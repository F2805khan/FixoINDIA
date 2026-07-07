import { CalendarClock, MapPin, WalletCards, X, XCircle } from "lucide-react";
import { professionalPhoto } from "../data/services.js";
import StatusTimeline from "./StatusTimeline.jsx";

const getStatusClass = (status = "Confirmed") => status.toLowerCase().replace(/\s+/g, "-");

function StatusModal({ booking, onCancel, onClose }) {
  if (!booking) return null;

  const status = booking.bookingStatus || "On The Way";
  const canCancel = !["Cancelled", "Completed"].includes(status);
  const dateTime =
    booking.date && booking.time
      ? `${booking.date} at ${booking.time}`
      : booking.dateTime || booking.date || booking.time || "Today";

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="status-modal">
        <div className="modal-head">
          <h2>Booking Status</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close booking status">
            <X size={20} />
          </button>
        </div>

        <div className="status-summary">
          <span>Booking ID: {booking.bookingId}</span>
          <strong className={`status-badge ${getStatusClass(status)}`}>{status}</strong>
        </div>

        <StatusTimeline currentStatus={status} />

        <div className="professional-card">
          <img src={booking.professionalPhoto || professionalPhoto} alt={booking.professionalName} />
          <div>
            <strong>{booking.professionalName || "Ramesh Kumar"}</strong>
            <p>{booking.serviceName || booking.service?.title || "fixOindia Professional"}</p>
            <small>Estimated arrival: {booking.estimatedArrival || "12 minutes"}</small>
          </div>
        </div>

        <div className="status-detail-grid">
          <div>
            <CalendarClock size={17} />
            <span>
              <strong>Date & Time</strong>
              {dateTime}
            </span>
          </div>
          <div>
            <WalletCards size={17} />
            <span>
              <strong>Amount</strong>
              {booking.amount || "Pending"}
            </span>
          </div>
          {booking.address && (
            <div>
              <MapPin size={17} />
              <span>
                <strong>Address</strong>
                {booking.address}
              </span>
            </div>
          )}
        </div>

        <div className="modal-action-row">
          {canCancel && (
            <button className="btn btn-danger full" onClick={() => onCancel(booking)}>
              <XCircle size={17} /> Cancel Service
            </button>
          )}
          <button className="btn btn-soft full" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export default StatusModal;
