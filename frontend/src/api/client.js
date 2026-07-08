const API_URL = import.meta.env.VITE_API_URL || "/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");
const TOKEN_KEY = "funservice_token";
const USER_KEY = "funservice_user";
const legacyBrandPrefix = ["quick", "fix"].join("");
const LEGACY_TOKEN_KEY = `${legacyBrandPrefix}_token`;
const LEGACY_USER_KEY = `${legacyBrandPrefix}_user`;
const SESSION_CHANGED_EVENT = "funservice:session-changed";
const PROFILE_UPDATED_EVENT = "funservice:profile-updated";

const bookingPath = (id) => `/bookings/${encodeURIComponent(id)}`;
const paymentPath = (bookingId) => `/payment/${encodeURIComponent(bookingId)}`;
const supportMessagesPath = (userId) => `/support/messages/${encodeURIComponent(userId)}`;
const adminBookingPath = (id) => `/admin/bookings/${encodeURIComponent(id)}`;
const adminCouponPath = (id) => `/admin/coupons/${encodeURIComponent(id)}`;
const adminServicePath = (id) => `/admin/services/${encodeURIComponent(id)}`;
const adminBeautyArtistPath = (id) => `/admin/beauty-artists/${encodeURIComponent(id)}`;
const adminSupportPath = (id) => `/admin/support/${encodeURIComponent(id)}/reply`;
const adminUserPasswordPath = (id) => `/admin/users/${encodeURIComponent(id)}/password`;

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
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
    const saved = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveSession = ({ token, user }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
};

const updateSavedUser = (partial = {}) => {
  const current = readSavedUser();
  if (!current) return null;
  const next = { ...current, ...partial };
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: next }));
  return next;
};

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
};

const notifyServicesChanged = () => {
  localStorage.setItem("funservice-services-changed-at", new Date().toISOString());
  window.dispatchEvent(new Event("funservice:services-changed"));
};

const notifyBeautyChanged = () => {
  localStorage.setItem("funservice-beauty-changed-at", new Date().toISOString());
  window.dispatchEvent(new Event("funservice:beauty-changed"));
};

export const api = {
  hasToken: () => Boolean(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)),
  getToken: () => localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY),
  getSavedUser: readSavedUser,
  saveSession,
  updateSavedUser,
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
  getAdminBeautyArtists: () => request("/admin/beauty-artists?includeDisabled=true"),
  createBeautyArtist: (payload) =>
    request("/admin/beauty-artists", { method: "POST", body: JSON.stringify(payload) }).then((artist) => {
      notifyBeautyChanged();
      return artist;
    }),
  updateBeautyArtist: (id, payload) =>
    request(adminBeautyArtistPath(id), { method: "PUT", body: JSON.stringify(payload) }).then((artist) => {
      notifyBeautyChanged();
      return artist;
    }),
  deleteBeautyArtist: (id) => request(adminBeautyArtistPath(id), { method: "DELETE" }).then((response) => {
    notifyBeautyChanged();
    return response;
  }),
  createBooking: (payload) =>
    request("/bookings", { method: "POST", body: JSON.stringify(payload) }),
  applyCoupon: (payload) =>
    request("/coupons/apply", { method: "POST", body: JSON.stringify(payload) }),
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
  getAdminCoupons: () => request("/admin/coupons"),
  createAdminCoupon: (payload) =>
    request("/admin/coupons", { method: "POST", body: JSON.stringify(payload) }),
  updateAdminCoupon: (id, payload) =>
    request(adminCouponPath(id), { method: "PUT", body: JSON.stringify(payload) }),
  deleteAdminCoupon: (id) => request(adminCouponPath(id), { method: "DELETE" }),
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
