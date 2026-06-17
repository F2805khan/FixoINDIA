import { useEffect, useState } from "react";
import {
  CalendarClock,
  MapPin,
  Navigation,
  Phone,
  Radio,
  WalletCards,
  X,
  XCircle
} from "lucide-react";
import { professionalPhoto } from "../data/services.js";
import {
  LIVE_SIMULATION_STEPS,
  formatBookingAmount,
  formatBookingDateTime,
  getStatusClass,
  isActiveBookingStatus,
  normalizeBookingStatus
} from "../utils/bookingTracking.js";
import StatusTimeline from "./StatusTimeline.jsx";

const DEFAULT_AGENT_PHONE = "99988877766";

function BookingStatusDrawer({ booking, liveMode = false, onCancel, onClose }) {
  const [displayStatus, setDisplayStatus] = useState(normalizeBookingStatus(booking?.bookingStatus));
  const [etaMinutes, setEtaMinutes] = useState(18);

  useEffect(() => {
    if (!booking) return;
    setDisplayStatus(normalizeBookingStatus(booking.bookingStatus));
    setEtaMinutes(18);
  }, [booking?.bookingId, booking?.bookingStatus]);

  useEffect(() => {
    if (!booking || !liveMode || !isActiveBookingStatus(displayStatus)) return;

    const startIndex = LIVE_SIMULATION_STEPS.indexOf(normalizeBookingStatus(booking.bookingStatus));
    let stepIndex = startIndex >= 0 ? startIndex : 0;

    const advance = setInterval(() => {
      stepIndex += 1;
      if (stepIndex >= LIVE_SIMULATION_STEPS.length) {
        clearInterval(advance);
        return;
      }
      setDisplayStatus(LIVE_SIMULATION_STEPS[stepIndex]);
      setEtaMinutes((current) => Math.max(6, current - 5));
    }, 3200);

    const etaTick = setInterval(() => {
      setEtaMinutes((current) => (current > 6 ? current - 1 : current));
    }, 45000);

    return () => {
      clearInterval(advance);
      clearInterval(etaTick);
    };
  }, [booking?.bookingId, liveMode]);

  if (!booking) return null;

  const status = displayStatus;
  const canCancel = isActiveBookingStatus(status);
  const dateTime = formatBookingDateTime(booking);
  const amount = formatBookingAmount(booking.amount);
  const onTheWay = status === "On The Way";
  const agentPhone = booking.professionalPhone || DEFAULT_AGENT_PHONE;

  return (
    <div className="booking-status-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="booking-status-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Booking status"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">{liveMode ? "Live booking tracker" : "Active service"}</span>
            <h2>{booking.serviceName || "Your booking"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close booking status">
            <X size={20} />
          </button>
        </div>

        <div className="tracking-hero-card">
          <div className="tracking-hero-top">
            <span className="booking-id-chip">{booking.bookingId}</span>
            <strong className={`status-badge ${getStatusClass(status)}`}>{status}</strong>
          </div>
          <div className="tracking-hero-stats">
            <article>
              <CalendarClock size={16} />
              <span>Visit time</span>
              <strong>{dateTime}</strong>
            </article>
            <article>
              <Navigation size={16} />
              <span>{onTheWay ? "ETA" : "Status"}</span>
              <strong>{onTheWay ? `${etaMinutes} min` : status}</strong>
            </article>
            <article>
              <WalletCards size={16} />
              <span>Amount</span>
              <strong>{amount}</strong>
            </article>
          </div>
          {liveMode && canCancel && (
            <p className="tracking-hero-note">
              <Radio size={14} /> We are updating your visit step by step in real time.
            </p>
          )}
        </div>

        <StatusTimeline
          booking={booking}
          currentStatus={status}
          etaMinutes={etaMinutes}
          liveMode={liveMode}
        />

        <div className="professional-card tracking-pro-card">
          <img src={booking.professionalPhoto || professionalPhoto} alt={booking.professionalName || "Professional"} />
          <div>
            <span className="eyebrow">Assigned professional</span>
            <strong>{booking.professionalName || "Matching in progress"}</strong>
            <p>{onTheWay ? `Reaching you in ~${etaMinutes} minutes` : "Agent contact shared once assigned"}</p>
            <small>Call agent: {agentPhone}</small>
          </div>
          <a className="btn btn-ghost btn-small tracking-call-btn" href={`tel:${agentPhone}`}>
            <Phone size={14} /> Call agent
          </a>
        </div>

        <div className="status-detail-grid">
          <div>
            <MapPin size={17} />
            <span>
              <strong>Service address</strong>
              {booking.address || "Address on file"}
            </span>
          </div>
          <div>
            <WalletCards size={17} />
            <span>
              <strong>Payment</strong>
              {booking.paymentMethod || "Online"} · {booking.paymentStatus || "Pending"}
            </span>
          </div>
        </div>

        <div className="modal-action-row">
          {canCancel && (
            <button className="btn btn-danger full" type="button" onClick={() => onCancel?.(booking)}>
              <XCircle size={17} /> Cancel service
            </button>
          )}
          <button className="btn btn-soft full" type="button" onClick={onClose}>
            Close tracker
          </button>
        </div>
      </aside>
    </div>
  );
}

export default BookingStatusDrawer;
