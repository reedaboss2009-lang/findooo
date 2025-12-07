import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Helper to safely get environment variables
const getEnv = (key: string, fallback: string): string => {
  try {
    // Check for Vite
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       if (import.meta.env[key]) return import.meta.env[key];
       // @ts-ignore
       if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    }
  } catch (e) {}

  try {
    // Check for process.env
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}

  return fallback;
};

export const firebaseConfig = {
  apiKey: getEnv("FIREBASE_API_KEY", "AIzaSyBoBpVcGc47aly2mA_FDa0GjvvbIsQwF7Y"),
  authDomain: getEnv("FIREBASE_AUTH_DOMAIN", "pharmac-8af57.firebaseapp.com"),
  projectId: getEnv("FIREBASE_PROJECT_ID", "pharmac-8af57"),
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET", "pharmac-8af57.firebasestorage.app"),
  messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID", "946903858770"),
  appId: getEnv("FIREBASE_APP_ID", "1:946903858770:web:1ab411eac2e6ca3ab3698b")
};

// Initialize Firebase
// Check if an app is already initialized to handle hot-reloading environments gracefully
const app = firebase.apps.length > 0 ? firebase.app() : firebase.initializeApp(firebaseConfig);

// Initialize Auth
const auth = firebase.auth();

// Initialize Firestore
const db = firebase.firestore();

// Attempt to configure settings (compat mode)
try {
  db.settings({ experimentalForceLongPolling: true, merge: true });
} catch (e) {
  // Ignore if already initialized
}

export { app, auth, db };