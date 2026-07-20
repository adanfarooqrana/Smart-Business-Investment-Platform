/**
 * KYC face-matching pipeline: API engine (preferred) + client-side canvas fallback.
 * Threshold: >= 70% similarity required to pass.
 */

const KYC_API_URL =
  import.meta.env.VITE_KYC_API_URL ||
  (import.meta.env.DEV ? "/kyc-api" : "http://localhost:8000");

const KYC_ALLOW_OFFLINE = import.meta.env.VITE_KYC_ALLOW_OFFLINE === "true";

/** Hard verification gate — faces must match at least this confidence. */
export const FACE_MATCH_THRESHOLD = 70;

export const FACE_MATCH_FAIL_REASON =
  "Face match failed. Please try again, face does not match the CNIC image.";

export type KycVerifyResult = {
  success: boolean;
  confidence?: number;
  verdict?: string;
  message?: string;
  error?: string;
  reason?: string;
  matchConfidenceScore?: number;
  engine?: "api" | "client";
};

export async function checkKycApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${KYC_API_URL}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function verifyKycWithEngine(params: {
  idCardFront: File;
  idCardBack: File;
  liveFace: File;
  researcherId: string;
}): Promise<KycVerifyResult> {
  const form = new FormData();
  form.append("id_card", params.idCardFront);
  form.append("id_card_back", params.idCardBack);
  form.append("live_face", params.liveFace);
  form.append("researcher_id", params.researcherId);

  let res: Response;
  try {
    res = await fetch(`${KYC_API_URL}/verify-kyc`, {
      method: "POST",
      body: form,
    });
  } catch {
    return {
      success: false,
      error: "Cannot reach KYC server. Start: cd kyc-engine && python main.py",
    };
  }

  const data = await res.json();
  if (!res.ok && !data?.message) {
    return {
      success: false,
      error: data?.error || `KYC server error (${res.status})`,
    };
  }

  const confidence = Number(data.confidence ?? 0);
  const passed = Boolean(data.success) && confidence >= FACE_MATCH_THRESHOLD;

  if (!passed) {
    return {
      success: false,
      confidence,
      matchConfidenceScore: confidence,
      verdict: data.verdict,
      message: data.message,
      reason: FACE_MATCH_FAIL_REASON,
      error: FACE_MATCH_FAIL_REASON,
      engine: "api",
    };
  }

  return {
    success: true,
    confidence,
    matchConfidenceScore: confidence,
    verdict: data.verdict || "MATCHED",
    message: data.message || `Face matched successfully (${Math.round(confidence)}% confidence)!`,
    engine: "api",
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for face matching."));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

/**
 * Extract a face-ish grayscale crop:
 * - CNIC photo usually sits on the left third
 * - Live selfie face is centered
 */
function extractFaceGray(
  img: HTMLImageElement,
  mode: "cnic" | "selfie",
  size = 160,
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not supported");

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;

  if (mode === "cnic") {
    // Pakistani CNIC: portrait on left
    sw = Math.max(1, Math.floor(w * 0.38));
    sh = Math.max(1, Math.floor(h * 0.72));
    sx = Math.floor(w * 0.04);
    sy = Math.floor(h * 0.14);
  } else {
    // Selfie: centered square
    const side = Math.min(w, h) * 0.55;
    sw = side;
    sh = side;
    sx = (w - side) / 2;
    sy = (h - side) / 2.4;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const gray = new Float32Array(size * size);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  // Release canvas backing store where possible
  canvas.width = 0;
  canvas.height = 0;
  return gray;
}

function histogram64(gray: Float32Array): Float32Array {
  const hist = new Float32Array(64);
  for (let i = 0; i < gray.length; i += 1) {
    const bin = Math.min(63, Math.floor(gray[i] / 4));
    hist[bin] += 1;
  }
  // L2 normalize (same spirit as OpenCV normalize)
  let sumSq = 0;
  for (let i = 0; i < hist.length; i += 1) sumSq += hist[i] * hist[i];
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < hist.length; i += 1) hist[i] /= norm;
  return hist;
}

/** OpenCV HISTCMP_CORREL equivalent on normalized histograms → 0–100. */
function correlPercent(a: Float32Array, b: Float32Array): number {
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < a.length; i += 1) {
    meanA += a[i];
    meanB += b[i];
  }
  meanA /= a.length;
  meanB /= b.length;

  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB) || 1;
  const corr = num / den;
  return Math.round(Math.max(0, Math.min(100, corr * 100)) * 100) / 100;
}

/**
 * Client-side face similarity between CNIC front and live selfie (data URLs or blob URLs).
 */
export async function matchFacesClientSide(
  cnicFrontSrc: string,
  liveSelfieSrc: string,
): Promise<KycVerifyResult> {
  try {
    const [cnicImg, selfieImg] = await Promise.all([
      loadImage(cnicFrontSrc),
      loadImage(liveSelfieSrc),
    ]);

    const cnicGray = extractFaceGray(cnicImg, "cnic");
    const selfieGray = extractFaceGray(selfieImg, "selfie");
    const confidence = correlPercent(histogram64(cnicGray), histogram64(selfieGray));

    if (confidence < FACE_MATCH_THRESHOLD) {
      return {
        success: false,
        confidence,
        matchConfidenceScore: confidence,
        reason: FACE_MATCH_FAIL_REASON,
        error: FACE_MATCH_FAIL_REASON,
        message: FACE_MATCH_FAIL_REASON,
        engine: "client",
      };
    }

    return {
      success: true,
      confidence,
      matchConfidenceScore: confidence,
      verdict: "MATCHED",
      message: `Face matched successfully (${Math.round(confidence)}% confidence)!`,
      engine: "client",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Client face match failed.",
      reason: FACE_MATCH_FAIL_REASON,
      engine: "client",
    };
  }
}

/**
 * Full pipeline: prefer KYC API when healthy, else client canvas matcher.
 * Always enforces FACE_MATCH_THRESHOLD (70%).
 */
export async function runFaceMatchPipeline(params: {
  cnicFrontFile?: File | null;
  cnicBackFile?: File | null;
  liveSelfieFile?: File | null;
  cnicFrontDataUrl: string;
  cnicBackDataUrl?: string;
  liveSelfieDataUrl: string;
  researcherId: string;
}): Promise<KycVerifyResult> {
  const apiUp = await checkKycApiHealth();

  if (apiUp) {
    try {
      const front =
        params.cnicFrontFile ||
        dataUrlToFile(params.cnicFrontDataUrl, "cnic-front.jpg");
      const back =
        params.cnicBackFile ||
        (params.cnicBackDataUrl
          ? dataUrlToFile(params.cnicBackDataUrl, "cnic-back.jpg")
          : dataUrlToFile(params.cnicFrontDataUrl, "cnic-back.jpg"));
      const live =
        params.liveSelfieFile ||
        dataUrlToFile(params.liveSelfieDataUrl, "live-selfie.jpg");

      const apiResult = await verifyKycWithEngine({
        idCardFront: front,
        idCardBack: back,
        liveFace: live,
        researcherId: params.researcherId || "anonymous",
      });

      // If API unreachable-style error and offline allowed, fall through
      if (apiResult.error?.includes("Cannot reach") && KYC_ALLOW_OFFLINE) {
        /* fall through to client */
      } else {
        return apiResult;
      }
    } catch {
      if (!KYC_ALLOW_OFFLINE) {
        return {
          success: false,
          error: "KYC API failed.",
          reason: FACE_MATCH_FAIL_REASON,
        };
      }
    }
  } else {
    return {
      success: false,
      error:
        "KYC Engine offline. Start server: cd kyc-engine && python main.py (or run start-server.bat)",
      reason: FACE_MATCH_FAIL_REASON,
    };
  }

  if (!KYC_ALLOW_OFFLINE) {
    return {
      success: false,
      error: "KYC Engine unavailable and offline fallback is disabled.",
      reason: FACE_MATCH_FAIL_REASON,
    };
  }

  console.warn("[KYC] kyc-engine unreachable — using browser fallback (set VITE_KYC_ALLOW_OFFLINE=true to allow).");
  return matchFacesClientSide(params.cnicFrontDataUrl, params.liveSelfieDataUrl);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function compressDataUrl(
  dataUrl: string,
  maxWidth = 1024,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", quality);
      canvas.width = 0;
      canvas.height = 0;
      resolve(out);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function compressImageFile(file: File): Promise<string> {
  const raw = await fileToDataUrl(file);
  if (!file.type.startsWith("image/")) return raw;
  return compressDataUrl(raw);
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

export { KYC_ALLOW_OFFLINE };
