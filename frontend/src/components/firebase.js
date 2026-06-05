// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCylpca3m3U6usv9e-NR_XmeIKQxBAcA5I",
    authDomain: "fu-service.firebaseapp.com",
    projectId: "fu-service",
    storageBucket: "fu-service.firebasestorage.app",
    messagingSenderId: "341612186829",
    appId: "1:341612186829:web:3e2c9aa107c6e78f152d84",
    measurementId: "G-SM0JX1Z0QM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
