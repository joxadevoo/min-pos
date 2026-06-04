import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration provided by the developer
const firebaseConfig = {
  apiKey: "AIzaSyA8ioK-IgwTNUB-rGdgUexf317qPDzkxfw",
  authDomain: "beautystorestocktracking.firebaseapp.com",
  projectId: "beautystorestocktracking",
  storageBucket: "beautystorestocktracking.firebasestorage.app",
  messagingSenderId: "822169185246",
  appId: "1:822169185246:web:2430e55f94ac5be1cbcb4f",
  measurementId: "G-0EHEXNFYRZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and export
export const db = getFirestore(app);
