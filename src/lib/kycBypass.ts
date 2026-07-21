/**
 * TEMPORARY KYC BYPASS FOR TESTING
 * --------------------------------
 * Set to `false` to restore real CNIC/selfie verification + admin approval wait.
 * When `true`:
 *  - CnicFaceVerify shows as already Done (no camera required)
 *  - KycPendingGate auto-approves and opens the dashboard
 *  - Dashboard KYC pending checks are skipped
 */
export const KYC_BYPASS_FOR_TESTING = false;

/** Tiny transparent PNG data-URL used as placeholder KYC media when bypassed. */
export const KYC_BYPASS_PLACEHOLDER_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
