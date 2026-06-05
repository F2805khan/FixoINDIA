import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  Headphones,
  History,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  Wrench,
  X,
  Zap
} from "lucide-react";

const baseLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/services", label: "Services", icon: Wrench },
  { to: "/history", label: "History", icon: History },
  { to: "/support", label: "Customer Support", icon: Headphones }
];

function Navbar({ user, onLogout, onOpenStatus }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const closeMenus = () => {
    setOpen(false);
    setProfileOpen(false);
  };

  const openBookingStatus = () => {
    onOpenStatus?.();
    closeMenus();
  };

  const logout = () => {
    onLogout();
    closeMenus();
  };

  return (
    <header className="navbar-shell">
      <nav className="navbar container">
        <Link to="/" className="brand" onClick={closeMenus}>
          <span className="brand-icon">
            <Zap size={20} fill="currentColor" />
          </span>
          <span>
            <strong>FunService</strong>
            <small>All Services. One Click.</small>
          </span>
        </Link>

        <button className="nav-toggle" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`nav-links ${open ? "open" : ""}`}>
          {baseLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={closeMenus}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="nav-actions">
          <button className="icon-button" aria-label="Notifications" title="Notifications">
            <Bell size={20} />
            <span className="notification-dot" />
          </button>
          
          {user ? (
            <>
              <div className="profile-menu-wrap">
                <button
                  className={`session-pill ${user.role === "admin" ? "admin" : ""}`}
                  onClick={() => {
                    setProfileOpen((value) => !value);
                    setOpen(false);
                  }}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  {user.role === "admin" ? <ShieldCheck size={15} /> : <UserRound size={15} />}
                  {user.name || user.userId || "Account"}
                </button>
                {profileOpen && (
                  <div className="profile-menu" role="menu">
                    <button type="button" onClick={openBookingStatus} role="menuitem">
                      <CalendarClock size={16} /> Booking Status
                    </button>
                    <Link to="/history" onClick={closeMenus} role="menuitem">
                      <History size={16} /> History
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/backend" onClick={closeMenus} role="menuitem">
                        <ShieldCheck size={16} /> Backend
                      </Link>
                    )}
                    <button type="button" onClick={logout} role="menuitem">
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link className="btn btn-primary compact" to="/login">
              Login / Signup
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
