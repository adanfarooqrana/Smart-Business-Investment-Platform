// Firebase Storage helpers (Firebase v9+ modular)
import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";

// ============================================================================
// Config
// ============================================================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/jpg", "image/png", "image/gif"],
  pdf: ["application/pdf"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
};

const ALL_ALLOWED = [
  ...new Set([
    ...ALLOWED_TYPES.image,
    ...ALLOWED_TYPES.pdf,
    ...ALLOWED_TYPES.document,
  ]),
];

// ============================================================================
// Path builders — enforce the agreed structure
// ============================================================================

export const storagePaths = {
  cnic: (userId, fileName) => `users/${userId}/cnic/${fileName}`,
  ideaProof: (ideaId, fileName) => `ideas/${ideaId}/proofs/${fileName}`,
  paymentScreenshot: (paymentId, fileName) =>
    `payments/${paymentId}/screenshots/${fileName}`,
};

// ============================================================================
// Internal helpers
// ============================================================================

function getExtension(name = "") {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : "";
}

function uniqueName(originalName = "file") {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}${getExtension(originalName)}`;
}

/**
 * Validate a File/Blob against the allowed types and max size.
 * Returns `{ valid, error }`.
 */
export function validateFile(file, allowed = ALL_ALLOWED) {
  if (!file) return { valid: false, error: "No file provided" };
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File exceeds the 10MB limit" };
  }
  if (file.type && allowed.length && !allowed.includes(file.type)) {
    return { valid: false, error: `Unsupported file type: ${file.type}` };
  }
  return { valid: true, error: null };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Upload a File/Blob to an exact `path`. Validates type + size first.
 * Returns the public download URL.
 */
export async function uploadFile(file, path, allowed = ALL_ALLOWED) {
  const { valid, error } = validateFile(file, allowed);
  if (!valid) throw new Error(error);

  const fileRef = ref(storage, path);
  const snapshot = await uploadBytes(fileRef, file);
  return getDownloadURL(snapshot.ref);
}

/**
 * Upload an image into `folder`, auto-generating a unique file name.
 * Only image types are accepted. Returns the download URL.
 */
export async function uploadImage(file, folder) {
  const { valid, error } = validateFile(file, ALLOWED_TYPES.image);
  if (!valid) throw new Error(error);

  const path = `${folder.replace(/\/$/, "")}/${uniqueName(file.name)}`;
  return uploadFile(file, path, ALLOWED_TYPES.image);
}

/**
 * Upload many images into `folder`. Returns an array of download URLs in the
 * same order as the input files.
 */
export async function uploadMultipleImages(files, folder) {
  const list = Array.from(files || []);
  return Promise.all(list.map((file) => uploadImage(file, folder)));
}

/**
 * Upload an image provided as a base64 / data-URL string. Useful for camera
 * captures (CNIC scan, selfies, proof photos). Returns the download URL.
 */
export async function uploadDataUrl(dataUrl, path) {
  const fileRef = ref(storage, path);
  const snapshot = await uploadString(fileRef, dataUrl, "data_url");
  return getDownloadURL(snapshot.ref);
}

/** Get the public download URL for an existing storage `path`. */
export function getFileUrl(path) {
  return getDownloadURL(ref(storage, path));
}

/** Delete the file at `path`. */
export function deleteFile(path) {
  return deleteObject(ref(storage, path));
}
