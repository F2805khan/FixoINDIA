import "../config/env.js";
import connectDB from "../config/db.js";
import Service from "../models/Service.js";

const services = [
  {
    title: "AC Repairing",
    description: "All types of AC repair and service with fast diagnosis.",
    category: "AC Repairing",
    price: 499,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=700&q=80",
    rating: 4.9
  },
  {
    title: "Electrician",
    description: "Electrical repair, installation, wiring, and safety checks.",
    category: "Electrician",
    price: 299,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Cleaning",
    description: "Home, office, bathroom, kitchen, and deep cleaning.",
    category: "Cleaning",
    price: 349,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Salon at Home",
    description: "Haircut, makeup, grooming, facial, and more at home.",
    category: "Salon at Home",
    price: 399,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=700&q=80",
    rating: 4.7
  },
  {
    title: "Plumbing",
    description: "Pipe repair, leakage fixing, tap fitting, and drainage work.",
    category: "Plumbing",
    price: 299,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Appliance Repair",
    description: "Washing machine, TV, fridge, oven, and more.",
    category: "Appliance Repair",
    price: 399,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=700&q=80",
    rating: 4.7
  },
  {
    title: "Carpentry",
    description: "Furniture repair, fitting, polishing, and installation.",
    category: "Carpentry",
    price: 399,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=700&q=80",
    rating: 4.6
  },
  {
    title: "Painting",
    description: "Wall painting, texture work, touch-ups, and waterproofing.",
    category: "Painting",
    price: 599,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=700&q=80",
    rating: 4.8
  },
  {
    title: "Pest Control",
    description: "Cockroach, termite, mosquito, bed bug, and ant treatment.",
    category: "Pest Control",
    price: 499,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=700&q=80",
    rating: 4.7
  },
  {
    title: "Laundry",
    description: "Wash, fold, dry cleaning, ironing, and doorstep pickup.",
    category: "Laundry",
    price: 199,
    duration: "30 Min",
    image: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=700&q=80",
    rating: 4.6
  }
];

const seed = async () => {
  await connectDB();
  await Service.destroy({ where: {} });
  await Service.bulkCreate(services);
  console.log("QuickFix services seeded");
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
