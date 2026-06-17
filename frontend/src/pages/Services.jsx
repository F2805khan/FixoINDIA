import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { matchServiceQuery } from "../utils/serviceSearch.js";

const categoryIcons = {
  "All Services": Sparkles,
  "Salon at Home": Brush,
  "Spa at Home": Sparkles,
  "AC Repairing": Snowflake,
  "Appliance Repair": WashingMachine,
  Cleaning: SprayCan,
  "Pest Control": Bug,
  Electrician: PlugZap,
  Plumbing: ShowerHead,
  Carpentry: Hammer,
  Painting: PaintRoller
};

function Services({ services = defaultServices, searchableServices = services, onBookService }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("All Services");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  const categoryList = useMemo(() => {
    const serviceCategories = services.map((service) => service.category).filter(Boolean);
    return Array.from(new Set([...categories, ...serviceCategories]));
  }, [services]);

  const servicePool = search.trim() ? searchableServices : services;

  const filteredServices = useMemo(() => {
    return servicePool.filter((service) => {
      const categoryMatch =
        activeCategory === "All Services" || service.category === activeCategory;
      return categoryMatch && matchServiceQuery(service, search);
    });
  }, [activeCategory, search, servicePool]);

  return (
    <section className="page-shell">
      <div className="container">
        <div className="page-title-row">
          <div>
            <h1>Our Services</h1>
            <p>Choose from a wide range of services and get it done in under 30 minutes.</p>
          </div>
          <form
            className="services-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              const next = new URLSearchParams(searchParams);
              const query = search.trim();
              if (query) next.set("q", query);
              else next.delete("q");
              setSearchParams(next, { replace: true });
            }}
          >
            <label className="search-box">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search for a service..."
                aria-label="Search for a service"
              />
              <Search size={18} />
            </label>
          </form>
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
            {filteredServices.length ? (
              filteredServices.map((service) => (
                <ServiceCard
                  key={service.id || service._id}
                  service={service}
                  onBookService={onBookService}
                />
              ))
            ) : (
              <div className="services-empty-search">
                <h3>No services found for "{search}"</h3>
                <p>Try another keyword like cleaning, AC, electrician, or plumbing.</p>
              </div>
            )}
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
