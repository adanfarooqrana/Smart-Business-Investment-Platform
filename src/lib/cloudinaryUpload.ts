/**
 * Cloudinary Unsigned Upload helper for InvestBiz.
 * Uses VITE_CLOUDINARY_CLOUD_NAME + VITE_CLOUDINARY_UPLOAD_PRESET from env.
 */

export type CloudinaryFolder =
  | "chat_attachments"
  | "business_logos"
  | "business_banners"
  | "product_images"
  | "products"
  | "cnic_verifications"
  | "product_photos"
  | "payout_receipts"
  | "payment_receipts"
  | "community_images"
  | "selfies"
  | (string & {});

export type CloudinaryUploadProgress = {
  status: "idle" | "uploading" | "done" | "error";
  message: string;
  percent?: number;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function getCloudName(): string {
  const name = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
  if (!name) {
    throw new Error(
      "Cloudinary cloud name missing. Set VITE_CLOUDINARY_CLOUD_NAME in .env",
    );
  }
  return name;
}

function getUploadPreset(): string {
  const preset = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim();
  if (!preset) {
    throw new Error(
      "Cloudinary upload preset missing. Set VITE_CLOUDINARY_UPLOAD_PRESET in .env",
    );
  }
  return preset;
}

/** Accept File, Blob, or data-URL / remote URL string. */
function toUploadBody(file: File | Blob | string): Blob | string {
  if (typeof file === "string") return file;
  return file;
}

function assertFileSize(file: File | Blob | string) {
  if (typeof file === "string") {
    // Rough base64 size estimate (data URL)
    if (file.startsWith("data:") && file.length > MAX_FILE_BYTES * 1.4) {
      throw new Error("Image is too large. Please use a file under 10 MB.");
    }
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Image is too large. Please use a file under 10 MB.");
  }
}

/**
 * Upload an image to Cloudinary (unsigned) and return `secure_url`.
 *
 * @param file - File, Blob, or data URL / HTTPS URL string
 * @param folderName - Cloudinary folder (e.g. 'cnic_verifications')
 * @param onProgress - Optional UI callback for loading feedback
 */
export async function uploadToCloudinary(
  file: File | Blob | string,
  folderName: CloudinaryFolder = "product_images",
  onProgress?: (p: CloudinaryUploadProgress) => void,
): Promise<string> {
  if (!file) throw new Error("No image file provided.");

  assertFileSize(file);
  onProgress?.({ status: "uploading", message: "Uploading image...", percent: 10 });

  const cloudName = getCloudName();
  const uploadPreset = getUploadPreset();
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const form = new FormData();
  form.append("file", toUploadBody(file));
  form.append("upload_preset", uploadPreset);
  if (folderName) form.append("folder", `smartbiz/${folderName}`);

  onProgress?.({ status: "uploading", message: "Uploading image...", percent: 40 });

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body: form });
  } catch (err) {
    onProgress?.({
      status: "error",
      message: "Network error while uploading image.",
    });
    throw err instanceof Error ? err : new Error("Cloudinary upload failed.");
  }

  onProgress?.({ status: "uploading", message: "Processing image...", percent: 80 });

  const data = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!response.ok || (!data.secure_url && !data.url)) {
    const msg =
      data.error?.message ||
      `Cloudinary upload failed (${response.status}). Check unsigned preset settings.`;
    onProgress?.({ status: "error", message: msg });
    throw new Error(msg);
  }

  const secureUrl = String(data.secure_url || data.url).trim();
  onProgress?.({ status: "done", message: "Upload complete", percent: 100 });
  return secureUrl;
}

export async function uploadFileToCloudinary(
  file: File,
  folderName: CloudinaryFolder = "chat_attachments",
  onProgress?: (p: CloudinaryUploadProgress) => void,
): Promise<string> {
  if (!file) throw new Error("No file provided.");
  assertFileSize(file);
  onProgress?.({ status: "uploading", message: "Uploading file...", percent: 10 });

  const cloudName = getCloudName();
  const uploadPreset = getUploadPreset();
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  if (folderName) form.append("folder", `smartbiz/${folderName}`);

  onProgress?.({ status: "uploading", message: "Uploading file...", percent: 40 });

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body: form });
  } catch (err) {
    onProgress?.({
      status: "error",
      message: "Network error while uploading file.",
    });
    throw err instanceof Error ? err : new Error("Cloudinary upload failed.");
  }

  onProgress?.({ status: "uploading", message: "Processing file...", percent: 80 });

  const data = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!response.ok || (!data.secure_url && !data.url)) {
    const msg =
      data.error?.message ||
      `Cloudinary upload failed (${response.status}). Check unsigned preset allows raw/auto.`;
    onProgress?.({ status: "error", message: msg });
    throw new Error(msg);
  }

  const secureUrl = String(data.secure_url || data.url).trim();
  onProgress?.({ status: "done", message: "Upload complete", percent: 100 });
  return secureUrl;
}

/** Upload multiple images sequentially; returns secure URLs in order. */
export async function uploadManyToCloudinary(
  files: Array<File | Blob | string>,
  folderName: CloudinaryFolder,
  onProgress?: (p: CloudinaryUploadProgress & { index: number; total: number }) => void,
): Promise<string[]> {
  const urls: string[] = [];
  const total = files.length;
  for (let i = 0; i < files.length; i++) {
    const url = await uploadToCloudinary(files[i], folderName, (p) =>
      onProgress?.({ ...p, index: i, total }),
    );
    urls.push(url);
  }
  return urls;
}

/** True if value is already a remote HTTPS image URL (skip re-upload). */
export function isRemoteImageUrl(value: string | null | undefined): boolean {
  const v = String(value || "").trim();
  return /^https?:\/\//i.test(v) && !v.startsWith("blob:");
}

/**
 * If value is already a Cloudinary/HTTPS URL, return it.
 * If data URL / File / Blob, upload first.
 */
export async function ensureCloudinaryUrl(
  value: File | Blob | string | null | undefined,
  folderName: CloudinaryFolder,
  onProgress?: (p: CloudinaryUploadProgress) => void,
): Promise<string> {
  if (!value) return "";
  if (typeof value === "string" && isRemoteImageUrl(value)) return value.trim();
  return uploadToCloudinary(value, folderName, onProgress);
}
