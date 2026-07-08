import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "./utils/notifications.js";
import NotificationCenter from "./components/NotificationCenter.jsx";
import OwnerPanel from "./pages/OwnerPanel.jsx";
import LoginSignup from "./pages/LoginSignup.jsx";
import Profile, { ProfileSkeletonCapture } from "./pages/Profile.jsx";
import Services from "./pages/Services.jsx";
import BookingStatus from "./pages/BookingStatus.jsx";
import {
  ArrowRight, BadgeCheck, Banknote, Bell, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronRight, Clock3, CreditCard, Droplets, Flower2, Gauge, Home, Instagram,
  Landmark, LayoutDashboard, LockKeyhole, LogOut, Mail, MapPin, Menu, MessageCircle, Paintbrush, Phone, Refrigerator,
  PlayCircle, ScanLine, Scissors, ShieldCheck, ShoppingCart, Sparkles, Star, UserRound, UsersRound,
  WalletCards, WandSparkles, WashingMachine, Wind, Wrench, X, Zap
} from "lucide-react";
import { api } from "./api/client.js";
import { getUserProfile } from "./data/profileStore.js";
import { saveUserBooking } from "./data/bookingStore.js";
import { getBestCustomerReviews, getCustomerReviews, saveCustomerReview } from "./data/reviewStore.js";
import { displayUserName, isPrivilegedUser, logoutSession, onSessionChanged } from "./data/sessionStore.js";

const isPhoneLike = (value) => /^[+\d][\d\s-]{7,}$/.test(String(value || "").trim());

const fallbackServices = [
  { id: "house-maid", title: "House Maid", category: "Cleaning", description: "Reliable daily help for a calm, cared-for home.", price: 399, duration: "2-3 hrs", icon: Sparkles, image: "/images/site/home-care.jpg" },
  { id: "fridge-deep-clean", title: "Fridge Deep Cleaning", category: "Cleaning", description: "A hygienic reset for every shelf, seal and corner.", price: 599, duration: "90 mins", icon: Refrigerator, image: "/images/site/fridge-clean.jpg" },
  { id: "ac-maintenance", title: "AC Maintenance", category: "Maintenance", description: "Deep service, filter cleaning and cooling checks.", price: 499, duration: "60 mins", icon: Wind, image: "/images/site/ac-maintenance.jpg" },
  { id: "electrician-plumber", title: "Electrician / Plumber", category: "Repairs", description: "Fast fixes for everyday electrical and plumbing issues.", price: 299, duration: "45 mins", icon: Zap, image: "/images/site/electrician.jpg" },
  { id: "pest-control", title: "Pest Control", category: "Cleaning", description: "Targeted treatments that keep your spaces protected.", price: 899, duration: "2 hrs", icon: ShieldCheck, image: "/images/site/pest-control.jpg" },
  { id: "painting-walls", title: "Painting & Walls", category: "Maintenance", description: "Touch-ups, texture work and full room refreshes.", price: 1499, duration: "Quote visit", icon: Paintbrush, image: "/images/site/painting.jpg" },
  { id: "appliance-repair", title: "Appliance Repair", category: "Repairs", description: "Diagnostics and dependable repair for home essentials.", price: 399, duration: "60 mins", icon: WashingMachine, image: "/images/site/appliance-repair.jpg" },
  { id: "home-deep-clean", title: "Home Deep Clean", category: "Cleaning", description: "A room-by-room clean for a fresh start at home.", price: 2199, duration: "4-5 hrs", icon: Droplets, image: "/images/site/deep-clean.jpg" }
];

const beautyCategoryNames = new Set(["Salon at Home", "Spa at Home", "Beauty at home", "Beauty"]);
const beautySearchTerms = ["beauty", "salon", "spa", "facial", "waxing", "threading", "mehndi", "nail", "makeup", "grooming", "haircut", "beard"];

const isBeautyService = (service = {}) => {
  const category = String(service.category || "");
  const title = String(service.title || "");
  const haystack = `${category} ${title} ${service.description || ""}`.toLowerCase();
  return beautyCategoryNames.has(category) || beautySearchTerms.some((term) => haystack.includes(term));
};

const getGeneralCatalogServices = (services = []) => services.filter((service) => !isBeautyService(service));

const interleaveServices = (...groups) => {
  const longest = Math.max(0, ...groups.map((group) => group.length));
  return Array.from({ length: longest }).flatMap((_, index) => groups.map((group) => group[index]).filter(Boolean));
};

const cartStorageKey = "funservice-cart-items";

const getServiceCartId = (service) => String(service?.bookingId || service?.id || service?._id || service?.serviceId || service?.title || "");

const normalizeCartItem = (service, quantity = 1) => ({
  id: getServiceCartId(service),
  title: service.title,
  category: service.category || service.salonName || "Service",
  description: service.description || "",
  image: service.image || "/images/site/home-care.jpg",
  duration: service.duration || "Slot based",
  price: Number(service.price) || 0,
  salonName: service.salonName || "",
  quantity
});

const readCartItems = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item?.id && item?.title) : [];
  } catch {
    return [];
  }
};

const saveCartItems = (items) => {
  localStorage.setItem(cartStorageKey, JSON.stringify(items));
  return items;
};

const serviceIconByCategory = {
  Cleaning: Sparkles,
  Maintenance: Wrench,
  Repairs: Zap,
  "AC Repairing": Wind,
  Electrician: Zap,
  Plumbing: Wrench,
  "Appliance Repair": WashingMachine,
  Carpentry: Wrench,
  Painting: Paintbrush,
  "Pest Control": ShieldCheck,
  Laundry: Droplets,
  "Salon at Home": Scissors,
  "More Services": Sparkles
};

const normalizeService = (service) => ({
  ...service,
  id: service._id || service.id,
  icon: service.icon || serviceIconByCategory[service.category] || Sparkles,
  region: service.region || "All Regions",
  enabled: service.enabled !== false
});

function useCatalogServices() {
  const [catalogServices, setCatalogServices] = useState(fallbackServices.map(normalizeService));

  useEffect(() => {
    let active = true;
    const loadServices = () => api.getServices()
      .then((rows) => {
        if (active && Array.isArray(rows) && rows.length) {
          setCatalogServices(rows.map(normalizeService));
        }
      })
      .catch(() => {
        // Keep fallback services when the backend is unavailable.
      });

    const onStorage = (event) => {
      if (event.key === "funservice-services-changed-at") loadServices();
    };

    loadServices();
    const interval = window.setInterval(loadServices, 5000);
    window.addEventListener("focus", loadServices);
    window.addEventListener("funservice:services-changed", loadServices);
    window.addEventListener("storage", onStorage);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadServices);
      window.removeEventListener("funservice:services-changed", loadServices);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return catalogServices;
}

const beautyServices = [
  { id: "beauty-glow-studio-hair-styling", title: "Women's Salon", category: "Beauty at home", description: "Hair styling and soft salon rituals delivered at home.", price: 699, duration: "60 mins", icon: Scissors, image: "/images/site/beauty-salon.jpg" },
  { id: "beauty-glow-studio-signature-facial", title: "Facial & Cleanup", category: "Beauty at home", description: "Glow-led skin care with cleanup and massage.", price: 899, duration: "75 mins", icon: Sparkles, image: "/images/site/beauty-facial.jpg" },
  { id: "beauty-waxing", bookingId: "beauty-glow-studio-threading-waxing", title: "Waxing", category: "Beauty at home", description: "Comfortable, hygienic essentials with single-use care.", price: 549, duration: "50 mins", icon: WandSparkles, image: "/images/site/beauty-facial.jpg" },
  { id: "beauty-threading", bookingId: "beauty-glow-studio-threading-waxing", title: "Threading", category: "Beauty at home", description: "Precise finishing touches for brows and face.", price: 549, duration: "50 mins", icon: ScanLine, image: "/images/site/beauty-threading.jpg" },
  { id: "beauty-blush-and-bloom-mehndi-session", title: "Mehndi", category: "Beauty at home", description: "Intricate celebration-ready designs at your doorstep.", price: 999, duration: "90 mins", icon: Flower2, image: "/images/site/beauty-mehndi.jpg" },
  { id: "beauty-blush-and-bloom-nail-ritual", title: "Nail Art", category: "Beauty at home", description: "Shape, polish and detail-led nail art finishing.", price: 749, duration: "70 mins", icon: Sparkles, image: "/images/site/beauty-nails.jpg" },
  { id: "beauty-the-groom-room-mens-grooming", title: "Men's Grooming", category: "Beauty at home", description: "Haircut, beard trim and home grooming in one visit.", price: 599, duration: "60 mins", icon: Scissors, image: "/images/site/beauty-grooming.jpg" },
  { id: "beauty-the-groom-room-mens-facial", title: "Men's Facial", category: "Beauty at home", description: "A clean, restorative facial for a fresh everyday reset.", price: 799, duration: "70 mins", icon: Sparkles, image: "/images/site/beauty-mens-facial.jpg" }
];

const beautySalons = [
  {
    id: "glow-studio",
    name: "Glow Studio by Riya",
    area: "Indiranagar",
    rating: "4.9",
    image: "/images/site/beauty-salon.jpg",
    description: "Soft glam, hair rituals and skin care with a calm at-home touch.",
    services: [
      { id: "signature-facial", title: "Signature Facial & Cleanup", description: "A glow-led skin reset with cleanup and massage.", price: 899, duration: "75 mins", image: "/images/site/beauty-facial.jpg", icon: Sparkles },
      { id: "hair-styling", title: "Hair Styling At Home", description: "Blow dry, styling and occasion-ready finishing.", price: 699, duration: "60 mins", image: "/images/site/beauty-salon.jpg", icon: Scissors },
      { id: "threading-waxing", title: "Threading & Waxing", description: "Comfortable essentials with hygienic single-use care.", price: 549, duration: "50 mins", image: "/images/site/beauty-threading.jpg", icon: ScanLine }
    ]
  },
  {
    id: "blush-and-bloom",
    name: "Blush & Bloom Salon",
    area: "Koramangala",
    rating: "4.8",
    image: "/images/site/beauty-makeup.jpg",
    description: "Celebration makeup, polish and skin rituals selected for your day.",
    services: [
      { id: "party-makeup", title: "Party Makeup", description: "A polished event look with skin prep and finishing.", price: 1499, duration: "90 mins", image: "/images/site/beauty-makeup.jpg", icon: WandSparkles },
      { id: "nail-ritual", title: "Nail Art Ritual", description: "Shape, polish and a detail-led nail art finish.", price: 749, duration: "70 mins", image: "/images/site/beauty-nails.jpg", icon: Sparkles },
      { id: "mehndi-session", title: "Mehndi Session", description: "Intricate celebration-ready designs at your doorstep.", price: 999, duration: "90 mins", image: "/images/site/beauty-mehndi.jpg", icon: Flower2 }
    ]
  },
  {
    id: "the-groom-room",
    name: "The Groom Room",
    area: "HSR Layout",
    rating: "4.7",
    image: "/images/site/beauty-grooming.jpg",
    description: "Reliable men's grooming and refresh rituals delivered at home.",
    services: [
      { id: "mens-grooming", title: "Men's Grooming", description: "Haircut, beard trim and an effortless home grooming visit.", price: 599, duration: "60 mins", image: "/images/site/beauty-grooming.jpg", icon: Scissors },
      { id: "mens-facial", title: "Men's Facial", description: "A clean, restorative facial for a fresh everyday reset.", price: 799, duration: "70 mins", image: "/images/site/beauty-mens-facial.jpg", icon: Sparkles },
      { id: "event-ready", title: "Event Ready Grooming", description: "Hair, beard and skin finishing for your next occasion.", price: 1199, duration: "90 mins", image: "/images/site/beauty-grooming.jpg", icon: WandSparkles }
    ]
  }
];

const beautyAppointments = beautySalons.flatMap((salon) =>
  salon.services.map((service) => ({
    ...service,
    id: `beauty-${salon.id}-${service.id}`,
    salonId: salon.id,
    salonName: salon.name,
    category: "Beauty at home"
  }))
);

const plans = [
  { name: "Essentials", price: "499", note: "For small home fixes", features: ["1 service credit", "Verified professional", "Standard support"] },
  { name: "Standard", price: "999", note: "For a smoother month", popular: true, features: ["3 service credits", "Priority slots", "15% off add-ons", "WhatsApp support"] },
  { name: "Premium", price: "1,899", note: "For hands-free homes", features: ["6 service credits", "Same-day priority", "20% off add-ons", "Dedicated care"] }
];

const testimonialSeeds = [
  { reviewId: "seed-aarushi", name: "Aarushi Mehta", city: "Bengaluru", service: "Home cleaning", text: "The booking felt effortless, the professional was punctual, and the house felt brand new.", rating: 5, image: "/images/site/customer-aarushi.jpg", createdAt: "2026-05-03T10:00:00.000Z" },
  { reviewId: "seed-rohan", name: "Rohan Kapoor", city: "Mumbai", service: "Home services", text: "Finally, a home-services app that is clear about price, time and who is showing up.", rating: 5, image: "/images/site/customer-rohan.jpg", createdAt: "2026-05-02T10:00:00.000Z" },
  { reviewId: "seed-neha", name: "Neha Iyer", city: "Delhi NCR", service: "Beauty at home", text: "I booked a facial and deep clean in the same week. Both experiences were excellent.", rating: 5, image: "/images/site/customer-neha.jpg", createdAt: "2026-05-01T10:00:00.000Z" }
];

const checklistGroups = [
  ["Legal & Compliance", ["Privacy policy published", "Terms and conditions published", "Cookie consent banner enabled"]],
  ["Auth & Security", ["Signup and login tested", "Email verification enabled", "Password reset tested", "Google OAuth working", "Rate limiting enabled"]],
  ["Payments", ["Stripe success flow tested", "Stripe failure flow tested", "Customer portal configured"]],
  ["Launch", ["PostHog page tracking active", "Sitemap and robots.txt ready", "Support inbox connected"]]
];

function Logo() {
  return <Link className="brand" to="/"><span className="brand-mark"><img src="/images/site/funservice-logo.svg" alt="" /></span><span>fixOindia</span></Link>;
}

function Navbar({ cartCount = 0 }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const links = [
    { to: "/", label: "Home" },
    { to: "/services", label: "Services" },
    { to: "/vision", label: "AI Vision", className: "vision-link" },
    { to: "/contact", label: "Customer Support" }
  ];

  useEffect(() => onSessionChanged(setUser), []);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutSession();
      setOpen(false);
      toast.success("Logged out successfully.");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="site-nav">
      <div className="nav-inner shell">
        <Logo />
        <button className="mobile-toggle" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`nav-links ${open ? "is-open" : ""}`}>
          {links.map(({ to, label, className }) => (
            <NavLink key={to} to={to} className={className} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <Link className="mobile-account-link" to={user ? "/profile" : "/auth"} onClick={() => setOpen(false)}>
            <UserRound size={15} /> {user ? "Profile" : "Login / Signup"}
          </Link>
          {user && (
            <Link className="mobile-account-link" to="/profile?tab=history" onClick={() => setOpen(false)}>
              <CalendarDays size={15} /> Booking history
            </Link>
          )}
          {user && isPrivilegedUser(user) && (
            <Link className="mobile-account-link" to="/owner" onClick={() => setOpen(false)}>
              <LayoutDashboard size={15} /> Admin Panel
            </Link>
          )}
          {user && (
            <button className="mobile-account-link mobile-logout-link" type="button" onClick={logout} disabled={loggingOut}>
              <LogOut size={15} /> {loggingOut ? "Logging out..." : "Logout"}
            </button>
          )}
        </nav>
        <div className="nav-actions">
          <NotificationCenter />
          {user ? (
            <>
              <Link className="btn btn-primary compact" to="/profile" style={{ background: "var(--accent)", borderRadius: "20px", minHeight: "36px", fontSize: "12px" }}>
                {displayUserName(user)}
              </Link>
              {isPrivilegedUser(user) && (
                <Link className="btn btn-ghost compact admin-panel-btn" to="/owner" style={{ borderRadius: "20px", minHeight: "36px", fontSize: "12px" }}>
                  <LayoutDashboard size={14} /> Admin Panel
                </Link>
              )}
            </>
          ) : (
            <Link className="btn btn-primary compact" to="/auth" style={{ background: "var(--accent)", borderRadius: "20px", minHeight: "36px", fontSize: "12px" }}>
              Login / Signup
            </Link>
          )}

          {user && (
            <button className="icon-button danger" type="button" aria-label={loggingOut ? "Logging out" : "Logout"} title="Logout" onClick={logout} disabled={loggingOut}>
              <LogOut size={18} />
            </button>
          )}

          <Link className="icon-button cart-icon-button" aria-label={`Cart ${cartCount ? `(${cartCount})` : ""}`} to="/cart">
            <ShoppingCart size={18} />
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
        </div>
      </div>
      {location.pathname === "/beauty" && <div className="beauty-nav-line" />}
      {location.pathname === "/vision" && <div className="vision-nav-line" />}
    </header>
  );
}

function SectionHead({ label, title, copy, link, linkLabel = "Explore all" }) {
  return <div className="section-head"><div>{label && <span className="eyebrow">{label}</span>}<h2>{title}</h2>{copy && <p>{copy}</p>}</div>{link && <Link className="text-link" to={link}>{linkLabel} <ArrowRight size={16} /></Link>}</div>;
}

function ServiceCard({ service, compact = false, index = 0, onBookService }) {
  const Icon = service.icon;
  const bookingId = service.bookingId || service.id;
  const isDisabled = service.enabled === false;
  return <article className={`service-card ${compact ? "compact" : ""} ${isDisabled ? "disabled" : ""}`} style={isDisabled ? { opacity: 0.8 } : {}}>
    <div className="service-photo" style={{ position: "relative" }}>
      <img src={service.image} alt="" />
      {isDisabled && (
        <span className="coming-soon-badge" style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "var(--accent-ink, #34440b)",
          color: "var(--accent, #92b81e)",
          border: "1px solid var(--accent-border)",
          padding: "3px 6px",
          borderRadius: "20px",
          fontSize: "8px",
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          Coming Soon
        </span>
      )}
    </div>
    <div className="service-card-top"><span className="service-icon"><Icon size={24} /></span><span className="service-number">{String(index + 1).padStart(2, "0")}</span></div>
    <h3>{service.title}</h3><p>{service.description}</p>
    {!compact && <div className="service-meta"><span>From <b>₹{service.price}</b></span><span><Clock3 size={14} /> {service.duration}</span></div>}
    {isDisabled ? (
      <span className="card-link-disabled" style={{ display: "inline-flex", gap: "5px", alignItems: "center", color: "var(--muted)", fontSize: "11px", fontWeight: "800", cursor: "not-allowed", padding: "12px 0 0" }}>
        Coming Soon
      </span>
    ) : (
      <Link className="card-link" to={`/book/${bookingId}`} onClick={() => onBookService?.(service)}>Book service <ArrowRight size={15} /></Link>
    )}
  </article>;
}

function PricingCards({ condensed = false }) {
  return <div className="pricing-grid">{plans.map((plan) => <article className={`price-card ${plan.popular ? "featured" : ""}`} key={plan.name}>
    {plan.popular && <span className="popular-tag">Most popular</span>}
    <div><span className="eyebrow">{plan.name}</span><p className="price-note">{plan.note}</p></div>
    <div className="price"><sup>₹</sup>{plan.price}<small>/mo</small></div>
    <ul>{plan.features.map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}</ul>
    <Link className={`btn ${plan.popular ? "btn-primary" : "btn-ghost"}`} to="/pricing">{condensed ? "View plan" : "Choose plan"} <ArrowRight size={15} /></Link>
  </article>)}</div>;
}

function HomePage({ onBookService }) {
  const trustItems = ["Verified Pros", "Background Checked", "Insured Visits", "Same-Day Booking", "Transparent Pricing"];
  const services = useCatalogServices();
  const generalServices = useMemo(() => getGeneralCatalogServices(services), [services]);
  const mixedLandingServices = useMemo(
    () => interleaveServices(generalServices.slice(0, 4), beautyServices.slice(0, 4)).slice(0, 8),
    [generalServices]
  );
  const highlightedPages = useMemo(() => [
    {
      to: "/services",
      label: "Home services",
      title: "Cleaning, repairs and maintenance",
      copy: "Everyday care for the jobs that keep your home running.",
      image: generalServices[0]?.image || "/images/site/home-care.jpg",
      Icon: Home
    },
    {
      to: "/beauty",
      label: "Beauty services",
      title: "Salon and grooming at home",
      copy: "Facials, grooming, nail art, mehndi and styling in one beauty page.",
      image: "/images/site/beauty-salon.jpg",
      Icon: Sparkles,
      beauty: true
    }
  ], [generalServices]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: "", email: "", city: "", service: "Home cleaning", rating: 5, text: "" });
  const featuredTestimonials = getBestCustomerReviews([...customerReviews, ...testimonialSeeds]);

  useEffect(() => {
    getCustomerReviews().then(setCustomerReviews);
  }, []);

  const updateReview = (event) => {
    const { name, value } = event.target;
    setReviewForm((current) => ({ ...current, [name]: value }));
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!reviewForm.name.trim() || !reviewForm.email.trim() || !reviewForm.city.trim() || !reviewForm.text.trim()) {
      toast.error("Name, email, city, and review are required.");
      return;
    }

    setReviewSaving(true);
    try {
      const review = await saveCustomerReview(reviewForm);
      api.sendReviewConfirmation({ ...review, email: reviewForm.email.trim() }).catch((error) => {
        console.warn("Review confirmation email unavailable.", error);
      });
      const reviews = [review, ...customerReviews];
      setCustomerReviews(reviews);
      setReviewForm({ name: "", email: "", city: "", service: "Home cleaning", rating: 5, text: "" });
      const promoted = getBestCustomerReviews([...reviews, ...testimonialSeeds]).some(({ reviewId }) => reviewId === review.reviewId);
      toast.success(promoted ? "Review added to the featured testimonials." : "Thanks. Your review has been saved.");
    } finally {
      setReviewSaving(false);
    }
  };

  return <main className="landing-page">
    <section className="hero shell">
      <div className="hero-copy">
        <span className="eyebrow hero-eyebrow"><span className="live-dot" /> Trusted home care, one tap away</span>
        <h1><span className="hero-line">Your Home,</span><span className="hero-line hero-line-accent">Handled.</span></h1>
        <p>Trusted professionals for cleaning, maintenance and beauty, thoughtfully delivered to your doorstep.</p>
        <div className="hero-actions"><Link className="btn btn-primary" to="/services">Book a Service <ArrowRight size={17} /></Link><Link className="btn btn-ghost" to="/beauty">Explore Beauty</Link></div>
        <div className="stat-row"><span><Star size={15} fill="currentColor" /> 4.9 Rated</span><span><UsersRound size={15} /> 10,000+ Bookings</span><span><Clock3 size={15} /> Same-Day Slots</span></div>
      </div>
      <div className="hero-art">
        <img className="hero-photo" src="/images/site/home-care.jpg" alt="FunService home care professional" />
        <div className="art-grid" /><div className="orb orb-one" /><div className="orb orb-two" /><div className="orb orb-three" />
        <div className="hero-3d-cards" aria-hidden="true">
          <div className="hero-3d-card card-clean">
            <span><Sparkles size={18} /> Deep Clean</span>
            <strong>₹2,199</strong>
            <small>Today · 10:30 AM</small>
          </div>
          <div className="hero-3d-card card-care">
            <span><ShieldCheck size={18} /> Verified Pro</span>
            <strong>4.9 rating</strong>
            <small>Background checked</small>
          </div>
          <div className="hero-3d-card card-booked">
            <span><CreditCard size={18} /> Booking</span>
            <strong>Confirmed</strong>
            <small>Secure payment ready</small>
          </div>
        </div>
        <div className="art-card art-card-main"><span className="art-card-icon"><ShieldCheck size={20} /></span><div><strong>Verified professional</strong><small>Arriving in 24 minutes</small></div><span className="status-dot" /></div>
        <div className="art-card art-card-mini"><Sparkles size={17} /><span>Home care<br /><b>made simple.</b></span></div>
        <div className="art-pill"><CheckCircle2 size={14} /> Secure booking</div>
      </div>
    </section>
    <section className="landing-page-highlights shell">
      {highlightedPages.map(({ to, label, title, copy, image, Icon, beauty }) => (
        <Link className={`page-highlight-card ${beauty ? "beauty" : ""}`} to={to} key={to}>
          <img src={image} alt="" />
          <div>
            <span><Icon size={15} /> {label}</span>
            <h2>{title}</h2>
            <p>{copy}</p>
            <strong>Open page <ArrowRight size={15} /></strong>
          </div>
        </Link>
      ))}
    </section>
    <section className="services-section landing-mix-section shell section"><SectionHead label="Featured mix" title="Home Care And Beauty, Together" copy="Popular picks for tidy rooms, smooth repairs and at-home glow." link="/services" linkLabel="View home services" /><div className="services-grid">{mixedLandingServices.map((service, index) => <ServiceCard key={service.id} service={service} compact index={index} onBookService={onBookService} />)}</div></section>
    <section className="process-section section"><div className="shell"><SectionHead label="How it works" title="Three Steps. Zero Stress." copy="A smoother home starts with a few simple taps." /><div className="process-grid">{[["01", "Choose", "Pick a service and a slot that fits your day."], ["02", "Confirm", "Review your details and pay securely online."], ["03", "Relax", "A verified professional arrives right on time."]].map(([number, title, copy]) => <article className="process-step" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="trust-section"><div className="marquee">{[...trustItems, ...trustItems].map((item, index) => <span key={`${item}-${index}`}><BadgeCheck size={17} /> {item}</span>)}</div><div className="shell testimonial-wrap"><SectionHead label="Loved at home" title="The Kind Of Service People Talk About." copy="The three highest-rated customer reviews are promoted here automatically." /><div className="testimonials">{featuredTestimonials.map(({ reviewId, name, city, service, text, rating, image }) => <article className="testimonial" key={reviewId}><div className="stars">{Array.from({ length: rating }).map((_, index) => <Star key={index} size={14} fill="currentColor" />)}</div><p>"{text}"</p><div className="testimonial-person">{image ? <img src={image} alt="" /> : <span className="review-avatar-fallback">{name.slice(0, 1).toUpperCase()}</span>}<div><strong>{name}</strong><span>{city} · {service}</span></div></div></article>)}</div><section className="review-submit-panel"><div><span className="eyebrow">Share your experience</span><h3>Had a visit worth talking about?</h3><p>Submit a rating and note. The best customer reviews automatically move into the testimonial cards above.</p></div><form onSubmit={submitReview}><div className="review-form-grid"><label><span>Your name</span><input required name="name" value={reviewForm.name} onChange={updateReview} placeholder="Your name" /></label><label><span>Email</span><input required name="email" type="email" value={reviewForm.email} onChange={updateReview} placeholder="you@example.com" /></label><label><span>City</span><input required name="city" value={reviewForm.city} onChange={updateReview} placeholder="Bengaluru" /></label><label><span>Service</span><select name="service" value={reviewForm.service} onChange={updateReview}><option>Home cleaning</option><option>Maintenance</option><option>Repairs</option><option>Beauty at home</option></select></label><div className="review-rating"><span>Rating</span><div>{Array.from({ length: 5 }).map((_, index) => { const rating = index + 1; return <button className={rating <= reviewForm.rating ? "active" : ""} type="button" key={rating} onClick={() => setReviewForm((current) => ({ ...current, rating }))} aria-label={`${rating} star rating`}><Star size={18} fill="currentColor" /></button>; })}</div></div></div><label className="review-message"><span>Your review</span><textarea required name="text" value={reviewForm.text} onChange={updateReview} placeholder="Tell us what made the service feel effortless." /></label><button className="btn btn-primary" type="submit" disabled={reviewSaving}>{reviewSaving ? "Saving review..." : "Submit review"} {!reviewSaving && <ArrowRight size={15} />}</button></form></section></div></section>
    <section className="beauty-teaser shell"><div><span className="beauty-eyebrow">fixOindia beauty</span><h2>Glow<br /><i>Delivered.</i></h2><p>Salon rituals, skin care, grooming and celebration-ready details, all in the comfort of home.</p><Link className="btn btn-beauty" to="/beauty">Explore Beauty <ArrowRight size={16} /></Link></div><div className="beauty-collage"><div className="beauty-tile tile-one"><Flower2 /></div><div className="beauty-tile tile-two"><Sparkles /></div><div className="beauty-tile tile-three"><Scissors /></div></div></section>
    <section className="closing-cta shell"><span className="eyebrow">Ready when you are</span><h2>Give your to-do list<br />some breathing room.</h2><Link className="btn btn-primary" to="/services">Book your first service <ArrowRight size={16} /></Link></section>
  </main>;
}

// ServicesPage removed

function BeautyPage() {
  const [playingReel, setPlayingReel] = useState(false);
  const [selectedSalonId, setSelectedSalonId] = useState(beautySalons[0].id);
  const selectedSalon = beautySalons.find((salon) => salon.id === selectedSalonId) || beautySalons[0];
  return <main className="beauty-page simple-beauty-page">
    <section className="beauty-hero shell simple-beauty-hero"><div><span className="eyebrow">Beauty by fixOindia</span><h1>Beauty services, simply booked.</h1><p>Choose a salon listed by the owner, select a service, and book with the same clean checkout.</p><a className="btn btn-primary" href="#beauty-appointment">Book an appointment <ArrowRight size={16} /></a></div><div className="beauty-hero-art"><div className="beauty-arch"><img src="/images/site/beauty-salon.jpg" alt="At-home beauty service" /></div><div className="beauty-float"><Sparkles size={15} /> Verified beauty experts</div></div></section>
    <section className="shell beauty-section beauty-services-overview"><div className="beauty-heading"><span className="eyebrow">Beauty services</span><h2>Salon Care, Grooming And Glow.</h2><p>Facials, waxing, threading, grooming, mehndi and nail art from partner beauty experts at home.</p></div><div className="beauty-grid">{beautyServices.map((service, index) => { const Icon = service.icon; const bookingId = service.bookingId || service.id; return <article key={service.id}><div className="beauty-card-photo"><img src={service.image} alt={service.title} /></div><span>{String(index + 1).padStart(2, "0")} · {service.duration}</span><Icon size={24} /><h3>{service.title}</h3><p>{service.description}</p><strong>From ₹{service.price}</strong><Link to={`/book/${bookingId}`}>Book beauty service <ArrowRight size={14} /></Link></article>; })}</div></section>
    <section className="shell beauty-appointment-section" id="beauty-appointment"><div className="simple-section-title"><div><span className="eyebrow">Owner-listed salons</span><h2>Choose your salon</h2><p>Pick a partner and continue to a simple date-wise booking slot.</p></div></div><div className="beauty-salon-grid simple-salon-grid">{beautySalons.map((salon) => <button className={`beauty-salon-card ${selectedSalon.id === salon.id ? "selected" : ""}`} type="button" key={salon.id} onClick={() => setSelectedSalonId(salon.id)}><img src={salon.image} alt={salon.name} /><span className="beauty-salon-check"><BadgeCheck size={14} /> Owner listed</span><div><small>{salon.area}</small><h3>{salon.name}</h3><p>{salon.description}</p><strong><Star size={13} fill="currentColor" /> {salon.rating} rating</strong></div></button>)}</div><div className="simple-service-section beauty-salon-services"><div className="simple-section-title"><div><span className="eyebrow">Selected salon</span><h2>{selectedSalon.name}</h2><p>{selectedSalon.area} · Choose one service to continue.</p></div></div><div className="simple-catalog-grid">{selectedSalon.services.map((service) => { const Icon = service.icon; return <article className="simple-service-card" key={service.id}><Link to={`/book/beauty-${selectedSalon.id}-${service.id}`} className="simple-service-photo"><img src={service.image} alt={service.title} /><span><Icon size={14} /> Beauty</span></Link><div className="simple-service-body"><h3>{service.title}</h3><span className="simple-rating"><Star size={13} fill="currentColor" /> {selectedSalon.rating} ({service.duration})</span><div className="simple-price-row"><strong>₹{service.price}</strong><small>onwards</small></div><p>{service.description}</p><Link className="simple-add-btn" to={`/book/beauty-${selectedSalon.id}-${service.id}`}>Add</Link></div></article>; })}</div></div></section>
    <section className="shell beauty-reel-section simple-reel-section"><div className="beauty-reel-copy"><span className="eyebrow">Expert upload</span><h2>Preview the service.</h2><p>Watch a short expert video, then choose the salon and service that fits.</p><div className="beauty-expert"><img src="/images/site/expert-riya.jpg" alt="" /><div><strong>Riya Sharma</strong><span>Beauty expert</span></div></div></div><div className="beauty-reel">{playingReel ? <video controls autoPlay muted loop playsInline><source src="/videos/beauty-expert-reel.mp4" type="video/mp4" /></video> : <button className="beauty-reel-launch" type="button" onClick={() => setPlayingReel(true)} aria-label="Play beauty expert preview"><img src="/images/site/beauty-mehndi.jpg" alt="Beauty expert preview" /><span><PlayCircle size={42} /> Play expert preview</span></button>}<span><PlayCircle size={17} /> Uploaded by a verified beauty expert</span></div></section>
  </main>;
}

function PricingPage() {
  return <main className="page shell"><div className="centered-title"><span className="eyebrow">Membership</span><h1>Home care that<br />keeps up with life.</h1><p>Start small or hand us the whole list. Every plan includes verified professionals and transparent pricing.</p></div><PricingCards /><section className="plan-note"><LockKeyhole size={18} /><div><strong>Secure Stripe billing</strong><p>Upgrade, downgrade or cancel any time from your account.</p></div></section></main>;
}

function CartPage({ cartItems, onUpdateQuantity, onRemove }) {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return <main className="page shell cart-page">
    <div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><span>Cart</span></div>
    <div className="cart-head">
      <div>
        <span className="eyebrow">Your cart</span>
        <h1>Services ready to book.</h1>
        <p>Add services from the catalog, adjust quantity, then book the service you want.</p>
      </div>
      <Link className="btn btn-ghost btn-small" to="/services">Add more services <ArrowRight size={14} /></Link>
    </div>

    {cartItems.length ? (
      <div className="cart-layout">
        <section className="cart-list">
          {cartItems.map((item) => (
            <article className="cart-item" key={item.id}>
              <img src={item.image} alt={item.title} />
              <div className="cart-item-main">
                <span className="eyebrow">{item.category}</span>
                <h2>{item.title}</h2>
                <p>{item.description || item.duration}</p>
                <small>{item.duration} · ₹{item.price} each</small>
              </div>
              <div className="cart-item-actions">
                <div className="quantity-control">
                  <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>-</button>
                  <b>{item.quantity}</b>
                  <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= 10}>+</button>
                </div>
                <strong>₹{item.price * item.quantity}</strong>
                <Link className="btn btn-primary btn-small" to={`/book/${encodeURIComponent(item.id)}`}>Book this</Link>
                <button className="btn btn-ghost btn-small" type="button" onClick={() => onRemove(item.id)}>Remove</button>
              </div>
            </article>
          ))}
        </section>
        <aside className="cart-total-card">
          <span className="eyebrow">Cart total</span>
          <strong>₹{total}</strong>
          <p>{cartItems.length} service{cartItems.length > 1 ? "s" : ""} added. Choose “Book this” on any item to continue checkout.</p>
        </aside>
      </div>
    ) : (
      <section className="cart-empty">
        <ShoppingCart size={34} />
        <h2>Your cart is empty.</h2>
        <p>Add services from the catalog and they will show here.</p>
        <Link className="btn btn-primary" to="/services">Browse services <ArrowRight size={15} /></Link>
      </section>
    )}
  </main>;
}

const defaultSlotTimes = ["09:00 AM", "10:30 AM", "12:00 PM", "03:30 PM", "05:00 PM", "06:30 PM"];

const nextThreeBookingDays = () => Array.from({ length: 3 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index);
  return {
    key: date.toISOString().slice(0, 10),
    weekday: date.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase(),
    day: date.toLocaleDateString("en-IN", { day: "2-digit" }),
    label: date.toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" })
  };
});

function BookingPage({ cartItems = [], onUpdateCartQuantity }) {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const catalogServices = useCatalogServices();
  const activeService = catalogServices.find((service) => service.id === serviceId || service._id === serviceId) || beautyAppointments.find((service) => service.id === serviceId) || { id: serviceId, title: serviceId === "beauty-at-home" ? "Beauty At Home" : "Selected Service", description: "A verified FunService professional, booked around your day.", price: serviceId === "beauty-at-home" ? 999 : 499, icon: Sparkles };
  const activeServiceCartId = getServiceCartId(activeService);
  const cartItem = cartItems.find((item) => item.id === activeServiceCartId || item.id === serviceId);
  const bookingDays = useMemo(() => nextThreeBookingDays(), []);
  const firstAvailableDay = bookingDays[0];
  const [step, setStep] = useState(1), [selectedDate, setSelectedDate] = useState(firstAvailableDay.key), [selectedTime, setSelectedTime] = useState(defaultSlotTimes[0]);
  const [quantity, setQuantity] = useState(cartItem?.quantity || 1);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bookingTouched, setBookingTouched] = useState({});
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const Icon = activeService.icon;

  const paymentIcons = {
    "UPI": Phone,
    "Debit/Credit Card": CreditCard,
    "Net Banking": Landmark,
    "Wallet": WalletCards,
    "Cash on Service": Banknote
  };
  const unitPrice = Number(activeService.price) || 0;
  const bookingSubtotal = unitPrice * quantity;
  const bookingDiscount = Number(appliedCoupon?.discountAmount) || 0;
  const bookingTotal = appliedCoupon ? Number(appliedCoupon.finalAmount) : bookingSubtotal;
  const updateQuantity = (nextQuantity) => {
    const safeQuantity = Math.max(1, Math.min(10, nextQuantity));
    if (safeQuantity !== quantity) {
      setAppliedCoupon(null);
      setCouponError("");
    }
    setQuantity(safeQuantity);
    if (cartItem) onUpdateCartQuantity?.(cartItem.id, safeQuantity);
  };

  useEffect(() => {
    if (cartItem?.quantity) setQuantity(cartItem.quantity);
  }, [cartItem?.quantity]);

  useEffect(() => {
    const unsubscribe = onSessionChanged(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) return;

      const savedProfile = await getUserProfile(nextUser);
      setProfile(savedProfile);
      if (savedProfile) {
        setCustomer({
          name: savedProfile.name || "",
          phone: savedProfile.phone || "",
          address: [savedProfile.address, savedProfile.city].filter(Boolean).join(", ")
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await api.getPaymentMethods();
        setPaymentMethods(methods);
        setPaymentMethod((current) => current || methods.find(m => m.enabled !== false)?.method || methods[0]?.method || "");
      } catch {
        const fallback = [
          { method: "UPI", type: "online", description: "Pay securely with any UPI app.", enabled: true },
          { method: "Debit/Credit Card", type: "online", description: "Pay with a debit or credit card.", enabled: true },
          { method: "Cash on Service", type: "cash", description: "Pay the professional after the service.", enabled: true }
        ];
        setPaymentMethods(fallback);
        setPaymentMethod((current) => current || fallback[0].method);
      }
    };

    loadPaymentMethods();
  }, []);

  useEffect(() => {
    if (!bookingDays.some((day) => day.key === selectedDate)) {
      setSelectedDate(firstAvailableDay.key);
    }
  }, [bookingDays, firstAvailableDay.key, selectedDate]);

  const updateCustomer = (event) => {
    const { name, value } = event.target;
    setCustomer((current) => ({ ...current, [name]: value }));
  };

  const openPayment = () => {
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      setBookingSubmitted(true);
      toast.error("Name, phone number, and service address are required.");
      return;
    }
    setBookingSubmitted(false);
    setBookingTouched({});
    setStep(3);
  };

  const continueFromSlot = () => {
    if (!customer.phone.trim()) {
      setBookingSubmitted(true);
      toast.error("Mobile number is required for direct booking.");
      return;
    }
    if (!isPhoneLike(customer.phone)) {
      toast.error("Enter a valid mobile number (e.g. +91 98765 43210).");
      return;
    }
    setBookingSubmitted(false);
    setBookingTouched({});
    setStep(2);
  };

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponError("Enter a coupon code.");
      return;
    }

    if (!user) {
      toast.error("Sign in before applying a coupon.");
      navigate("/auth");
      return;
    }

    setCouponApplying(true);
    setCouponError("");
    try {
      const result = await api.applyCoupon({ code, orderAmount: bookingSubtotal });
      setAppliedCoupon(result);
      setCouponCode(result.code);
      toast.success(`Coupon ${result.code} applied.`);
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error.message || "Coupon could not be applied.");
    } finally {
      setCouponApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  const confirmBooking = async () => {
    if (!user) {
      toast.error("Sign in before confirming your booking.");
      navigate("/auth");
      return;
    }

    if (!profile) {
      toast.error("Complete your profile before confirming your booking.");
      navigate("/profile");
      return;
    }

    const selectedMethod = paymentMethods.find(({ method }) => method === paymentMethod);
    if (!selectedMethod) {
      toast.error("Choose an available payment method.");
      return;
    }

    setProcessing(true);
    try {
      const isCash = selectedMethod.type === "cash";
      let paymentStatus = isCash ? "Pending" : "Checking";

      if (!isCash) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        paymentStatus = "Paid";
      }

      if (!isCash && paymentStatus !== "Paid") {
        toast.error("Payment is not complete. Your booking has not been confirmed.");
        return;
      }

      const booking = await saveUserBooking(user, {
        serviceId: activeService.id,
        serviceName: quantity > 1 ? `${activeService.title} x ${quantity}` : activeService.title,
        customerName: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        date: bookingDays.find((day) => day.key === selectedDate)?.label || selectedDate,
        time: selectedTime,
        subtotalAmount: bookingSubtotal,
        amount: bookingTotal,
        salonName: activeService.salonName || "",
        couponCode: appliedCoupon?.code || "",
        paymentMethod,
        paymentStatus
      });
      setConfirmedBooking(booking);
      toast.success(
        paymentStatus === "Paid" ? "Payment complete. Booking confirmed." : "Booking confirmed."
      );
    } catch (error) {
      toast.error(error.message || "Could not confirm your booking.");
    } finally {
      setProcessing(false);
    }
  };

  const openBookingHistory = () => {
    if (!confirmedBooking) return;
    navigate("/profile?tab=history", { state: { freshBooking: confirmedBooking } });
  };

  const selectedPaymentType = paymentMethods.find(({ method }) => method === paymentMethod)?.type;
  const isCashBooking = selectedPaymentType === "cash";
  const noPaymentMethods = paymentMethods.length === 0;
  const selectedDayLabel = bookingDays.find((day) => day.key === selectedDate)?.label || selectedDate;

  const isServiceDisabled = activeService.enabled === false;

  return <main className="booking-page shell simple-booking-page">
    <div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><Link to="/services">Services</Link><ChevronRight size={13} /><span>Book</span></div>
    <div className="booking-layout simple-booking-layout"><aside className="booking-summary simple-booking-sidebar"><span className="eyebrow">Booking steps</span><h2>{activeService.title}</h2><p>{activeService.description}</p><div className="simple-step-list">{[["Slot", CalendarDays, step >= 1], ["Address", Home, step >= 2], ["Payment", CreditCard, step >= 3]].map(([label, StepIcon, active]) => <button className={active ? "active" : ""} type="button" key={label}><StepIcon size={16} /><span>{label}</span></button>)}</div>{activeService.salonName && <div className="summary-line"><span>Salon partner</span><strong>{activeService.salonName}</strong></div>}<div className="summary-line"><span>Selected slot</span><strong>{selectedDayLabel}, {selectedTime}</strong></div><div className="summary-line"><span>Quantity</span><strong>{quantity}</strong></div></aside>
      <section className="booking-panel">
      {isServiceDisabled ? (
        <div className="booking-form" style={{ display: "grid", placeItems: "center", textAlign: "center", padding: "40px 20px" }}>
          <Sparkles size={48} style={{ color: "var(--accent)", marginBottom: "16px" }} />
          <h1>This service is Coming Soon!</h1>
          <p style={{ maxWidth: "400px", margin: "8px 0 24px", color: "var(--muted)" }}>
            We're currently setting up this service with verified professionals in your region. Check back soon!
          </p>
          <Link className="btn btn-primary" to="/services">Explore other services <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <>
          <div className="booking-steps">{["Slot", "Address", "Payment"].map((label, index) => <span className={step >= index + 1 ? "active" : ""} key={label}><b>{index + 1}</b>{label}</span>)}</div>
          {step === 1 && <div className="booking-form"><span className="eyebrow">Step 01</span><h1>Choose a time that works.</h1><label><span>Mobile number</span><input required name="phone" value={customer.phone} onChange={updateCustomer} onBlur={() => setBookingTouched(curr => ({ ...curr, phone: true }))} placeholder="+91 98765 43210" className={(!customer.phone?.trim() && (bookingTouched.phone || bookingSubmitted)) ? "input-error" : ""} /></label><div className="calendar-card"><div className="calendar-head"><strong>Next 3 days</strong><span>Available slots</span></div><div className="date-row three-day-row">{bookingDays.map((day) => <button key={day.key} className={selectedDate === day.key ? "active" : ""} onClick={() => setSelectedDate(day.key)}><span>{day.weekday}</span><b>{day.day}</b></button>)}</div></div><div className="time-grid">{defaultSlotTimes.map((time) => <button className={selectedTime === time ? "active" : ""} key={time} onClick={() => setSelectedTime(time)}>{time}</button>)}</div><button className="btn btn-primary" onClick={continueFromSlot}>Continue to address <ArrowRight size={16} /></button></div>}
          {step === 2 && <div className="booking-form"><span className="eyebrow">Step 02</span><h1>Where should we arrive?</h1><label><span>Full name</span><input required name="name" value={customer.name} onChange={updateCustomer} onBlur={() => setBookingTouched(curr => ({ ...curr, name: true }))} placeholder="Your name" className={(!customer.name?.trim() && (bookingTouched.name || bookingSubmitted)) ? "input-error" : ""} /></label><label><span>Phone number</span><input required name="phone" value={customer.phone} onChange={updateCustomer} onBlur={() => setBookingTouched(curr => ({ ...curr, phone: true }))} placeholder="+91 98765 43210" className={(!customer.phone?.trim() && (bookingTouched.phone || bookingSubmitted)) ? "input-error" : ""} /></label><label><span>Service address</span><textarea required name="address" value={customer.address} onChange={updateCustomer} onBlur={() => setBookingTouched(curr => ({ ...curr, address: true }))} placeholder="Flat, building, street and landmark" className={(!customer.address?.trim() && (bookingTouched.address || bookingSubmitted)) ? "input-error" : ""} /></label><div className="form-actions"><button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary" onClick={openPayment}>Review payment <ArrowRight size={16} /></button></div></div>}
          {step === 3 && <div className="booking-form"><span className="eyebrow">Step 03</span><h1>Choose how to pay.</h1><div className="booking-quantity-box"><div><span>Quantity</span><strong>{quantity} service{quantity > 1 ? "s" : ""}</strong><small>₹{unitPrice} each</small></div><div className="quantity-control"><button type="button" onClick={() => updateQuantity(quantity - 1)} disabled={quantity <= 1}>-</button><b>{quantity}</b><button type="button" onClick={() => updateQuantity(quantity + 1)} disabled={quantity >= 10}>+</button></div></div>
            <div className="payment-method-grid">
              {paymentMethods.map((method) => {
                const PaymentIcon = paymentIcons[method.method] || CreditCard;
                const isMethodDisabled = method.enabled === false;
                return (
                  <button
                    type="button"
                    className={`payment-method ${paymentMethod === method.method ? "active" : ""} ${isMethodDisabled ? "disabled" : ""}`}
                    style={isMethodDisabled ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                    onClick={() => {
                      if (!isMethodDisabled) setPaymentMethod(method.method);
                    }}
                    disabled={isMethodDisabled}
                    key={method.method}
                  >
                    <PaymentIcon size={20} />
                    <span>
                      <strong>
                        {method.method} {isMethodDisabled && <span style={{ color: "var(--accent)", fontSize: "10px", marginLeft: "6px" }}>(Coming Soon)</span>}
                      </strong>
                      <small>{method.description}</small>
                    </span>
                    {paymentMethod === method.method && !isMethodDisabled && <CheckCircle2 size={17} />}
                  </button>
                );
              })}
            </div>
            <div className="coupon-apply-box">
              <label>
                <span>Coupon code</span>
                <div className="coupon-input-row">
                  <input value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponError(""); }} placeholder="SAVE100" disabled={couponApplying || Boolean(appliedCoupon)} />
                  {appliedCoupon ? (
                    <button className="btn btn-ghost btn-small" type="button" onClick={removeCoupon}>Remove</button>
                  ) : (
                    <button className="btn btn-primary btn-small" type="button" onClick={applyCoupon} disabled={couponApplying}>
                      {couponApplying ? "Applying..." : "Apply"}
                    </button>
                  )}
                </div>
              </label>
              {appliedCoupon && <p className="coupon-success"><CheckCircle2 size={14} /> {appliedCoupon.code} applied. You saved ₹{bookingDiscount}.</p>}
              {couponError && <p className="coupon-error">{couponError}</p>}
            </div>
            {!paymentMethods.length && <p className="payment-empty">No payment method is available right now. Please contact support.</p>}<div className="review-box"><span>{selectedDayLabel} at {selectedTime} · Qty {quantity}{appliedCoupon ? ` · Coupon ${appliedCoupon.code}` : ""}</span><strong>{appliedCoupon ? <><small>₹{bookingSubtotal}</small> ₹{bookingTotal}</> : `₹${bookingTotal}`}</strong></div><div className="form-actions"><button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button><button className="btn btn-primary" onClick={confirmBooking} disabled={processing || !paymentMethods.length}>{processing ? "Checking payment status..." : paymentMethods.find(({ method }) => method === paymentMethod)?.type === "cash" ? "Confirm cash booking" : "Pay and confirm"} {!processing && <ArrowRight size={16} />}</button></div></div>}
        </>
      )}
      </section>
      <aside className="simple-cart-column">
        <article className="simple-promise-card"><div><h3>Fun Promise</h3><p><Check size={15} /> Verified professionals</p><p><Check size={15} /> Hassle-free booking</p><p><Check size={15} /> Transparent pricing</p></div><span className="quality-stamp">Quality<br />Assured</span></article>
        <article className="simple-cart-card"><h3>Cart</h3><div className="simple-cart-line"><span>{activeService.title}</span><strong>₹{unitPrice}</strong></div><small>{selectedPaymentType === "cash" ? "Cash on service" : "Online payment"} · {selectedDayLabel}, {selectedTime}</small><div className="cart-quantity-row"><span>Quantity</span><div className="quantity-control compact"><button type="button" onClick={() => updateQuantity(quantity - 1)} disabled={quantity <= 1}>-</button><b>{quantity}</b><button type="button" onClick={() => updateQuantity(quantity + 1)} disabled={quantity >= 10}>+</button></div></div><div className="simple-savings"><BadgeCheck size={14} /> Platform protection included</div>{appliedCoupon && <div className="simple-savings coupon-saving-line"><CheckCircle2 size={14} /> Coupon saved ₹{bookingDiscount}</div>}<div className="simple-cart-total"><span>Amount to pay</span><strong>₹{bookingTotal}</strong></div><button className="btn btn-primary" type="button" onClick={() => step < 2 ? setStep(2) : step < 3 ? openPayment() : confirmBooking()} disabled={processing || isServiceDisabled || (step === 3 && !paymentMethods.length)}>{isServiceDisabled ? "Coming Soon" : step < 3 ? "Continue" : processing ? "Checking..." : "Confirm booking"}</button></article>
      </aside>
    </div>
    {confirmedBooking && (
      <div className="booking-confirmation-backdrop" role="dialog" aria-modal="true" aria-labelledby="booking-success-title">
        <section className="booking-confirmation-popup">
          <div className="success-panel booking-success-panel">
            <CheckCircle2 size={58} />
            <span className="eyebrow">Booking confirmed</span>
            <h2 id="booking-success-title">
              {confirmedBooking.paymentStatus === "Paid" ? "Payment successful." : "Booking successful."}
            </h2>
            <p>
              Your {confirmedBooking.serviceName} booking is saved for {confirmedBooking.date} at {confirmedBooking.time}.
            </p>
            <div className="booking-success-details">
              <span>
                <small>Booking ID</small>
                <strong>{confirmedBooking.bookingId}</strong>
              </span>
              <span>
                <small>Amount</small>
                <strong>₹{confirmedBooking.amount}</strong>
              </span>
              {Number(confirmedBooking.discountAmount) > 0 && (
                <span>
                  <small>Coupon</small>
                  <strong>{confirmedBooking.couponCode} saved ₹{confirmedBooking.discountAmount}</strong>
                </span>
              )}
              <span>
                <small>Payment</small>
                <strong>{confirmedBooking.paymentMethod} · {confirmedBooking.paymentStatus}</strong>
              </span>
            </div>
            <div className="success-actions">
              <button className="btn btn-primary" type="button" onClick={openBookingHistory}>
                Go to booking history <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
    )}
  </main>;
}

function DashboardPage() {
  return <Profile dashboardLayout />;
}

function AdminPage() {
  const initial = Object.fromEntries(checklistGroups.flatMap(([, items]) => items.map((item, index) => [item, index % 3 === 0])));
  const [checks, setChecks] = useState(initial), completed = Object.values(checks).filter(Boolean).length, total = Object.keys(checks).length;
  return <main className="admin-page shell"><div className="admin-head"><div><span className="eyebrow">Protected control</span><h1>Launch control.</h1><p>Track the final details before FunService goes live.</p></div><span className="secure-chip"><LockKeyhole size={15} /> Firebase custom claim required</span></div><div className="admin-stats">{[["₹2.4L", "Monthly bookings"], ["1,284", "Active customers"], ["4.91", "Average rating"], [`${completed}/${total}`, "Launch checks done"]].map(([value, label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</div><div className="admin-grid"><section className="checklist-panel"><div className="panel-head"><div><span className="eyebrow">Pre-launch checklist</span><h2>Production readiness</h2></div><Gauge size={22} /></div>{checklistGroups.map(([group, items]) => <div className="check-group" key={group}><h3>{group}</h3>{items.map((item) => <label key={item}><input type="checkbox" checked={checks[item]} onChange={() => setChecks({ ...checks, [item]: !checks[item] })} /><span>{item}</span></label>)}</div>)}</section><aside className="admin-side"><article><div className="panel-head"><h3>Dependency scanner</h3><ScanLine size={18} /></div><div className="scan-status"><CheckCircle2 size={18} /><div><strong>Healthy</strong><span>0 critical vulnerabilities</span></div></div><button className="btn btn-ghost btn-small">Run npm audit</button></article><article><div className="panel-head"><h3>Recent activity</h3><Bell size={18} /></div>{["New booking · Mumbai", "Payment captured · ₹999", "New review · 5 stars"].map((item) => <p className="activity" key={item}>{item}</p>)}</article></aside></div></main>;
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", type: "General support", message: "" });
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  useEffect(() => onSessionChanged((nextUser) => {
    setUser(nextUser);
    if (!nextUser) return;

    setForm((current) => ({
      ...current,
      name: current.name || (isPrivilegedUser(nextUser) ? "" : displayUserName(nextUser)),
      email: current.email || (isPrivilegedUser(nextUser) ? "" : nextUser.email) || ""
    }));
  }), []);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      const response = await api.createSupportMessage({
        userId: user?._id || user?.uid,
        name: form.name.trim(),
        email: form.email.trim(),
        message: `${form.type}: ${form.message.trim()}`
      });
      setTicketId(response.supportMessage?.ticketId || "");
      setSent(true);
    } catch (error) {
      toast.error(error.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  return <main className="page shell">
    <div className="contact-layout">
      <section>
        <span className="eyebrow">Support</span>
        <h1>We are here<br />when you need us.</h1>
        <p>Tell us what is happening and the care team will get back to you shortly.</p>
        <div className="contact-list">
          <span><Mail size={18} /><b>Email</b><small>support@funservice.in</small></span>
          <span><Phone size={18} /><b>Call</b><small>+91 8962635796 (Mon-Sun, 8 AM-10 PM)</small></span>
        </div>
      </section>
      <form className="contact-form" onSubmit={submit}>
        {sent ? (
          <div className="form-success">
            <CheckCircle2 size={34} />
            <h2>Message received.</h2>
            <p>{ticketId ? `Ticket ID: ${ticketId}` : "We will be in touch shortly."}</p>
          </div>
        ) : (
          <>
            <h2>How can we help?</h2>
            <label>
              <span>Name</span>
              <input required name="name" value={form.name} onChange={update} placeholder="Your name" />
            </label>
            <label>
              <span>Email</span>
              <input required name="email" value={form.email} onChange={update} type="email" placeholder="you@example.com" />
            </label>
            <label>
              <span>Type</span>
              <select name="type" value={form.type} onChange={update}>
                <option>General support</option>
                <option>Booking help</option>
                <option>Bug report</option>
                <option>Payment issue</option>
              </select>
            </label>
            <label>
              <span>Message</span>
              <textarea required name="message" value={form.message} onChange={update} placeholder="Tell us a little more" />
            </label>
            <button className="btn btn-primary" disabled={sending}>
              {sending ? "Sending..." : "Send message"} {!sending && <ArrowRight size={16} />}
            </button>
          </>
        )}
      </form>
    </div>
  </main>;
}

function LegalPage({ title, type }) {
  const groups = type === "privacy" ? [["Information we collect", "We collect account, booking, payment reference and service address information required to deliver your requested services."], ["How we use your information", "Your information helps us schedule professionals, confirm visits, process payments and improve the quality of the platform."], ["Data protection", "Sensitive keys stay on secure backend systems. Access to personal data is restricted, logged and reviewed."]] : type === "cookies" ? [["Essential cookies", "These cookies keep your session, preferences and booking flow working correctly."], ["Analytics cookies", "With your consent, analytics help us understand which journeys are useful and where the experience can improve."], ["Your choices", "You may update your cookie preferences at any time. Consent is refreshed periodically."]] : [["Using FunService", "By using FunService, you agree to provide accurate booking information and use the platform for lawful home-service requests."], ["Bookings and payments", "Prices, slot availability and cancellation details are shown before checkout. Payment processing is handled securely."], ["Service quality", "We work with verified professionals and review every reported issue carefully."]];
  return <main className="legal-page shell"><span className="eyebrow">fixOindia legal</span><h1>{title}</h1><p className="legal-date">Last updated: May 31, 2026</p>{groups.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</main>;
}

function Footer() {
  return <footer className="site-footer"><div className="shell footer-grid"><div><Logo /><p>Your home. Handled. Trusted care for homes that have enough going on.</p></div><div><h4>Services</h4><Link to="/services">Home cleaning</Link><Link to="/services">Maintenance</Link><Link to="/beauty">Beauty at home</Link></div><div><h4>Company</h4><Link to="/vision">AI Vision</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link><Link to="/cookies">Cookie policy</Link></div><div><h4>Connect</h4><a href="#"><Instagram size={15} /> Instagram</a><a href="tel:8962635796"><Phone size={15} /> 8962635796</a><span className="footer-note">Made for urban India</span></div></div><div className="shell footer-bottom"><span>© 2026 FunService. All rights reserved.</span><span>Securely booked. Thoughtfully delivered.</span></div></footer>;
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(!localStorage.getItem("funservice-cookie-consent")), []);
  if (!visible) return null;
  return <aside className="cookie-banner"><div><strong>A small note about cookies.</strong><p>We use essential cookies and optional analytics to make fixOindia work beautifully.</p></div><div><Link to="/cookies">Learn more</Link><button className="btn btn-primary btn-small" onClick={() => { localStorage.setItem("funservice-cookie-consent", new Date().toISOString()); setVisible(false); }}>Accept</button></div></aside>;
}

function AiGeneratorPage() {
  return (
    <main className="page shell vision-coming-page">
      <section className="vision-coming-card">
        <div className="vision-orbit vision-orbit-one" />
        <div className="vision-orbit vision-orbit-two" />
        <div className="vision-grid" />
        <div className="vision-coming-content">
          <span className="eyebrow"><WandSparkles size={15} /> AI Vision</span>
          <span className="vision-coming-pill"><span /> Coming Soon</span>
          <h1>Imagine the change<br /><i>before it begins.</i></h1>
          <p>fixOindia AI Vision is getting ready to help you preview thoughtful home transformations from a simple description.</p>
          <div className="vision-coming-status">
            <span><Sparkles size={16} /> Design previews</span>
            <span><Home size={16} /> Home-first ideas</span>
            <span><ShieldCheck size={16} /> Safe generation</span>
          </div>
        </div>
        <div className="vision-preview">
          <span className="vision-preview-dot dot-one" />
          <span className="vision-preview-dot dot-two" />
          <span className="vision-preview-dot dot-three" />
          <div className="vision-preview-room">
            <Home size={58} />
            <span>AI preview preparing</span>
          </div>
          <div className="vision-preview-scan" />
        </div>
      </section>
    </main>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const services = useCatalogServices();
  const generalServices = useMemo(() => getGeneralCatalogServices(services), [services]);
  const searchableServices = useMemo(
    () => [...generalServices, ...beautyServices.map(normalizeService)],
    [generalServices]
  );
  const [cartItems, setCartItems] = useState(readCartItems);
  const [sessionUser, setSessionUser] = useState(null);
  const [loginPopupOpen, setLoginPopupOpen] = useState(false);
  const ownerRoute = location.pathname === "/owner" || location.pathname === "/backend";
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const authRoute = location.pathname === "/auth" || location.pathname === "/login";

  useEffect(() => onSessionChanged(setSessionUser), []);

  useEffect(() => {
    if (sessionUser || ownerRoute || authRoute) {
      setLoginPopupOpen(false);
      return;
    }
    setLoginPopupOpen(true);
  }, [sessionUser, ownerRoute, authRoute, location.pathname]);

  const updateCart = (updater) => {
    setCartItems((current) => saveCartItems(updater(current)));
  };

  const addToCart = (service) => {
    const item = normalizeCartItem(service);
    if (!item.id || !item.title) return;

    updateCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: Math.min(10, cartItem.quantity + 1) }
            : cartItem
        );
      }
      return [...current, item];
    });
    navigate(`/book/${item.id}`);
  };

  const updateCartQuantity = (id, quantity) => {
    updateCart((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) } : item
      )
    );
  };

  const removeFromCart = (id) => {
    updateCart((current) => current.filter((item) => item.id !== id));
    toast.success("Service removed from cart.");
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <>
      {!ownerRoute && <Navbar cartCount={cartCount} />}
      <div className="route-stage" key={location.pathname}>
        <Routes>
          <Route path="/" element={<HomePage onBookService={addToCart} />} />
          <Route path="/services" element={<Services services={generalServices} searchableServices={searchableServices} onBookService={addToCart} />} />
          <Route path="/cart" element={<CartPage cartItems={cartItems} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} />} />
          <Route path="/beauty" element={<BeautyPage />} />
          <Route path="/pricing" element={<Navigate to="/" replace />} />
          <Route path="/vision" element={<AiGeneratorPage />} />
          <Route path="/book/:serviceId" element={<BookingPage cartItems={cartItems} onUpdateCartQuantity={updateCartQuantity} />} />
          <Route path="/auth" element={<LoginSignup />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<Profile />} />
          {import.meta.env.DEV && <Route path="/profile-skeleton-preview" element={<ProfileSkeletonCapture />} />}
          <Route path="/owner" element={<OwnerPanel />} />
          <Route path="/backend" element={<Navigate to="/owner" replace />} />
          <Route path="/admin" element={<Navigate to="/owner" replace />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/support" element={<Navigate to="/contact" replace />} />
          <Route path="/history" element={<Navigate to="/profile?tab=history" replace />} />
          <Route path="/booking-status" element={<Navigate to="/profile" replace />} />
          <Route path="/booking-status/:bookingId" element={<BookingStatus />} />
          <Route path="/privacy" element={<LegalPage title="Privacy Policy" type="privacy" />} />
          <Route path="/terms" element={<LegalPage title="Terms of Service" type="terms" />} />
          <Route path="/cookies" element={<LegalPage title="Cookie Policy" type="cookies" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!ownerRoute && <Footer />}
      {!ownerRoute && <CookieBanner />}
      {loginPopupOpen && !sessionUser && !ownerRoute && !authRoute && (
        <LoginSignup
          compact
          onDismiss={() => setLoginPopupOpen(false)}
          onAuthenticated={() => {
            setLoginPopupOpen(false);
            navigate("/");
          }}
        />
      )}
    </>
  );
}

export default App;
