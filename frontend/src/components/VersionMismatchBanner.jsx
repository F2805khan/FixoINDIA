import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { api } from "../api/client.js";
import { checkServerVersion, onVersionMismatch } from "../utils/versionSync.js";

export default function VersionMismatchBanner() {
  const [notice, setNotice] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkServerVersion(() => api.health());

    const interval = window.setInterval(() => {
      checkServerVersion(() => api.health());
    }, 5 * 60 * 1000);

    const unsubscribe = onVersionMismatch((detail) => {
      setNotice(detail);
      setDismissed(false);
    });

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, []);

  if (!notice || dismissed) return null;

  const isCritical = notice.level === "critical";

  return (
    <div className={`version-sync-banner ${isCritical ? "is-critical" : "is-soft"}`} role="status">
      <div>
        <strong>{isCritical ? "Update required" : "Update available"}</strong>
        <p>{notice.message}</p>
      </div>
      <div className="version-sync-actions">
        <button className="btn btn-primary btn-small" type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={14} /> Refresh now
        </button>
        {!isCritical && (
          <button className="icon-button" type="button" onClick={() => setDismissed(true)} aria-label="Dismiss update notice">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
