// Firebase SDK v9+ modular setup
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  push,
  get,
  update,
  remove,
  onValue,
} from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Project: smart-business-investment-app
// Override via .env.local (VITE_FIREBASE_*) when you rotate API keys in Firebase Console.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDmSY2MM2KTC8O4gzafl6a16B3nVWGY46A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "smart-business-investment-app.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ??
    "https://smart-business-investment-app-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "smart-business-investment-app",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "smart-business-investment-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "16829036183",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:16829036183:web:3dbd9a022335554d691bd2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-NXK9S2VQRC",
};

const app = initializeApp(firebaseConfig);

// Core service exports
export const auth = getAuth(app);
export const db = getDatabase(app); // Realtime Database
export const storage = getStorage(app);

// Aliases / extra services kept so existing code keeps working:
//  - `database` is used by RTDB callers (firebaseService, AuthContext, etc.)
//  - `firestore` is used by Firestore callers (imported as `firestore as db`)
export const database = db;
export const firestore = getFirestore(app);

export default app;

// ============================================================================
// Realtime Database helper functions (v9 modular)
// ============================================================================

/** Overwrite the value at `path` with `data`. */
export const writeData = (path, data) => set(ref(db, path), data);

/** Push `data` into a list at `path`. Returns the generated key. */
export const pushData = async (path, data) => {
  const newRef = push(ref(db, path));
  await set(newRef, data);
  return newRef.key;
};

/** Read the value at `path` once. Returns the value or null. */
export const readData = async (path) => {
  const snapshot = await get(ref(db, path));
  return snapshot.exists() ? snapshot.val() : null;
};

/** Merge `data` into the existing value at `path`. */
export const updateData = (path, data) => update(ref(db, path), data);

/** Delete the value at `path`. */
export const deleteData = (path) => remove(ref(db, path));

/**
 * Subscribe to live changes at `path`.
 * `callback` receives the current value (or null). Returns an unsubscribe fn.
 */
export const listenData = (path, callback) =>
  onValue(ref(db, path), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
