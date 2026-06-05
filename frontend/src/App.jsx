import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import OwnerPanel from "./pages/OwnerPanel.jsx";
import LoginSignup from "./pages/LoginSignup.jsx";
import Profile, { ProfileSkeletonCapture } from "./pages/Profile.jsx";
import {
  ArrowRight, BadgeCheck, Banknote, Bell, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronRight, Clock3, CreditCard, Droplets, Flower2, Gauge, Home, Instagram,
  Landmark, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, MessageCircle, Paintbrush, Phone, Refrigerator,
  PlayCircle, ScanLine, Scissors, Search, ShieldCheck, Sparkles, Star, UserRound, UsersRound,
  WalletCards, WandSparkles, WashingMachine, Wind, Wrench, X, Zap
} from "lucide-react";
import { api } from "./api/client.js";
import { getUserProfile } from "./data/profileStore.js";
import { saveUserBooking } from "./data/bookingStore.js";
import { getBestCustomerReviews, getCustomerReviews, saveCustomerReview } from "./data/reviewStore.js";
import { logoutSession, onSessionChanged } from "./data/sessionStore.js";

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

const paymentConfirmationAnimation = "/animations/payment-confirmation.json";
const cashBookingConfirmationAnimation = "/animations/cash-booking-confirmed.json";

function BookingConfirmationAnimation({ compact = false, paymentStatus }) {
  const isPaid = paymentStatus === "Paid";
  return (
    <div className={compact ? "payment-lottie compact" : "payment-lottie"} aria-hidden="true">
      <DotLottieReact src={isPaid ? paymentConfirmationAnimation : cashBookingConfirmationAnimation} loop autoplay />
    </div>
  );
}

const beautyServices = [
  ["Women's Salon", "Hair, styling and spa rituals", Scissors, "/images/site/beauty-salon.jpg"],
  ["Facial & Cleanup", "Glow-led skin care at home", Sparkles, "/images/site/beauty-facial.jpg"],
  ["Waxing", "Comfortable, hygienic essentials", WandSparkles, "/images/site/beauty-facial.jpg"],
  ["Threading", "Precise finishing touches", ScanLine, "/images/site/beauty-threading.jpg"],
  ["Mehndi", "Intricate designs for every celebration", Flower2, "/images/site/beauty-mehndi.jpg"],
  ["Nail Art", "Polished details, made personal", Sparkles, "/images/site/beauty-nails.jpg"],
  ["Men's Grooming", "Sharp, effortless home grooming", Scissors, "/images/site/beauty-grooming.jpg"],
  ["Men's Facial", "Skin reset and refresh", Sparkles, "/images/site/beauty-mens-facial.jpg"]
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
  { name: "Essentials", price: "499", note: "For the quick fixes", features: ["1 service credit", "Verified professional", "Standard support"] },
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
  return <Link className="brand" to="/"><span className="brand-mark"><Home size={17} /></span><span>FunService<span className="brand-dot">.</span></span></Link>;
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const canOpenBackend = user?.role === "admin" || user?.role === "owner";
  const links = [["/", "Home"], ["/services", "Services"], ["/beauty", "Beauty"], ["/pricing", "Pricing"], ["/vision", "AI Vision"], ["/contact", "Support"]];

  useEffect(() => onSessionChanged(setUser), []);

  return <header className="site-nav">
    <div className="nav-inner shell">
      <Logo />
      <button className="mobile-toggle" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
      <nav className={`nav-links ${open ? "is-open" : ""}`}>{links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={to === "/beauty" ? "beauty-link" : ""}>{label}</NavLink>)}{canOpenBackend && <Link className="mobile-account-link" to="/backend" onClick={() => setOpen(false)}><LayoutDashboard size={15} /> Backend Panel</Link>}<Link className="mobile-account-link" to={user ? "/profile" : "/auth"} onClick={() => setOpen(false)}><UserRound size={15} /> {user ? "Profile" : "Login / Signup"}</Link></nav>
      <div className="nav-actions">{canOpenBackend && <Link className="btn btn-ghost btn-small" to="/backend">Backend Panel</Link>}<Link className="btn btn-ghost btn-small" to={user ? "/profile" : "/auth"}>{user ? "Profile" : "Login"}</Link><Link className="btn btn-primary btn-small" to="/book/house-maid">Book Now <ArrowRight size={15} /></Link></div>
    </div>
    {location.pathname === "/beauty" && <div className="beauty-nav-line" />}
  </header>;
}

function SectionHead({ label, title, copy, link, linkLabel = "Explore all" }) {
  return <div className="section-head"><div>{label && <span className="eyebrow">{label}</span>}<h2>{title}</h2>{copy && <p>{copy}</p>}</div>{link && <Link className="text-link" to={link}>{linkLabel} <ArrowRight size={16} /></Link>}</div>;
}

function ServiceCard({ service, compact = false, index = 0 }) {
  const Icon = service.icon;
  return <article className={`service-card ${compact ? "compact" : ""}`}>
    <div className="service-photo"><img src={service.image} alt="" /></div>
    <div className="service-card-top"><span className="service-icon"><Icon size={24} /></span><span className="service-number">{String(index + 1).padStart(2, "0")}</span></div>
    <h3>{service.title}</h3><p>{service.description}</p>
    {!compact && <div className="service-meta"><span>From <b>₹{service.price}</b></span><span><Clock3 size={14} /> {service.duration}</span></div>}
    <Link className="card-link" to={`/book/${service.id}`}>Book service <ArrowRight size={15} /></Link>
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

function HomePage() {
  const trustItems = ["Verified Pros", "Background Checked", "Insured Visits", "Same-Day Booking", "Transparent Pricing"];
  const services = useCatalogServices();
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
        <div className="hero-actions"><Link className="btn btn-primary" to="/services">Book a Service <ArrowRight size={17} /></Link><Link className="btn btn-ghost" to="/services">See All Services</Link></div>
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
    <section className="services-section shell section"><SectionHead label="What we do" title="Every Service Your Home Needs" copy="Thoughtful care, qualified hands, no guesswork." link="/services" /><div className="services-grid">{services.slice(0, 8).map((service, index) => <ServiceCard key={service.id} service={service} compact index={index} />)}</div></section>
    <section className="process-section section"><div className="shell"><SectionHead label="How it works" title="Three Steps. Zero Stress." copy="A smoother home starts with a few simple taps." /><div className="process-grid">{[["01", "Choose", "Pick a service and a slot that fits your day."], ["02", "Confirm", "Review your details and pay securely online."], ["03", "Relax", "A verified professional arrives right on time."]].map(([number, title, copy]) => <article className="process-step" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="trust-section"><div className="marquee">{[...trustItems, ...trustItems].map((item, index) => <span key={`${item}-${index}`}><BadgeCheck size={17} /> {item}</span>)}</div><div className="shell testimonial-wrap"><SectionHead label="Loved at home" title="The Kind Of Service People Talk About." copy="The three highest-rated customer reviews are promoted here automatically." /><div className="testimonials">{featuredTestimonials.map(({ reviewId, name, city, service, text, rating, image }) => <article className="testimonial" key={reviewId}><div className="stars">{Array.from({ length: rating }).map((_, index) => <Star key={index} size={14} fill="currentColor" />)}</div><p>"{text}"</p><div className="testimonial-person">{image ? <img src={image} alt="" /> : <span className="review-avatar-fallback">{name.slice(0, 1).toUpperCase()}</span>}<div><strong>{name}</strong><span>{city} · {service}</span></div></div></article>)}</div><section className="review-submit-panel"><div><span className="eyebrow">Share your experience</span><h3>Had a visit worth talking about?</h3><p>Submit a rating and note. The best customer reviews automatically move into the testimonial cards above.</p></div><form onSubmit={submitReview}><div className="review-form-grid"><label><span>Your name</span><input required name="name" value={reviewForm.name} onChange={updateReview} placeholder="Your name" /></label><label><span>Email</span><input required name="email" type="email" value={reviewForm.email} onChange={updateReview} placeholder="you@example.com" /></label><label><span>City</span><input required name="city" value={reviewForm.city} onChange={updateReview} placeholder="Bengaluru" /></label><label><span>Service</span><select name="service" value={reviewForm.service} onChange={updateReview}><option>Home cleaning</option><option>Maintenance</option><option>Repairs</option><option>Beauty at home</option></select></label><div className="review-rating"><span>Rating</span><div>{Array.from({ length: 5 }).map((_, index) => { const rating = index + 1; return <button className={rating <= reviewForm.rating ? "active" : ""} type="button" key={rating} onClick={() => setReviewForm((current) => ({ ...current, rating }))} aria-label={`${rating} star rating`}><Star size={18} fill="currentColor" /></button>; })}</div></div></div><label className="review-message"><span>Your review</span><textarea required name="text" value={reviewForm.text} onChange={updateReview} placeholder="Tell us what made the service feel effortless." /></label><button className="btn btn-primary" type="submit" disabled={reviewSaving}>{reviewSaving ? "Saving review..." : "Submit review"} {!reviewSaving && <ArrowRight size={15} />}</button></form></section></div></section>
    <section className="beauty-teaser shell"><div><span className="beauty-eyebrow">FunService beauty</span><h2>Glow<br /><i>Delivered.</i></h2><p>Salon rituals, skin care, grooming and celebration-ready details, all in the comfort of home.</p><Link className="btn btn-beauty" to="/beauty">Explore Beauty <ArrowRight size={16} /></Link></div><div className="beauty-collage"><div className="beauty-tile tile-one"><Flower2 /></div><div className="beauty-tile tile-two"><Sparkles /></div><div className="beauty-tile tile-three"><Scissors /></div></div></section>
    <section className="pricing-section shell section"><SectionHead label="Care plans" title="A Little Less To Think About" copy="Simple monthly plans for the tasks that keep life moving." link="/pricing" linkLabel="Compare plans" /><PricingCards condensed /></section>
    <section className="closing-cta shell"><span className="eyebrow">Ready when you are</span><h2>Give your to-do list<br />some breathing room.</h2><Link className="btn btn-primary" to="/services">Book your first service <ArrowRight size={16} /></Link></section>
  </main>;
}

function ServicesPage() {
  const services = useCatalogServices();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const normalizedQuery = query.trim().toLowerCase();
  const visible = services.filter((service) => {
    const matchesCategory = filter === "All" || service.category === filter;
    const matchesQuery = !normalizedQuery || [service.title, service.category, service.description]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesCategory && matchesQuery;
  });
  return <main className="page shell services-page">
    <div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><span>Services</span></div>
    <div className="page-title-row"><div><span className="eyebrow">Service catalog</span><h1>Care for every corner.</h1><p>Browse trusted services with clear pricing and thoughtfully designed visits.</p></div><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services" aria-label="Search services" /></label></div>
    <div className="filter-row">{["All", "Cleaning", "Maintenance", "Repairs"].map((category) => <button className={filter === category ? "active" : ""} key={category} onClick={() => setFilter(category)}>{category}</button>)}</div>
    {visible.length ? <div className="catalog-grid">{visible.map((service) => { const Icon = service.icon; const isExpanded = expanded === service.id; return <article className={`catalog-card ${isExpanded ? "expanded" : ""}`} key={service.id}><div className="catalog-photo"><img src={service.image} alt={service.title} /></div><div className="catalog-main"><span className="catalog-number">{String(services.indexOf(service) + 1).padStart(2, "0")}</span><span className="service-icon"><Icon size={22} /></span><div><span className="catalog-category">{service.category}</span><h3>{service.title}</h3><p>{service.description}</p></div><button aria-label={`Expand ${service.title}`} onClick={() => setExpanded(isExpanded ? null : service.id)}><ChevronDown size={19} /></button></div>{isExpanded && <div className="catalog-details"><div><span>Starting at</span><strong>₹{service.price}</strong></div><div><span>Typical visit</span><strong>{service.duration}</strong></div><div><span>Region</span><strong>{service.region || "All Regions"}</strong></div><Link className="btn btn-primary btn-small" to={`/book/${service.id}`}>Book now <ArrowRight size={15} /></Link></div>}</article>; })}</div> : <div className="catalog-empty"><Search size={24} /><strong>No services found.</strong><p>Try another search or choose a different category.</p><button className="btn btn-ghost btn-small" type="button" onClick={() => { setFilter("All"); setQuery(""); }}>Clear filters</button></div>}
  </main>;
}

function BeautyPage() {
  const [playingReel, setPlayingReel] = useState(false);
  const [selectedSalonId, setSelectedSalonId] = useState(beautySalons[0].id);
  const selectedSalon = beautySalons.find((salon) => salon.id === selectedSalonId) || beautySalons[0];
  return <main className="beauty-page">
    <section className="beauty-hero shell"><div><span className="beauty-eyebrow">Beauty by FunService</span><h1>Beauty At Your<br /><i>Doorstep.</i></h1><p>A little luxury, brought home. Expert salon and grooming experiences designed around your time.</p><a className="btn btn-beauty" href="#beauty-appointment">Book an appointment <ArrowRight size={16} /></a></div><div className="beauty-hero-art"><div className="beauty-arch"><img src="/images/site/beauty-salon.jpg" alt="At-home beauty service" /></div><div className="beauty-float"><Sparkles size={15} /> Personalized care</div></div></section>
    <section className="shell beauty-appointment-section" id="beauty-appointment"><div className="beauty-heading"><span className="beauty-eyebrow">Owner-listed salons</span><h2>Choose your salon. Then choose your ritual.</h2><p>Every salon is reviewed by the owner before it appears here. Pick a partner and book a service with the same simple checkout used across FunService.</p></div><div className="beauty-salon-grid">{beautySalons.map((salon) => <button className={`beauty-salon-card ${selectedSalon.id === salon.id ? "selected" : ""}`} type="button" key={salon.id} onClick={() => setSelectedSalonId(salon.id)}><img src={salon.image} alt={salon.name} /><span className="beauty-salon-check"><BadgeCheck size={14} /> Owner listed</span><div><small>{salon.area}</small><h3>{salon.name}</h3><p>{salon.description}</p><strong><Star size={13} fill="currentColor" /> {salon.rating} rating</strong></div></button>)}</div><div className="beauty-salon-services"><div className="beauty-salon-services-head"><div><span className="beauty-eyebrow">Selected salon</span><h3>{selectedSalon.name}</h3><p>{selectedSalon.area} · Choose one service to continue to slot selection.</p></div><BadgeCheck size={22} /></div><div className="beauty-salon-service-grid">{selectedSalon.services.map((service) => { const Icon = service.icon; return <article key={service.id}><img src={service.image} alt={service.title} /><div><Icon size={19} /><h4>{service.title}</h4><p>{service.description}</p><span><strong>₹{service.price}</strong><small>{service.duration}</small></span><Link className="btn btn-beauty btn-small" to={`/book/beauty-${selectedSalon.id}-${service.id}`}>Book appointment <ArrowRight size={14} /></Link></div></article>; })}</div></div></section>
    <section className="shell beauty-reel-section"><div className="beauty-reel-copy"><span className="beauty-eyebrow">Expert upload · 00:19</span><h2>A little preview before your appointment.</h2><p>Watch one of our beauty experts at work, then choose an at-home service that fits your ritual.</p><div className="beauty-expert"><img src="/images/site/expert-riya.jpg" alt="" /><div><strong>Riya Sharma</strong><span>Beauty expert · bridal and glow rituals</span></div></div><a className="btn btn-beauty" href="#beauty-appointment">Choose a salon <ArrowRight size={16} /></a></div><div className="beauty-reel">{playingReel ? <video controls autoPlay muted loop playsInline><source src="/videos/beauty-expert-reel.mp4" type="video/mp4" /></video> : <button className="beauty-reel-launch" type="button" onClick={() => setPlayingReel(true)} aria-label="Play beauty expert preview"><img src="/images/site/beauty-mehndi.jpg" alt="Beauty expert preview" /><span><PlayCircle size={42} /> Play expert preview</span></button>}<span><PlayCircle size={17} /> Uploaded by a verified beauty expert</span></div></section>
    <section className="shell beauty-section"><div className="beauty-heading"><span className="beauty-eyebrow">The menu</span><h2>Your ritual. Your room.</h2></div><div className="beauty-grid">{beautyServices.map(([title, description, Icon, image], index) => <article key={title}><div className="beauty-card-photo"><img src={image} alt="" /></div><span>{String(index + 1).padStart(2, "0")}</span><Icon size={22} /><h3>{title}</h3><p>{description}</p><a href="#beauty-appointment">Choose salon <ArrowRight size={14} /></a></article>)}</div></section>
    <section className="shell beauty-packages"><div className="beauty-heading"><span className="beauty-eyebrow">Curated bundles</span><h2>For your kind of occasion.</h2></div><div className="beauty-package-grid">{[["Everyday Glow", "A soft reset for busy weeks", "₹1,299"], ["Festival Ready", "A little extra polish for the calendar", "₹2,499"], ["Bridal Ritual", "A tailored pre-event care plan", "₹7,999"]].map(([name, copy, price]) => <article key={name}><Flower2 size={21} /><h3>{name}</h3><p>{copy}</p><strong>{price}</strong></article>)}</div></section>
    <section className="shell gallery-section"><div className="beauty-heading"><span className="beauty-eyebrow">Moodboard</span><h2>Quietly indulgent.</h2></div><div className="beauty-gallery">{Array.from({ length: 6 }).map((_, index) => <div key={index} className={`gallery-tile gallery-${index + 1}`} />)}</div></section>
  </main>;
}

function PricingPage() {
  return <main className="page shell"><div className="centered-title"><span className="eyebrow">Membership</span><h1>Home care that<br />keeps up with life.</h1><p>Start small or hand us the whole list. Every plan includes verified professionals and transparent pricing.</p></div><PricingCards /><section className="plan-note"><LockKeyhole size={18} /><div><strong>Secure Stripe billing</strong><p>Upgrade, downgrade or cancel any time from your account.</p></div></section></main>;
}

function BookingPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const catalogServices = useCatalogServices();
  const activeService = catalogServices.find((service) => service.id === serviceId || service._id === serviceId) || beautyAppointments.find((service) => service.id === serviceId) || { id: serviceId, title: serviceId === "beauty-at-home" ? "Beauty At Home" : "Selected Service", description: "A verified FunService professional, booked around your day.", price: serviceId === "beauty-at-home" ? 999 : 499, icon: Sparkles };
  const [step, setStep] = useState(1), [selectedDate, setSelectedDate] = useState("02"), [selectedTime, setSelectedTime] = useState("10:30 AM");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [processing, setProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const Icon = activeService.icon;

  const paymentIcons = {
    "UPI": Phone,
    "Debit/Credit Card": CreditCard,
    "Net Banking": Landmark,
    "Wallet": WalletCards,
    "Cash on Service": Banknote
  };

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
        setPaymentMethod((current) => current || methods[0]?.method || "");
      } catch {
        const fallback = [
          { method: "UPI", type: "online", description: "Pay securely with any UPI app." },
          { method: "Debit/Credit Card", type: "online", description: "Pay with a debit or credit card." },
          { method: "Cash on Service", type: "cash", description: "Pay the professional after the service." }
        ];
        setPaymentMethods(fallback);
        setPaymentMethod((current) => current || fallback[0].method);
      }
    };

    loadPaymentMethods();
  }, []);

  const updateCustomer = (event) => {
    const { name, value } = event.target;
    setCustomer((current) => ({ ...current, [name]: value }));
  };

  const openPayment = () => {
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      toast.error("Name, phone number, and service address are required.");
      return;
    }
    setStep(3);
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
        serviceName: activeService.title,
        customerName: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        date: `June ${selectedDate}, 2026`,
        time: selectedTime,
        amount: activeService.price,
        salonName: activeService.salonName || "",
        paymentMethod,
        paymentStatus
      });
      setConfirmedBooking(booking);
      setStep(4);
    } catch (error) {
      toast.error(error.message || "Could not confirm your booking.");
    } finally {
      setProcessing(false);
    }
  };

  return <main className="booking-page shell">
    <div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><Link to="/services">Services</Link><ChevronRight size={13} /><span>Book</span></div>
    <div className="booking-layout"><aside className="booking-summary"><span className="eyebrow">Your booking</span><span className="booking-service-icon"><Icon size={26} /></span><h2>{activeService.title}</h2><p>{activeService.description}</p>{activeService.salonName && <div className="summary-line"><span>Salon partner</span><strong>{activeService.salonName}</strong></div>}<div className="summary-line"><span>Professional visit</span><strong>₹{activeService.price}</strong></div><div className="summary-line"><span>Platform protection</span><strong>Included</strong></div><div className="summary-total"><span>Total</span><strong>₹{activeService.price}</strong></div></aside>
      <section className="booking-panel"><div className="booking-steps">{["Slot", "Address", "Payment", "Done"].map((label, index) => <span className={step >= index + 1 ? "active" : ""} key={label}><b>{index + 1}</b>{label}</span>)}</div>
      {step === 1 && <div className="booking-form"><span className="eyebrow">Step 01</span><h1>Choose a time that works.</h1><div className="calendar-card"><div className="calendar-head"><strong>June 2026</strong><span>Next available slots</span></div><div className="date-row">{[["MON", "01"], ["TUE", "02"], ["WED", "03"], ["THU", "04"], ["FRI", "05"], ["SAT", "06"]].map(([day, date]) => <button key={date} className={selectedDate === date ? "active" : ""} onClick={() => setSelectedDate(date)}><span>{day}</span><b>{date}</b></button>)}</div></div><div className="time-grid">{["09:00 AM", "10:30 AM", "12:00 PM", "03:30 PM", "05:00 PM", "06:30 PM"].map((time) => <button className={selectedTime === time ? "active" : ""} key={time} onClick={() => setSelectedTime(time)}>{time}</button>)}</div><button className="btn btn-primary" onClick={() => setStep(2)}>Continue to address <ArrowRight size={16} /></button></div>}
      {step === 2 && <div className="booking-form"><span className="eyebrow">Step 02</span><h1>Where should we arrive?</h1><label><span>Full name</span><input name="name" value={customer.name} onChange={updateCustomer} placeholder="Your name" /></label><label><span>Phone number</span><input name="phone" value={customer.phone} onChange={updateCustomer} placeholder="+91 98765 43210" /></label><label><span>Service address</span><textarea name="address" value={customer.address} onChange={updateCustomer} placeholder="Flat, building, street and landmark" /></label><div className="form-actions"><button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary" onClick={openPayment}>Review payment <ArrowRight size={16} /></button></div></div>}
      {step === 3 && <div className="booking-form"><span className="eyebrow">Step 03</span><h1>Choose how to pay.</h1><div className="payment-method-grid">{paymentMethods.map((method) => { const PaymentIcon = paymentIcons[method.method] || CreditCard; return <button type="button" className={`payment-method ${paymentMethod === method.method ? "active" : ""}`} onClick={() => setPaymentMethod(method.method)} key={method.method}><PaymentIcon size={20} /><span><strong>{method.method}</strong><small>{method.description}</small></span>{paymentMethod === method.method && <CheckCircle2 size={17} />}</button>; })}</div>{!paymentMethods.length && <p className="payment-empty">No payment method is available right now. Please contact support.</p>}<div className="review-box"><span>June {selectedDate}, 2026 at {selectedTime}</span><strong>₹{activeService.price}</strong></div><div className="form-actions"><button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button><button className="btn btn-primary" onClick={confirmBooking} disabled={processing || !paymentMethods.length}>{processing ? "Checking payment status..." : paymentMethods.find(({ method }) => method === paymentMethod)?.type === "cash" ? "Confirm cash booking" : "Pay and confirm"} {!processing && <ArrowRight size={16} />}</button></div></div>}
      {step === 4 && <div className="booking-done"><BookingConfirmationAnimation paymentStatus={confirmedBooking?.paymentStatus} /><span className="done-icon"><CheckCircle2 size={38} /></span><span className="eyebrow">{confirmedBooking?.paymentStatus === "Paid" ? "Payment confirmed" : "Booking confirmed"}</span><h1>Your home is on our list.</h1><p>{confirmedBooking?.paymentStatus === "Paid" ? "Your payment is complete. " : "Cash on service selected. "}A verified professional will arrive on June {selectedDate} at {selectedTime}.</p><Link className="btn btn-primary" to="/profile">View my booking <ArrowRight size={16} /></Link></div>}
      </section>
    </div>
    {confirmedBooking && <div className="booking-confirmation-backdrop"><section className="booking-confirmation-popup" role="dialog" aria-modal="true" aria-label="Booking confirmed"><BookingConfirmationAnimation compact paymentStatus={confirmedBooking.paymentStatus} /><span className="eyebrow">{confirmedBooking.paymentStatus === "Paid" ? "Payment confirmed" : "Booking confirmed"}</span><h2>{activeService.title} is booked.</h2><p>{confirmedBooking.paymentStatus === "Paid" ? "Online payment complete. " : "Cash on service selected. "}Your booking ID is <strong>{confirmedBooking.bookingId}</strong>.</p><div className="popup-actions"><button className="btn btn-ghost" onClick={() => setConfirmedBooking(null)}>Close</button><Link className="btn btn-primary" to="/profile">View booking <ArrowRight size={15} /></Link></div></section></div>}
  </main>;
}

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSessionChanged(async (user) => {
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }

      const savedProfile = await getUserProfile(user);
      if (!savedProfile) {
        navigate("/profile", { replace: true });
        return;
      }

      setProfile(savedProfile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading || !profile) {
    return <main className="dashboard-page shell"><p>Loading your account...</p></main>;
  }

  const firstName = profile.name.split(" ")[0];
  const initials = profile.name.slice(0, 2).toUpperCase();
  const memberSince = typeof profile.createdAt === "string"
    ? new Date(profile.createdAt).getFullYear()
    : profile.createdAt?.toDate?.().getFullYear() || new Date().getFullYear();
  const logout = async () => {
    await logoutSession();
    navigate("/auth");
  };

  return <main className="dashboard-page shell"><aside className="account-sidebar"><div className="user-pill"><span>{initials}</span><div><strong>{profile.name}</strong><small>Member since {memberSince}</small></div></div>{[["My bookings", CalendarDays, () => {}], ["Profile", UserRound, () => navigate("/profile")], ["Payments", CreditCard, () => {}], ["Notifications", Bell, () => {}], ["Logout", LogOut, logout]].map(([label, Icon, action], index) => <button className={index === 0 ? "active" : ""} key={label} onClick={action}><Icon size={17} /> {label}</button>)}</aside><section><div className="dashboard-head"><div><span className="eyebrow">My account</span><h1>Good morning, {firstName}.</h1><p>Your home care schedule is looking pleasantly light.</p></div><Link className="btn btn-primary btn-small" to="/services">Book a service <ArrowRight size={15} /></Link></div><article className="upcoming-card"><div><span className="eyebrow">Next visit</span><h2>Home Deep Clean</h2><p>Tuesday, June 02 at 10:30 AM</p></div><span className="visit-badge">Professional assigned</span><div className="assigned"><span>RK</span><div><strong>Ravi Kumar</strong><small>4.9 rating · 244 visits</small></div></div></article><div className="dashboard-grid"><article className="dashboard-panel"><div className="panel-title-row"><h3>Profile details</h3><Link to="/profile">Edit profile <ArrowRight size={13} /></Link></div><div className="profile-summary-grid"><span><small>Email</small><strong>{profile.email || "Not added"}</strong></span><span><small>Phone</small><strong>{profile.phone}</strong></span><span><small>Address</small><strong>{profile.address}, {profile.city}</strong></span></div></article><article className="dashboard-panel plan-panel"><h3>Your care plan</h3><span className="plan-name">Standard</span><p>2 of 3 monthly service credits available.</p><div className="progress"><span /></div><Link to="/pricing">Manage membership <ArrowRight size={14} /></Link></article></div></section></main>;
}

function AdminPage() {
  const initial = Object.fromEntries(checklistGroups.flatMap(([, items]) => items.map((item, index) => [item, index % 3 === 0])));
  const [checks, setChecks] = useState(initial), completed = Object.values(checks).filter(Boolean).length, total = Object.keys(checks).length;
  return <main className="admin-page shell"><div className="admin-head"><div><span className="eyebrow">Protected admin</span><h1>Launch control.</h1><p>Track the final details before FunService goes live.</p></div><span className="secure-chip"><LockKeyhole size={15} /> Firebase custom claim required</span></div><div className="admin-stats">{[["₹2.4L", "Monthly bookings"], ["1,284", "Active customers"], ["4.91", "Average rating"], [`${completed}/${total}`, "Launch checks done"]].map(([value, label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</div><div className="admin-grid"><section className="checklist-panel"><div className="panel-head"><div><span className="eyebrow">Pre-launch checklist</span><h2>Production readiness</h2></div><Gauge size={22} /></div>{checklistGroups.map(([group, items]) => <div className="check-group" key={group}><h3>{group}</h3>{items.map((item) => <label key={item}><input type="checkbox" checked={checks[item]} onChange={() => setChecks({ ...checks, [item]: !checks[item] })} /><span>{item}</span></label>)}</div>)}</section><aside className="admin-side"><article><div className="panel-head"><h3>Dependency scanner</h3><ScanLine size={18} /></div><div className="scan-status"><CheckCircle2 size={18} /><div><strong>Healthy</strong><span>0 critical vulnerabilities</span></div></div><button className="btn btn-ghost btn-small">Run npm audit</button></article><article><div className="panel-head"><h3>Recent activity</h3><Bell size={18} /></div>{["New booking · Mumbai", "Payment captured · ₹999", "New review · 5 stars"].map((item) => <p className="activity" key={item}>{item}</p>)}</article></aside></div></main>;
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", type: "General support", message: "" });
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await api.createSupportMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        message: `${form.type}: ${form.message.trim()}`
      });
      setSent(true);
    } catch (error) {
      toast.error(error.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };
  return <main className="page shell"><div className="contact-layout"><section><span className="eyebrow">Support</span><h1>We are here<br />when you need us.</h1><p>Tell us what is happening and the care team will get back to you shortly.</p><div className="contact-list"><span><MessageCircle size={18} /><b>WhatsApp</b><small>+91 98765 43210</small></span><span><Mail size={18} /><b>Email</b><small>support@funservice.in</small></span><span><Phone size={18} /><b>Call</b><small>Mon-Sun, 8 AM-10 PM</small></span></div></section><form className="contact-form" onSubmit={submit}>{sent ? <div className="form-success"><CheckCircle2 size={34} /><h2>Message received.</h2><p>We will be in touch shortly.</p></div> : <><h2>How can we help?</h2><label><span>Name</span><input required name="name" value={form.name} onChange={update} placeholder="Your name" /></label><label><span>Email</span><input required name="email" value={form.email} onChange={update} type="email" placeholder="you@example.com" /></label><label><span>Type</span><select name="type" value={form.type} onChange={update}><option>General support</option><option>Booking help</option><option>Bug report</option><option>Payment issue</option></select></label><label><span>Message</span><textarea required name="message" value={form.message} onChange={update} placeholder="Tell us a little more" /></label><button className="btn btn-primary" disabled={sending}>{sending ? "Sending..." : "Send message"} {!sending && <ArrowRight size={16} />}</button></>}</form></div></main>;
}

function LegalPage({ title, type }) {
  const groups = type === "privacy" ? [["Information we collect", "We collect account, booking, payment reference and service address information required to deliver your requested services."], ["How we use your information", "Your information helps us schedule professionals, confirm visits, process payments and improve the quality of the platform."], ["Data protection", "Sensitive keys stay on secure backend systems. Access to personal data is restricted, logged and reviewed."]] : type === "cookies" ? [["Essential cookies", "These cookies keep your session, preferences and booking flow working correctly."], ["Analytics cookies", "With your consent, analytics help us understand which journeys are useful and where the experience can improve."], ["Your choices", "You may update your cookie preferences at any time. Consent is refreshed periodically."]] : [["Using FunService", "By using FunService, you agree to provide accurate booking information and use the platform for lawful home-service requests."], ["Bookings and payments", "Prices, slot availability and cancellation details are shown before checkout. Payment processing is handled securely."], ["Service quality", "We work with verified professionals and review every reported issue carefully."]];
  return <main className="legal-page shell"><span className="eyebrow">FunService legal</span><h1>{title}</h1><p className="legal-date">Last updated: May 31, 2026</p>{groups.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</main>;
}

function Footer() {
  return <footer className="site-footer"><div className="shell footer-grid"><div><Logo /><p>Your home. Handled. Trusted care for homes that have enough going on.</p></div><div><h4>Services</h4><Link to="/services">Home cleaning</Link><Link to="/services">Maintenance</Link><Link to="/beauty">Beauty at home</Link><Link to="/pricing">Care plans</Link></div><div><h4>Company</h4><Link to="/contact">Contact</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link><Link to="/cookies">Cookie policy</Link></div><div><h4>Connect</h4><a href="https://instagram.com"><Instagram size={15} /> Instagram</a><a href="https://wa.me/919876543210"><MessageCircle size={15} /> WhatsApp</a><span className="footer-note">Made for urban India</span></div></div><div className="shell footer-bottom"><span>© 2026 FunService</span><span>Securely booked. Thoughtfully delivered.</span></div></footer>;
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(!localStorage.getItem("funservice-cookie-consent")), []);
  if (!visible) return null;
  return <aside className="cookie-banner"><div><strong>A small note about cookies.</strong><p>We use essential cookies and optional analytics to make FunService work beautifully.</p></div><div><Link to="/cookies">Learn more</Link><button className="btn btn-primary btn-small" onClick={() => { localStorage.setItem("funservice-cookie-consent", new Date().toISOString()); setVisible(false); }}>Accept</button></div></aside>;
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
          <p>FunService AI Vision is getting ready to help you preview thoughtful home transformations from a simple description.</p>
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
  const ownerRoute = location.pathname === "/owner" || location.pathname === "/backend";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <>
      <Toaster position="top-right" />
      {!ownerRoute && <Navbar />}
      <div className="route-stage" key={location.pathname}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/beauty" element={<BeautyPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/vision" element={<AiGeneratorPage />} />
          <Route path="/book/:serviceId" element={<BookingPage />} />
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
          <Route path="/privacy" element={<LegalPage title="Privacy Policy" type="privacy" />} />
          <Route path="/terms" element={<LegalPage title="Terms of Service" type="terms" />} />
          <Route path="/cookies" element={<LegalPage title="Cookie Policy" type="cookies" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!ownerRoute && <Footer />}
      {!ownerRoute && <CookieBanner />}
    </>
  );
}

export default App;
