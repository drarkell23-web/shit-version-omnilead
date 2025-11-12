// Minimal client bridge: optional Firestore writes (if firebase config present), and POSTs to Render backend endpoints.
// If you don't want Firestore writes, leave firebaseConfig as an empty object.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Put your Firebase config below if you want Firestore writes (optional)
const firebaseConfig = {
  apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: ""
};

let db = null;
try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("Firestore init error (expected if no config):", e);
}

export async function createLead(lead) {
  try {
    if (db) await addDoc(collection(db, "leads"), { ...lead, created: serverTimestamp() });
  } catch (e) { console.warn("Firestore write failed", e); }
  try {
    const r = await fetch("/api/lead", { method: "POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(lead) });
    return await r.json();
  } catch (e) { return { ok:false, error: e.message || String(e) }; }
}

export async function upsertContractor(contractor) {
  try {
    if (db) await addDoc(collection(db, "contractors"), { ...contractor, created: serverTimestamp() });
  } catch (e) { console.warn("Firestore write failed", e); }
  try {
    const r = await fetch("/api/contractor", { method: "POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(contractor) });
    return await r.json();
  } catch (e) { return { ok:false, error: e.message || String(e) }; }
}

export async function uploadReview(formData) {
  try {
    const r = await fetch("/api/review", { method: "POST", body: formData });
    return await r.json();
  } catch (e) { return { ok:false, error: e.message || String(e) }; }
}
