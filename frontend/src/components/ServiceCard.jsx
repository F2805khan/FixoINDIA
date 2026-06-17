import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

function ServiceCard({ service, onBookService, compact = false }) {
  const bookingId = service.bookingId || service.id || service._id;
  const bookingPath = bookingId ? `/book/${bookingId}` : "/services";

  return (
    <article className={`service-card ${compact ? "service-card-compact" : ""} ${service.enabled === false ? "service-disabled" : ""}`}>
      <div className="service-image-wrap" style={{ position: "relative" }}>
        <img src={service.image} alt={service.title} className="service-image" loading="lazy" />
        {service.enabled === false && (
          <span className="coming-soon-badge" style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "var(--accent-ink, #34440b)",
            color: "var(--accent, #92b81e)",
            border: "1px solid var(--accent-border)",
            padding: "4px 8px",
            borderRadius: "20px",
            fontSize: "9px",
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}>
            Coming Soon
          </span>
        )}
      </div>
      <div className="service-card-body">
        <h3>{service.title}</h3>
        {!compact && <p>{service.description}</p>}
        <div className="service-meta">
          <span>
            Starts at <strong>₹{service.price}</strong>
          </span>
          {!compact && (
            <span>
              <Clock size={15} /> {service.duration}
            </span>
          )}
        </div>
        {service.enabled === false ? (
          <button className="btn btn-ghost full" type="button" disabled style={{ opacity: 0.6, cursor: "not-allowed", border: "1px dashed var(--border)" }}>
            Coming Soon
          </button>
        ) : onBookService ? (
          <button className="btn btn-primary full" type="button" onClick={() => onBookService(service)}>
            Add to Cart
          </button>
        ) : (
          <Link className="btn btn-primary full" to={bookingPath}>
            Add to Cart
          </Link>
        )}
      </div>
    </article>
  );
}

export default ServiceCard;
