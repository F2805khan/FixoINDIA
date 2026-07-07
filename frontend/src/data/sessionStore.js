import { onAuthStateChanged, signOut as signOutFirebase } from "firebase/auth";
import { api } from "../api/client.js";
import { auth } from "../components/firebase.js";

export const isPrivilegedUser = (user) => ["admin", "owner"].includes(user?.role);

export const displayUserName = (user) => {
  const name = user?.name || user?.displayName || user?.userId || "";
  return name.toLowerCase() === "quickfix admin" ? "fixOindia Control" : name || "Account";
};

const asBackendUser = (user) =>
  user
    ? {
        ...user,
        uid: user._id,
        displayName: displayUserName(user),
        phoneNumber: user.phone,
        backendSession: true
      }
    : null;

const getBackendUser = () => (api.hasToken() ? asBackendUser(api.getSavedUser()) : null);
const sessionChangedEvent = "funservice:session-changed";

export const onSessionChanged = (callback) => {
  const emit = (firebaseUser = auth.currentUser) => callback(getBackendUser() || firebaseUser);
  const onBackendSessionChanged = () => emit();
  const unsubscribeFirebase = onAuthStateChanged(auth, emit);

  emit();
  window.addEventListener(sessionChangedEvent, onBackendSessionChanged);

  return () => {
    unsubscribeFirebase();
    window.removeEventListener(sessionChangedEvent, onBackendSessionChanged);
  };
};

export const logoutSession = async () => {
  api.clearSession();
  if (auth.currentUser) await signOutFirebase(auth);
};
