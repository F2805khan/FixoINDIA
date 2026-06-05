import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { ArrowLeft, LayoutDashboard, ShieldCheck } from "lucide-react";
import { api } from "../api/client.js";
import AdminAccessGate from "./AdminAccessGate.jsx";
import AdminDashboard from "./AdminDashboard.jsx";

function OwnerPanel() {
  const [session, setSession] = useState(null);
  const [services, setServices] = useState([]);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const saved = api.getSavedUser();
      if (!saved || !api.isAdmin()) {
        setBooting(false);
        return;
      }

      try {
        if (!api.hasToken()) {
          api.clearSession();
          setBooting(false);
          return;
        }

        const response = await api.getProfile();
        const profile = response.user;
        if (!["admin", "owner"].includes(profile?.role)) {
          api.clearSession();
          setBooting(false);
          return;
        }

        api.saveSession({ user: profile, token: api.getToken() });
        setSession({ user: profile, token: api.getToken() });

        const backendServices = await api.getAdminServices();
        setServices(backendServices || []);
      } catch {
        api.clearSession();
      } finally {
        setBooting(false);
      }
    };

    bootstrap();
  }, []);

  const handleAuthSuccess = async (nextSession) => {
    api.saveSession(nextSession);
    setSession(nextSession);
    try {
      const backendServices = await api.getAdminServices();
      setServices(backendServices || []);
    } catch {
      toast.error("Could not load SQL services from backend.");
    }
  };

  const handleLogout = () => {
    api.clearSession();
    setSession(null);
  };

  if (booting) {
    return (
      <main className="owner-shell">
        <div className="owner-loading">Checking owner access...</div>
      </main>
    );
  }

  return (
    <main className="owner-shell">
      <Toaster position="top-right" />
      <header className="owner-topbar shell">
        <div className="owner-brand">
          <span><LayoutDashboard size={17} /></span>
          <div>
            <strong>FunService Control</strong>
            <small>Operations dashboard</small>
          </div>
        </div>
        <div className="owner-topbar-actions">
          <Link className="owner-back" to="/">
            <ArrowLeft size={16} /> Public site
          </Link>
          {session?.user ? (
            <div className="owner-session">
              <span className="owner-role"><ShieldCheck size={14} /> {session.user.role === "owner" ? "Owner" : "Admin"}</span>
              <strong>{session.user.name || session.user.userId}</strong>
              <button type="button" className="btn btn-ghost btn-small" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <span className="owner-locked">Admin access only</span>
          )}
        </div>
      </header>

      {!session?.user || !api.isAdmin() ? (
        <AdminAccessGate onAuthSuccess={handleAuthSuccess} />
      ) : (
        <AdminDashboard
          currentUser={session.user}
          services={services}
          onServiceAdded={(service) => setServices((current) => [...current, service])}
          onServiceUpdated={(service) =>
            setServices((current) =>
              current.map((item) => ((item._id || item.id) === (service._id || service.id) ? service : item))
            )
          }
          onServiceDeleted={(service) =>
            setServices((current) =>
              current.filter((item) => (item._id || item.id) !== (service._id || service.id))
            )
          }
          onServicesSynced={setServices}
        />
      )}
    </main>
  );
}

export default OwnerPanel;
