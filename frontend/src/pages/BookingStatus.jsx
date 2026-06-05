import { CalendarClock, MapPin, Phone, UserCheck, XCircle } from "lucide-react";
import StatusTimeline from "../components/StatusTimeline.jsx";
import { professionalPhoto } from "../data/services.js";

const fallbackBooking = {
  bookingId: "#QF1245789",
  serviceName: "AC Repairing",
  amount: "₹499",
  date: "2026-05-24",
  time: "10:00",
  address: "12 Blue Street, New Delhi",
  phone: "+91 98765 43210",
  bookingStatus: "On The Way",
  professionalName: "Ramesh Kumar",
  professionalPhoto,
  estimatedArrival: "12 minutes"
};

const getStatusClass = (status = "Confirmed") => status.toLowerCase().replace(/\s+/g, "-");

function BookingStatus({ booking, onOpenStatus, onCancelBooking }) {
  const currentBooking = booking || fallbackBooking;
  const status = currentBooking.bookingStatus || "On The Way";
  const canCancel = booking && !["Cancelled", "Completed"].includes(status);

  return (
    <section className="page-shell">
      <div className="container status-page-grid">
        <div className="status-panel">
          <div className="section-heading inline">
            <div>
              <h1>Booking Status</h1>
              <p>Track your professional in real time.</p>
            </div>
            <span className={`status-badge ${getStatusClass(status)}`}>{status}</span>
          </div>

          <div className="status-id">Booking ID: {currentBooking.bookingId}</div>
          <StatusTimeline currentStatus={status} />
          <div className="status-actions">
            <button className="btn btn-primary" onClick={() => onOpenStatus(currentBooking)}>
              Open Live Status Popup
            </button>
            {canCancel && (
              <button className="btn btn-danger" onClick={() => onCancelBooking(currentBooking)}>
                <XCircle size={17} /> Cancel Service
              </button>
            )}
          </div>
        </div>

        <aside className="booking-detail-card">
          <img src={currentBooking.professionalPhoto} alt={currentBooking.professionalName} />
          <h2>{currentBooking.professionalName}</h2>
          <p>{currentBooking.serviceName}</p>
          <div>
            <UserCheck size={18} />
            Trusted FunService Professional
          </div>
          <div>
            <CalendarClock size={18} />
            {currentBooking.date || "24 May 2026"} at {currentBooking.time || "10:00 AM"}
          </div>
          <div>
            <Phone size={18} />
            {currentBooking.phone}
          </div>
          <div>
            <MapPin size={18} />
            {currentBooking.address}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default BookingStatus;
