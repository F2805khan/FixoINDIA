import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headphones,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  Zap
} from "lucide-react";
import ServiceCard from "../components/ServiceCard.jsx";
import ReviewCard from "../components/ReviewCard.jsx";
import { heroImage, reviews, services as defaultServices } from "../data/services.js";

function Home({ services = defaultServices, onBookService }) {
  const popularServices = services.slice(0, 5);

  return (
    <>
      <section className="hero-section home-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="badge hero-kicker">
              <Zap size={15} /> Fast. Reliable. Trusted.
            </span>
            <h1 className="hero-title" aria-label="All Your Home Services in Under 30 Minutes">
              <span className="hero-word" style={{ "--delay": "0.05s" }}>
                All
              </span>{" "}
              <span className="hero-word" style={{ "--delay": "0.12s" }}>
                Your
              </span>{" "}
              <span className="hero-word" style={{ "--delay": "0.19s" }}>
                Home
              </span>{" "}
              <span className="hero-word" style={{ "--delay": "0.26s" }}>
                Services
              </span>{" "}
              <span className="hero-word" style={{ "--delay": "0.33s" }}>
                in
              </span>{" "}
              <span className="hero-word" style={{ "--delay": "0.4s" }}>
                Under
              </span>{" "}
              <span className="hero-word accent-text" style={{ "--delay": "0.47s" }}>
                30
              </span>{" "}
              <span className="hero-word accent-text" style={{ "--delay": "0.54s" }}>
                Minutes
              </span>
            </h1>
            <p className="hero-subtitle">
              Book trusted professionals for your home and get the job done fast, right at your
              doorstep.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => onBookService(popularServices[0])}>
                Book a Service
              </button>
              <a className="btn btn-outline" href="#booking-guide">
                <Clock3 size={17} /> How It Works
              </a>
            </div>
          </div>

          <div className="hero-visual animated-visual">
            <div className="hero-orbit" />
            <img src={heroImage} alt="FunService service professional" />
            <div className="floating-card">
              <Sparkles size={18} />
              <span>Service in Under</span>
              <strong>30 Min</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="container feature-bar animated-strip">
        <div className="feature-item">
          <Timer />
          <span>
            <strong>30 Min</strong>
            Service Guarantee
          </span>
        </div>
        <div className="feature-item">
          <UserCheck />
          <span>
            <strong>Verified</strong>
            Professionals
          </span>
        </div>
        <div className="feature-item">
          <Banknote />
          <span>
            <strong>Upfront</strong>
            Affordable Pricing
          </span>
        </div>
        <div className="feature-item">
          <ShieldCheck />
          <span>
            <strong>Safe & Secure</strong>
            Payments
          </span>
        </div>
      </section>

      <section className="container section-block reveal-section">
        <div className="section-heading">
          <div>
            <h2>Popular Services</h2>
          </div>
          <a href="/services" className="text-link">
            View all services <ChevronRight size={16} />
          </a>
        </div>
        <div className="popular-grid stagger-grid">
          {popularServices.map((service) => (
            <ServiceCard
              compact
              key={service.id}
              service={service}
              onBookService={onBookService}
            />
          ))}
        </div>
      </section>

      <section className="booking-guide animated-band" id="booking-guide">
        <div className="container guide-grid">
          <div className="guide-copy">
            <h2>We are always ready to help you</h2>
            <p>
              <CheckCircle2 size={18} /> Quick & Reliable Service
            </p>
            <p>
              <CheckCircle2 size={18} /> Experienced Professionals
            </p>
            <p>
              <CheckCircle2 size={18} /> 100% Satisfaction Guarantee
            </p>
          </div>

          <div className="phone-mockup" aria-label="Phone booking form mockup">
            <div className="phone-notch" />
            <h3>Book a Service</h3>
            <label>
              Select Service
              <span>AC Repairing</span>
            </label>
            <label>
              Select Date
              <span>24 May 2026</span>
            </label>
            <label>
              Select Time
              <span>10:30 AM - 11:00 AM</span>
            </label>
            <button>Confirm Booking</button>
          </div>

          <div className="steps-card">
            <h2>Book in Just 3 Steps</h2>
            <div>
              <span>1</span>
              Select a Service
            </div>
            <div>
              <span>2</span>
              Choose Date & Time
            </div>
            <div>
              <span>3</span>
              Get It Done in 30 Min
            </div>
          </div>
        </div>
      </section>

      <section className="container section-block reveal-section">
        <div className="section-heading">
          <h2>Why Choose FunService?</h2>
        </div>
        <div className="why-grid stagger-grid">
          <div>
            <Zap />
            <strong>Lightning Fast</strong>
            <span>Service in under 30 mins</span>
          </div>
          <div>
            <UserCheck />
            <strong>Trusted Experts</strong>
            <span>Background verified</span>
          </div>
          <div>
            <BadgeCheck />
            <strong>Transparent Pricing</strong>
            <span>No hidden charges</span>
          </div>
          <div>
            <Headphones />
            <strong>24/7 Support</strong>
            <span>We are here to help</span>
          </div>
        </div>
      </section>

      <section className="container section-block reveal-section">
        <div className="section-heading">
          <h2>What Our Customers Say</h2>
          <a href="#reviews" className="text-link">
            View all reviews <ChevronRight size={16} />
          </a>
        </div>
        <div className="review-grid stagger-grid" id="reviews">
          {reviews.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>
      </section>
    </>
  );
}

export default Home;
