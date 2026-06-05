import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { api } from "../api/client.js";
import { db } from "../components/firebase.js";

const profileKey = (uid) => `funservice-profile-${uid}`;

export const getCachedUserProfile = (uid) => {
  try {
    const saved = localStorage.getItem(profileKey(uid));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveLocalProfile = (profile) => {
  localStorage.setItem(profileKey(profile.uid), JSON.stringify(profile));
};

const clean = (value) => String(value || "").trim();

export const profileDefaults = (user) => ({
  uid: user?._id || user?.uid || "",
  name: user?.name || user?.displayName || "",
  email: user?.email || "",
  phone: user?.phone || user?.phoneNumber || "",
  address: user?.address || "",
  city: user?.city || "",
  latitude: user?.latitude || "",
  longitude: user?.longitude || "",
  subscriptionStatus: user?.subscriptionStatus || "active",
  createdAt: user?.createdAt,
  updatedAt: user?.updatedAt
});

const profileFromBackend = (user) => ({
  ...profileDefaults(user),
  uid: user?._id || user?.uid
});

const saveFirestoreProfile = (profile, existingProfile = null) =>
  setDoc(
    doc(db, "userProfiles", profile.uid),
    {
      ...profile,
      createdAt: existingProfile?.createdAt || profile.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  ).catch((error) => {
    console.warn("Firestore profile save unavailable; SQL profile remains saved.", error);
  });

export const getUserProfile = async (user) => {
  if (!user?.uid) return null;

  if (api.hasToken()) {
    try {
      const response = await api.getProfile();
      const profile = profileFromBackend(response.user);
      saveLocalProfile(profile);
      return profile;
    } catch (error) {
      console.warn("SQL profile lookup unavailable; using cached profile.", error);
    }
  }

  try {
    const snapshot = await getDoc(doc(db, "userProfiles", user.uid));
    if (snapshot.exists()) {
      const profile = { uid: user.uid, ...snapshot.data() };
      saveLocalProfile(profile);
      return profile;
    }
  } catch (error) {
    console.warn("Firestore profile lookup unavailable; using local profile cache.", error);
  }

  return getCachedUserProfile(user.uid);
};

export const saveUserProfile = async (user, values, existingProfile = null) => {
  if (!user?.uid) throw new Error("Sign in before saving your profile.");

  const now = new Date().toISOString();
  const profile = {
    uid: user.uid,
    name: clean(values.name),
    email: clean(values.email || user.email),
    phone: clean(values.phone || user.phoneNumber),
    address: clean(values.address),
    city: clean(values.city),
    latitude: clean(values.latitude ?? existingProfile?.latitude),
    longitude: clean(values.longitude ?? existingProfile?.longitude),
    subscriptionStatus: values.subscriptionStatus || existingProfile?.subscriptionStatus || "active",
    createdAt: existingProfile?.createdAt || now,
    updatedAt: now
  };

  saveLocalProfile(profile);

  if (api.hasToken()) {
    const response = await api.updateProfile(profile);
    const savedProfile = {
      ...profile,
      ...profileFromBackend(response.user),
      createdAt: response.user.createdAt || profile.createdAt,
      updatedAt: response.user.updatedAt || profile.updatedAt
    };
    api.saveSession({ user: response.user });
    saveLocalProfile(savedProfile);
    saveFirestoreProfile(savedProfile, existingProfile);
    return savedProfile;
  }

  saveFirestoreProfile(profile, existingProfile);
  return profile;
};
