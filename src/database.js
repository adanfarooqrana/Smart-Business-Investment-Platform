// Realtime Database helpers (Firebase v9+ modular)
import { ref, set, push, get, update, remove, onValue } from "firebase/database";
import { db } from "./firebase";

// ============================================================================
// Generic helpers
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
 * Subscribe to live changes at `path`. `callback` receives the current value
 * (or null). Returns an unsubscribe function.
 */
export const listenData = (path, callback) =>
  onValue(ref(db, path), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });

/**
 * Read every record under a collection `path` once and return it as an array
 * of `{ id, ...value }` objects (newest first when a `createdAt` is present).
 */
export const getAllData = async (path) => {
  const snapshot = await get(ref(db, path));
  if (!snapshot.exists()) return [];
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

// ============================================================================
// Entity-specific save functions
// ============================================================================

const withTimestamps = (data) => ({
  ...data,
  createdAt: data.createdAt || Date.now(),
  updatedAt: Date.now(),
});

/** Save an entrepreneur profile under /entrepreneurs/{uid}. */
export const saveEntrepreneur = (data) => {
  const uid = data.uid || data.id;
  return writeData(`entrepreneurs/${uid}`, withTimestamps({ ...data, uid }));
};

/** Save an investor profile under /investors/{uid}/profile (never wipe sibling branches). */
export const saveInvestor = (data) => {
  const uid = data.uid || data.id;
  if (!uid) return Promise.reject(new Error("uid is required for saveInvestor"));
  return updateData(`investors/${uid}/profile`, withTimestamps({ ...data, uid, role: "investor" }));
};

/**
 * Save an investment idea. Uses /investment_ideas/{id} when an id is provided,
 * otherwise pushes a new record and returns its key.
 */
export const saveInvestmentIdea = (data) => {
  const id = data.id || data.ideaId;
  if (id) return writeData(`investment_ideas/${id}`, withTimestamps({ ...data, id }));
  return pushData("investment_ideas", withTimestamps(data));
};

/** Save stage 1 data under /stage1_data/{ideaId}. */
export const saveStage1Data = (data) =>
  writeData(`stage1_data/${data.ideaId || data.id}`, withTimestamps(data));

/** Save stage 2 data under /stage2_data/{ideaId}. */
export const saveStage2Data = (data) =>
  writeData(`stage2_data/${data.ideaId || data.id}`, withTimestamps(data));

/** Save stage 3 data under /stage3_data/{ideaId}. */
export const saveStage3Data = (data) =>
  writeData(`stage3_data/${data.ideaId || data.id}`, withTimestamps(data));

/** Push a chat/message record into /messages. Returns the new key. */
export const saveMessage = (data) => pushData("messages", withTimestamps(data));

/** Push a payment record into /payments. Returns the new key. */
export const savePayment = (data) => pushData("payments", withTimestamps(data));

/** Push a community post into /community_posts. Returns the new key. */
export const saveCommunityPost = (data) =>
  pushData(
    "community_posts",
    withTimestamps({ votes: 0, shares: 0, ...data }),
  );
