import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { auth, storage } from "@/firebase";
import {
  uploadFileToCloudinary,
  uploadToCloudinary,
} from "@/lib/cloudinaryUpload";

const MAX_BYTES = 10 * 1024 * 1024;
const STEP_TIMEOUT_MS = 12_000;

function safeFileName(name: string): string {
  return String(name || "file")
    .replace(/[^\w.\-()+ ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

/** Shrink large chat photos so upload finishes quickly. */
async function compressImageForChat(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("gif")) return file;
  if (file.size < 400_000) return file;

  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load image for compress."));
    el.src = dataUrl;
  });

  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
  );
  if (!blob || blob.size >= file.size) return file;

  const base = safeFileName(file.name).replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

async function uploadViaCloudinary(
  file: File,
  kind: "image" | "document",
): Promise<string> {
  if (kind === "image") {
    return uploadToCloudinary(file, "chat_attachments");
  }
  return uploadFileToCloudinary(file, "chat_attachments");
}

/** Proven path used elsewhere — matches existing Storage image rules. */
async function uploadViaFirebase(file: File): Promise<string> {
  const uid = String(auth.currentUser?.uid || "").trim();
  if (!uid) throw new Error("Please sign in again to send attachments.");

  const name = safeFileName(file.name || "photo.jpg");
  // Flat path under uploads/{uid}/ so existing image rules apply (no new deploy needed)
  const path = `uploads/${uid}/chat_${Date.now()}_${name}`;
  const fileRef = storageRef(storage, path);
  const dataUrl = await fileToDataUrl(file);
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Could not prepare the image for upload.");
  }
  const snapshot = await uploadString(fileRef, dataUrl, "data_url");
  const url = await getDownloadURL(snapshot.ref);
  if (!url) throw new Error("Firebase upload returned no URL.");
  return url;
}

/**
 * Upload a chat photo/document.
 * Cloudinary first (short timeout), then Firebase for images.
 * UI never stays on Uploading… forever.
 */
export async function uploadChatAttachment(
  file: File,
  kind: "image" | "document" = "image",
): Promise<{ url: string; name: string; type: "image" | "document" }> {
  if (!file) throw new Error("No file selected.");
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large. Please use a file under 10 MB.");
  }
  if (kind === "image" && !String(file.type || "").startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, WEBP).");
  }

  const name = safeFileName(file.name || (kind === "image" ? "photo.jpg" : "document"));
  const errors: string[] = [];

  const uploadFile =
    kind === "image" ? await compressImageForChat(file) : file;
  const uploadName =
    kind === "image" ? safeFileName(uploadFile.name || name) : name;

  try {
    const url = await withTimeout(
      uploadViaCloudinary(uploadFile, kind),
      STEP_TIMEOUT_MS,
      "Cloudinary upload",
    );
    if (url) return { url: String(url).trim(), name: uploadName, type: kind };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Chat Cloudinary upload failed:", msg);
    errors.push(msg);
  }

  if (kind === "image") {
    try {
      const url = await withTimeout(
        uploadViaFirebase(uploadFile),
        STEP_TIMEOUT_MS,
        "Firebase upload",
      );
      if (url) return { url: String(url).trim(), name: uploadName, type: kind };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Chat Firebase upload failed:", msg);
      errors.push(msg);
    }
  }

  throw new Error(
    errors.length
      ? `Upload failed: ${errors.join(" | ")}`
      : "Upload failed. Please try a smaller image.",
  );
}
