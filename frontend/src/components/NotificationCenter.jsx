import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  clearNotifications,
  markAllRead,
  onNotificationsChanged
} from "../data/notificationStore.js";

const iconByType = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
};

function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const wrapRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const lastAutoIdRef = useRef("");

  const clearTimers = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    openTimerRef.current = null;
    closeTimerRef.current = null;
  };

  useEffect(() => onNotificationsChanged(setNotifications), []);

  useEffect(() => {
    const latest = notifications[0];
    if (!latest || latest.id === lastAutoIdRef.current) return;

    lastAutoIdRef.current = latest.id;
    clearTimers();

    openTimerRef.current = window.setTimeout(() => {
      setOpen(true);
      openTimerRef.current = null;
    }, 450);

    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 4300);

    return clearTimers;
  }, [notifications[0]?.id]);

  useEffect(() => {
    if (open) markAllRead();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        clearTimers();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const toggleOpen = () => {
    clearTimers();
    setOpen((value) => !value);
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="notification-trigger" ref={wrapRef}>
      <button
        type="button"
        className="icon-button notification-button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggleOpen}
        style={{ border: "none", background: "none" }}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-dot" />}
      </button>

      {open && (
        <div className="notification-popup" role="dialog" aria-label="Notifications">
          <div className="notification-popup-head">
            <strong>Notifications</strong>
            <button type="button" className="notification-close" aria-label="Close notifications" onClick={() => { clearTimers(); setOpen(false); }}>
              <X size={15} />
            </button>
          </div>

          <div className="notification-list">
            {notifications.length ? (
              notifications.map((item) => {
                const Icon = iconByType[item.type] || Info;
                return (
                  <article className={`notification-item ${item.type}`} key={item.id}>
                    <span className="notification-icon">
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="notification-empty">No notifications yet.</p>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-actions">
              <button type="button" className="btn btn-ghost btn-small" onClick={clearNotifications}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
