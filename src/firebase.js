// src/firebase.js
// Central Firebase connection for CoreForge.
// Every feature that needs Auth, Firestore, or Storage imports from here.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// CoreForge Firebase project configuration.
// Note: these web config values are not secrets — access is controlled
// by Firestore and Storage security rules, which we configure separately.
const firebaseConfig = {
  apiKey: "AIzaSyCc7b6zUAM-kH8cInHfLNMTSItERvgnAlU",
  authDomain: "coreforge-69912.firebaseapp.com",
  projectId: "coreforge-69912",
  storageBucket: "coreforge-69912.firebasestorage.app",
  messagingSenderId: "99553113160",
  appId: "1:99553113160:web:56ad440268ca6b47b9147d",
};

// Initialize the Firebase app once and share it across CoreForge.
const app = initializeApp(firebaseConfig);

// Service handles used throughout the application.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;