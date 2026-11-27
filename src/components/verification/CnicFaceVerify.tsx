import { useEffect, useRef, useState } from "react";
import {
  IdCard,
  Camera,
  CheckCircle2,
  Loader2,
  ScanFace,
  RefreshCw,
  ShieldCheck,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase";
import {
  compressDataUrl,
  runFaceMatchPipeline,
} from "@/lib/kycService";
import {
  KYC_BYPASS_FOR_TESTING,
  KYC_BYPASS_PLACEHOLDER_IMAGE,
  USE_SIMULATED_KYC,
} from "@/lib/kycBypass";

export type CnicFaceResult = {
  cnicFront: string;
  cnicBack: string;
  liveSelfie: string;
  faceMatchScore: number;
  matchConfidenceScore: number;
  /** true when score UI was skipped (direct mode) */
  skippedScoreUi?: boolean;
  simulated?: boolean;
};

type CnicFaceVerifyProps = {
  onComplete: (result: CnicFaceResult) => void;
  /** Fired when match fails so parents can clear pending selfie state */
  onMatchFailed?: (reason: string) => void;
  accent?: "amber" | "emerald" | "violet";
  className?: string;
  /** Change this to force a clean KYC form (clears stale CNIC/selfie). */
  resetKey?: string | number;
};

const ACCENTS = {
  amber: {
    ring: "border-amber-400",
    text: "text-amber-600",
    bg: "from-amber-500 to-orange-500",
    soft: "bg-amber-50 border-amber-200",
  },
  emerald: {
    ring: "border-emerald-400",
    text: "text-emerald-600",
    bg: "from-emerald-500 to-teal-500",
    soft: "bg-emerald-50 border-emerald-200",
  },
  violet: {
    ring: "border-violet-400",
    text: "text-violet-600",
    bg: "from-violet-500 to-purple-500",
    soft: "bg-violet-50 border-violet-200",
  },
};

export function CnicFaceVerify({
  onComplete,
  onMatchFailed,
  accent = "amber",
  className = "",
  resetKey = "default",
}: CnicFaceVerifyProps) {
  const a = ACCENTS[accent];

  // Full bypass: skip camera/CNIC entirely (separate from simulated mode)
  useEffect(() => {
    if (!KYC_BYPASS_FOR_TESTING) return;
    const t = window.setTimeout(() => {
      onComplete({
        cnicFront: KYC_BYPASS_PLACEHOLDER_IMAGE,
        cnicBack: KYC_BYPASS_PLACEHOLDER_IMAGE,
        liveSelfie: KYC_BYPASS_PLACEHOLDER_IMAGE,
        faceMatchScore: 100,
        matchConfidenceScore: 100,
      });
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (KYC_BYPASS_FOR_TESTING) {
    return (
      <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center ${className}`}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className={`text-sm font-bold ${a.text}`}>KYC temporarily disabled for testing</p>
        <p className="mt-1 text-xs text-slate-500">
          CNIC + live selfie skipped. Continuing as <span className="font-semibold text-emerald-700">Done</span>.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
          <CheckCircle2 className="h-3.5 w-3.5" /> Done
        </div>
      </div>
    );
  }

  return (
    <CnicFaceVerifyActive
      key={String(resetKey)}
      onComplete={onComplete}
      onMatchFailed={onMatchFailed}
      accent={accent}
      className={className}
    />
  );
}

/** Original KYC UI — simulated or live engine based on USE_SIMULATED_KYC. */
function CnicFaceVerifyActive({
  onComplete,
  onMatchFailed,
  accent = "amber",
  className = "",
}: CnicFaceVerifyProps) {
  const a = ACCENTS[accent];
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [selfie, setSelfie] = useState("");
  const [camOpen, setCamOpen] = useState(false);
  const [camError, setCamError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [score, setScore] = useState(0);
  const [scoreDisplay, setScoreDisplay] = useState("");
  const [done, setDone] = useState(false);
  const [failBanner, setFailBanner] = useState("");
  const [successBanner, setSuccessBanner] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);
  const completingRef = useRef(false);

  const stopCam = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => () => stopCam(), []);

  /** Reject solid black / blank uploads before calling the engine. */
  const isBlankDataUrl = (dataUrl: string): Promise<boolean> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let sum = 0;
        let sumSq = 0;
        const n = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
          sum += v;
          sumSq += v * v;
        }
        const mean = sum / n;
        const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
        resolve(mean < 14 || mean > 248 || std < 10);
      };
      img.onerror = () => resolve(true);
      img.src = dataUrl;
    });

  const readFile = (file: File | undefined, setter: (v: string) => void, label: string) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      if (await isBlankDataUrl(dataUrl)) {
        setFailBanner(`Please upload a correct ${label} photo (blank/black images are not allowed).`);
        setter("");
        return;
      }
      setFailBanner("");
      setter(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const openCamera = async (opts?: { keepFailBanner?: boolean }) => {
    setCamError("");
    if (!opts?.keepFailBanner) setFailBanner("");
    stopCam();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOpen(true);
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          void video.play().catch(() => {});
        };
        void video.play().catch(() => {});
      });
    } catch {
      setCamError(
        "Camera access denied. Allow webcam permission — live selfie is required (file upload disabled for liveness).",
      );
    }
  };

  const finishDirectMode = async (frontSnap: string, backSnap: string, selfieSnap: string) => {
    if (completingRef.current) return;
    completingRef.current = true;
    setScanning(true);
    setFailBanner("");
    setSuccessBanner("");
    try {
      const [frontCompressed, backCompressed, selfieCompressed] = await Promise.all([
        compressDataUrl(frontSnap),
        compressDataUrl(backSnap),
        compressDataUrl(selfieSnap, 720, 0.8),
      ]);
      setDone(true);
      setSuccessBanner("Documents captured. Submit for admin approval when ready.");
      onComplete({
        cnicFront: frontCompressed,
        cnicBack: backCompressed,
        liveSelfie: selfieCompressed,
        faceMatchScore: 100,
        matchConfidenceScore: 100,
        skippedScoreUi: true,
        simulated: false,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Failed to prepare KYC documents.";
      setFailBanner(reason);
      onMatchFailed?.(reason);
      completingRef.current = false;
    } finally {
      setScanning(false);
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setCamError("Camera still starting — wait for the live preview, then snap.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    const sample = ctx.getImageData(0, 0, Math.min(32, w), Math.min(32, h)).data;
    let sum = 0;
    for (let i = 0; i < sample.length; i += 4) {
      sum += sample[i] + sample[i + 1] + sample[i + 2];
    }
    const avg = sum / ((sample.length / 4) * 3);
    if (avg < 12) {
      setCamError("Selfie came out black. Wait for a clear preview, then snap again.");
      return;
    }
    const data = canvas.toDataURL("image/jpeg", 0.85);
    canvas.width = 0;
    canvas.height = 0;
    setSelfie(data);
    setCamError("");
    setFailBanner("");
    setSuccessBanner("");
    setDone(false);
    setScore(0);
    setScoreDisplay("");
    stopCam();
    setCamOpen(false);

    // Direct mode: skip face-match scoring UI — unlock submit after uploads
    if (!USE_SIMULATED_KYC && front && back) {
      void finishDirectMode(front, back, data);
    }
  };

  const clearSelfieForRetry = (autoOpenCamera = true) => {
    setSelfie("");
    setScore(0);
    setScoreDisplay("");
    setDone(false);
    setScanning(false);
    setSuccessBanner("");
    completingRef.current = false;
    if (autoOpenCamera && front && back) {
      window.setTimeout(() => {
        void openCamera({ keepFailBanner: true });
      }, 250);
    }
  };

  const handleVerifyIdentity = async () => {
    if (!front || !back) {
      setFailBanner("Upload CNIC Front and Back before verification.");
      return;
    }
    if (!selfie) {
      setFailBanner("Capture a live selfie with the camera first.");
      return;
    }

    // Direct mode should never show scoring — complete without accuracy metrics
    if (!USE_SIMULATED_KYC) {
      await finishDirectMode(front, back, selfie);
      return;
    }

    const frontSnap = front;
    const backSnap = back;
    const selfieSnap = selfie;
    const attemptId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setScanning(true);
    setFailBanner("");
    setSuccessBanner("");
    setScore(0);
    setScoreDisplay("");

    try {
      const [frontCompressed, backCompressed, selfieCompressed] = await Promise.all([
        compressDataUrl(frontSnap),
        compressDataUrl(backSnap),
        compressDataUrl(selfieSnap, 720, 0.8),
      ]);

      const result = await runFaceMatchPipeline({
        cnicFrontDataUrl: frontCompressed,
        cnicBackDataUrl: backCompressed,
        liveSelfieDataUrl: selfieCompressed,
        researcherId: `${auth.currentUser?.uid || "anonymous"}-${attemptId}`,
      });

      const confidence = Number(result.matchConfidenceScore ?? result.confidence ?? 0);
      const display = Number.isFinite(confidence)
        ? (Math.round(confidence * 10) / 10).toFixed(1)
        : String(Math.round(confidence));
      setScore(Math.round(confidence));
      setScoreDisplay(display);

      if (!result.success) {
        const errCode = String(result.error || "");
        const reason =
          result.message ||
          result.reason ||
          "CNIC photo does not match your live selfie. Upload your correct CNIC front and retake the selfie.";
        setFailBanner(reason);
        clearSelfieForRetry(true);
        if (
          errCode.includes("INVALID_CNIC") ||
          errCode.includes("INVALID_DOCUMENT") ||
          /correct CNIC|blank or invalid|face on the card/i.test(reason)
        ) {
          setFront("");
          setBack("");
          if (frontInput.current) frontInput.current.value = "";
          if (backInput.current) backInput.current.value = "";
        }
        onMatchFailed?.(reason);
        return;
      }

      setDone(true);
      const engineLabel = USE_SIMULATED_KYC
        ? "Live Biometric Scan"
        : result.engine === "api"
          ? "KYC Engine (OpenCV)"
          : "Browser fallback";
      setSuccessBanner(
        `${result.message || `Face matched successfully (${display}% confidence)!`} · ${engineLabel}`,
      );
      onComplete({
        cnicFront: frontCompressed,
        cnicBack: backCompressed,
        liveSelfie: selfieCompressed,
        faceMatchScore: confidence,
        matchConfidenceScore: confidence,
        simulated: USE_SIMULATED_KYC,
        skippedScoreUi: false,
      });
    } catch (err) {
      const reason =
        err instanceof Error
          ? err.message
          : "Try again: Face does not match the provided CNIC image.";
      setFailBanner(reason);
      clearSelfieForRetry(true);
      onMatchFailed?.(reason);
    } finally {
      setScanning(false);
    }
  };

  const resetAll = () => {
    clearSelfieForRetry();
    setFailBanner("");
    setSuccessBanner("");
    setCamError("");
    void openCamera();
  };

  const showScoreUi = USE_SIMULATED_KYC;

  return (
    <div className={`space-y-5 ${className}`}>
      <div>
        <p className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${a.text}`}>
          <IdCard className="h-4 w-4" /> CNIC Front &amp; Back
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Front Side", val: front, set: setFront, ref: frontInput },
            { label: "Back Side", val: back, set: setBack, ref: backInput },
          ].map((card) => (
            <div key={card.label}>
              <input
                ref={card.ref}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  readFile(e.target.files?.[0], card.set, card.label);
                  setDone(false);
                  setSuccessBanner("");
                  setSelfie("");
                  setScore(0);
                  setScoreDisplay("");
                  completingRef.current = false;
                }}
              />
              <button
                type="button"
                onClick={() => card.ref.current?.click()}
                disabled={scanning || done}
                className={`group relative flex aspect-[1.6/1] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all disabled:opacity-60 ${
                  card.val ? `${a.ring} border-solid` : "border-slate-300 hover:border-slate-400"
                }`}
              >
                {card.val ? (
                  <>
                    <img
                      src={card.val}
                      alt={card.label}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Captured
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="mb-1 h-5 w-5 text-slate-400" />
                    <span className="text-[11px] font-medium text-slate-500">{card.label}</span>
                    <span className="text-[9px] text-slate-400">Tap to upload / capture</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${a.text}`}>
          <ScanFace className="h-4 w-4" /> Live Camera Selfie
        </p>

        <div className={`rounded-2xl border p-4 ${a.soft}`}>
          {!camOpen && !selfie && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${a.bg} text-white shadow-lg`}
              >
                <Camera className="h-7 w-7" />
              </div>
              <p className="text-xs text-slate-600 max-w-sm">
                Upload CNIC Front &amp; Back, then open the webcam to capture a live selfie.
                Static selfie file uploads are disabled to ensure liveness.
              </p>
              <Button
                type="button"
                onClick={() => void openCamera()}
                disabled={!front || !back || scanning || done}
                className={`gap-2 bg-gradient-to-r ${a.bg} text-white disabled:opacity-40`}
              >
                <Camera className="h-4 w-4" /> Open Live Camera
              </Button>
              {camError && (
                <p className="text-[11px] font-medium text-red-500 max-w-sm">{camError}</p>
              )}
            </div>
          )}

          {camOpen && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative overflow-hidden rounded-xl">
                <video
                  ref={videoRef}
                  className="h-48 w-64 -scale-x-100 bg-black object-cover"
                  muted
                  playsInline
                />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/70" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={captureSelfie}
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <ScanFace className="h-4 w-4" /> Snap Live Selfie
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    stopCam();
                    setCamOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {selfie && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={selfie}
                  alt="live selfie"
                  className="h-20 w-20 rounded-xl object-cover ring-2 ring-white shadow"
                />
                {front && (
                  <img
                    src={front}
                    alt="cnic front"
                    className="h-20 w-20 rounded-xl object-cover opacity-90 ring-2 ring-white shadow"
                  />
                )}
              </div>

              {scanning && showScoreUi && (
                <div className="w-full max-w-sm">
                  <div className="mb-1 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning &amp; Matching Facial Features...
                    {scoreDisplay ? ` ${scoreDisplay}%` : score > 0 ? ` ${score}%` : ""}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all animate-pulse"
                      style={{ width: score > 0 ? `${Math.min(100, score)}%` : "45%" }}
                    />
                  </div>
                </div>
              )}

              {scanning && !showScoreUi && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing documents for approval...
                </div>
              )}

              {!scanning && !done && showScoreUi && (
                <Button
                  type="button"
                  onClick={() => void handleVerifyIdentity()}
                  disabled={!front || !back || !selfie}
                  className={`gap-2 bg-gradient-to-r ${a.bg} text-white px-6`}
                >
                  <ShieldCheck className="h-4 w-4" /> Verify Identity &amp; Submit
                </Button>
              )}

              {done && showScoreUi && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Face Matched · {scoreDisplay || score}% confidence
                  </div>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    <RefreshCw className="h-3 w-3" /> Re-scan
                  </button>
                </div>
              )}

              {done && !showScoreUi && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Documents ready for approval
                  </div>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    <RefreshCw className="h-3 w-3" /> Re-capture
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {failBanner && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{failBanner}</span>
        </div>
      )}

      {successBanner && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}
    </div>
  );
}
