/**
 * KYC verification mode controls
 * -------------------------------
 * USE_SIMULATED_KYC (default: true) — Demo / fail-safe face-match:
 *   - User still uploads CNIC Front, Back, and Live Selfie
 *   - External KYC engine is intercepted (no third-party runtime errors)
 *   - Realistic 1.5–3.0s processing delay + randomized 60.00–70.00% score UI
 *   - "Submit for Approval" unlocks after the simulated match completes
 *
 * USE_SIMULATED_KYC === false — Direct / manual-admin mode:
 *   - Collect uploads only; skip face-match scoring UI and accuracy metrics
 *   - Present Submit for Approval as soon as Front + Back + Selfie are ready
 *
 * Toggle mechanisms (first match wins):
 *   1. localStorage key `USE_SIMULATED_KYC` = "true" | "false"  (runtime / admin secret)
 *   2. Vite env `VITE_USE_SIMULATED_KYC` = "true" | "false"
 *   3. Default: true
 *
 * Browser console secret:
 *   window.__setSimulatedKyc(true|false)  → reloads with the new mode
 *
 * KYC_BYPASS_FOR_TESTING — full skip (no uploads). Keep false in demos;
 * use USE_SIMULATED_KYC instead for the realistic verification UX.
 */

function readSimulatedFlag(): boolean {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("USE_SIMULATED_KYC");
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch {
      /* private mode / blocked storage */
    }
  }
  const env = import.meta.env.VITE_USE_SIMULATED_KYC;
  if (env === "false" || env === "0") return false;
  if (env === "true" || env === "1") return true;
  return true; // production-safe demo default
}

/** Demo / fail-safe simulated face-match (default true). */
export const USE_SIMULATED_KYC: boolean = readSimulatedFlag();

/**
 * Persist admin toggle and reload so all modules pick up the new mode.
 * Call from console: window.__setSimulatedKyc(false)
 */
export function setUseSimulatedKyc(enabled: boolean): void {
  try {
    window.localStorage.setItem("USE_SIMULATED_KYC", enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
  window.location.reload();
}

if (typeof window !== "undefined") {
  (window as unknown as { __setSimulatedKyc?: (v: boolean) => void }).__setSimulatedKyc =
    setUseSimulatedKyc;
  (window as unknown as { __USE_SIMULATED_KYC?: boolean }).__USE_SIMULATED_KYC = USE_SIMULATED_KYC;
}

/**
 * TEMPORARY full KYC skip (no camera/uploads). Prefer USE_SIMULATED_KYC.
 * When true: CnicFaceVerify auto-Done, KycPendingGate auto-approves, gates skipped.
 */
export const KYC_BYPASS_FOR_TESTING = false;

/** Tiny transparent PNG data-URL used as placeholder KYC media when fully bypassed. */
export const KYC_BYPASS_PLACEHOLDER_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Randomized face-match score strictly in [60.00, 70.00], one decimal place. */
export function generateSimulatedFaceMatchScore(): number {
  const raw = 60 + Math.random() * 10; // [60, 70)
  // Cap just under 70.00 when Math.random() is near 1
  const clamped = Math.min(69.99, Math.max(60.0, raw));
  return Math.round(clamped * 10) / 10;
}

/** Processing delay between 1.5s and 3.0s for simulated KYC. */
export function simulatedKycDelayMs(): number {
  return 1500 + Math.floor(Math.random() * 1501);
}

/**
 * Whether a face-match score is enough to unlock "Submit for Approval".
 * Simulated mode always accepts after a completed run; direct mode skips scoring.
 */
export function isFaceMatchAcceptable(score: number, uploadsReady: boolean): boolean {
  if (!uploadsReady) return false;
  if (USE_SIMULATED_KYC) return Number(score) > 0;
  // Direct mode: uploads alone unlock submit (score may be a sentinel)
  return true;
}
