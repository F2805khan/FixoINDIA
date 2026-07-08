import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "../utils/notifications.js";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  CreditCard,
  Edit3,
  Film,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Send,
  ShieldCheck,
  Share2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserRound,
  Users,
  Wrench,
  Search,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  Mail,
  UserCheck,
  KeyRound,
  Reply,
  Scissors,
  Sparkles,
  Star,
  Tag,
  Upload,
  Video
} from "lucide-react";
import { api } from "../api/client.js";
import { categories } from "../data/services.js";

const blankService = {
  title: "",
  category: "More Services",
  price: "",
  duration: "30 Min",
  image: "/images/site/home-care.jpg",
  description: "",
  region: "All Regions",
  enabled: true
};

const blankBeautyArtist = {
  name: "",
  specialty: "Beauty Artist",
  salonName: "",
  region: "All Regions",
  phone: "",
  email: "",
  image: "/images/site/expert-riya.jpg",
  bio: "",
  rating: "4.8",
  enabled: true,
  services: [],
  videoTitle: "",
  videoUrl: "",
  videoThumbnail: ""
};

const blankBeautyService = {
  title: "",
  price: "",
  duration: "60 mins",
  image: "/images/site/beauty-salon.jpg",
  description: "",
  enabled: true
};

const blankBeautyVideo = {
  artistId: "",
  videoTitle: "",
  videoUrl: "",
  videoThumbnail: ""
};

const blankCoupon = {
  code: "",
  discountType: "flat",
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "1",
  expiresAt: "",
  isActive: true
};

const regions = ["All Regions", "Bengaluru", "Delhi NCR", "Mumbai", "Hyderabad", "Pune", "Chennai"];

const emptyOverview = {
  totals: {
    services: 0,
    users: 0,
    orders: 0,
    ordersToday: 0,
    activeOrders: 0,
    activeUsers: 0,
    revenueToday: 0
  },
  daily: [],
  statusCounts: {},
  recentBookings: [],
  recentUsers: []
};

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const getStatusClass = (status = "Confirmed") => status.toLowerCase().replace(/\s+/g, "-");

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCouponDiscount = (coupon) => {
  if (coupon.discountType === "percentage") {
    return `${Number(coupon.discountValue) || 0}%`;
  }
  return formatMoney(coupon.discountValue);
};

const formatCouponUsage = (coupon) => {
  const used = Number(coupon.usedCount) || 0;
  const limit = coupon.usageLimit;
  if (limit === null || limit === undefined || limit === "") {
    return `${used} / Unlimited`;
  }
  return `${used} / ${limit}`;
};

const getBookingKey = (booking) => String(booking?._id || booking?.bookingId || "");

const getBeautyArtistId = (artist) => String(artist?._id || artist?.id || "");

const getBeautyServices = (artist) => (Array.isArray(artist?.services) ? artist.services : []);

const getBookingCustomer = (booking) => {
  if (booking?.customerProfile) return booking.customerProfile;
  if (booking?.customer) return booking.customer;
  return typeof booking?.userId === "object" && booking.userId ? booking.userId : {};
};

const getBookingCoordinates = (booking) => {
  const customer = getBookingCustomer(booking);
  const latitude = booking?.latitude ?? customer?.latitude;
  const longitude = booking?.longitude ?? customer?.longitude;

  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  const latitudeText = String(latitude).trim();
  const longitudeText = String(longitude).trim();

  return latitudeText && longitudeText ? { latitude: latitudeText, longitude: longitudeText } : null;
};

const getBookingLocation = (booking) => {
  const customer = getBookingCustomer(booking);
  return [booking?.address || customer?.address, customer?.city].filter(Boolean).join(", ") || "Address not saved";
};

const buildAgentBookingMessage = (booking) => {
  const customer = getBookingCustomer(booking);
  const coordinates = getBookingCoordinates(booking);
  const mapsLink = coordinates
    ? `Map: https://www.google.com/maps?q=${encodeURIComponent(`${coordinates.latitude},${coordinates.longitude}`)}`
    : "";

  return [
    "fixOindia booking for agent",
    `Booking ID: ${booking.bookingId || "Not assigned"}`,
    `Customer: ${booking.customerName || customer.name || "Customer"}`,
    `Mobile: ${booking.phone || customer.phone || "Phone not saved"}`,
    `Service: ${booking.serviceName || "Service not saved"}`,
    booking.salonName ? `Salon: ${booking.salonName}` : "",
    `Location: ${getBookingLocation(booking)}`,
    mapsLink,
    `Payment: ${booking.paymentMethod || "Not selected"} (${booking.paymentStatus || "Pending"})`,
    `Amount: ${formatMoney(booking.amount)}`,
    `Date of service: ${booking.date || "Date not saved"}`,
    `Time slot: ${booking.time || "Time not saved"}`,
    `Status: ${booking.bookingStatus || "Confirmed"}`,
    `Agent contact: ${booking.professionalPhone || "99988877766"}`
  ].filter(Boolean).join("\n");
};

function AdminDashboard({ currentUser, services, onServiceAdded, onServiceUpdated, onServiceDeleted, onServicesSynced }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [form, setForm] = useState(blankService);
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [regionFilter, setRegionFilter] = useState("All Regions");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [overview, setOverview] = useState(emptyOverview);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState(blankCoupon);
  const [couponSaving, setCouponSaving] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState(null);
  
  // Custom states for complete lists
  const [bookingsList, setBookingsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [supportList, setSupportList] = useState([]);
  
  // Accordion & Search states
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [userSearch, setUserSearch] = useState("");
  const [supportSearch, setSupportSearch] = useState("");
  
  // Status and Assign Form state inside expandables
  const [assignForm, setAssignForm] = useState({ professionalName: "", professionalPhone: "99988877766", estimatedArrival: "", professionalPhoto: "" });
  const [assigningId, setAssigningId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [supportReplies, setSupportReplies] = useState({});
  const [beautyArtists, setBeautyArtists] = useState([]);
  const [beautyArtistForm, setBeautyArtistForm] = useState(blankBeautyArtist);
  const [beautyServiceForm, setBeautyServiceForm] = useState(blankBeautyService);
  const [beautyVideoForm, setBeautyVideoForm] = useState(blankBeautyVideo);
  const [showBeautyArtistForm, setShowBeautyArtistForm] = useState(false);
  const [editingBeautyArtistId, setEditingBeautyArtistId] = useState(null);
  const [beautyServiceArtistId, setBeautyServiceArtistId] = useState("");
  const [beautySearch, setBeautySearch] = useState("");
  const [beautySaving, setBeautySaving] = useState(false);
  const [beautyDeletingId, setBeautyDeletingId] = useState(null);
  const [beautyUpdatingId, setBeautyUpdatingId] = useState(null);

  const daily = overview.daily?.length ? overview.daily : emptyOverview.daily;
  const totals = overview.totals || emptyOverview.totals;
  const managedServices = services.map((service) => ({
    enabled: service.enabled !== false,
    region: service.region || "All Regions",
    ...service
  }));
  const visibleServices = managedServices.filter((service) => regionFilter === "All Regions" || service.region === "All Regions" || service.region === regionFilter);
  const activeServiceCount = managedServices.filter((service) => service.enabled !== false).length;
  const activeBeautyArtistCount = beautyArtists.filter((artist) => artist.enabled !== false).length;
  const beautyServiceCount = beautyArtists.reduce((total, artist) => total + getBeautyServices(artist).length, 0);
  const beautyVideoCount = beautyArtists.filter((artist) => artist.videoUrl).length;

  const maxChartValue = useMemo(() => {
    const values = daily.flatMap((day) => [day.orders || 0, day.activeUsers || 0]);
    return Math.max(1, ...values);
  }, [daily]);

  // Badge notification counts
  const pendingBookingsCount = useMemo(() => {
    return bookingsList.filter((b) => b.bookingStatus === "Confirmed").length;
  }, [bookingsList]);

  const openSupportCount = useMemo(() => {
    return supportList.filter((s) => s.status === "Open" || s.status === "Pending").length;
  }, [supportList]);

  const filteredBeautyArtists = useMemo(() => {
    const query = beautySearch.trim().toLowerCase();
    if (!query) return beautyArtists;

    return beautyArtists.filter((artist) => {
      const serviceTitles = getBeautyServices(artist).map((service) => service.title).join(" ");
      const haystack = [
        artist.name,
        artist.specialty,
        artist.salonName,
        artist.region,
        serviceTitles
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });
  }, [beautyArtists, beautySearch]);

  const stats = [
    {
      label: "Orders Today",
      value: totals.ordersToday,
      subValue: formatMoney(totals.revenueToday),
      icon: ClipboardList
    },
    {
      label: "Active Users",
      value: totals.activeUsers,
      subValue: `${usersList.length} total users`,
      icon: Users
    },
    {
      label: "Active Orders",
      value: totals.activeOrders,
      subValue: `${bookingsList.length} total orders`,
      icon: Activity
    },
    {
      label: "Services",
      value: managedServices.length,
      subValue: `${activeServiceCount} active`,
      icon: Wrench
    }
  ];

  const mlProgram = useMemo(() => {
    const recentOrderCount = bookingsList.slice(0, 10).length || 0;
    const demandScore = Math.min(99, Math.round((totals.activeUsers || 0) * 9 + recentOrderCount * 6 + activeServiceCount * 2));
    const topCategory = managedServices.reduce((acc, service) => {
      acc[service.category] = (acc[service.category] || 0) + 1;
      return acc;
    }, {});
    const recommendedCategory = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || "Cleaning";
    return {
      demandScore,
      recommendedCategory,
      regionFocus: regionFilter,
      action: demandScore > 70 ? "Add more professionals in high-demand regions." : "Promote active services and collect more booking signals."
    };
  }, [activeServiceCount, managedServices, bookingsList, regionFilter, totals.activeUsers]);

  const loadOverview = async () => {
    const nextOverview = await api.getAdminOverview();
    setOverview({
      ...emptyOverview,
      ...nextOverview,
      totals: { ...emptyOverview.totals, ...(nextOverview.totals || {}) }
    });
  };

  const refreshServices = async () => {
    const backendServices = await api.getAdminServices();
    onServicesSynced?.(backendServices);
  };

  const loadPaymentMethods = async () => {
    setPaymentMethods(await api.getAdminPaymentMethods());
  };

  const loadCoupons = async () => {
    setCoupons(await api.getAdminCoupons());
  };

  const loadBookingsList = async () => {
    try {
      const data = await api.getAdminBookings();
      setBookingsList(data || []);
    } catch (err) {
      console.error("Failed to load admin bookings list:", err);
    }
  };

  const loadUsersList = async () => {
    try {
      const data = await api.getAdminUsers();
      setUsersList(data || []);
    } catch (err) {
      console.error("Failed to load admin users list:", err);
    }
  };

  const loadSupportList = async () => {
    try {
      const data = await api.getAdminSupport();
      setSupportList(data || []);
    } catch (err) {
      console.error("Failed to load admin support inbox:", err);
    }
  };

  const loadBeautyArtists = async () => {
    try {
      const data = await api.getAdminBeautyArtists();
      setBeautyArtists(data || []);
    } catch (err) {
      console.error("Failed to load beauty artists:", err);
    }
  };

  const refreshDashboard = async ({ quiet = false } = {}) => {
    if (!quiet) setRefreshing(true);
    try {
      await Promise.all([
        loadOverview(),
        refreshServices(),
        loadPaymentMethods(),
        loadCoupons(),
        loadBookingsList(),
        loadUsersList(),
        loadSupportList(),
        loadBeautyArtists()
      ]);
      if (!quiet) toast.success("Backend dashboard refreshed.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      if (!quiet) setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshDashboard({ quiet: true });
  }, []);

  const copyTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  };

  const copyBookingDetails = async (booking) => {
    if (!booking) return;
    try {
      await copyTextToClipboard(buildAgentBookingMessage(booking));
      toast.success("Booking details copied for agent.");
    } catch {
      toast.error("Could not copy booking details.");
    }
  };

  const shareBookingDetails = async (booking) => {
    if (!booking) return;
    const text = buildAgentBookingMessage(booking);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FunService ${booking.bookingId || "booking"}`,
          text
        });
        toast.success("Booking details shared.");
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    try {
      await copyTextToClipboard(text);
      toast.success("Sharing unavailable, details copied.");
    } catch {
      toast.error("Could not share booking details.");
    }
  };

  const updateForm = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const resetForm = () => {
    setForm(blankService);
    setShowForm(false);
    setEditingServiceId(null);
  };

  const startEditService = (service) => {
    setForm({
      ...blankService,
      ...service,
      price: service.price ?? "",
      region: service.region || "All Regions",
      enabled: service.enabled !== false
    });
    setEditingServiceId(service._id || service.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitService = async (event) => {
    event.preventDefault();
    const price = Number(form.price);
    const payload = {
      ...form,
      title: form.title.trim(),
      id: slugify(form.title),
      price,
      description: form.description.trim(),
      region: form.region || "All Regions",
      enabled: form.enabled !== false
    };

    if (
      !payload.title ||
      !payload.category ||
      Number.isNaN(price) ||
      price < 0 ||
      !payload.description
    ) {
      toast.error("Service name, category, price, and description are required.");
      return;
    }

    setSaving(true);
    try {
      if (editingServiceId) {
        if (!form._id) {
          toast.error("This service is not in SQL yet. Add it first from the admin form.");
          return;
        }
        const savedService = await api.updateService(form._id, payload);
        await loadOverview();
        onServiceUpdated?.(savedService);
        toast.success("Service updated in SQL.");
      } else {
        const savedService = await api.createService(payload);
        onServiceAdded(savedService);
        await loadOverview();
        toast.success("Service added to SQL.");
      }
      resetForm();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleServiceStatus = async (service) => {
    const id = service._id || service.id;
    if (!service._id) {
      toast.error("This service is not in SQL yet. Add it first from the admin form.");
      return;
    }
    const enabled = service.enabled === false;
    setTogglingId(id);
    try {
      const savedService = await api.updateService(service._id, { enabled });
      onServiceUpdated?.(savedService);
      toast.success(`${service.title} ${enabled ? "enabled" : "disabled"} in SQL.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTogglingId(null);
    }
  };

  const deleteService = async (service) => {
    const id = service._id || service.id;
    if (!service._id) {
      toast.error("Only SQL services can be deleted from admin.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${service.title}?`)) return;
    setDeletingId(id);

    try {
      await api.deleteService(service._id);
      await loadOverview();
      onServiceDeleted(service);
      toast.success("Service deleted from SQL.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const togglePaymentMethod = async (paymentMethod) => {
    setUpdatingPaymentMethod(paymentMethod.method);
    try {
      const methods = await api.updateAdminPaymentMethods([
        { method: paymentMethod.method, enabled: !paymentMethod.enabled }
      ]);
      setPaymentMethods(methods);
      toast.success(`${paymentMethod.method} ${paymentMethod.enabled ? "disabled" : "enabled"}.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingPaymentMethod(null);
    }
  };

  const updateCouponForm = (event) => {
    const { name, type, checked, value } = event.target;
    setCouponForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const resetCouponForm = () => setCouponForm(blankCoupon);

  const getCouponId = (coupon) => coupon?._id || coupon?.id;

  const submitCoupon = async (event) => {
    event.preventDefault();
    setCouponSaving(true);
    try {
      await api.createAdminCoupon({
        ...couponForm,
        code: couponForm.code.trim(),
        discountValue: Number(couponForm.discountValue),
        minOrderAmount: Number(couponForm.minOrderAmount) || 0,
        maxDiscount: couponForm.maxDiscount === "" ? null : Number(couponForm.maxDiscount),
        usageLimit: couponForm.usageLimit === "" ? null : Number(couponForm.usageLimit),
        expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : null
      });
      resetCouponForm();
      await loadCoupons();
      toast.success("Coupon created.");
    } catch (error) {
      toast.error(error.message || "Could not save coupon.");
    } finally {
      setCouponSaving(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    const couponId = getCouponId(coupon);
    if (!couponId) return;
    try {
      await api.updateAdminCoupon(couponId, { isActive: coupon.isActive === false });
      await loadCoupons();
      toast.success(`Coupon ${coupon.isActive === false ? "enabled" : "disabled"}.`);
    } catch (error) {
      toast.error(error.message || "Could not update coupon.");
    }
  };

  const deleteCoupon = async (coupon) => {
    const couponId = getCouponId(coupon);
    if (!couponId) return;
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;

    setDeletingCouponId(couponId);
    try {
      await api.deleteAdminCoupon(couponId);
      await loadCoupons();
      toast.success("Coupon deleted.");
    } catch (error) {
      toast.error(error.message || "Could not delete coupon.");
    } finally {
      setDeletingCouponId(null);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    setUpdatingStatusId(bookingId);
    try {
      await api.updateBookingStatus(bookingId, { bookingStatus: status });
      toast.success(`Booking status updated to ${status}.`);
      await loadBookingsList();
      await loadOverview();
    } catch (error) {
      toast.error(error.message || "Failed to update booking status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleAssignProfessional = async (bookingId) => {
    if (!assignForm.professionalName.trim()) {
      toast.error("Professional name is required.");
      return;
    }
    setAssigningId(bookingId);
    try {
      await api.assignProfessional(bookingId, {
        professionalName: assignForm.professionalName.trim(),
        professionalPhone: assignForm.professionalPhone.trim() || "99988877766",
        estimatedArrival: assignForm.estimatedArrival.trim() || "15 minutes",
        professionalPhoto: assignForm.professionalPhoto.trim() || undefined
      });
      toast.success("Professional assigned successfully.");
      setAssignForm({ professionalName: "", professionalPhone: "99988877766", estimatedArrival: "", professionalPhoto: "" });
      await loadBookingsList();
      await loadOverview();
    } catch (error) {
      toast.error(error.message || "Failed to assign professional.");
    } finally {
      setAssigningId(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.cancelAdminBooking(bookingId);
      toast.success("Booking cancelled.");
      await loadBookingsList();
      await loadOverview();
    } catch (error) {
      toast.error(error.message || "Failed to cancel booking.");
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt("Enter new password (min 6 characters):");
    if (newPassword === null) return;
    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    try {
      await api.resetUserPassword(userId, { newPassword: newPassword.trim() });
      toast.success("Password reset successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to reset password.");
    }
  };

  const handleReplySupport = async (messageId, status = "Replied") => {
    const replyText = supportReplies[messageId] || "";
    if (status === "Replied" && !replyText.trim()) {
      toast.error("Reply text is required.");
      return;
    }
    try {
      await api.replyToSupportMessage(messageId, {
        reply: replyText.trim(),
        status
      });
      toast.success(status === "Complete" ? "Ticket marked complete." : "Reply submitted successfully.");
      setSupportReplies(prev => ({ ...prev, [messageId]: "" }));
      await loadSupportList();
    } catch (error) {
      toast.error(error.message || "Failed to update support ticket.");
    }
  };

  const updateBeautyArtistForm = (event) => {
    const { name, type, checked, value } = event.target;
    setBeautyArtistForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const updateBeautyServiceForm = (event) => {
    const { name, type, checked, value } = event.target;
    setBeautyServiceForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const updateBeautyVideoForm = (event) => {
    const { name, value } = event.target;
    setBeautyVideoForm((current) => ({ ...current, [name]: value }));
  };

  const resetBeautyArtistForm = () => {
    setBeautyArtistForm(blankBeautyArtist);
    setEditingBeautyArtistId(null);
    setShowBeautyArtistForm(false);
  };

  const openNewBeautyArtistForm = () => {
    setBeautyArtistForm(blankBeautyArtist);
    setEditingBeautyArtistId(null);
    setShowBeautyArtistForm(true);
  };

  const mergeBeautyArtist = (savedArtist) => {
    setBeautyArtists((current) => {
      const savedId = getBeautyArtistId(savedArtist);
      const exists = current.some((artist) => getBeautyArtistId(artist) === savedId);
      return exists
        ? current.map((artist) => (getBeautyArtistId(artist) === savedId ? savedArtist : artist))
        : [savedArtist, ...current];
    });
  };

  const startEditBeautyArtist = (artist) => {
    setBeautyArtistForm({
      ...blankBeautyArtist,
      ...artist,
      services: getBeautyServices(artist),
      rating: artist.rating ?? "4.8",
      enabled: artist.enabled !== false
    });
    setEditingBeautyArtistId(getBeautyArtistId(artist));
    setShowBeautyArtistForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitBeautyArtist = async (event) => {
    event.preventDefault();
    const rating = Number(beautyArtistForm.rating);
    const payload = {
      ...beautyArtistForm,
      name: String(beautyArtistForm.name || "").trim(),
      specialty: String(beautyArtistForm.specialty || "").trim() || "Beauty Artist",
      salonName: String(beautyArtistForm.salonName || "").trim(),
      region: beautyArtistForm.region || "All Regions",
      phone: String(beautyArtistForm.phone || "").trim(),
      email: String(beautyArtistForm.email || "").trim(),
      image: String(beautyArtistForm.image || "").trim() || "/images/site/expert-riya.jpg",
      bio: String(beautyArtistForm.bio || "").trim(),
      rating,
      enabled: beautyArtistForm.enabled !== false,
      services: getBeautyServices(beautyArtistForm)
    };

    if (!payload.name || !Number.isFinite(rating)) {
      toast.error("Artist name and rating are required.");
      return;
    }

    setBeautySaving(true);
    try {
      const savedArtist = editingBeautyArtistId
        ? await api.updateBeautyArtist(editingBeautyArtistId, payload)
        : await api.createBeautyArtist(payload);
      mergeBeautyArtist(savedArtist);
      if (!beautyServiceArtistId) setBeautyServiceArtistId(getBeautyArtistId(savedArtist));
      toast.success(editingBeautyArtistId ? "Beauty artist updated." : "Beauty artist added.");
      resetBeautyArtistForm();
    } catch (error) {
      toast.error(error.message || "Failed to save beauty artist.");
    } finally {
      setBeautySaving(false);
    }
  };

  const toggleBeautyArtistStatus = async (artist) => {
    const artistId = getBeautyArtistId(artist);
    setBeautyUpdatingId(artistId);
    try {
      const savedArtist = await api.updateBeautyArtist(artistId, { enabled: artist.enabled === false });
      mergeBeautyArtist(savedArtist);
      toast.success(`${artist.name} ${savedArtist.enabled ? "enabled" : "disabled"}.`);
    } catch (error) {
      toast.error(error.message || "Failed to update beauty artist.");
    } finally {
      setBeautyUpdatingId(null);
    }
  };

  const deleteBeautyArtist = async (artist) => {
    const artistId = getBeautyArtistId(artist);
    if (!window.confirm(`Are you sure you want to delete ${artist.name}?`)) return;
    setBeautyDeletingId(artistId);
    try {
      await api.deleteBeautyArtist(artistId);
      setBeautyArtists((current) => current.filter((item) => getBeautyArtistId(item) !== artistId));
      if (beautyServiceArtistId === artistId) setBeautyServiceArtistId("");
      if (beautyVideoForm.artistId === artistId) setBeautyVideoForm(blankBeautyVideo);
      toast.success("Beauty artist deleted.");
    } catch (error) {
      toast.error(error.message || "Failed to delete beauty artist.");
    } finally {
      setBeautyDeletingId(null);
    }
  };

  const submitBeautyService = async (event) => {
    event.preventDefault();
    const artist = beautyArtists.find((item) => getBeautyArtistId(item) === beautyServiceArtistId);
    const price = Number(beautyServiceForm.price);

    if (!artist) {
      toast.error("Choose a beauty artist first.");
      return;
    }

    if (!String(beautyServiceForm.title || "").trim() || !Number.isFinite(price) || price < 0) {
      toast.error("Beauty service name and price are required.");
      return;
    }

    const service = {
      id: `${slugify(beautyServiceForm.title)}-${Date.now().toString(36)}`,
      title: String(beautyServiceForm.title || "").trim(),
      description: String(beautyServiceForm.description || "").trim(),
      price,
      duration: String(beautyServiceForm.duration || "").trim() || "60 mins",
      image: String(beautyServiceForm.image || "").trim() || "/images/site/beauty-salon.jpg",
      enabled: beautyServiceForm.enabled !== false
    };

    setBeautySaving(true);
    try {
      const savedArtist = await api.updateBeautyArtist(getBeautyArtistId(artist), {
        services: [...getBeautyServices(artist), service]
      });
      mergeBeautyArtist(savedArtist);
      setBeautyServiceForm(blankBeautyService);
      toast.success("Beauty service added to artist.");
    } catch (error) {
      toast.error(error.message || "Failed to add beauty service.");
    } finally {
      setBeautySaving(false);
    }
  };

  const updateBeautyServiceList = async (artist, services, successMessage) => {
    const artistId = getBeautyArtistId(artist);
    setBeautyUpdatingId(artistId);
    try {
      const savedArtist = await api.updateBeautyArtist(artistId, { services });
      mergeBeautyArtist(savedArtist);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error.message || "Failed to update beauty services.");
    } finally {
      setBeautyUpdatingId(null);
    }
  };

  const toggleBeautyServiceStatus = (artist, serviceKey) => {
    const nextServices = getBeautyServices(artist).map((service, index) => {
      const key = service.id || String(index);
      return key === serviceKey ? { ...service, enabled: service.enabled === false } : service;
    });
    updateBeautyServiceList(artist, nextServices, "Beauty service status updated.");
  };

  const deleteBeautyService = (artist, serviceKey) => {
    const nextServices = getBeautyServices(artist).filter((service, index) => (service.id || String(index)) !== serviceKey);
    updateBeautyServiceList(artist, nextServices, "Beauty service removed.");
  };

  const loadBeautyVideoForm = (artist) => {
    setBeautyVideoForm({
      artistId: getBeautyArtistId(artist),
      videoTitle: artist.videoTitle || "",
      videoUrl: artist.videoUrl || "",
      videoThumbnail: artist.videoThumbnail || ""
    });
  };

  const submitBeautyVideo = async (event) => {
    event.preventDefault();
    const artist = beautyArtists.find((item) => getBeautyArtistId(item) === beautyVideoForm.artistId);

    if (!artist) {
      toast.error("Choose a beauty artist first.");
      return;
    }

    if (!String(beautyVideoForm.videoUrl || "").trim()) {
      toast.error("Artist video URL is required.");
      return;
    }

    setBeautySaving(true);
    try {
      const savedArtist = await api.updateBeautyArtist(getBeautyArtistId(artist), {
        videoTitle: String(beautyVideoForm.videoTitle || "").trim() || "Artist preview",
        videoUrl: String(beautyVideoForm.videoUrl || "").trim(),
        videoThumbnail: String(beautyVideoForm.videoThumbnail || "").trim()
      });
      mergeBeautyArtist(savedArtist);
      setBeautyVideoForm({ ...blankBeautyVideo, artistId: getBeautyArtistId(savedArtist) });
      toast.success("Artist video saved.");
    } catch (error) {
      toast.error(error.message || "Failed to save artist video.");
    } finally {
      setBeautySaving(false);
    }
  };

  // Filters for Booking list
  const filteredBookings = useMemo(() => {
    return bookingsList.filter((b) => {
      const searchMatch =
        (b.bookingId || "").toLowerCase().includes(bookingSearch.toLowerCase()) ||
        (b.customerName || "").toLowerCase().includes(bookingSearch.toLowerCase()) ||
        (b.serviceName || "").toLowerCase().includes(bookingSearch.toLowerCase());
      const statusMatch = bookingStatusFilter === "All" || b.bookingStatus === bookingStatusFilter;
      return searchMatch && statusMatch;
    });
  }, [bookingsList, bookingSearch, bookingStatusFilter]);

  // Filters for User list
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      return (
        (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.phone || "").toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.userId || "").toLowerCase().includes(userSearch.toLowerCase())
      );
    });
  }, [usersList, userSearch]);

  // Filters for Support list
  const filteredSupport = useMemo(() => {
    return supportList.filter((s) => {
      return (
        (s.name || "").toLowerCase().includes(supportSearch.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(supportSearch.toLowerCase()) ||
        (s.message || "").toLowerCase().includes(supportSearch.toLowerCase()) ||
        (s.ticketId || s._id || "").toLowerCase().includes(supportSearch.toLowerCase())
      );
    });
  }, [supportList, supportSearch]);

  // Tabs titles & descriptions
  const tabTitles = {
    overview: "Dashboard Overview",
    bookings: "Bookings Management",
    services: "Service Catalog Manager",
    beauty: "Beauty Artist Studio",
    users: "Users Directory",
    support: "Support Inbox",
    settings: "Settings"
  };

  const tabDescriptions = {
    overview: "Real-time statistics, active user analytics, and market demand forecasts.",
    bookings: "Track orders, assign service professionals, and export CSV lists to Excel.",
    services: "Create, update, toggle availability, or delete services across regions.",
    beauty: "Add beauty artists, assign beauty services, and save artist video uploads.",
    users: "Full list of user profiles, address coordinates, and account management tools.",
    support: "Read customer support queries, view ticket IDs, and send email replies.",
    settings: "Configure payment gateways and manage discount coupons for customer checkout."
  };

  // Expand toggler for booking rows
  const toggleBookingExpand = (bookingId) => {
    if (expandedBookingId === bookingId) {
      setExpandedBookingId(null);
    } else {
      setExpandedBookingId(bookingId);
      const b = bookingsList.find(item => getBookingKey(item) === bookingId);
      if (b) {
        setAssignForm({
          professionalName: b.professionalName || "",
          professionalPhone: b.professionalPhone || "99988877766",
          estimatedArrival: b.estimatedArrival || "",
          professionalPhoto: b.professionalPhoto || ""
        });
      }
    }
  };

  // Export URL
  const exportUrl = `${import.meta.env.VITE_API_URL || "/api"}/admin/bookings/export-excel?token=${api.getToken()}`;

  // Rendering Functions
  const renderOverview = () => (
    <div className="admin-overview-tab animated-fade-in">
      <div className="admin-stats">
        {stats.map(({ label, value, subValue, icon: Icon }) => (
          <div className="admin-stat backend-stat" key={label}>
            <Icon size={20} />
            <span>{label}</span>
            <strong>{value || 0}</strong>
            <small>{subValue}</small>
          </div>
        ))}
      </div>

      <div className="admin-analytics-grid">
        <section className="admin-panel admin-chart-card">
          <div className="section-heading inline">
            <div>
              <h2>Daily Status</h2>
              <p>Orders getting and active users for the last 7 days.</p>
            </div>
            <BarChart3 size={22} />
          </div>

          <div className="chart-legend" aria-hidden="true">
            <span className="legend-orders">Orders</span>
            <span className="legend-users">Active users</span>
          </div>

          {daily.length ? (
            <div className="daily-chart">
              {daily.map((day) => {
                const orderHeight = `${Math.max(8, ((day.orders || 0) / maxChartValue) * 100)}%`;
                const userHeight = `${Math.max(
                  8,
                  ((day.activeUsers || 0) / maxChartValue) * 100
                )}%`;

                return (
                  <div
                    className="chart-day"
                    key={day.date}
                    style={{ "--orders-height": orderHeight, "--users-height": userHeight }}
                    aria-label={`${day.label}: ${day.orders} orders, ${day.activeUsers} active users`}
                  >
                    <div className="chart-bars">
                      <span className="chart-bar orders" title={`${day.orders} orders`} />
                      <span className="chart-bar users" title={`${day.activeUsers} active users`} />
                    </div>
                    <strong>{day.label}</strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state compact">
              <BarChart3 size={26} />
              <strong>No graph data</strong>
              <span>Orders will appear here after bookings start.</span>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="section-heading inline">
            <div>
              <h2>Order Status</h2>
              <p>Current booking pipeline.</p>
            </div>
            <CheckCircle2 size={22} />
          </div>

          <div className="status-strip">
            {Object.keys(overview.statusCounts || {}).length ? (
              Object.entries(overview.statusCounts).map(([status, count]) => (
                <div className="status-chip" key={status}>
                  <span className={`status-badge ${getStatusClass(status)}`}>{status}</span>
                  <strong>{count}</strong>
                </div>
              ))
            ) : (
              <div className="empty-state compact">
                <ClipboardList size={24} />
                <strong>No orders</strong>
                <span>New orders will update this panel.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="admin-panel ml-program-panel">
        <div className="section-heading inline">
          <div>
            <h2>ML Program</h2>
            <p>Smart demand signals for region planning and service growth.</p>
          </div>
          <BrainCircuit size={22} />
        </div>
        <div className="ml-program-grid">
          <article>
            <span>Demand score</span>
            <strong>{mlProgram.demandScore}%</strong>
            <small>Based on active users, recent bookings, and live services.</small>
          </article>
          <article>
            <span>Recommended category</span>
            <strong>{mlProgram.recommendedCategory}</strong>
            <small>Use this signal before adding a new service.</small>
          </article>
          <article>
            <span>Region focus</span>
            <strong>{mlProgram.regionFocus}</strong>
            <small>{mlProgram.action}</small>
          </article>
        </div>
      </section>
    </div>
  );

  const renderBookings = () => (
    <div className="admin-bookings-tab animated-fade-in">
      <div className="admin-table-filters">
        <label className="search-box">
          <Search size={15} />
          <input
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
            placeholder="Search bookings by ID, customer name, service..."
          />
        </label>

        <div className="filter-select-group">
          <label>Status:</label>
          <select value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed (New)</option>
            <option value="Professional Assigned">Professional Assigned</option>
            <option value="On The Way">On The Way</option>
            <option value="Service In Progress">Service In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-datatable bookings-datatable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Date & Time</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length ? (
              filteredBookings.map((b) => {
                const bookingKey = getBookingKey(b);
                const isExpanded = expandedBookingId === bookingKey;
                const customer = getBookingCustomer(b);
                const coords = getBookingCoordinates(b);
                const mapsUrl = coords ? `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}` : null;
                const agentMessage = buildAgentBookingMessage(b);

                return (
                  <Fragment key={bookingKey}>
                    <tr
                      className={`booking-row-summary ${isExpanded ? "expanded" : ""}`}
                      onClick={() => toggleBookingExpand(bookingKey)}
                    >
                      <td className="font-mono">{b.bookingId}</td>
                      <td>
                        <strong>{b.customerName || customer.name}</strong>
                        <small className="cell-phone">{b.phone || customer.phone}</small>
                      </td>
                      <td>{b.serviceName}</td>
                      <td>{b.date} | {b.time}</td>
                      <td><strong>{formatMoney(b.amount)}</strong></td>
                      <td>
                        <span className={`status-badge ${getStatusClass(b.bookingStatus)}`}>
                          {b.bookingStatus || "Confirmed"}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-small accordion-toggle-btn">
                          {isExpanded ? "Close" : "Expand"} <ChevronDown size={14} className={isExpanded ? "rotated-180" : ""} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="booking-row-detail">
                        <td colSpan="7">
                          <div className="booking-detail-expanded animated-slide-down">
                            <div className="booking-detail-summary">
                              <div>
                                <span>Service</span>
                                <strong>{b.serviceName || "Service not saved"}</strong>
                              </div>
                              <div>
                                <span>Date of service</span>
                                <strong>{b.date || "Date not saved"}</strong>
                              </div>
                              <div>
                                <span>Time slot</span>
                                <strong>{b.time || "Time not saved"}</strong>
                              </div>
                              <div>
                                <span>Amount</span>
                                <strong>{formatMoney(b.amount)}</strong>
                              </div>
                              <div>
                                <span>Payment</span>
                                <strong>{b.paymentMethod || "Not selected"} · {b.paymentStatus || "Pending"}</strong>
                              </div>
                              <div className="booking-summary-status">
                                <span>Current status</span>
                                <span className={`status-badge ${getStatusClass(b.bookingStatus)}`}>
                                  {b.bookingStatus || "Confirmed"}
                                </span>
                              </div>
                            </div>

                            <div className="detail-section-grid simple-detail-grid">
                              <div className="detail-card">
                                <h3><UserRound size={14} /> Customer Contact</h3>
                                <div className="detail-info-list">
                                  <div>
                                    <span className="info-label">Name</span>
                                    <span className="info-value">{b.customerName || customer.name || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="info-label">Email</span>
                                    <span className="info-value">{customer.email || "Email not saved"}</span>
                                  </div>
                                  <div>
                                    <span className="info-label">Phone</span>
                                    <span className="info-value">{b.phone || customer.phone || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="info-label">Service Address</span>
                                    <span className="info-value">{getBookingLocation(b)}</span>
                                  </div>
                                  {mapsUrl && (
                                    <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn btn-soft btn-small maps-link">
                                      <MapPin size={12} /> Open Map Coordinates
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="detail-card">
                                <h3><UserCheck size={14} /> Professional Assignment</h3>
                                <div className="assign-form">
                                  <label>
                                    Booking status
                                    <select
                                      value={b.bookingStatus || "Confirmed"}
                                      onChange={(e) => handleUpdateBookingStatus(bookingKey, e.target.value)}
                                      disabled={updatingStatusId === bookingKey}
                                    >
                                      <option value="Confirmed">Confirmed</option>
                                      <option value="Professional Assigned">Professional Assigned</option>
                                      <option value="On The Way">On The Way</option>
                                      <option value="Service In Progress">Service In Progress</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Cancelled">Cancelled</option>
                                    </select>
                                  </label>
                                  <label>
                                    Name
                                    <input
                                      value={assignForm.professionalName}
                                      onChange={(e) => setAssignForm(prev => ({ ...prev, professionalName: e.target.value }))}
                                      placeholder="Professional's Name"
                                    />
                                  </label>
                                  <label>
                                    Agent mobile
                                    <input
                                      value={assignForm.professionalPhone}
                                      onChange={(e) => setAssignForm(prev => ({ ...prev, professionalPhone: e.target.value }))}
                                      placeholder="99988877766"
                                    />
                                  </label>
                                  <label>
                                    Estimated Arrival
                                    <input
                                      value={assignForm.estimatedArrival}
                                      onChange={(e) => setAssignForm(prev => ({ ...prev, estimatedArrival: e.target.value }))}
                                      placeholder="e.g. 15 minutes"
                                    />
                                  </label>
                                  <label>
                                    Photo URL (optional)
                                    <input
                                      value={assignForm.professionalPhoto}
                                      onChange={(e) => setAssignForm(prev => ({ ...prev, professionalPhoto: e.target.value }))}
                                      placeholder="https://..."
                                    />
                                  </label>
                                  <button
                                    className="btn btn-primary btn-small"
                                    type="button"
                                    onClick={() => handleAssignProfessional(bookingKey)}
                                    disabled={assigningId === bookingKey}
                                  >
                                    Assign & Update Status
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="booking-details-footer">
                              <div className="agent-message-box">
                                <span><MessageCircle size={13} /> Message Preview for Agent:</span>
                                <pre>{agentMessage}</pre>
                              </div>
                              <div className="action-buttons">
                                <button className="btn btn-soft btn-small" type="button" onClick={() => copyBookingDetails(b)}>
                                  <Copy size={13} /> Copy Details
                                </button>
                                <button className="btn btn-soft btn-small" type="button" onClick={() => shareBookingDetails(b)}>
                                  <Share2 size={13} /> Share Details
                                </button>
                                {b.bookingStatus !== "Cancelled" && b.bookingStatus !== "Completed" && (
                                  <button className="btn btn-danger btn-small" type="button" onClick={() => handleCancelBooking(bookingKey)}>
                                    Cancel Booking
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="table-empty">
                  No bookings match the search filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderServices = () => (
    <div className="admin-services-tab animated-fade-in">
      <div className="service-admin-toolbar">
        <label>
          <MapPin size={15} /> Region
          <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
            {regions.map((region) => (
              <option value={region} key={region}>{region}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-list">
        {visibleServices.map((service) => {
          const id = service._id || service.id;
          return (
            <div className={`admin-service-row ${service.enabled === false ? "disabled" : ""}`} key={id}>
              <img src={service.image} alt={service.title} />
              <div>
                <strong>{service.title}</strong>
                <span>
                  {service.category} | {formatMoney(service.price)} | {service.duration}
                </span>
                <small><MapPin size={12} /> {service.region || "All Regions"} · {service.enabled === false ? "Off" : "On"}</small>
              </div>
              <button
                className={`icon-button ${service.enabled === false ? "" : "success"}`}
                onClick={() => toggleServiceStatus(service)}
                disabled={togglingId === id}
                aria-label={`${service.enabled === false ? "Enable" : "Disable"} ${service.title}`}
                title={service.enabled === false ? "Turn service on" : "Turn service off"}
              >
                {service.enabled === false ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
              </button>
              <button
                className="icon-button"
                onClick={() => startEditService(service)}
                aria-label={`Edit ${service.title}`}
                title="Edit service"
              >
                <Edit3 size={17} />
              </button>
              <button
                className="icon-button danger"
                onClick={() => deleteService(service)}
                disabled={deletingId === id}
                aria-label={`Delete ${service.title}`}
                title="Delete service"
              >
                <Trash2 size={17} />
              </button>
            </div>
          );
        })}
        {!visibleServices.length && (
          <div className="empty-state compact">
            <Wrench size={24} />
            <strong>No services in this region</strong>
            <span>Add a service or switch the region filter.</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderBeauty = () => {
    const selectedVideoArtist = beautyArtists.find((artist) => getBeautyArtistId(artist) === beautyVideoForm.artistId);

    return (
      <div className="admin-beauty-tab animated-fade-in">
        <div className="beauty-admin-summary">
          <article>
            <Sparkles size={19} />
            <span>Beauty Artists</span>
            <strong>{beautyArtists.length}</strong>
            <small>{activeBeautyArtistCount} active</small>
          </article>
          <article>
            <Scissors size={19} />
            <span>Beauty Services</span>
            <strong>{beautyServiceCount}</strong>
            <small>assigned to artists</small>
          </article>
          <article>
            <Film size={19} />
            <span>Artist Videos</span>
            <strong>{beautyVideoCount}</strong>
            <small>uploaded links</small>
          </article>
        </div>

        {showBeautyArtistForm && (
          <form className="admin-form beauty-artist-form" onSubmit={submitBeautyArtist}>
            <div className="section-heading inline">
              <div>
                <h2>{editingBeautyArtistId ? "Edit Beauty Artist" : "Add Beauty Artist"}</h2>
                <p>{editingBeautyArtistId ? "Profile details and availability." : "Beauty profile details."}</p>
              </div>
              <button className="btn btn-soft compact" type="button" onClick={resetBeautyArtistForm}>
                Cancel
              </button>
            </div>

            <div className="admin-form-grid">
              <label>
                Artist Name
                <input name="name" value={beautyArtistForm.name} onChange={updateBeautyArtistForm} placeholder="Riya Sharma" required />
              </label>
              <label>
                Specialty
                <input name="specialty" value={beautyArtistForm.specialty} onChange={updateBeautyArtistForm} placeholder="Hair, makeup, facial" required />
              </label>
              <label>
                Salon / Studio
                <input name="salonName" value={beautyArtistForm.salonName} onChange={updateBeautyArtistForm} placeholder="Glow Studio" />
              </label>
              <label>
                Region
                <select name="region" value={beautyArtistForm.region} onChange={updateBeautyArtistForm} required>
                  {regions.map((region) => (
                    <option value={region} key={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Phone
                <input name="phone" value={beautyArtistForm.phone} onChange={updateBeautyArtistForm} placeholder="99988877766" />
              </label>
              <label>
                Email
                <input name="email" type="email" value={beautyArtistForm.email} onChange={updateBeautyArtistForm} placeholder="artist@example.com" />
              </label>
              <label>
                Rating
                <input name="rating" type="number" step="0.1" min="0" max="5" value={beautyArtistForm.rating} onChange={updateBeautyArtistForm} required />
              </label>
              <label className="admin-toggle-field">
                Artist status
                <span>
                  <input name="enabled" type="checkbox" checked={beautyArtistForm.enabled} onChange={updateBeautyArtistForm} />
                  {beautyArtistForm.enabled ? "On - visible" : "Off - hidden"}
                </span>
              </label>
            </div>

            <label>
              Artist Photo URL
              <input name="image" value={beautyArtistForm.image} onChange={updateBeautyArtistForm} placeholder="/images/site/expert-riya.jpg" />
            </label>

            <label>
              Bio
              <textarea name="bio" value={beautyArtistForm.bio} onChange={updateBeautyArtistForm} rows="3" placeholder="Soft glam, facials, grooming, and at-home beauty care." />
            </label>

            <button className="btn btn-primary" type="submit" disabled={beautySaving}>
              <Save size={17} /> {beautySaving ? "Saving" : editingBeautyArtistId ? "Update Artist" : "Save Artist"}
            </button>
          </form>
        )}

        <div className="beauty-admin-toolgrid">
          <form className="admin-form beauty-tool-panel" onSubmit={submitBeautyService}>
            <div className="section-heading inline">
              <div>
                <h2>Add Beauty Service</h2>
                <p>Artist service menu.</p>
              </div>
              <Scissors size={22} />
            </div>

            <div className="admin-form-grid">
              <label>
                Artist
                <select value={beautyServiceArtistId} onChange={(event) => setBeautyServiceArtistId(event.target.value)} disabled={!beautyArtists.length} required>
                  <option value="">{beautyArtists.length ? "Select artist" : "No artists yet"}</option>
                  {beautyArtists.map((artist) => (
                    <option value={getBeautyArtistId(artist)} key={getBeautyArtistId(artist)}>
                      {artist.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Service Name
                <input name="title" value={beautyServiceForm.title} onChange={updateBeautyServiceForm} placeholder="Party makeup" required />
              </label>
              <label>
                Price
                <input name="price" type="number" min="0" value={beautyServiceForm.price} onChange={updateBeautyServiceForm} placeholder="1499" required />
              </label>
              <label>
                Duration
                <input name="duration" value={beautyServiceForm.duration} onChange={updateBeautyServiceForm} required />
              </label>
              <label>
                Image URL
                <input name="image" value={beautyServiceForm.image} onChange={updateBeautyServiceForm} />
              </label>
              <label className="admin-toggle-field">
                Service status
                <span>
                  <input name="enabled" type="checkbox" checked={beautyServiceForm.enabled} onChange={updateBeautyServiceForm} />
                  {beautyServiceForm.enabled ? "On" : "Off"}
                </span>
              </label>
            </div>

            <label>
              Description
              <textarea name="description" value={beautyServiceForm.description} onChange={updateBeautyServiceForm} rows="3" placeholder="Skin prep, finishing, and detail-led beauty care." />
            </label>

            <button className="btn btn-primary" type="submit" disabled={beautySaving || !beautyArtists.length}>
              <Plus size={17} /> Add Beauty Service
            </button>
          </form>

          <form className="admin-form beauty-tool-panel" onSubmit={submitBeautyVideo}>
            <div className="section-heading inline">
              <div>
                <h2>Artist Video Upload</h2>
                <p>Featured artist media.</p>
              </div>
              <Upload size={22} />
            </div>

            <label>
              Artist
              <select name="artistId" value={beautyVideoForm.artistId} onChange={updateBeautyVideoForm} disabled={!beautyArtists.length} required>
                <option value="">{beautyArtists.length ? "Select artist" : "No artists yet"}</option>
                {beautyArtists.map((artist) => (
                  <option value={getBeautyArtistId(artist)} key={getBeautyArtistId(artist)}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="admin-form-grid">
              <label>
                Video Title
                <input name="videoTitle" value={beautyVideoForm.videoTitle} onChange={updateBeautyVideoForm} placeholder="Bridal makeup preview" />
              </label>
              <label>
                Video URL
                <input name="videoUrl" value={beautyVideoForm.videoUrl} onChange={updateBeautyVideoForm} placeholder="/videos/artist-preview.mp4" required />
              </label>
            </div>

            <label>
              Thumbnail URL
              <input name="videoThumbnail" value={beautyVideoForm.videoThumbnail} onChange={updateBeautyVideoForm} placeholder="/images/site/beauty-mehndi.jpg" />
            </label>

            {selectedVideoArtist?.videoUrl && (
              <div className="beauty-video-mini-preview">
                <Video size={16} />
                <a href={selectedVideoArtist.videoUrl} target="_blank" rel="noreferrer">
                  {selectedVideoArtist.videoTitle || "Current artist video"}
                </a>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={beautySaving || !beautyArtists.length}>
              <Upload size={17} /> Save Artist Video
            </button>
          </form>
        </div>

        <div className="admin-table-filters">
          <label className="search-box">
            <Search size={15} />
            <input
              value={beautySearch}
              onChange={(event) => setBeautySearch(event.target.value)}
              placeholder="Search artists, salons, services..."
            />
          </label>
        </div>

        <div className="beauty-artist-grid">
          {filteredBeautyArtists.length ? (
            filteredBeautyArtists.map((artist) => {
              const artistId = getBeautyArtistId(artist);
              const artistServices = getBeautyServices(artist);
              return (
                <article className={`beauty-artist-admin-card ${artist.enabled === false ? "disabled" : ""}`} key={artistId}>
                  <header>
                    <img src={artist.image || "/images/site/expert-riya.jpg"} alt={artist.name} />
                    <div>
                      <span className="beauty-card-kicker"><Sparkles size={13} /> {artist.specialty || "Beauty Artist"}</span>
                      <h3>{artist.name}</h3>
                      <p>{artist.bio || "No artist bio added yet."}</p>
                    </div>
                  </header>

                  <div className="beauty-card-meta">
                    <span><MapPin size={13} /> {artist.region || "All Regions"}</span>
                    <span><Star size={13} fill="currentColor" /> {Number(artist.rating || 0).toFixed(1)}</span>
                    <span>{artist.salonName || "Independent artist"}</span>
                  </div>

                  <div className="beauty-service-list">
                    {artistServices.length ? (
                      artistServices.map((service, index) => {
                        const serviceKey = service.id || String(index);
                        return (
                          <div className={`beauty-service-pill ${service.enabled === false ? "disabled" : ""}`} key={serviceKey}>
                            <span>
                              <strong>{service.title}</strong>
                              <small>{formatMoney(service.price)} | {service.duration}</small>
                            </span>
                            <button
                              className={`icon-button ${service.enabled === false ? "" : "success"}`}
                              type="button"
                              onClick={() => toggleBeautyServiceStatus(artist, serviceKey)}
                              disabled={beautyUpdatingId === artistId}
                              title={service.enabled === false ? "Turn service on" : "Turn service off"}
                              aria-label={`${service.enabled === false ? "Enable" : "Disable"} ${service.title}`}
                            >
                              {service.enabled === false ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                            </button>
                            <button
                              className="icon-button danger"
                              type="button"
                              onClick={() => deleteBeautyService(artist, serviceKey)}
                              disabled={beautyUpdatingId === artistId}
                              title="Remove service"
                              aria-label={`Remove ${service.title}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <span className="beauty-empty-note">No beauty services added.</span>
                    )}
                  </div>

                  {artist.videoUrl && (
                    <div className="beauty-card-video">
                      <video controls preload="metadata" poster={artist.videoThumbnail || artist.image || "/images/site/beauty-mehndi.jpg"}>
                        <source src={artist.videoUrl} />
                      </video>
                      <a href={artist.videoUrl} target="_blank" rel="noreferrer">
                        <Film size={14} /> {artist.videoTitle || "Artist video"}
                      </a>
                    </div>
                  )}

                  <footer className="beauty-card-actions">
                    <button
                      className={`icon-button ${artist.enabled === false ? "" : "success"}`}
                      type="button"
                      onClick={() => toggleBeautyArtistStatus(artist)}
                      disabled={beautyUpdatingId === artistId}
                      title={artist.enabled === false ? "Turn artist on" : "Turn artist off"}
                      aria-label={`${artist.enabled === false ? "Enable" : "Disable"} ${artist.name}`}
                    >
                      {artist.enabled === false ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                    </button>
                    <button className="icon-button" type="button" onClick={() => startEditBeautyArtist(artist)} title="Edit artist" aria-label={`Edit ${artist.name}`}>
                      <Edit3 size={17} />
                    </button>
                    <button className="icon-button" type="button" onClick={() => loadBeautyVideoForm(artist)} title="Load video" aria-label={`Load video for ${artist.name}`}>
                      <Video size={17} />
                    </button>
                    <button
                      className="icon-button danger"
                      type="button"
                      onClick={() => deleteBeautyArtist(artist)}
                      disabled={beautyDeletingId === artistId}
                      title="Delete artist"
                      aria-label={`Delete ${artist.name}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </footer>
                </article>
              );
            })
          ) : (
            <div className="empty-state">
              <Sparkles size={36} />
              <strong>No beauty artists found</strong>
              <span>No artist profiles match this view.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="admin-users-tab animated-fade-in">
      <div className="admin-table-filters">
        <label className="search-box">
          <Search size={15} />
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search users by name, email, phone..."
          />
        </label>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-datatable">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>User ID / Auth Provider</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Region / Address</th>
              <th>Joined On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length ? (
              filteredUsers.map((u) => {
                const initials = u.name ? u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";
                return (
                  <tr key={u._id || u.userId}>
                    <td>
                      <span className="user-avatar-initials">{initials}</span>
                    </td>
                    <td>
                      <strong className="font-mono text-xs">{u.userId || u._id}</strong>
                      <small className="block text-muted text-xs capitalize">{u.authProvider || "Firebase"}</small>
                    </td>
                    <td><strong>{u.name || "FunService Customer"}</strong></td>
                    <td>{u.email || <span className="text-muted">Not added</span>}</td>
                    <td>{u.phone || <span className="text-muted">Not added</span>}</td>
                    <td>
                      <span className={`role-badge ${u.role || "customer"}`}>{u.role || "customer"}</span>
                    </td>
                    <td>
                      <div><strong>{u.city || "All Cities"}</strong></div>
                      <small className="block max-w-xs truncate text-xs text-muted" title={u.address}>{u.address || "No address saved"}</small>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-small text-danger"
                        type="button"
                        onClick={() => handleResetPassword(u._id || u.userId)}
                        title="Reset user password"
                      >
                        <KeyRound size={13} /> Reset Pass
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="table-empty">
                  No users match the search query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSupport = () => (
    <div className="admin-support-tab animated-fade-in">
      <div className="admin-table-filters">
        <label className="search-box">
          <Search size={15} />
          <input
            value={supportSearch}
            onChange={(e) => setSupportSearch(e.target.value)}
            placeholder="Search support by ticket ID, customer name, message contents..."
          />
        </label>
      </div>

      <div className="support-tickets-inbox-grid">
        {filteredSupport.length ? (
          filteredSupport.map((ticket) => {
            const dateStr = formatDate(ticket.createdAt);
            const isUnreplied = ticket.status === "Open" || ticket.status === "Pending";
            const isComplete = ticket.status === "Complete" || ticket.status === "Closed";
            const ticketStatusLabel = isComplete ? "Complete" : isUnreplied ? "Pending" : ticket.status || "Pending";
            
            return (
              <article className={`support-ticket-admin-card ${isUnreplied ? "open-ticket" : "replied-ticket"}`} key={ticket._id || ticket.ticketId}>
                <header className="ticket-card-header">
                  <div>
                    <span className="font-mono text-xs text-muted">TICKET: {ticket.ticketId || ticket._id}</span>
                    <h3>{ticket.name || "Anonymous Customer"}</h3>
                    <small>{ticket.email} | {ticket.phone || "No phone"}</small>
                  </div>
                  <span className={`status-badge ${ticketStatusLabel.toLowerCase()}`}>{ticketStatusLabel}</span>
                </header>
                <div className="ticket-body">
                  <p className="ticket-message-text">"{ticket.message}"</p>
                  <small className="ticket-timestamp">{dateStr}</small>
                  
                  {ticket.reply && (
                    <div className="ticket-reply-box">
                      <strong>Admin Reply:</strong>
                      <p>{ticket.reply}</p>
                    </div>
                  )}
                </div>
                
                {isUnreplied && (
                  <footer className="ticket-reply-composer">
                    <textarea
                      placeholder="Type email reply here..."
                      value={supportReplies[ticket._id || ticket.ticketId] || ""}
                      onChange={(e) => setSupportReplies(prev => ({ ...prev, [ticket._id || ticket.ticketId]: e.target.value }))}
                      rows="2"
                    />
                    <div className="ticket-reply-actions">
                      <button
                        className="btn btn-primary btn-small"
                        type="button"
                        onClick={() => handleReplySupport(ticket._id || ticket.ticketId)}
                      >
                        <Reply size={12} /> Send Email Reply
                      </button>
                      <button
                        className="btn btn-soft btn-small"
                        type="button"
                        onClick={() => handleReplySupport(ticket._id || ticket.ticketId, "Closed")}
                      >
                        Mark Complete
                      </button>
                    </div>
                  </footer>
                )}
                {!isUnreplied && !isComplete && (
                  <footer className="ticket-reply-composer">
                    <button
                      className="btn btn-soft btn-small"
                      type="button"
                      onClick={() => handleReplySupport(ticket._id || ticket.ticketId, "Closed")}
                    >
                      Mark Complete
                    </button>
                  </footer>
                )}
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            <MessageCircle size={36} />
            <strong>No support messages found</strong>
            <span>Your customer inbox is clear.</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="admin-settings-tab animated-fade-in">
      <section className="admin-panel payment-settings-panel">
        <div className="section-heading inline">
          <div>
            <h2>Payment Gateways</h2>
            <p>Choose which payment options customers see during booking checkout.</p>
          </div>
          <CreditCard size={22} />
        </div>
        <div className="payment-settings-grid">
          {paymentMethods.map((paymentMethod) => (
            <label className={`payment-setting ${paymentMethod.enabled ? "enabled" : ""}`} key={paymentMethod.method}>
              <div>
                <strong>{paymentMethod.method}</strong>
                <span>{paymentMethod.type === "cash" ? "Confirm booking, collect cash after service" : "Confirm booking after dummy online verification"}</span>
              </div>
              <input
                type="checkbox"
                checked={paymentMethod.enabled}
                disabled={updatingPaymentMethod === paymentMethod.method}
                onChange={() => togglePaymentMethod(paymentMethod)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="admin-panel coupon-settings-panel">
        <div className="section-heading inline">
          <div>
            <h2>Discount Coupons</h2>
            <p>Create promo codes customers can apply during checkout. Inactive or expired coupons are rejected automatically.</p>
          </div>
          <Tag size={22} />
        </div>

        <form className="admin-form coupon-settings-form" onSubmit={submitCoupon}>
          <div className="admin-form-grid">
            <label>
              Coupon Code
              <input
                name="code"
                value={couponForm.code}
                onChange={updateCouponForm}
                placeholder="SAVE100"
                required
              />
            </label>
            <label>
              Discount Type
              <select name="discountType" value={couponForm.discountType} onChange={updateCouponForm} required>
                <option value="flat">Flat amount (INR)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </label>
            <label>
              Discount Value
              <input
                name="discountValue"
                type="number"
                min="1"
                step={couponForm.discountType === "percentage" ? "1" : "10"}
                max={couponForm.discountType === "percentage" ? "100" : undefined}
                value={couponForm.discountValue}
                onChange={updateCouponForm}
                placeholder={couponForm.discountType === "percentage" ? "10" : "100"}
                required
              />
            </label>
            <label>
              Minimum Order
              <input
                name="minOrderAmount"
                type="number"
                min="0"
                step="10"
                value={couponForm.minOrderAmount}
                onChange={updateCouponForm}
                placeholder="0"
              />
            </label>
            <label>
              Max Discount Cap
              <input
                name="maxDiscount"
                type="number"
                min="0"
                step="10"
                value={couponForm.maxDiscount}
                onChange={updateCouponForm}
                placeholder={couponForm.discountType === "percentage" ? "500" : "Optional"}
              />
            </label>
            <label>
              Usage Limit
              <input
                name="usageLimit"
                type="number"
                min="1"
                step="1"
                value={couponForm.usageLimit}
                onChange={updateCouponForm}
                placeholder="1 (blank = unlimited)"
              />
            </label>
            <label>
              Expires On
              <input
                name="expiresAt"
                type="datetime-local"
                value={couponForm.expiresAt}
                onChange={updateCouponForm}
              />
            </label>
            <label className="admin-toggle-field">
              Coupon status
              <span>
                <input name="isActive" type="checkbox" checked={couponForm.isActive} onChange={updateCouponForm} />
                {couponForm.isActive ? "Active - customers can apply" : "Inactive - hidden at checkout"}
              </span>
            </label>
          </div>

          <div className="coupon-form-actions">
            <button className="btn btn-primary" type="submit" disabled={couponSaving}>
              <Plus size={17} /> {couponSaving ? "Saving" : "Create Coupon"}
            </button>
            <button className="btn btn-soft" type="button" onClick={resetCouponForm} disabled={couponSaving}>
              Reset
            </button>
          </div>
        </form>

        {coupons.length ? (
          <div className="admin-table-wrapper">
            <table className="admin-datatable coupon-settings-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Order</th>
                  <th>Max Cap</th>
                  <th>Usage</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const couponId = getCouponId(coupon);
                  return (
                    <tr key={couponId || coupon.code}>
                      <td>
                        <strong className="coupon-code-badge">{coupon.code}</strong>
                      </td>
                      <td>
                        <strong>{formatCouponDiscount(coupon)}</strong>
                        <small className="block text-muted text-xs capitalize">{coupon.discountType}</small>
                      </td>
                      <td>{formatMoney(coupon.minOrderAmount)}</td>
                      <td>{coupon.maxDiscount ? formatMoney(coupon.maxDiscount) : "—"}</td>
                      <td>{formatCouponUsage(coupon)}</td>
                      <td>{coupon.expiresAt ? formatDate(coupon.expiresAt) : "No expiry"}</td>
                      <td>
                        <span className={`status-badge ${coupon.isActive === false ? "cancelled" : "confirmed"}`}>
                          {coupon.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="coupon-row-actions">
                          <button
                            className={`icon-button ${coupon.isActive === false ? "" : "success"}`}
                            type="button"
                            onClick={() => toggleCoupon(coupon)}
                            aria-label={`${coupon.isActive === false ? "Enable" : "Disable"} ${coupon.code}`}
                            title={coupon.isActive === false ? "Enable coupon" : "Disable coupon"}
                          >
                            {coupon.isActive === false ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                          </button>
                          <button
                            className="icon-button danger"
                            type="button"
                            onClick={() => deleteCoupon(coupon)}
                            disabled={deletingCouponId === couponId}
                            aria-label={`Delete ${coupon.code}`}
                            title="Delete coupon"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state compact">
            <Tag size={28} />
            <strong>No coupons yet</strong>
            <span>Create a promo code above to offer checkout discounts.</span>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <section className="page-shell admin-dashboard-page-redesign">
      <div className="admin-panel-container">
        {/* Modern Sidebar Navigation */}
        <aside className="admin-left-sidebar">
          <div className="sidebar-brand-box">
            <ShieldCheck size={22} />
            <div>
              <h3>FunService Admin</h3>
              <span>{currentUser?.role === "owner" ? "Owner Panel" : "Operations Dashboard"}</span>
            </div>
          </div>

          <nav className="sidebar-menu-items">
            <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
              <BarChart3 size={16} />
              <span>Overview</span>
            </button>
            <button className={activeTab === "bookings" ? "active" : ""} onClick={() => setActiveTab("bookings")}>
              <ClipboardList size={16} />
              <span>Bookings</span>
              {pendingBookingsCount > 0 && <span className="menu-badge danger">{pendingBookingsCount}</span>}
            </button>
            <button className={activeTab === "services" ? "active" : ""} onClick={() => setActiveTab("services")}>
              <Wrench size={16} />
              <span>Services</span>
              {activeServiceCount > 0 && <span className="menu-badge info">{activeServiceCount}</span>}
            </button>
            <button className={activeTab === "beauty" ? "active" : ""} onClick={() => setActiveTab("beauty")}>
              <Sparkles size={16} />
              <span>Beauty</span>
              {activeBeautyArtistCount > 0 && <span className="menu-badge info">{activeBeautyArtistCount}</span>}
            </button>
            <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>
              <Users size={16} />
              <span>Users Directory</span>
              {usersList.length > 0 && <span className="menu-badge neutral">{usersList.length}</span>}
            </button>
            <button className={activeTab === "support" ? "active" : ""} onClick={() => setActiveTab("support")}>
              <MessageCircle size={16} />
              <span>Support Inbox</span>
              {openSupportCount > 0 && <span className="menu-badge warning">{openSupportCount}</span>}
            </button>
            <button className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")}>
              <CreditCard size={16} />
              <span>Settings</span>
            </button>
          </nav>

          <div className="sidebar-footer-action">
            <button className="btn btn-soft btn-refresh-sidebar full" onClick={() => refreshDashboard()} disabled={refreshing}>
              <RefreshCcw size={14} className={refreshing ? "spin-loop" : ""} />
              {refreshing ? "Refreshing..." : "Refresh Dashboard"}
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="admin-main-workspace">
          {/* Header row */}
          <header className="workspace-header-bar">
            <div>
              <h1>{tabTitles[activeTab]}</h1>
              <p>{tabDescriptions[activeTab]}</p>
            </div>
            <div className="workspace-header-actions">
              {activeTab === "services" && (
                <button className="btn btn-primary btn-add-service" onClick={() => setShowForm((value) => !value)}>
                  <Plus size={16} /> {showForm ? "Hide Form" : "Add Service"}
                </button>
              )}
              {activeTab === "beauty" && (
                <button className="btn btn-primary btn-add-service" onClick={() => (showBeautyArtistForm ? resetBeautyArtistForm() : openNewBeautyArtistForm())}>
                  <Plus size={16} /> {showBeautyArtistForm ? "Hide Artist Form" : "Add Artist"}
                </button>
              )}
              {activeTab === "bookings" && (
                <a href={exportUrl} className="btn btn-soft btn-export" target="_blank" rel="noreferrer" title="Export accepted bookings to CSV file">
                  <Share2 size={16} /> Export to Excel
                </a>
              )}
              <button
                className="btn btn-soft btn-refresh-workspace"
                onClick={() => refreshDashboard()}
                disabled={refreshing}
                title="Refresh dashboard data"
              >
                <RefreshCcw size={16} className={refreshing ? "spin-loop" : ""} />
              </button>
            </div>
          </header>

          {/* Collapsible Service Add/Edit Form */}
          {activeTab === "services" && showForm && (
            <form className="admin-form" onSubmit={submitService} style={{ margin: "0 0 20px" }}>
              <div className="section-heading inline">
                <div>
                  <h2>{editingServiceId ? "Edit Service" : "Add Service"}</h2>
                  <p>{editingServiceId ? "Update catalog, region, and availability." : "Create a service for the customer app."}</p>
                </div>
                <button className="btn btn-soft compact" type="button" onClick={resetForm}>
                  Cancel
                </button>
              </div>

              <div className="admin-form-grid">
                <label>
                  Service Name
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateForm}
                    placeholder="Water purifier repair"
                    required
                  />
                </label>
                <label>
                  Category
                  <select name="category" value={form.category} onChange={updateForm} required>
                    {categories.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Starting Price
                  <input
                    name="price"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={updateForm}
                    placeholder="399"
                    required
                  />
                </label>
                <label>
                  Duration
                  <input name="duration" value={form.duration} onChange={updateForm} required />
                </label>
                <label>
                  Region
                  <select name="region" value={form.region} onChange={updateForm} required>
                    {regions.map((region) => (
                      <option value={region} key={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-toggle-field">
                  Service status
                  <span>
                    <input name="enabled" type="checkbox" checked={form.enabled} onChange={updateForm} />
                    {form.enabled ? "On - visible to users" : "Off - hidden from users"}
                  </span>
                </label>
              </div>

              <label>
                Image URL
                <input name="image" value={form.image} onChange={updateForm} required />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  rows="3"
                  placeholder="Repair, installation, and maintenance handled by verified professionals."
                  required
                />
              </label>

              <button className="btn btn-primary" type="submit" disabled={saving}>
                <Save size={17} /> {saving ? "Saving" : editingServiceId ? "Update Service" : "Save Service"}
              </button>
            </form>
          )}

          {/* Main active tab body container */}
          <div className="workspace-tab-contents">
            {activeTab === "overview" && renderOverview()}
            {activeTab === "bookings" && renderBookings()}
            {activeTab === "services" && renderServices()}
            {activeTab === "beauty" && renderBeauty()}
            {activeTab === "users" && renderUsers()}
            {activeTab === "support" && renderSupport()}
            {activeTab === "settings" && renderSettings()}
          </div>
        </main>
      </div>
    </section>
  );
}

export default AdminDashboard;
