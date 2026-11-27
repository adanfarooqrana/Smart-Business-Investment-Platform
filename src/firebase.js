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

const firebaseConfig = {
  apiKey: "AIzaSyDMUqBly-UZeorPqf1VdtrnId5Fajs4Wg4",
  authDomain: "investbiz-3d869.firebaseapp.com",
  databaseURL: "https://investbiz-3d869-default-rtdb.firebaseio.com",
  projectId: "investbiz-3d869",
  storageBucket: "investbiz-3d869.firebasestorage.app",
  messagingSenderId: "391628309220",
  appId: "1:391628309220:web:7ceaca8ab434877999a2f1",
  measurementId: "G-N1YG226KQ7"
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