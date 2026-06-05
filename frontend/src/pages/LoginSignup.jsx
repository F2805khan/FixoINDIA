import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { BadgeCheck, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { api } from "../api/client.js";
import { auth } from "../components/firebase.js";
import { logoutSession, onSessionChanged } from "../data/sessionStore.js";

const authAnimation = "/animations/cash-booking-confirmed.json";

const blankForm = {
  name: "",
  email: "",
  phone: "",
  identifier: "",
  password: "",
  address: "",
  otp: ""
};

function LoginSignup() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [method, setMethod] = useState("password");
  const [resetMode, setResetMode] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => onSessionChanged(setCurrentUser), []);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const selectMode = (nextMode) => {
    setMode(nextMode);
    setResetMode(false);
    setOtpRequested(false);
    setForm(blankForm);
  };

  const selectMethod = (nextMethod) => {
    setMethod(nextMethod);
    setOtpRequested(false);
    setForm((current) => ({ ...current, otp: "" }));
  };

  const accountDestination = (user, isSignup = false) => {
    navigate(user?.role === "owner" ? "/owner" : isSignup ? "/profile" : "/dashboard");
  };

  const signupPayload = () => ({
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    password: form.password
  });

  const sendOtp = async () => {
    const payload = resetMode
      ? { identifier: form.identifier.trim(), purpose: "password-reset" }
      : mode === "signup"
        ? { email: form.email.trim(), purpose: "signup" }
        : { identifier: form.identifier.trim(), purpose: "login" };

    if (!(payload.email || payload.identifier)) {
      toast.error("Enter your email address first.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.requestOtp(payload);
      setOtpRequested(true);
      toast.success(response.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    if (!otpRequested) {
      await sendOtp();
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({
        identifier: form.identifier.trim(),
        otp: form.otp.trim(),
        newPassword: form.password
      });
      toast.success("Password reset successfully. You can log in now.");
      setResetMode(false);
      setOtpRequested(false);
      setForm(blankForm);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      const response = await api.googleLogin({
        idToken: await firebaseUser.getIdToken(true),
        mode
      });
      api.saveSession(response);
      toast.success(mode === "signup" ? "Gmail account created successfully." : "Logged in with Gmail.");
      accountDestination(response.user, mode === "signup");
    } catch (error) {
      if (auth.currentUser && !api.hasToken()) await signOut(auth);
      if (error.code === "auth/unauthorized-domain") {
        toast.error(`Authorize ${window.location.hostname} in Firebase Authentication settings.`);
      } else if (error.code === "auth/popup-closed-by-user") {
        toast.error("Gmail login was cancelled.");
      } else {
        toast.error(error.message || "Could not continue with Gmail.");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      let response;
      if (method === "password") {
        response =
          mode === "signup"
            ? await api.register(signupPayload())
            : await api.login({ identifier: form.identifier.trim(), password: form.password });
      } else {
        if (!otpRequested || !form.otp.trim()) {
          toast.error("Request an OTP and enter the verification code first.");
          return;
        }

        response = await api.verifyOtp(
          mode === "signup"
            ? { ...signupPayload(), otp: form.otp.trim(), purpose: "signup" }
            : { identifier: form.identifier.trim(), otp: form.otp.trim(), purpose: "login" }
        );
      }

      api.saveSession(response);
      toast.success(mode === "signup" ? "Account created successfully." : "Logged in successfully.");
      accountDestination(response.user, mode === "signup");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    try {
      await logoutSession();
      toast.success("Logged out successfully.");
    } catch (error) {
      toast.error("Could not log out.");
    }
  };

  if (currentUser) {
    return (
      <section className="auth-page shell">
        <div className="auth-stage auth-stage-signed">
          <AuthVisual />
          <div className="auth-card auth-card-simple auth-signed-card">
            <span className="badge">
              <ShieldCheck size={15} /> Signed in
            </span>
            <h1>{currentUser.displayName || currentUser.email || "FunService account"}</h1>
            <p>Your account is active and ready for your next booking.</p>
            <div className="auth-signed-actions">
              <button className="btn btn-primary" onClick={() => accountDestination(currentUser)}>
                Continue
              </button>
              <button className="btn btn-ghost" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page shell">
      <div className="auth-stage">
        <AuthVisual />
        <div className="auth-card auth-card-simple">
        <div className="auth-form-panel">
          <div className="auth-simple-head">
            <span className="badge">
              <ShieldCheck size={15} /> Customer access
            </span>
            <h1>{resetMode ? "Reset Password" : mode === "signup" ? "Create Account" : "Login"}</h1>
            <p>{resetMode ? "Receive a verification code by email." : "Use Gmail, email verification, or your password to continue."}</p>
          </div>

          {!resetMode && (
            <>
              <div className="auth-tabs">
                <button type="button" className={mode === "login" ? "active" : ""} onClick={() => selectMode("login")}>
                  <ShieldCheck size={16} /> Login
                </button>
                <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => selectMode("signup")}>
                  <BadgeCheck size={16} /> Signup
                </button>
              </div>

              <div className="method-tabs">
                <button type="button" className={`btn btn-small ${method === "google" ? "btn-primary" : "btn-ghost"}`} onClick={() => selectMethod("google")}>
                  <Mail size={16} /> Gmail
                </button>
                <button type="button" className={`btn btn-small ${method === "otp" ? "btn-primary" : "btn-ghost"}`} onClick={() => selectMethod("otp")}>
                  <Mail size={16} /> Email OTP
                </button>
                <button type="button" className={`btn btn-small ${method === "password" ? "btn-primary" : "btn-ghost"}`} onClick={() => selectMethod("password")}>
                  <KeyRound size={16} /> Password
                </button>
              </div>
            </>
          )}

          <form className="auth-form" onSubmit={resetMode ? submitReset : submitAuth}>
            {resetMode ? (
              <>
                <label>
                  Email address
                  <input required name="identifier" type="email" value={form.identifier} onChange={update} placeholder="you@example.com" />
                </label>
                {otpRequested && (
                  <>
                    <label>
                      Verification code
                      <input required name="otp" value={form.otp} onChange={update} placeholder="6-digit OTP" />
                    </label>
                    <label>
                      New password
                      <input required minLength="6" name="password" type="password" value={form.password} onChange={update} placeholder="Minimum 6 characters" />
                    </label>
                  </>
                )}
              </>
            ) : (
              <>
                {mode === "signup" && method !== "google" && (
                  <>
                    <label>
                      Name
                      <input required name="name" value={form.name} onChange={update} placeholder="Your full name" />
                    </label>
                    <label>
                      Email
                      <input required name="email" type="email" value={form.email} onChange={update} placeholder="you@example.com" />
                    </label>
                    <label>
                      Phone
                      <input required name="phone" value={form.phone} onChange={update} placeholder="+91 98765 43210" />
                    </label>
                    <label>
                      Address
                      <textarea name="address" value={form.address} onChange={update} placeholder="Flat, building, street and landmark" />
                    </label>
                    <label>
                      Password
                      <input required minLength="6" name="password" type="password" value={form.password} onChange={update} placeholder="Minimum 6 characters" />
                    </label>
                  </>
                )}

                {mode === "login" && method !== "google" && (
                  <label>
                    Email address
                    <input required name="identifier" type="email" value={form.identifier} onChange={update} placeholder="you@example.com" />
                  </label>
                )}

                {method === "password" && mode === "login" && (
                  <label>
                    Password
                    <input required name="password" type="password" value={form.password} onChange={update} placeholder="Your password" />
                  </label>
                )}

                {method === "otp" && otpRequested && (
                  <label>
                    Verification code
                    <input required name="otp" value={form.otp} onChange={update} placeholder="6-digit OTP" />
                  </label>
                )}
              </>
            )}

            {method === "google" && !resetMode ? (
              <button type="button" onClick={handleGoogleSuccess} className="btn btn-primary full" disabled={loading}>
                <Mail size={17} /> {mode === "signup" ? "Signup with Gmail" : "Continue with Gmail"}
              </button>
            ) : method === "otp" || resetMode ? (
              <>
                <button type="button" className="btn btn-ghost full" onClick={sendOtp} disabled={loading}>
                  <Mail size={17} /> {otpRequested ? "Resend OTP" : "Send OTP"}
                </button>
                {otpRequested && (
                  <button className="btn btn-primary full auth-followup-btn" type="submit" disabled={loading}>
                    {resetMode ? "Reset password" : mode === "signup" ? "Verify and create account" : "Verify and login"}
                  </button>
                )}
              </>
            ) : (
              <button className="btn btn-primary full" type="submit" disabled={loading}>
                {mode === "signup" ? "Create account" : "Login"}
              </button>
            )}

            {method === "password" && mode === "login" && !resetMode && (
              <button className="btn btn-ghost full auth-secondary-action" type="button" onClick={() => {
                setResetMode(true);
                setOtpRequested(false);
                setForm(blankForm);
              }}>
                <KeyRound size={15} /> Forgot password?
              </button>
            )}

            {resetMode && (
              <button className="btn btn-ghost full auth-secondary-action" type="button" onClick={() => {
                setResetMode(false);
                setOtpRequested(false);
                setForm(blankForm);
              }}>
                Back to login
              </button>
            )}
          </form>
        </div>
        </div>
      </div>
    </section>
  );
}

function AuthVisual() {
  return (
    <aside className="auth-visual" aria-hidden="true">
      <div className="auth-visual-ring" />
      <div className="auth-lottie">
        <DotLottieReact src={authAnimation} loop autoplay />
      </div>
      <div className="auth-visual-copy">
        <span>Secure access</span>
        <strong>OTP, Gmail and password login in one place.</strong>
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
