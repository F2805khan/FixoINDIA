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

const profileTimestamp = (profile) => {
  const value = profile?.updatedAt || profile?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

export const mergeProfiles = (preferred, fallback) => {
  if (!preferred) return fallback || null;
  if (!fallback) return preferred;

  const preferredIsNewer = profileTimestamp(preferred) >= profileTimestamp(fallback);
  const winner = preferredIsNewer ? preferred : fallback;
  const loser = preferredIsNewer ? fallback : preferred;

  const field = (key, { allowEmpty = false } = {}) => {
    if (!Object.prototype.hasOwnProperty.call(winner, key)) {
      return loser[key];
    }

    const value = winner[key];
    if (allowEmpty || (value !== undefined && value !== null && String(value).trim() !== "")) {
      return value;
    }

    return loser[key];
  };

  return {
    ...loser,
    ...winner,
    uid: winner.uid || loser.uid,
    name: field("name") ?? "",
    email: field("email") ?? "",
    phone: field("phone") ?? "",
    address: field("address", { allowEmpty: true }) ?? "",
    city: field("city", { allowEmpty: true }) ?? "",
    latitude: field("latitude", { allowEmpty: true }),
    longitude: field("longitude", { allowEmpty: true }),
    subscriptionStatus: field("subscriptionStatus") || loser.subscriptionStatus || winner.subscriptionStatus,
    createdAt: winner.createdAt || loser.createdAt,
    updatedAt: winner.updatedAt || loser.updatedAt
  };
};

export const PROFILE_CHANGED_EVENT = "funservice:profile-changed";

const userFieldsFromProfile = (profile) => ({
  name: profile.name,
  phone: profile.phone,
  address: profile.address,
  city: profile.city,
  email: profile.email,
  latitude: profile.latitude,
  longitude: profile.longitude
});

export const publishProfileUpdate = (profile) => {
  if (!profile?.uid) return profile;

  saveLocalProfile(profile);

  if (api.hasToken()) {
    api.updateSavedUser(userFieldsFromProfile(profile));
  }

  window.dispatchEvent(new CustomEvent(PROFILE_CHANGED_EVENT, { detail: profile }));
  return profile;
};

export const onProfileChanged = (callback) => {
  const handler = (event) => {
    if (event.detail) callback(event.detail);
  };

  window.addEventListener(PROFILE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(PROFILE_CHANGED_EVENT, handler);
};

export const isProfileComplete = (profile) =>
  Boolean(
    profile?.name?.trim() &&
    profile?.phone?.trim() &&
    profile?.address?.trim() &&
    profile?.city?.trim()
  );

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

  const cachedProfile = getCachedUserProfile(user.uid);

  if (api.hasToken()) {
    try {
      const response = await api.getProfile();
      const remoteProfile = profileFromBackend(response.user);
      const mergedProfile = mergeProfiles(remoteProfile, cachedProfile);
      saveLocalProfile(mergedProfile);
      return mergedProfile;
    } catch (error) {
      console.warn("SQL profile lookup unavailable; using cached profile.", error);
    }
  }

  try {
    const snapshot = await getDoc(doc(db, "userProfiles", user.uid));
    if (snapshot.exists()) {
      const firestoreProfile = { uid: user.uid, ...snapshot.data() };
      const mergedProfile = mergeProfiles(cachedProfile, firestoreProfile);
      saveLocalProfile(mergedProfile);
      return mergedProfile;
    }
  } catch (error) {
    console.warn("Firestore profile lookup unavailable; using local profile cache.", error);
  }

  return cachedProfile;
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
    const response = await api.updateProfile({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      latitude: profile.latitude || null,
      longitude: profile.longitude || null,
      subscriptionStatus: profile.subscriptionStatus
    });

    const backendProfile = profileFromBackend(response.user);
    const savedProfile = {
      ...backendProfile,
      uid: user.uid,
      name: profile.name,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      email: profile.email || backendProfile.email,
      latitude: profile.latitude,
      longitude: profile.longitude,
      subscriptionStatus: profile.subscriptionStatus,
      createdAt: response.user.createdAt || profile.createdAt,
      updatedAt: profile.updatedAt
    };

    saveFirestoreProfile(savedProfile, existingProfile);
    return publishProfileUpdate(savedProfile);
  }

  saveFirestoreProfile(profile, existingProfile);
  return publishProfileUpdate(profile);
};
