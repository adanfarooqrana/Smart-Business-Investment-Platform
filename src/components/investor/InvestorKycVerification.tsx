import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, LoaderCircle, ScanFace, ShieldCheck, Upload, X } from "lucide-react";
import { auth } from "@/firebase";
import { backendRequest } from "@/lib/backendClient";
import { Button } from "@/components/ui/button";

export type InvestorKycStatus = {
  stage: 0 | 1 | 2 | 3;
  fullName?: string;
  cnicNumber?: string;
  faceMatchScore?: number;
  livenessPassed?: boolean;
};

async function kycRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in with your verified investor account to continue.");
  const response = await backendRequest(user, "/api/kyc/" + path, options);
  return response.json() as Promise<T>;
}

export async function getInvestorKycStatus() {
  return kycRequest<InvestorKycStatus>("status");
}

type CameraMode = "front" | "back" | "selfie" | "liveness";
const LIVENESS_STEPS = [
  { label: "Left", title: "Move left", icon: ArrowLeft },
  { label: "Right", title: "Move right", icon: ArrowRight },
  { label: "Straight", title: "Look straight", icon: ScanFace },
];

function message(error: unknown) {
  return error instanceof Error ? error.message : "Verification could not be completed. Please retry.";
}

async function captureFrame(video: HTMLVideoElement, maxWidth = 1500) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error("Camera is still starting. Try again in a moment.");
  }
  const width = Math.min(video.videoWidth, maxWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(video.videoHeight * width / video.videoWidth);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not access the camera canvas.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Could not capture a camera frame.")),
    "image/jpeg", .93,
  ));
}

export function InvestorKycVerification({
  onDashboard, onProfileDetails,
}: {
  onDashboard: (status: InvestorKycStatus) => void;
  onProfileDetails: (status: InvestorKycStatus) => void;
}) {
  const [status, setStatus] = useState<InvestorKycStatus | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<"front" | "back", Blob>>>({});
  const [camera, setCamera] = useState<CameraMode | null>(null);
  const [challenge, setChallenge] = useState("");
  const [phase, setPhase] = useState(0);
  const [openingLiveness, setOpeningLiveness] = useState(false);
  const [retryLiveness, setRetryLiveness] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraTicket = useRef(0);

  const releaseStream = () => {
    cameraTicket.current++;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const closeCamera = () => {
    releaseStream();
    setCameraReady(false);
    setCamera(null);
    setChallenge("");
    setHint("");
  };

  const loadStatus = async () => {
    setError("");
    try {
      await auth.authStateReady();
      setStatus(await getInvestorKycStatus());
    } catch (error) {
      setError(message(error));
    }
  };

  useEffect(() => {
    let active = true;
    void auth.authStateReady().then(getInvestorKycStatus).then(
      (status) => { if (active) setStatus(status); },
      (error) => { if (active) setError(message(error)); },
    );
    return () => { active = false; releaseStream(); };
  }, []);

  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => {});
    }
  }, [camera]);

  const openCamera = async (mode: CameraMode) => {
    closeCamera();
    setError("");
    setPhase(0);
    const ticket = cameraTicket.current;
    if (mode === "liveness") {
      setOpeningLiveness(true);
      setRetryLiveness(false);
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access requires localhost or HTTPS.");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (ticket !== cameraTicket.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (mode === "liveness") {
        const result = await kycRequest<{ challenge: string }>("start-liveness", { method: "POST" });
        if (ticket !== cameraTicket.current) return;
        setChallenge(result.challenge);
      }
      setCamera(mode);
      setCameraReady(false);
    } catch (error) {
      if (ticket !== cameraTicket.current) return;
      closeCamera();
      if (mode === "liveness") setRetryLiveness(true);
      setError(message(error));
    } finally {
      if (mode === "liveness") setOpeningLiveness(false);
    }
  };

  const verifyCnic = async () => {
    if (!documents.front || !documents.back) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("front", documents.front, "front.jpg");
    form.append("back", documents.back, "back.jpg");
    try {
      setStatus(await kycRequest<InvestorKycStatus>("extract-cnic", { method: "POST", body: form }));
      setDocuments({});
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  };

  const capture = async () => {
    if (!videoRef.current || !camera || camera === "liveness") return;
    setError("");
    setBusy(true);
    try {
      const picture = await captureFrame(videoRef.current);
      if (camera === "selfie") {
        closeCamera();
        const form = new FormData();
        form.append("selfie", picture, "selfie.jpg");
        setStatus(await kycRequest<InvestorKycStatus>("verify-selfie", { method: "POST", body: form }));
      } else {
        setDocuments((previous) => ({ ...previous, [camera]: picture }));
        closeCamera();
      }
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (camera !== "liveness" || !cameraReady || !challenge) return;
    const controller = new AbortController();
    let timer: number | undefined;
    const submitFrame = async <T,>(path: string, request: RequestInit): Promise<T> => {
      try {
        return await kycRequest<T>(path, request);
      } catch (error) {
        if (controller.signal.aborted || !/temporarily unavailable|cannot reach the investbiz backend/i.test(message(error))) {
          throw error;
        }
        setHint("Reconnecting to verification...");
        return kycRequest<T>(path, request);
      }
    };
    const tick = async () => {
      if (controller.signal.aborted || !videoRef.current) return;
      let finalizing = false;
      try {
        const picture = await captureFrame(videoRef.current, 720);
        const input = new FormData();
        input.append("frame", picture, "frame.jpg");
        input.append("challenge", challenge);
        const request = { method: "POST", body: input, signal: controller.signal };
        const progress = await submitFrame<{ phase: number }>("liveness-frame", request);
        if (controller.signal.aborted) return;
        setPhase(progress.phase);
        setHint("");
        if (progress.phase === 4) {
          finalizing = true;
          const verified = await submitFrame<InvestorKycStatus>("verify-liveness-video", request);
          if (!controller.signal.aborted) {
            setStatus(verified);
            closeCamera();
          }
          return;
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const feedback = message(error);
        if (finalizing || !/face|blurry|lighting|poorly lit|capture a clear|camera is still starting/i.test(feedback) ||
            /unavailable|not been installed|before starting KYC/i.test(feedback)) {
          closeCamera();
          setRetryLiveness(true);
          setError(feedback);
          return;
        }
        setHint(feedback);
      }
      if (!controller.signal.aborted) timer = window.setTimeout(() => { void tick(); }, 250);
    };
    void tick();
    return () => {
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [camera, cameraReady, challenge]);

  const activeStep = LIVENESS_STEPS[phase - 1];
  const PromptIcon = phase >= 4 ? LoaderCircle : activeStep?.icon ?? ScanFace;

  return (
    <section aria-label="Investor KYC Verification" className="rounded-3xl border border-white/60 bg-white/95 p-5 shadow-2xl md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <ShieldCheck className="size-7 text-amber-700" aria-hidden="true" />
        <h3 className="font-display text-2xl font-bold">Investor KYC Verification</h3>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!status && (error
        ? <Button variant="outline" onClick={() => void loadStatus()}>Retry</Button>
        : <p role="status" className="text-sm text-muted-foreground">Checking verification progress…</p>)}

      {status?.stage === 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold">Stage 1 · CNIC Front &amp; Back</h4>
          <p className="text-sm text-muted-foreground">Keep the whole card in frame and avoid glare.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["front", "back"] as const).map((side) => (
              <div key={side} className="space-y-3 rounded-xl border bg-amber-50/60 p-4">
                <p className="font-semibold">CNIC {side === "front" ? "Front" : "Back"}</p>
                {documents[side] && <p role="status" className="text-sm text-emerald-800">Image ready ✓</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={busy || !!camera} onClick={() => void openCamera(side)}>
                    <Camera aria-hidden="true" /> Camera
                  </Button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-amber-500">
                    <Upload className="size-4" aria-hidden="true" /> Upload
                    <input type="file" accept="image/jpeg,image/png" aria-label={"Upload CNIC " + side}
                      className="sr-only" disabled={busy || !!camera}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) setDocuments((previous) => ({ ...previous, [side]: file }));
                      }} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" disabled={!documents.front || !documents.back || busy || !!camera}
            onClick={() => void verifyCnic()}>
            {busy ? "Extracting CNIC details…" : "Check and extract CNIC"}
          </Button>
        </div>
      )}

      {!!status?.stage && (
        <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">Your Name ({status.fullName}) and CNIC ({status.cnicNumber}) successfully extracted! ✓</p>
          <p>Front image quality OK ✓ · Back image quality OK ✓</p>
        </div>
      )}

      {status?.stage === 1 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold">Stage 2 · Live Selfie</h4>
          <Button type="button" disabled={busy || !!camera} onClick={() => void openCamera("selfie")}>
            <Camera aria-hidden="true" /> {busy ? "Comparing selfie…" : "Take Live Selfie"}
          </Button>
        </div>
      )}

      {status && status.stage >= 2 && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-950">
          <CheckCircle2 className="size-5" aria-hidden="true" /> Live Selfie Matched with CNIC Photo ✓
        </p>
      )}

      {status?.stage === 2 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold">Stage 3 · Live Liveness Video</h4>
          <Button type="button" disabled={!!camera || openingLiveness} onClick={() => void openCamera("liveness")}>
            {openingLiveness ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Camera aria-hidden="true" />}
            {openingLiveness ? "Opening camera..." : retryLiveness ? "Restart Liveness Video" : "Start Liveness Video"}
          </Button>
        </div>
      )}

      {camera === "liveness" && (
        <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950 p-4 text-white sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 font-semibold">
              <ScanFace className="size-5 text-orange-300" aria-hidden="true" /> Live face check
            </h4>
            <Button variant="ghost" size="icon" type="button" onClick={closeCamera} aria-label="Close camera">
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className={"relative isolate mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-full border-4 bg-slate-900 transition-colors " +
            (phase >= 4 ? "border-emerald-400" : "border-orange-400")}>
            <video ref={videoRef} playsInline muted autoPlay onPlaying={() => setCameraReady(true)}
              className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />
            <div className="pointer-events-none absolute inset-x-[16%] bottom-[13%] grid justify-items-center gap-2">
              <div role="status" className={"flex min-h-10 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-center text-xs font-semibold shadow-lg backdrop-blur-sm sm:px-3 sm:text-sm " +
                (phase >= 4 ? "border-emerald-400 bg-emerald-950/90 text-emerald-100" : "border-red-400 bg-red-950/90 text-white")}>
                <PromptIcon className={"size-4 shrink-0 " + (phase >= 4 ? "animate-spin" : "")} aria-hidden="true" />
                {phase >= 4 ? "Matching your selfie..." : activeStep?.title ?? "Center your face"}
              </div>
              <ol className="flex items-center justify-center gap-1" aria-label="Liveness progress">
                {LIVENESS_STEPS.map(({ label }, index) => {
                  const done = phase > index + 1;
                  const active = phase === index + 1;
                  return (
                    <li key={label} aria-current={active ? "step" : undefined}
                      className={"flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs " +
                        (done ? "border-emerald-400 bg-emerald-900 text-emerald-100" :
                          active ? "border-red-400 bg-red-950 text-red-50" : "border-white/25 bg-slate-950/85 text-slate-200")}>
                      {done && <CheckCircle2 className="size-3" aria-label="Complete" />}
                      {label}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
          <p className="mt-3 min-h-5 text-center text-sm text-slate-300" aria-live="polite">
            {hint || (phase >= 4 ? "Comparing the final frame with your verified live selfie." :
              phase === 3 ? "Face the camera, center your face, and hold still for the automatic capture." :
              phase === 0 ? "Face the camera and keep your face centered." : "Follow the prompt and hold until the step turns green.")}
          </p>
        </div>
      )}

      {camera && camera !== "liveness" && (
        <div className="mt-5 space-y-3 rounded-2xl border bg-slate-50 p-4 text-center">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">
              {camera === "selfie" ? "Keep one face in the frame" : "Frame the CNIC " + camera}
            </p>
            <Button variant="ghost" size="icon" type="button" onClick={closeCamera} aria-label="Close camera">
              <X aria-hidden="true" />
            </Button>
          </div>
          <video ref={videoRef} playsInline muted autoPlay onPlaying={() => setCameraReady(true)}
            className="mx-auto aspect-video w-full max-w-lg rounded-xl bg-slate-900 object-contain" />
          <Button type="button" disabled={!cameraReady || busy} onClick={() => void capture()}>
            {camera === "selfie" ? "Capture Live Selfie" : "Capture CNIC " + camera}
          </Button>
        </div>
      )}

      {status?.stage === 3 && (
        <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <p className="font-display text-xl font-bold">Identity &amp; Liveness Verified ✓</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => onDashboard(status)}>Enter Investor Dashboard</Button>
            <Button type="button" variant="outline" onClick={() => onProfileDetails(status)}>Add banking details</Button>
          </div>
        </div>
      )}
    </section>
  );
}
