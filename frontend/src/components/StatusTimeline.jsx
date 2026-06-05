import { Check, Clock, Navigation, Wrench, XCircle } from "lucide-react";

const timeline = [
  "Booking Confirmed",
  "Professional Assigned",
  "On The Way",
  "Service In Progress",
  "Completed"
];

const icons = [Check, Check, Navigation, Wrench, Check];

function StatusTimeline({ currentStatus = "On The Way" }) {
  const isCancelled = currentStatus === "Cancelled";
  const normalizedStatus = currentStatus === "Confirmed" ? "Booking Confirmed" : currentStatus;
  const currentIndex = Math.max(
    0,
    timeline.findIndex((step) => step === normalizedStatus)
  );

  return (
    <div className="timeline">
      {timeline.map((step, index) => {
        const Icon = icons[index] || Clock;
        const complete = !isCancelled && index <= currentIndex;
        return (
          <div className={`timeline-row ${complete ? "active" : ""}`} key={step}>
            <span className="timeline-icon">
              <Icon size={16} />
            </span>
            <div>
              <strong>{step}</strong>
              <small>
                {index === 0 && "24 May 2024, 10:00 AM"}
                {index === 1 && "Ramesh Kumar assigned"}
                {index === 2 && "Arriving in 12 mins"}
                {index > 2 && "Yet to start"}
              </small>
            </div>
            {index === 2 && <em>12 mins</em>}
          </div>
        );
      })}
      {isCancelled && (
        <div className="timeline-row cancelled active">
          <span className="timeline-icon">
            <XCircle size={16} />
          </span>
          <div>
            <strong>Cancelled</strong>
            <small>This service request has been cancelled.</small>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusTimeline;
