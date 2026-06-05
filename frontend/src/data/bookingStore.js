import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { api } from "../api/client.js";
import { db } from "../components/firebase.js";

const bookingKey = (uid) => `funservice-bookings-${uid}`;

export const getCachedUserBookings = (uid) => {
  try {
    const saved = localStorage.getItem(bookingKey(uid));
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveLocalBookings = (uid, bookings) => {
  localStorage.setItem(bookingKey(uid), JSON.stringify(bookings));
};

const sortBookings = (bookings) =>
  [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const getUserBookings = async (user) => {
  if (!user?.uid) return [];

  if (api.hasToken()) {
    try {
      const bookings = sortBookings(await api.getMyBookings());
      saveLocalBookings(user.uid, bookings);
      return bookings;
    } catch (error) {
      console.warn("SQL booking history unavailable; using cached bookings.", error);
    }
  }

  try {
    const snapshot = await getDocs(collection(db, "userProfiles", user.uid, "bookings"));
    if (!snapshot.empty) {
      const bookings = sortBookings(snapshot.docs.map((booking) => booking.data()));
      saveLocalBookings(user.uid, bookings);
      return bookings;
    }
  } catch (error) {
    console.warn("Firestore booking lookup unavailable; using local booking cache.", error);
  }

  return sortBookings(getCachedUserBookings(user.uid));
};

export const saveUserBooking = async (user, values) => {
  if (!user?.uid) throw new Error("Sign in before confirming your booking.");

  if (!api.hasToken()) throw new Error("Your session expired. Sign in before confirming your booking.");

  const response = await api.createBooking(values);
  const booking = response.booking;
  const bookings = [booking, ...getCachedUserBookings(user.uid).filter(({ bookingId }) => bookingId !== booking.bookingId)];
  saveLocalBookings(user.uid, bookings);

  setDoc(doc(db, "userProfiles", user.uid, "bookings", booking.bookingId), booking).catch((error) => {
    console.warn("Firestore booking mirror unavailable; SQL booking remains saved.", error);
  });

  return booking;
};
