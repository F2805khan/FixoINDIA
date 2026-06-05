const API_URL = import.meta.env.VITE_API_URL || "/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
const TOKEN_KEY = "quickfix_token";
const USER_KEY = "quickfix_user";

const bookingPath = (id) => `/bookings/${encodeURIComponent(id)}`;
const paymentPath = (bookingId) => `/payment/${encodeURIComponent(bookingId)}`;
const supportMessagesPath = (userId) => `/support/messages/${encodeURIComponent(userId)}`;
const adminBookingPath = (id) => `/admin/bookings/${encodeURIComponent(id)}`;
const adminServicePath = (id) => `/admin/services/${encodeURIComponent(id)}`;
const adminSupportPath = (id) => `/admin/support/${encodeURIComponent(id)}/reply`;
const adminUserPasswordPath = (id) => `/admin/users/${encodeURIComponent(id)}/password`;

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const optionHeaders = options.headers || {};
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...optionHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

const readSavedUser = () => {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveSession = ({ token, user }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("quickfix:session-changed"));
};

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("quickfix:session-changed"));
};

const notifyServicesChanged = () => {
  localStorage.setItem("funservice-services-changed-at", new Date().toISOString());
  window.dispatchEvent(new Event("funservice:services-changed"));
};

export const api = {
  hasToken: () => Boolean(localStorage.getItem(TOKEN_KEY)),
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getSavedUser: readSavedUser,
  saveSession,
  clearSession,
  isAdmin: () => readSavedUser()?.role === "admin" || readSavedUser()?.role === "owner",
  isOwner: () => readSavedUser()?.role === "owner",
  health: () =>
    fetch(`${API_ORIGIN}/api/health`).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Health check failed");
      return data;
    }),
  register: (payload) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getProfile: () => request("/auth/profile"),
  updateProfile: (payload) =>
    request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  updatePassword: (payload) =>
    request("/auth/password", { method: "PUT", body: JSON.stringify(payload) }),
  requestOtp: (payload) =>
    request("/auth/request-otp", { method: "POST", body: JSON.stringify(payload) }),
  verifyOtp: (payload) =>
    request("/auth/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  resetPassword: (payload) =>
    request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  googleLogin: (payload) =>
    request("/auth/google", { method: "POST", body: JSON.stringify(payload) }),
  getServices: (query = "") => request(`/services${query}`),
  getServiceCategories: () => request("/services/categories"),
  getServiceById: (id) => request(`/services/${encodeURIComponent(id)}`),
  getAdminOverview: () => request("/admin/overview"),
  getAdminServices: () => request("/admin/services?includeDisabled=true"),
  createService: (payload) =>
    request("/admin/services", { method: "POST", body: JSON.stringify(payload) }).then((service) => {
      notifyServicesChanged();
      return service;
    }),
  updateService: (id, payload) =>
    request(adminServicePath(id), { method: "PUT", body: JSON.stringify(payload) }).then((service) => {
      notifyServicesChanged();
      return service;
    }),
  deleteService: (id) => request(adminServicePath(id), { method: "DELETE" }).then((response) => {
    notifyServicesChanged();
    return response;
  }),
  createBooking: (payload) =>
    request("/bookings", { method: "POST", body: JSON.stringify(payload) }),
  getMyBookings: () => request("/bookings/me"),
  getUserBookings: (userId) => request(`/bookings/user/${encodeURIComponent(userId)}`),
  getBookingById: (id) => request(bookingPath(id)),
  updateBookingStatus: (id, payload) =>
    request(`${bookingPath(id)}/status`, { method: "PUT", body: JSON.stringify(payload) }),
  cancelBooking: (id) => request(`${bookingPath(id)}/cancel`, { method: "PUT" }),
  deleteBooking: (id) => request(bookingPath(id), { method: "DELETE" }),
  createPaymentOrder: (payload) =>
    request("/payment/create-order", { method: "POST", body: JSON.stringify(payload) }),
  getPaymentMethods: () => request("/payment/methods"),
  verifyPayment: (payload) =>
    request("/payment/verify", { method: "POST", body: JSON.stringify(payload) }),
  getPaymentByBookingId: (bookingId) => request(paymentPath(bookingId)),
  getAdminBookings: () => request("/admin/bookings"),
  updateAdminBookingStatus: (id, payload) =>
    request(`${adminBookingPath(id)}/status`, { method: "PUT", body: JSON.stringify(payload) }),
  assignProfessional: (id, payload) =>
    request(`${adminBookingPath(id)}/assign`, { method: "PUT", body: JSON.stringify(payload) }),
  cancelAdminBooking: (id) =>
    request(`${adminBookingPath(id)}/cancel`, { method: "PUT" }),
  getAdminUsers: () => request("/admin/users"),
  resetUserPassword: (id, payload) =>
    request(adminUserPasswordPath(id), { method: "PUT", body: JSON.stringify(payload) }),
  getAdminPayments: () => request("/admin/payments"),
  getAdminPaymentMethods: () => request("/admin/payment-methods"),
  updateAdminPaymentMethods: (methods) =>
    request("/admin/payment-methods", { method: "PUT", body: JSON.stringify({ methods }) }),
  getAdminSupport: () => request("/admin/support"),
  replyToSupportMessage: (id, payload) =>
    request(adminSupportPath(id), { method: "PUT", body: JSON.stringify(payload) }),
  createSupportMessage: (payload) =>
    request("/support/message", { method: "POST", body: JSON.stringify(payload) }),
  getSupportMessagesByUser: (userId) => request(supportMessagesPath(userId)),
  reverseGeocode: (latitude, longitude) =>
    request(`/location/reverse?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`),
  sendReviewConfirmation: (payload) =>
    request("/reviews/confirmation", { method: "POST", body: JSON.stringify(payload) }),
  generateImage: (payload) =>
    request("/images/generate", { method: "POST", body: JSON.stringify(payload) })
};
