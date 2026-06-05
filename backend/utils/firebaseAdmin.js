import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "fu-service";

if (!getApps().length) {
  initializeApp({ projectId });
}

export const verifyFirebaseIdToken = (idToken) => getAuth().verifyIdToken(idToken);
