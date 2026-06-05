import { useState } from "react";
import { toast } from "react-hot-toast";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { api } from "../api/client.js";

const adminLoginId = import.meta.env.VITE_OWNER_LOGIN_ID || import.meta.env.VITE_ADMIN_LOGIN_ID || "";

function AdminAccessGate({ onAuthSuccess }) {
  const [form, setForm] = useState({ identifier: adminLoginId, password: "" });
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const login = async (event) => {
    event.preventDefault();

    if (!form.identifier.trim() || !form.password) {
      toast.error("Admin email or ID and password are required.");
      return;
    }

    setLoading(true);
    try {
      const session = await api.login({
        identifier: form.identifier.trim(),
        password: form.password
      });

      if (!["admin", "owner"].includes(session.user?.role)) {
        api.clearSession();
        toast.error("This account is not authorized for the backend panel.");
        return;
      }

      onAuthSuccess(session);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-access-page">
      <div className="admin-access-card">
        <div className="admin-access-copy">
          <span className="badge">
            <ShieldCheck size={15} /> Admin only
          </span>
          <h1>Backend Panel</h1>
          <p>Sign in with your admin or owner ID to manage services, bookings, payments, and users.</p>
        </div>

        <form className="auth-form admin-login-form" onSubmit={login}>
          <label>
            Admin email or ID
            <span className="input-with-icon">
              <KeyRound size={17} />
              <input
                required
                name="identifier"
                value={form.identifier}
                onChange={update}
                placeholder="admin@example.com"
                autoComplete="username"
              />
            </span>
          </label>

          <label>
            Password
            <span className="input-with-icon">
              <Lock size={17} />
              <input
                required
                name="password"
                type="password"
                value={form.password}
                onChange={update}
                placeholder="Admin password"
                autoComplete="current-password"
              />
            </span>
          </label>

          <button className="btn btn-primary full" type="submit" disabled={loading}>
            {loading ? "Verifying" : "Open Backend Panel"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AdminAccessGate;
