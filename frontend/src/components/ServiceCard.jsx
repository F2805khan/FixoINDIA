import { Clock, IndianRupee } from "lucide-react";

function ServiceCard({ service, onBookService, compact = false }) {
  return (
    <article className={`service-card ${compact ? "service-card-compact" : ""}`}>
      <div className="service-image-wrap">
        <img src={service.image} alt={service.title} className="service-image" loading="lazy" />
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
        <button className="btn btn-primary full" onClick={() => onBookService(service)}>
          Book Now
        </button>
      </div>
    </article>
  );
}

export default ServiceCard;
