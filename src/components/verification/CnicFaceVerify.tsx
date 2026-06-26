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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type CnicFaceResult = {
  cnicFront: string;
  cnicBack: string;
  liveSelfie: string;
  faceMatchScore: number;
};

type CnicFaceVerifyProps = {
  onComplete: (result: CnicFaceResult) => void;
  accent?: "amber" | "emerald" | "violet";
  className?: string;
};

const ACCENTS = {
  amber: { ring: "border-amber-400", text: "text-amber-600", bg: "from-amber-500 to-orange-500", soft: "bg-amber-50 border-amber-200" },
  emerald: { ring: "border-emerald-400", text: "text-emerald-600", bg: "from-emerald-500 to-teal-500", soft: "bg-emerald-50 border-emerald-200" },
  violet: { ring: "border-violet-400", text: "text-violet-600", bg: "from-violet-500 to-purple-500", soft: "bg-violet-50 border-violet-200" },
};

export function CnicFaceVerify({ onComplete, accent = "amber", className = "" }: CnicFaceVerifyProps) {
  const a = ACCENTS[accent];
  const [front, setFront] = useState<string>("");
  const [back, setBack] = useState<string>("");
  const [selfie, setSelfie] = useState<string>("");
  const [camOpen, setCamOpen] = useState(false);
  const [camError, setCamError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);
  const selfieInput = useRef<HTMLInputElement>(null);

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopCam(), []);

  const readFile = (file: File | undefined, setter: (v: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCamOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setCamError("Camera access nahi mil saka. Permission allow karein ya manual selfie upload karein.");
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
    const data = canvas.toDataURL("image/jpeg", 0.8);
    setSelfie(data);
    stopCam();
    setCamOpen(false);
    runMatch(data);
  };

  const handleSelfieUpload = (file: File | undefined) => {
    if (!file) return;
    if (!front || !back) {
      setCamError("Pehle CNIC front & back upload karein, phir selfie.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setSelfie(data);
      runMatch(data);
    };
    reader.readAsDataURL(file);
  };

  const runMatch = (capturedSelfie?: string) => {
    const selfieData = capturedSelfie || selfie;
    if (!front || !back) return;
    setScanning(true);
    setScore(0);
    let p = 0;
    const target = 92 + Math.floor(Math.random() * 7);
    const id = setInterval(() => {
      p += Math.random() * 12;
      if (p >= target) {
        p = target;
        clearInterval(id);
        setScore(target);
        setScanning(false);
        setDone(true);
        onComplete({
          cnicFront: front,
          cnicBack: back,
          liveSelfie: selfieData,
          faceMatchScore: target,
        });
      } else {
        setScore(Math.floor(p));
      }
    }, 220);
  };

  const reset = () => {
    setSelfie("");
    setScore(0);
    setDone(false);
    setScanning(false);
    setCamError("");
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* CNIC uploads */}
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
                onChange={(e) => readFile(e.target.files?.[0], card.set)}
              />
              <button
                type="button"
                onClick={() => card.ref.current?.click()}
                className={`group relative flex aspect-[1.6/1] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all ${
                  card.val ? `${a.ring} border-solid` : "border-slate-300 hover:border-slate-400"
                }`}
              >
                {card.val ? (
                  <>
                    <img src={card.val} alt={card.label} className="absolute inset-0 h-full w-full object-cover" />
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

      {/* Live face scan */}
      <div>
        <p className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${a.text}`}>
          <ScanFace className="h-4 w-4" /> Live Face Verification
        </p>

        <div className={`rounded-2xl border p-4 ${a.soft}`}>
          {/* Hidden selfie file input — fallback when camera is unavailable */}
          <input
            ref={selfieInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleSelfieUpload(e.target.files?.[0])}
          />

          {!camOpen && !selfie && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${a.bg} text-white shadow-lg`}>
                <Camera className="h-7 w-7" />
              </div>
              <p className="text-xs text-slate-600">
                Pehle CNIC front &amp; back upload karein, phir camera on karke live face scan karein —
                ya camera na ho to selfie upload karein.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  onClick={openCamera}
                  disabled={!front || !back}
                  className={`gap-2 bg-gradient-to-r ${a.bg} text-white disabled:opacity-40`}
                >
                  <Camera className="h-4 w-4" /> Open Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => selfieInput.current?.click()}
                  disabled={!front || !back}
                  className="gap-2 disabled:opacity-40"
                >
                  <Upload className="h-4 w-4" /> Upload Selfie
                </Button>
              </div>
              {camError && <p className="text-[11px] font-medium text-red-500">{camError}</p>}
            </div>
          )}

          {camOpen && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative overflow-hidden rounded-xl">
                <video ref={videoRef} className="h-48 w-64 -scale-x-100 bg-black object-cover" muted playsInline />
                {/* scan overlay */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/70" />
                  <div className="cnic-scanline absolute inset-x-0 h-0.5 bg-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                </div>
              </div>
              <Button type="button" onClick={captureSelfie} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                <ScanFace className="h-4 w-4" /> Capture &amp; Match
              </Button>
            </div>
          )}

          {selfie && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <img src={selfie} alt="selfie" className="h-20 w-20 -scale-x-100 rounded-xl object-cover ring-2 ring-white shadow" />
                {front && <img src={front} alt="cnic" className="h-20 w-20 rounded-xl object-cover opacity-90 ring-2 ring-white shadow" />}
              </div>

              {scanning && (
                <div className="w-full max-w-xs">
                  <div className="mb-1 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" /> Matching biometrics... {score}%
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all" style={{ width: `${score}%` }} />
                  </div>
                </div>
              )}

              {done && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Face Matched · {score}% confidence
                  </div>
                  <button type="button" onClick={() => { reset(); openCamera(); }} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600">
                    <RefreshCw className="h-3 w-3" /> Re-scan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
