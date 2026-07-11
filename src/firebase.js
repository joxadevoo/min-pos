import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration provided by the developer
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

let app = null;
let db = null;
let auth = null;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
  try {
    const isInitial = getApps().length === 0;
    app = isInitial ? initializeApp(firebaseConfig) : getApp();
    if (isInitial) {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } else {
      db = getFirestore(app);
    }
    auth = getAuth(app);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
} else {
  console.warn("VITE_FIREBASE_API_KEY is missing. Firebase will run in offline mode.");
}

export { app, db, auth };
