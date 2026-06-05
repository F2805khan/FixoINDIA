import { onAuthStateChanged, signOut as signOutFirebase } from "firebase/auth";
import { api } from "../api/client.js";
import { auth } from "../components/firebase.js";

const asBackendUser = (user) =>
  user
    ? {
        ...user,
        uid: user._id,
        displayName: user.name,
        phoneNumber: user.phone,
        backendSession: true
      }
    : null;

const getBackendUser = () => (api.hasToken() ? asBackendUser(api.getSavedUser()) : null);

export const onSessionChanged = (callback) => {
  const emit = (firebaseUser = auth.currentUser) => callback(getBackendUser() || firebaseUser);
  const onBackendSessionChanged = () => emit();
  const unsubscribeFirebase = onAuthStateChanged(auth, emit);

  emit();
  window.addEventListener("quickfix:session-changed", onBackendSessionChanged);

  return () => {
    unsubscribeFirebase();
    window.removeEventListener("quickfix:session-changed", onBackendSessionChanged);
  };
};

export const logoutSession = async () => {
  api.clearSession();
  if (auth.currentUser) await signOutFirebase(auth);
};
