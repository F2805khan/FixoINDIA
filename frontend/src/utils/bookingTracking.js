export const TRACKING_STEPS = [
  {
    key: "Confirmed",
    label: "Booking confirmed",
    hint: "Slot reserved and payment recorded."
  },
  {
    key: "Professional Assigned",
    label: "Professional assigned",
    hint: "Verified expert matched to your visit."
  },
  {
    key: "On The Way",
    label: "On the way",
    hint: "Your professional is heading to you."
  },
  {
    key: "Service In Progress",
    label: "Service in progress",
    hint: "Work has started at your address."
  },
  {
    key: "Completed",
    label: "Completed",
    hint: "Service finished. Rate your experience."
  }
];

export const LIVE_SIMULATION_STEPS = ["Confirmed", "Professional Assigned", "On The Way"];

export const normalizeBookingStatus = (status = "Confirmed") => {
  if (status === "Booking Confirmed") return "Confirmed";
  return status || "Confirmed";
};

export const getStepIndex = (status) => {
  const normalized = normalizeBookingStatus(status);
  const index = TRACKING_STEPS.findIndex((step) => step.key === normalized);
  return index >= 0 ? index : 0;
};

export const getProgressPercent = (status) => {
  const index = getStepIndex(status);
  return Math.round(((index + 1) / TRACKING_STEPS.length) * 100);
};

export const isActiveBookingStatus = (status) =>
  !["Completed", "Cancelled"].includes(normalizeBookingStatus(status));

export const getStatusClass = (status = "Confirmed") =>
  normalizeBookingStatus(status).toLowerCase().replace(/\s+/g, "-");

export const formatBookingDateTime = (booking) => {
  if (booking?.date && booking?.time) return `${booking.date} at ${booking.time}`;
  return booking?.dateTime || booking?.date || booking?.time || "Scheduled soon";
};

export const formatBookingAmount = (amount) =>
  typeof amount === "number" ? `₹${amount}` : amount || "Pending";
