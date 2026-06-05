import { useMemo, useState } from "react";
import {
  Brush,
  Bug,
  ChevronRight,
  Hammer,
  PaintRoller,
  PlugZap,
  Search,
  ShowerHead,
  Snowflake,
  Sparkles,
  SprayCan,
  WashingMachine,
  Wrench
} from "lucide-react";
import ServiceCard from "../components/ServiceCard.jsx";
import { categories, services as defaultServices } from "../data/services.js";

const categoryIcons = {
  "All Services": Sparkles,
  "AC Repairing": Snowflake,
  Electrician: PlugZap,
  Cleaning: SprayCan,
  "Salon at Home": Brush,
  Plumbing: ShowerHead,
  "Appliance Repair": WashingMachine,
  Carpentry: Hammer,
  Painting: PaintRoller,
  "Pest Control": Bug,
  Laundry: WashingMachine,
  "More Services": Wrench
};

function Services({ services = defaultServices, onBookService }) {
  const [activeCategory, setActiveCategory] = useState("All Services");
  const [search, setSearch] = useState("");

  const categoryList = useMemo(() => {
    const serviceCategories = services.map((service) => service.category).filter(Boolean);
    return Array.from(new Set([...categories, ...serviceCategories]));
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const categoryMatch =
        activeCategory === "All Services" ||
        activeCategory === "More Services" ||
        service.category === activeCategory;
      const searchMatch = service.title.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, search]);

  return (
    <section className="page-shell">
      <div className="container">
        <div className="page-head with-search">
          <div>
            <h1>Our Services</h1>
            <p>Choose from a wide range of services and get it done in under 30 minutes.</p>
          </div>
          <label className="search-box">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for a service..."
            />
            <Search size={18} />
          </label>
        </div>

        <div className="services-layout">
          <aside className="category-sidebar">
            {categoryList.map((category) => {
              const Icon = categoryIcons[category] || Wrench;
              return (
                <button
                  key={category}
                  className={activeCategory === category ? "active" : ""}
                  onClick={() => setActiveCategory(category)}
                >
                  <Icon size={18} />
                  {category}
                </button>
              );
            })}
          </aside>

          <div className="service-grid">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id || service._id}
                service={service}
                onBookService={onBookService}
              />
            ))}
          </div>
        </div>

        <div className="service-cta">
          <div>
            <h2>Can't find what you need?</h2>
            <p>We've got you covered! Our team will help you find the right professional.</p>
          </div>
          <button className="btn btn-light">
            Request a Service <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default Services;
