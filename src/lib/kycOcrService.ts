import { createWorker, PSM, type Worker } from "tesseract.js";

export type ExtractedCnicData = {
  fullName: string;
  cnicNumber: string;
  fromOcr: boolean;
  rawText?: string;
};

/** Structured cleaner output — always `{ fullName, cnicNumber }`. */
export type ParsedCnicFields = {
  fullName: string;
  cnicNumber: string;
};

/** Rule 1 Step B: `\b\d{5}[-]?\d{7}[-]?\d{1}\b` */
const CNIC_PATTERN = /\b(\d{5})-?(\d{7})-?(\d)\b/g;

/** Rule 2: English name line after "Name" label — A–Z + spaces, 3–30 chars. */
const NAME_LINE_PATTERN = /^[A-Z\s]{3,30}$/;

const DEMO_NAMES = new Set(["muhammad ali khan"]);
const DEMO_CNIC_DIGITS = new Set(["4210112345671"]);

/** Words / labels to ignore when extracting the person name. */
const IGNORE_NAME_WORDS =
  /\b(name|father|husband|mother|spouse|identity|card|islamic|republic|pakistan|national|government|citizen|cnic|date|of|birth|gender|country|stay|permanent|address|district|signature|blood|issue|expiry|holder|urdu|english)\b/i;

const HAS_URDU = /[\u0600-\u06FF]/;

/** Mild OCR digit noise only inside digit-like chunks. */
function normalizeDigitNoise(raw: string): string {
  return raw
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8")
    .replace(/[Zz]/g, "2")
    .replace(/[Gg]/g, "6");
}

/**
 * Reject OCR phantoms (e.g. 18092-0218092-0 where the first block is echoed).
 * Noisy / low-confidence → treat as missing (fallback "").
 */
function isPlausibleCnicDigits(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  if (DEMO_CNIC_DIGITS.has(digits)) return false;
  if (/^0{5}/.test(digits)) return false;
  if (/^(\d)\1{12}$/.test(digits)) return false;

  const head = digits.slice(0, 5);
  const mid = digits.slice(5, 12);
  if (new Set(digits).size < 4) return false;
  if (mid.includes(head)) return false;
  if (digits.indexOf(head, 1) !== -1) return false;
  if (/^0{5,}/.test(mid)) return false;
  if (digits.slice(8, 13) === head) return false;
  return true;
}

/** Normalize to `XXXXX-XXXXXXX-X`, or `""` if invalid. */
export function formatPakistaniCnic(raw: string): string {
  const digits = normalizeDigitNoise(raw).replace(/\D/g, "");
  if (!isPlausibleCnicDigits(digits)) return "";
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function sanitizeExtractedCnic(cnic?: string | null): string {
  const raw = String(cnic || "").trim();
  if (!raw) return "";
  if (raw === "42101-1234567-1") return "";
  return formatPakistaniCnic(raw);
}

function toTitleCaseName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();
}

/**
 * Clean a candidate English name line.
 * Keeps A–Z / spaces only; rejects ignore-list / noisy lines → "".
 */
function cleanEnglishNameCandidate(raw: string): string {
  const stripped = String(raw || "")
    .replace(HAS_URDU, " ")
    .replace(/[^A-Za-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return "";

  const upper = stripped.toUpperCase();
  if (!NAME_LINE_PATTERN.test(upper)) return "";
  if (IGNORE_NAME_WORDS.test(upper)) return "";
  if (DEMO_NAMES.has(stripped.toLowerCase())) return "";

  const words = upper.split(/\s+/).filter(Boolean);
  // Person names on CNIC are almost always 2–5 tokens
  if (words.length < 2 || words.length > 5) return "";
  if (words.some((w) => w.length < 2)) return "";

  return toTitleCaseName(upper);
}

export function sanitizeExtractedName(name?: string | null): string {
  return cleanEnglishNameCandidate(String(name || ""));
}

/** True only for the CNIC "Name" field label (not Father / Husband Name). */
function isPersonNameLabel(line: string): boolean {
  const l = line.trim();
  if (/\b(father|husband|mother|spouse)\b/i.test(l)) return false;
  return (
    /^name(\s*\/\s*.*)?\s*[:.\-]*\s*$/i.test(l) ||
    /^name(\s*\/\s*\S*)?\s*[:.\-]?\s+[A-Za-z]/i.test(l) ||
    /^نام\s*\/?\s*name\b/i.test(l)
  );
}

/**
 * Rule 1 — CNIC NUMBER EXTRACTION
 * A) Keep alphanumerics + hyphens
 * B) Match `\b\d{5}[-]?\d{7}[-]?\d{1}\b`
 * C) Normalize `XXXXX-XXXXXXX-X`
 * Fallback: ""
 */
export function extractCnicNumberFromOcrText(rawText: string, boostText = ""): string {
  const pool = `${rawText || ""}\n${boostText || ""}`;

  // Step A (+ mild digit OCR repair inside digit clusters)
  const stepA = pool
    .replace(/([0-9OIlZSBg-]{5,})/gi, (chunk) => normalizeDigitNoise(chunk))
    .replace(/[^A-Za-z0-9-]+/g, " ");

  const tallies = new Map<string, number>();
  const consider = (a: string, b: string, c: string, weight = 1) => {
    const formatted = formatPakistaniCnic(`${a}${b}${c}`);
    if (!formatted) return;
    const digits = formatted.replace(/\D/g, "");
    tallies.set(digits, (tallies.get(digits) || 0) + weight);
  };

  // Step B — prefer boost (ID-band) hits
  if (boostText) {
    const boostClean = boostText
      .replace(/([0-9OIlZSBg-]{5,})/gi, (chunk) => normalizeDigitNoise(chunk))
      .replace(/[^A-Za-z0-9-]+/g, " ");
    for (const m of boostClean.matchAll(new RegExp(CNIC_PATTERN.source, "g"))) {
      consider(m[1], m[2], m[3], 3);
    }
  }

  for (const m of stepA.matchAll(new RegExp(CNIC_PATTERN.source, "g"))) {
    consider(m[1], m[2], m[3], 1);
  }

  // Compact 13-digit runs as secondary (still must pass plausibility)
  for (const m of stepA.matchAll(/\b\d{13}\b/g)) {
    const formatted = formatPakistaniCnic(m[0]);
    if (!formatted) continue;
    const digits = formatted.replace(/\D/g, "");
    tallies.set(digits, (tallies.get(digits) || 0) + 1);
  }

  if (!tallies.size) return ""; // Rule 3 fallback

  let winner = "";
  let best = -1;
  for (const [digits, count] of tallies) {
    if (count > best) {
      best = count;
      winner = digits;
    }
  }
  return formatPakistaniCnic(winner); // Step C
}

/**
 * Rule 2 — FULL NAME EXTRACTION (ENGLISH)
 * Look for the line immediately after "Name" / "Name / "
 * Match `^[A-Z\s]{3,30}$` (after cleaning)
 * Fallback: ""
 */
export function extractFullNameFromOcrText(rawText: string): string {
  const lines = String(rawText || "")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isPersonNameLabel(line)) continue;

    // Same-line: "Name: ROMAN ZAHID" / "Name / نام ROMAN ZAHID"
    const afterLabel = line
      .replace(/^.*?name(\s*\/\s*[^\s:]*)?\s*[:\-.]?\s*/i, "")
      .replace(/^نام\s*\/?\s*name\s*[:\-.]?\s*/i, "")
      .trim();
    const sameLine = cleanEnglishNameCandidate(afterLabel);
    if (sameLine) candidates.push(sameLine);

    // Next Latin-only line(s) under the Name label
    for (let j = i + 1; j <= i + 3 && j < lines.length; j += 1) {
      const next = lines[j];
      if (HAS_URDU.test(next) && !/[A-Za-z]{3,}/.test(next)) continue; // Urdu name line
      if (isPersonNameLabel(next)) break;
      if (/\b(father|husband|mother|gender|date|country)\b/i.test(next)) break;

      const cleaned = cleanEnglishNameCandidate(next);
      if (cleaned) {
        candidates.push(cleaned);
        break;
      }
    }
  }

  if (!candidates.length) return ""; // Rule 3 fallback

  // Prefer longer complete names (e.g. "Roman Zahid" over truncated "Man Zahid")
  candidates.sort((a, b) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    if (al !== bl && al.endsWith(bl)) return -1;
    if (bl !== al && bl.endsWith(al)) return 1;
    return b.length - a.length;
  });

  return candidates[0];
}

/**
 * Clean raw Tesseract output → structured `{ fullName, cnicNumber }`.
 */
export function parsePakistaniCnicOcrText(rawText: string, boostIdText = ""): ParsedCnicFields {
  return {
    fullName: extractFullNameFromOcrText(rawText),
    cnicNumber: extractCnicNumberFromOcrText(rawText, boostIdText),
  };
}

// ─── Internal aliases used by the Tesseract capture pipeline ─────────────────

function extractCnicNumber(text: string, boostText = ""): string {
  return extractCnicNumberFromOcrText(text, boostText);
}

function extractFullName(text: string): string {
  return extractFullNameFromOcrText(text);
}

function isReadableImageSrc(src?: string): boolean {
  if (!src || typeof src !== "string") return false;
  const s = src.trim();
  return s.startsWith("data:image") || s.startsWith("blob:") || /^https?:\/\//i.test(s);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load CNIC image for OCR."));
    img.src = src;
  });
}

type CropRect = { sx: number; sy: number; sw: number; sh: number };

/**
 * Pakistani CNIC front layout (portrait photo left ~35%, text fields right):
 * - Identity number band: upper-mid right
 * - Name field: mid right
 */
function cnicCropRegions(w: number, h: number): Record<string, CropRect> {
  return {
    full: { sx: 0, sy: 0, sw: w, sh: h },
    textColumn: { sx: Math.floor(w * 0.3), sy: Math.floor(h * 0.12), sw: Math.floor(w * 0.68), sh: Math.floor(h * 0.78) },
    nameBand: { sx: Math.floor(w * 0.28), sy: Math.floor(h * 0.28), sw: Math.floor(w * 0.68), sh: Math.floor(h * 0.22) },
    nameBandTight: { sx: Math.floor(w * 0.34), sy: Math.floor(h * 0.33), sw: Math.floor(w * 0.6), sh: Math.floor(h * 0.14) },
    idBand: { sx: Math.floor(w * 0.34), sy: Math.floor(h * 0.14), sw: Math.floor(w * 0.62), sh: Math.floor(h * 0.18) },
  };
}

/**
 * Upscale + grayscale + contrast boost + mild threshold for Tesseract.
 * Adds a white border so edge letters are not clipped by the OCR engine.
 */
async function preprocessForOcr(
  src: string,
  crop?: CropRect,
  opts?: { threshold?: boolean; softThreshold?: boolean; targetWidth?: number; pad?: number },
): Promise<string> {
  const img = await loadImageElement(src);
  const sx = crop?.sx ?? 0;
  const sy = crop?.sy ?? 0;
  const sw = crop?.sw ?? (img.naturalWidth || img.width);
  const sh = crop?.sh ?? (img.naturalHeight || img.height);

  const targetW = opts?.targetWidth ?? 1800;
  const scale = Math.max(1.8, targetW / Math.max(1, sw));
  const cw = Math.max(1, Math.round(sw * scale));
  const ch = Math.max(1, Math.round(sh * scale));
  const pad = Math.max(0, opts?.pad ?? (opts?.threshold || opts?.softThreshold ? 24 : 12));

  const canvas = document.createElement("canvas");
  canvas.width = cw + pad * 2;
  canvas.height = ch + pad * 2;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unsupported for OCR preprocess.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, pad, pad, cw, ch);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const total = canvas.width * canvas.height;

  let min = 255;
  let max = 0;
  const gray = new Uint8Array(total);
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    gray[p] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  const cut = opts?.softThreshold ? 168 : 152;
  for (let p = 0, i = 0; p < gray.length; p += 1, i += 4) {
    let v = ((gray[p] - min) / range) * 255;
    v = (v - 128) * 1.25 + 128;
    v = Math.max(0, Math.min(255, v));
    if (opts?.threshold || opts?.softThreshold) {
      v = v > cut ? 255 : 0;
    }
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  const out = canvas.toDataURL("image/png");
  canvas.width = 0;
  canvas.height = 0;
  return out;
}

async function recognizeWithModes(
  worker: Worker,
  imageSrc: string,
  opts?: { lettersOnly?: boolean; digitsOnly?: boolean },
): Promise<string> {
  const modes = opts?.digitsOnly
    ? [PSM.SINGLE_LINE, PSM.SINGLE_BLOCK, PSM.AUTO]
    : opts?.lettersOnly
      ? [PSM.SINGLE_BLOCK, PSM.SINGLE_LINE, PSM.AUTO]
      : [PSM.SINGLE_BLOCK, PSM.AUTO, PSM.SINGLE_COLUMN];

  const whitelist = opts?.digitsOnly
    ? "0123456789-"
    : opts?.lettersOnly
      ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -'."
      : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-./: ";

  let best = "";
  let bestParsedScore = -1;
  for (const mode of modes) {
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: mode,
        tessedit_char_whitelist: whitelist,
        preserve_interword_spaces: "1",
      });
      const ret = await worker.recognize(imageSrc);
      const text = String(ret?.data?.text || "").trim();
      if (!text) continue;

      if (opts?.digitsOnly) {
        const cnic = extractCnicNumber(text);
        const score = cnic ? 10 + cnic.length : 0;
        if (score > bestParsedScore || (score === bestParsedScore && text.length > best.length)) {
          bestParsedScore = score;
          best = text;
        } else if (!best) {
          best = text;
        }
      } else if (opts?.lettersOnly) {
        const name = extractFullName(text);
        if (name && text.length >= best.length) best = text;
        else if (text.length > best.length && !IGNORE_NAME_WORDS.test(text)) best = text;
      } else if (text.length > best.length) {
        best = text;
      }

      if (!opts?.lettersOnly && !opts?.digitsOnly && extractCnicNumber(text) && extractFullName(text)) {
        break;
      }
    } catch {
      /* try next mode */
    }
  }
  return best;
}

/**
 * Accurate Pakistani CNIC OCR:
 * preprocess → multi-region crops → Tesseract → rule-based cleaner → `{ fullName, cnicNumber }`.
 */
export async function extractCnicDataFromPayload(
  cnicFrontDataUrl?: string,
  cnicBackDataUrl?: string,
  fallbackName?: string,
): Promise<ExtractedCnicData> {
  const softName = sanitizeExtractedName(fallbackName);
  const empty: ExtractedCnicData = {
    fullName: softName,
    cnicNumber: "",
    fromOcr: false,
  };

  const front = isReadableImageSrc(cnicFrontDataUrl) ? cnicFrontDataUrl! : "";
  const back = isReadableImageSrc(cnicBackDataUrl) ? cnicBackDataUrl! : "";
  if (!front && !back) {
    console.warn("[OCR] No readable CNIC image.");
    return empty;
  }

  let worker: Worker | null = null;
  try {
    worker = await createWorker("eng", 1, {
      logger: () => undefined,
    });

    let combined = "";
    let idBandText = "";
    const primary = front || back;

    try {
      const img = await loadImageElement(primary);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const crops = cnicCropRegions(w, h);

      const jobs: Array<{
        crop: CropRect;
        threshold?: boolean;
        softThreshold?: boolean;
        label: string;
        lettersOnly?: boolean;
        digitsOnly?: boolean;
        targetWidth?: number;
      }> = [
        { crop: crops.full, label: "full", targetWidth: 1800 },
        { crop: crops.textColumn, label: "text", targetWidth: 1600 },
        { crop: crops.nameBand, label: "name-soft", lettersOnly: true, targetWidth: 2000 },
        { crop: crops.nameBand, softThreshold: true, label: "name-bin", lettersOnly: true, targetWidth: 2000 },
        { crop: crops.nameBandTight, label: "name-tight", lettersOnly: true, targetWidth: 1800 },
        { crop: crops.idBand, threshold: true, label: "id-bin", digitsOnly: true, targetWidth: 1800 },
        { crop: crops.idBand, label: "id-soft", digitsOnly: true, targetWidth: 1800 },
        { crop: crops.idBand, softThreshold: true, label: "id-softbin", digitsOnly: true, targetWidth: 1600 },
      ];

      for (const job of jobs) {
        try {
          const processed = await preprocessForOcr(primary, job.crop, {
            threshold: job.threshold,
            softThreshold: job.softThreshold,
            targetWidth: job.targetWidth ?? 1400,
            pad: job.lettersOnly || job.digitsOnly ? 28 : 12,
          });
          const text = await recognizeWithModes(worker, processed, {
            lettersOnly: job.lettersOnly,
            digitsOnly: job.digitsOnly,
          });
          if (text) {
            combined += `\n${text}`;
            if (job.digitsOnly) idBandText += `\n${text}`;
          }
        } catch (regionErr) {
          console.warn(`[OCR] region ${job.label} failed:`, regionErr);
        }
      }
    } catch (prepErr) {
      console.warn("[OCR] preprocess failed, raw recognize:", prepErr);
      const text = await recognizeWithModes(worker, primary);
      combined += `\n${text}`;
    }

    if (back && back !== primary) {
      try {
        const processed = await preprocessForOcr(back, undefined, { targetWidth: 1400 });
        const text = await recognizeWithModes(worker, processed);
        if (text) {
          combined += `\n${text}`;
          idBandText += `\n${text}`;
        }
      } catch {
        /* ignore back failures */
      }
    }

    await worker.terminate();
    worker = null;

    // Rule-based cleaner → structured JSON fields
    const parsed = parsePakistaniCnicOcrText(combined, idBandText);
    const fullName = parsed.fullName || softName;
    const cnicNumber = parsed.cnicNumber;

    console.info("[OCR] result", { fullName, cnicNumber, preview: combined.slice(0, 240) });

    return {
      fullName,
      cnicNumber,
      fromOcr: Boolean(cnicNumber || parsed.fullName),
      rawText: combined.slice(0, 3000),
    };
  } catch (ocrErr) {
    console.warn("[OCR] Tesseract failed:", ocrErr);
    try {
      await worker?.terminate();
    } catch {
      /* ignore */
    }
    return empty;
  }
}
