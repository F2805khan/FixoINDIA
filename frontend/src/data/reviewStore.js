import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../components/firebase.js";

const REVIEWS_KEY = "funservice-customer-reviews";

const clean = (value) => String(value || "").trim();

const sortReviews = (reviews) =>
  [...reviews].sort((a, b) => {
    if (Number(b.rating) !== Number(a.rating)) return Number(b.rating) - Number(a.rating);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

const readLocalReviews = () => {
  try {
    const saved = localStorage.getItem(REVIEWS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveLocalReviews = (reviews) => {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(sortReviews(reviews)));
};

export const getCustomerReviews = async () => {
  try {
    const snapshot = await getDocs(collection(db, "customerReviews"));
    if (!snapshot.empty) {
      const reviews = snapshot.docs.map((review) => review.data());
      saveLocalReviews(reviews);
      return sortReviews(reviews);
    }
  } catch (error) {
    console.warn("Firestore review lookup unavailable; using local review cache.", error);
  }

  return sortReviews(readLocalReviews());
};

export const saveCustomerReview = async (values) => {
  const review = {
    reviewId: `review-${Date.now()}`,
    name: clean(values.name),
    city: clean(values.city),
    service: clean(values.service),
    text: clean(values.text),
    rating: Math.min(5, Math.max(1, Number(values.rating) || 1)),
    createdAt: new Date().toISOString()
  };

  const reviews = [review, ...readLocalReviews()];
  saveLocalReviews(reviews);

  setDoc(doc(db, "customerReviews", review.reviewId), review).catch((error) => {
    console.warn("Firestore review save unavailable; review is saved locally.", error);
  });

  return review;
};

export const getBestCustomerReviews = (reviews, limit = 3) => sortReviews(reviews).slice(0, limit);
