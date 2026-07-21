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
  FACE_MATCH_THRESHOLD,
  compressDataUrl,
  runFaceMatchPipeline,
} from "@/lib/kycService";
import { KYC_BYPASS_FOR_TESTING, KYC_BYPASS_PLACEHOLDER_IMAGE } from "@/lib/kycBypass";

export type CnicFaceResult = {
  cnicFront: string;
  cnicBack: string;
  liveSelfie: string;
  faceMatchScore: number;
  matchConfidenceScore: number;
};

type CnicFaceVerifyProps = {
  onComplete: (result: CnicFaceResult) => void;
  /** Fired when match fails so parents can clear pending selfie state */
  onMatchFailed?: (reason: string) => void;
  accent?: "amber" | "emerald" | "violet";
  className?: string;
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
}: CnicFaceVerifyProps) {
  const a = ACCENTS[accent];

  // Testing: skip camera/CNIC — mark Done and continue
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

  return <CnicFaceVerifyActive onComplete={onComplete} onMatchFailed={onMatchFailed} accent={accent} className={className} />;
}

/** Original KYC UI — kept intact for when bypass is turned off. */
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
  const [done, setDone] = useState(false);
  const [failBanner, setFailBanner] = useState("");
  const [successBanner, setSuccessBanner] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);

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

  const readFile = (file: File | undefined, setter: (v: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    setCamError("");
    setFailBanner("");
    stopCam();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOpen(true);
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play().catch(() => {});
      });
    } catch {
      setCamError(
        "Camera access denied. Allow webcam permission — live selfie is required (file upload disabled for liveness).",
      );
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.85);
    canvas.width = 0;
    canvas.height = 0;
    setSelfie(data);
    setFailBanner("");
    setSuccessBanner("");
    setDone(false);
    setScore(0);
    stopCam();
    setCamOpen(false);
  };

  const clearSelfieForRetry = () => {
    setSelfie("");
    setScore(0);
    setDone(false);
    setScanning(false);
    setSuccessBanner("");
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

    setScanning(true);
    setFailBanner("");
    setSuccessBanner("");
    setScore(0);

    try {
      const [frontCompressed, backCompressed, selfieCompressed] = await Promise.all([
        compressDataUrl(front),
        compressDataUrl(back),
        compressDataUrl(selfie, 720, 0.8),
      ]);

      const result = await runFaceMatchPipeline({
        cnicFrontDataUrl: frontCompressed,
        cnicBackDataUrl: backCompressed,
        liveSelfieDataUrl: selfieCompressed,
        researcherId: auth.currentUser?.uid || "anonymous",
      });

      const confidence = Number(result.matchConfidenceScore ?? result.confidence ?? 0);
      setScore(Math.round(confidence));

      if (!result.success || confidence < FACE_MATCH_THRESHOLD) {
        const reason =
          result.reason ||
          result.error ||
          "Try again: Face does not match the provided CNIC image.";
        setFailBanner(reason);
        clearSelfieForRetry();
        onMatchFailed?.(reason);
        return;
      }

      setDone(true);
      const engineLabel =
        result.engine === "api"
          ? "KYC Engine (OpenCV)"
          : "Browser fallback";
      setSuccessBanner(
        `${result.message || `Face matched successfully (${Math.round(confidence)}% confidence)!`} · ${engineLabel}`,
      );
      onComplete({
        cnicFront: frontCompressed,
        cnicBack: backCompressed,
        liveSelfie: selfieCompressed,
        faceMatchScore: confidence,
        matchConfidenceScore: confidence,
      });
    } catch (err) {
      const reason =
        err instanceof Error
          ? err.message
          : "Try again: Face does not match the provided CNIC image.";
      setFailBanner(reason);
      clearSelfieForRetry();
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
                  readFile(e.target.files?.[0], card.set);
                  setDone(false);
                  setSuccessBanner("");
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
                  className="h-20 w-20 -scale-x-100 rounded-xl object-cover ring-2 ring-white shadow"
                />
                {front && (
                  <img
                    src={front}
                    alt="cnic front"
                    className="h-20 w-20 rounded-xl object-cover opacity-90 ring-2 ring-white shadow"
                  />
                )}
              </div>

              {scanning && (
                <div className="w-full max-w-sm">
                  <div className="mb-1 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning &amp; Matching Facial Features...
                    {score > 0 ? ` ${score}%` : ""}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all animate-pulse"
                      style={{ width: score > 0 ? `${score}%` : "45%" }}
                    />
                  </div>
                </div>
              )}

              {!scanning && !done && (
                <Button
                  type="button"
                  onClick={() => void handleVerifyIdentity()}
                  disabled={!front || !back || !selfie}
                  className={`gap-2 bg-gradient-to-r ${a.bg} text-white px-6`}
                >
                  <ShieldCheck className="h-4 w-4" /> Verify Identity &amp; Submit
                </Button>
              )}

              {done && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Face Matched · {score}% confidence
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
          <span>Try again: Face does not match the provided CNIC image.</span>
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
