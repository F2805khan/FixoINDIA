import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../utils/notifications.js";
import { AlertCircle, CalendarDays, Mail, Phone, ShieldCheck, Sparkles, X } from "lucide-react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { api } from "../api/client.js";
import { auth } from "../components/firebase.js";
import { logoutSession, onSessionChanged } from "../data/sessionStore.js";

const blankForm = {
  identifier: "",
  otp: ""
};

const isEmail = (value) => /\S+@\S+\.\S+/.test(value.trim());
const isPhoneLike = (value) => /^[+\d][\d\s-]{7,}$/.test(value.trim());

function LoginSignup({ compact = false, onAuthenticated, onDismiss }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("choice");
  const [form, setForm] = useState(blankForm);
  const [otpPurpose, setOtpPurpose] = useState("login");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [errorPopup, setErrorPopup] = useState({ title: "", message: "" });
  const [authMethods, setAuthMethods] = useState([]);

  useEffect(() => {
    api.getAuthMethods().then(setAuthMethods).catch(console.error);
  }, []);

  useEffect(() => onSessionChanged(setCurrentUser), []);

  const accountDestination = () => {
    if (onAuthenticated) {
      onAuthenticated();
      return;
    }
    navigate("/");
  };

  const showError = (message, title = "Login issue") => {
    setErrorPopup({ title, message });
  };

  const clearError = () => {
    setErrorPopup({ title: "", message: "" });
  };

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const requestOtp = async (event) => {
    event.preventDefault();
    const identifier = form.identifier.trim();

    if (!identifier) {
      showError("Enter your email address or phone number first.", "Contact required");
      return;
    }

    if (!isEmail(identifier) && !isPhoneLike(identifier)) {
      showError("Please enter a valid email address or phone number.", "Check your contact");
      return;
    }

    setLoading(true);
    clearError();

    try {
      const response = await api.requestOtp({ identifier, purpose: "login" });
      setOtpPurpose("login");
      setStep("otp");
      toast.success(response.message);
    } catch (error) {
      const isSignupEnabled = authMethods.some((m) => m.signupEnabled);
      if (error.status === 404 && isEmail(identifier)) {
        if (!isSignupEnabled) {
          showError("Account not found and signups are currently disabled.", "Account not found");
          return;
        }
        try {
          const response = await api.requestOtp({ email: identifier, purpose: "signup" });
          setOtpPurpose("signup");
          setStep("otp");
          toast.success(response.message);
        } catch (signupError) {
          showError(signupError.message || "Could not send OTP.", "OTP not sent");
        }
      } else if (error.status === 404 && isPhoneLike(identifier)) {
        showError("Phone login works for existing accounts only. Use your email or Gmail to create a new account.", "Account not found");
      } else {
        showError(error.message || "Could not send OTP.", "OTP not sent");
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    const identifier = form.identifier.trim();
    const otp = form.otp.trim();

    if (!otp) {
      showError("Enter the OTP sent to your email.", "OTP required");
      return;
    }

    setLoading(true);
    clearError();

    try {
      const payload = otpPurpose === "signup"
        ? { email: identifier, otp, purpose: "signup" }
        : { identifier, otp, purpose: "login" };
      const response = await api.verifyOtp(payload);
      api.saveSession(response);
      toast.success(otpPurpose === "signup" ? "Account created and logged in." : "Login complete.");
      accountDestination(response.user);
    } catch (error) {
      showError(error.message || "OTP not verified. Please try again.", "OTP not verified");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async () => {
    setLoading(true);
    clearError();

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      const response = await api.googleLogin({
        idToken: await firebaseUser.getIdToken(true),
        mode: "signup"
      });
      api.saveSession(response);
      toast.success(response.user ? "Gmail login complete." : "Logged in with Gmail.");
      accountDestination(response.user);
    } catch (error) {
      console.error("Google Login Catch Error details:", error);
      if (auth.currentUser && !api.hasToken()) await signOut(auth);
      if (error.code === "auth/unauthorized-domain") {
        showError(`Authorize ${window.location.hostname} in Firebase Authentication settings.`, "Firebase setup needed");
      } else if (error.code === "auth/popup-closed-by-user") {
        showError("Gmail login was cancelled.", "Gmail login cancelled");
      } else {
        showError(error.message || "Could not continue with Gmail.", "Gmail login issue");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep("choice");
    setForm((current) => ({ ...current, otp: "" }));
    setOtpPurpose("login");
    clearError();
  };

  const onLogout = async () => {
    try {
      await logoutSession();
      toast.success("Logged out successfully.");
    } catch {
      toast.error("Could not log out.");
    }
  };

  if (currentUser) {
    const signedInCard = (
      <div className="auth-card auth-card-simple auth-signed-card">
        <span className="badge"><ShieldCheck size={15} /> Signed in</span>
        <h1>{currentUser.displayName || currentUser.email || "fixOindia account"}</h1>
        <p>Your account is active and ready for your next booking.</p>
        <div className="auth-signed-actions">
          <button className="btn btn-primary" onClick={() => accountDestination(currentUser)}>Continue</button>
          {!compact && <button className="btn btn-ghost" onClick={onLogout}>Logout</button>}
        </div>
      </div>
    );

    if (compact) {
      return (
        <div className="auth-popup-backdrop login-welcome-backdrop" role="dialog" aria-modal="true" aria-label="Login">
          <section className="login-welcome-popup">{signedInCard}</section>
        </div>
      );
    }

    return (
      <section className="auth-page shell">
        <div className="auth-stage auth-stage-signed">
          <AuthVisual />
          {signedInCard}
        </div>
      </section>
    );
  }

  const authCard = (
    <div className="auth-card auth-card-simple">
      {compact && (
        <div className="login-welcome-head">
          <button className="icon-button" type="button" onClick={onDismiss} aria-label="Close login popup">
            <X size={18} />
          </button>
        </div>
      )}
        <div className="auth-form-panel">
            <div className="auth-simple-head">
              <span className="badge"><ShieldCheck size={15} /> Secure login</span>
              <h1>{step === "otp" ? "Verify OTP" : (authMethods.some((m) => m.signupEnabled) ? "Login / Signup" : "Login")}</h1>
              <p>
                {step === "otp"
                  ? `Enter the OTP sent for ${form.identifier.trim()}.`
                  : step === "identity"
                    ? (authMethods.some((m) => m.signupEnabled) ? "Enter your phone number or email to receive an OTP. New users will be signed up automatically." : "Enter your phone number or email to receive an OTP to login.")
                    : "Choose how you want to login."}
              </p>
            </div>

            {step === "choice" ? (
              <div className="login-choice-grid">
                <button className="login-choice-card" type="button" onClick={handleGoogleSuccess} disabled={loading}>
                  <span className="google-logo">G</span>
                  <strong>Continue with Google</strong>
                  <small>{authMethods.some(m => m.signupEnabled) ? "Login or sign up instantly with Gmail" : "Login securely with Gmail"}</small>
                </button>
                <button className="login-choice-card" type="button" onClick={() => setStep("identity")} disabled={loading}>
                  <Phone size={24} />
                  <strong>Phone / Email OTP</strong>
                  <small>{authMethods.some(m => m.signupEnabled) ? "Login or sign up with verification code" : "Login with verification code"}</small>
                </button>
                {compact && (
                  <button className="btn btn-ghost full auth-secondary-action" type="button" onClick={onDismiss} disabled={loading}>
                    Browse without login
                  </button>
                )}
              </div>
            ) : step === "identity" ? (
              <form className="auth-form simple-login-form" onSubmit={requestOtp}>
                <label>
                  Email or phone number
                  <div className="login-identity-input">
                    {isPhoneLike(form.identifier) ? <Phone size={17} /> : <Mail size={17} />}
                    <input
                      required
                      name="identifier"
                      value={form.identifier}
                      onChange={update}
                      placeholder="you@example.com or +91 98765 43210"
                      autoComplete="username"
                    />
                  </div>
                </label>
                <button className="btn btn-primary full" type="submit" disabled={loading}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
                <button className="btn btn-ghost full auth-secondary-action" type="button" onClick={() => setStep("choice")} disabled={loading}>
                  Back to login options
                </button>
              </form>
            ) : (
              <form className="auth-form simple-login-form" onSubmit={verifyOtp}>
                <label>
                  OTP verification code
                  <input
                    required
                    name="otp"
                    value={form.otp}
                    onChange={update}
                    placeholder="Enter 6-digit OTP"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
                <button className="btn btn-primary full" type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Verify and login"}
                </button>
                <button className="btn btn-ghost full auth-secondary-action" type="button" onClick={requestOtp} disabled={loading}>
                  Resend OTP
                </button>
                <button className="btn btn-ghost full auth-secondary-action" type="button" onClick={resetFlow}>
                  Change email or phone
                </button>
              </form>
            )}
          </div>
        </div>
  );

  if (compact) {
    return (
      <>
        <div className="auth-popup-backdrop login-welcome-backdrop" role="dialog" aria-modal="true" aria-label="Login">
          <section className="login-welcome-popup">{authCard}</section>
        </div>
        {errorPopup.message && (
          <div className="auth-popup-backdrop" role="dialog" aria-modal="true" aria-label="Login error">
            <section className="auth-error-popup">
              <button className="icon-button" type="button" onClick={clearError} aria-label="Close popup">
                <X size={18} />
              </button>
              <AlertCircle size={34} />
              <h2>{errorPopup.title}</h2>
              <p>{errorPopup.message}</p>
              <button className="btn btn-primary full" type="button" onClick={clearError}>
                Try again
              </button>
            </section>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="auth-page shell">
      <div className="auth-stage">
        <AuthVisual />
        {authCard}
      </div>

      {errorPopup.message && (
        <div className="auth-popup-backdrop" role="dialog" aria-modal="true" aria-label="Login error">
          <section className="auth-error-popup">
            <button className="icon-button" type="button" onClick={clearError} aria-label="Close popup">
              <X size={18} />
            </button>
            <AlertCircle size={34} />
            <h2>{errorPopup.title}</h2>
            <p>{errorPopup.message}</p>
            <button className="btn btn-primary full" type="button" onClick={clearError}>
              Try again
            </button>
          </section>
        </div>
      )}
    </section>
  );
}

function AuthVisual() {
  return (
    <aside className="auth-visual" aria-hidden="true">
      <div className="auth-visual-ring" />
      <div className="auth-static-visual">
        <div className="auth-static-card main">
          <span><ShieldCheck size={18} /> Secure Login</span>
          <strong>fixOindia</strong>
          <small>Email OTP, phone lookup and Gmail access</small>
        </div>
        <div className="auth-static-card mini card-one">
          <Mail size={18} />
          <span>Email OTP</span>
        </div>
        <div className="auth-static-card mini card-two">
          <CalendarDays size={18} />
          <span>Bookings ready</span>
        </div>
        <div className="auth-static-card mini card-three">
          <Sparkles size={18} />
          <span>Home care</span>
        </div>
      </div>
      <div className="auth-visual-copy">
        <span>Simple access</span>
        <strong>Login with OTP or Gmail. No passwords required.</strong>
      </div>
      <div className="auth-floating-chip chip-one">
        <ShieldCheck size={15} /> Verified booking
      </div>
      <div className="auth-floating-chip chip-two">
        <Mail size={15} /> Email OTP ready
      </div>
    </aside>
  );
}

export default LoginSignup;
