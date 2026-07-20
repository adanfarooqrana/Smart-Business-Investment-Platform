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

// Naya Firebase Configuration (Using .env variables first with fallbacks)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDWMFY4PNfL5N3ZCDuQuQ949uztpWAwfRk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "fyp-final-d643b.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ??
    "https://fyp-final-d643b-default-rtdb.firebaseio.com", // Naye RTDB ka URL (agar active kiya ho)
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "fyp-final-d643b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "fyp-final-d643b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "1077411823688",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:1077411823688:web:ccd7cac5edfea200ab987d",
};

const app = initializeApp(firebaseConfig);

// Core service exports
export const auth = getAuth(app);
export const db = getDatabase(app); // Realtime Database
export const storage = getStorage(app);

// Aliases taake aap ka existing project bina kisi error ke chalta rahe
export const database = db;
export const firestore = getFirestore(app);

export default app;

// ============================================================================
// Realtime Database helper functions (v9 modular) - Kept intact for compatibility
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