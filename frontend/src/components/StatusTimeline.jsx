import { Check, Clock, Navigation, Sparkles, UserCheck, Wrench, XCircle } from "lucide-react";
import {
  TRACKING_STEPS,
  getProgressPercent,
  getStepIndex,
  normalizeBookingStatus
} from "../utils/bookingTracking.js";

const stepIcons = [Check, UserCheck, Navigation, Wrench, Sparkles];

const getStepSubtitle = (step, booking, index, currentIndex, etaMinutes) => {
  const dateTime =
    booking?.date && booking?.time ? `${booking.date}, ${booking.time}` : "Scheduled slot locked in";
  const professional = booking?.professionalName || "fixOindia professional";

  if (index < currentIndex) {
    if (step.key === "Confirmed") return `Booked for ${dateTime}`;
    if (step.key === "Professional Assigned") return `${professional} accepted your request`;
    if (step.key === "On The Way") return "Route shared with your professional";
    if (step.key === "Service In Progress") return "Visit started at your address";
    return "Step completed";
  }

  if (index === currentIndex) {
    if (step.key === "Confirmed") return "We are confirming your booking details";
    if (step.key === "Professional Assigned") return `Matching the best pro near you`;
    if (step.key === "On The Way") return `Arriving in about ${etaMinutes} minutes`;
    if (step.key === "Service In Progress") return `${professional} is working on your service`;
      if (step.key === "Completed") return "Thank you for booking with fixOindia";
    return "In progress";
  }

  return "Waiting for the previous step";
};

function StatusTimeline({ booking, currentStatus = "Confirmed", etaMinutes = 12, liveMode = false }) {
  const isCancelled = normalizeBookingStatus(currentStatus) === "Cancelled";
  const currentIndex = getStepIndex(currentStatus);
  const progress = getProgressPercent(currentStatus);

  return (
    <div className="tracking-timeline-wrap">
      <div className="tracking-progress-head">
        <div>
          <span className="eyebrow">Live progress</span>
          <strong>{progress}% complete</strong>
        </div>
        {liveMode && !isCancelled && currentIndex < TRACKING_STEPS.length - 1 && (
          <span className="tracking-live-pill">
            <span className="live-dot" /> Live updates
          </span>
        )}
      </div>

      <div className="tracking-progress-bar" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="tracking-timeline">
        {TRACKING_STEPS.map((step, index) => {
          const Icon = stepIcons[index] || Clock;
          const complete = !isCancelled && index < currentIndex;
          const current = !isCancelled && index === currentIndex;
          const upcoming = !isCancelled && index > currentIndex;

          return (
            <div
              className={`tracking-step ${complete ? "complete" : ""} ${current ? "current" : ""} ${upcoming ? "upcoming" : ""}`}
              key={step.key}
            >
              <div className="tracking-step-rail">
                <span className={`tracking-step-icon ${current ? "pulse" : ""}`}>
                  <Icon size={16} />
                </span>
                {index < TRACKING_STEPS.length - 1 && <span className="tracking-step-line" />}
              </div>
              <div className="tracking-step-copy">
                <div className="tracking-step-title">
                  <strong>{step.label}</strong>
                  {current && <em>Now</em>}
                  {complete && <em>Done</em>}
                </div>
                <small>{getStepSubtitle(step, booking, index, currentIndex, etaMinutes)}</small>
                <p>{step.hint}</p>
              </div>
            </div>
          );
        })}

        {isCancelled && (
          <div className="tracking-step current cancelled">
            <div className="tracking-step-rail">
              <span className="tracking-step-icon">
                <XCircle size={16} />
              </span>
            </div>
            <div className="tracking-step-copy">
              <div className="tracking-step-title">
                <strong>Cancelled</strong>
                <em>Stopped</em>
              </div>
              <small>This service request has been cancelled.</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusTimeline;
