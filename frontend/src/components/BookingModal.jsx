import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Landmark,
  MapPin,
  Smartphone,
  Wallet,
  X,
  XCircle
} from "lucide-react";
import { services as defaultServices, professionalPhoto } from "../data/services.js";

const paymentMethods = [
  { label: "UPI", icon: Smartphone },
  { label: "Debit/Credit Card", icon: CreditCard },
  { label: "Net Banking", icon: Landmark },
  { label: "Cash on Service", icon: Wallet },
  { label: "Wallet", icon: Wallet }
];

function BookingModal({
  isOpen,
  services = defaultServices,
  service,
  onClose,
  onConfirm,
  onCancel,
  onTrack
}) {
  const [form, setForm] = useState({
    serviceId: service?.id || service?._id || "ac-repairing",
    date: "",
    time: "",
    address: "",
    phone: "",
    paymentMethod: "UPI"
  });
  const [successBooking, setSuccessBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (service) {
      setForm((current) => ({ ...current, serviceId: service.id || service._id }));
    }
    if (isOpen) {
      setSuccessBooking(null);
      setSubmitError("");
    }
  }, [service, isOpen]);

  const selectedService = useMemo(
    () =>
      services.find((item) => (item.id || item._id) === form.serviceId) ||
      service ||
      services[0] ||
      defaultServices[0],
    [form.serviceId, service, services]
  );

  if (!isOpen) return null;

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const confirmBooking = async (event) => {
    event.preventDefault();
    const booking = {
      bookingId: `#QF${Math.floor(100000 + Math.random() * 900000)}`,
      serviceId: selectedService.id || selectedService._id,
      serviceName: selectedService.title,
      amount: `₹${selectedService.price}`,
      date: form.date,
      time: form.time,
      phone: form.phone,
      address: form.address,
      paymentMethod: form.paymentMethod,
      paymentStatus: form.paymentMethod === "Cash on Service" ? "Pending" : "Paid",
      bookingStatus: "Confirmed",
      professionalName: "Ramesh Kumar",
      professionalPhoto,
      estimatedArrival: "12 minutes"
    };
    setSubmitting(true);
    setSubmitError("");

    try {
      const savedBooking = await onConfirm(booking);
      setSuccessBooking(savedBooking || booking);
    } catch (error) {
      setSubmitError(error.message || "Booking could not be confirmed");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelConfirmedBooking = () => {
    if (!successBooking || successBooking.bookingStatus === "Cancelled") return;
    const cancelledBooking = {
      ...successBooking,
      bookingStatus: "Cancelled",
      estimatedArrival: "Cancelled"
    };
    setSuccessBooking(cancelledBooking);
    onCancel(successBooking);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="booking-modal">
        <div className="modal-head">
          <div>
            <h2>{successBooking ? "Booking Confirmed" : "Book a Service"}</h2>
            <p>{successBooking ? "Your FunService professional is being tracked live." : "Fast service in under 30 minutes."}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close booking form">
            <X size={20} />
          </button>
        </div>

        {successBooking ? (
          <div className="success-panel">
            <CheckCircle2 size={58} />
            <h3>Success! Your booking ID is {successBooking.bookingId}</h3>
            <p>
              {successBooking.professionalName} has been assigned for {successBooking.serviceName}.
              Arrival estimate: {successBooking.estimatedArrival}.
            </p>
            <div className="success-actions">
              <button className="btn btn-primary" onClick={() => onTrack(successBooking)}>
                Track Booking
              </button>
              {successBooking.bookingStatus !== "Cancelled" && (
                <button className="btn btn-danger" onClick={cancelConfirmedBooking}>
                  <XCircle size={17} /> Cancel Service
                </button>
              )}
              <button className="btn btn-soft" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form className="booking-form" onSubmit={confirmBooking}>
            <label>
              Select Service
              <select name="serviceId" value={form.serviceId} onChange={update} required>
                {services.map((item) => (
                  <option value={item.id || item._id} key={item.id || item._id}>
                    {item.title} - ₹{item.price}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid">
              <label>
                Select Date
                <input type="date" name="date" value={form.date} onChange={update} required />
              </label>
              <label>
                Select Time
                <input type="time" name="time" value={form.time} onChange={update} required />
              </label>
            </div>

            <label>
              Address
              <textarea
                name="address"
                value={form.address}
                onChange={update}
                placeholder="House no, street, city"
                rows="3"
                required
              />
            </label>

            <label>
              Phone Number
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={update}
                placeholder="+91 98765 43210"
                required
              />
            </label>

            <div className="payment-block">
              <div className="section-heading inline">
                <div>
                  <h3>Payment Method</h3>
                  <p>Choose a secure payment option.</p>
                </div>
                <span className="secure-badge">
                  <BadgeCheck size={16} /> 100% Safe & Secure Payments
                </span>
              </div>

              <div className="gateway-card">
                <CreditCard size={28} />
                <span>FunService Secure Gateway</span>
                <small>UPI, cards, net banking, wallet, and cash supported</small>
              </div>

              <div className="payment-options">
                {paymentMethods.map(({ label, icon: Icon }) => (
                  <label className="payment-option" key={label}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={label}
                      checked={form.paymentMethod === label}
                      onChange={update}
                    />
                    <Icon size={18} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="booking-total">
              <span>
                <CalendarDays size={18} /> Duration: {selectedService.duration}
              </span>
              <strong>Payable: ₹{selectedService.price}</strong>
            </div>

            {submitError && <p className="form-error">{submitError}</p>}

            <button className="btn btn-primary full" type="submit" disabled={submitting}>
              {submitting ? "Confirming" : "Confirm Booking"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export default BookingModal;
