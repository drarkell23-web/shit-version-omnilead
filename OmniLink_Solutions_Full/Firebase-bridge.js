// === OmniSolutions Firebase Bridge ===
// This file connects your web app to your Firebase backend.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// === Step 1: Paste YOUR Firebase config below ===
const firebaseConfig = {
  apiKey: "AIzaSyCMVyCYTOJ9IOyVBFPZZddNk8xdly_jhfc",
  authDomain: "omnisolutions-717e0.firebaseapp.com",
  projectId: "omnisolutions-717e0",
  storageBucket: "omnisolutions-717e0.firebasestorage.app",
  messagingSenderId: "70821223257",
  appId: "1:70821223257:web:956672b76465350adb4a48",
  measurementId: "G-FRPM1E9H7N"
};

// === Step 2: Initialize Firebase and Firestore ===
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
