import "../config/env.js";
import connectDB from "../config/db.js";
import Service from "../models/Service.js";

const services = [
  {
    title: "Salon Classic for Women",
    description: "Waxing, threading, manicure, pedicure, and facial treatments at home.",
    category: "Salon at Home",
    price: 599,
    duration: "45 Min",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Stress Relief Spa for Women",
    description: "Relaxing massage and body treatments by certified therapists.",
    category: "Spa at Home",
    price: 1299,
    duration: "60 Min",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=700&q=80",
    rating: 4.9
  },
  {
    title: "Men's Haircut & Grooming",
    description: "Haircut, beard styling, massage, and facial grooming at home.",
    category: "Salon at Home",
    price: 299,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80",
    rating: 4.7
  },
  {
    title: "AC Service & Repair",
    description: "Deep jet cleaning, gas leak checks, and comprehensive AC servicing.",
    category: "AC Repairing",
    price: 499,
    duration: "45 Min",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=700&q=80",
    rating: 4.9
  },
  {
    title: "Washing Machine Repair",
    description: "On-site diagnostics and repair for top-load and front-load washing machines.",
    category: "Appliance Repair",
    price: 349,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=700&q=80",
    rating: 4.7
  },
  {
    title: "Refrigerator Repair",
    description: "Fixing cooling issues, compressor problems, and gas charging.",
    category: "Appliance Repair",
    price: 399,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1571175432247-50a2e5039488?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Full Home Deep Cleaning",
    description: "Deep cleaning of rooms, kitchen, bathrooms, windows, and floors.",
    category: "Cleaning",
    price: 2499,
    duration: "4-5 Hrs",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Bathroom Deep Cleaning",
    description: "Stain removal, sanitization, and wall/floor scrub for a sparkling bathroom.",
    category: "Cleaning",
    price: 399,
    duration: "60 Min",
    image: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=700&q=80",
    rating: 4.7
  },
  {
    title: "Cockroach & Ant Control",
    description: "Odourless gel and spray treatment with warranty to keep pests away.",
    category: "Pest Control",
    price: 799,
    duration: "45 Min",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Electrician Service",
    description: "Switchboard repair, light installations, geyser repair, and general wiring.",
    category: "Electrician",
    price: 149,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Plumbing Service",
    description: "Tap leak fixes, toilet repair, drainage block clearance, and fittings.",
    category: "Plumbing",
    price: 149,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Carpentry Service",
    description: "Furniture assembly, lock repair, door hinges fix, and general woodwork.",
    category: "Carpentry",
    price: 199,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=700&q=80",
    rating: 4.6
  },
  {
    title: "Wall Painting & Waterproofing",
    description: "Interior/exterior wall painting consultation and moisture damage waterproofing.",
    category: "Painting",
    price: 999,
    duration: "Quote Visit",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  }
];

const seed = async () => {
  await connectDB();
  await Service.destroy({ where: {} });
  await Service.bulkCreate(services);
  console.log("FunService services seeded");
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
