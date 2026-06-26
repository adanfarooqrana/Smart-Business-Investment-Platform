import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Lightbulb,
  Undo2,
  User,
  Phone,
  Mail,
  Lock,
  CheckCircle2,
  Loader2,
  Landmark,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Target,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { doc, setDoc } from "firebase/firestore";
import type { EntrepreneurProfile } from "@/services/entrepreneurService";
import { firestore } from "@/firebase";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { CnicFaceVerify, type CnicFaceResult } from "@/components/verification/CnicFaceVerify";
import { PITCH_CATEGORIES } from "@/lib/investorPitchSchema";

const BG_VIDEO = "/videos/8716432-uhd_3840_2160_25fps.mp4";
const BG_VIDEO_FALLBACK = "/videos/business-signup.mp4";
const BG_VIDEO_FALLBACK_2 = "/videos/investor-signup.mp4";

const STEPS = ["Your Vision", "Account", "CNIC & Face Scan", "Bank Account", "Verified"];

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} — timeout (${Math.round(ms / 1000)}s). Firebase Storage/RTDB check karein.`)),
        ms,
      );
    }),
  ]);
}

function friendlyFirebaseError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  if (code === "auth/email-already-in-use") {
    return "Yeh email pehle se registered hai. Login karein ya nayi email use karein.";
  }
  if (code === "auth/weak-password") {
    return "Password kam az kam 6 characters ka hona chahiye.";
  }
  if (code === "auth/invalid-email") {
    return "Email format sahi nahi hai.";
  }
  if (code === "auth/network-request-failed") {
    return "Internet / Firebase connection fail. Dev server restart karke dubara try karein.";
  }
  if (err instanceof Error) return err.message;
  return "Registration failed. Please try again.";
}

type FormState = {
  ideaVision: string;
  ideaInterest: string;
  founderGoals: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  bankAccountNumber: string;
};

export function EntrepreneurOnboarding({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { signupUser } = useAuth();
  const { registerEntrepreneur: registerLocal } = useAppState();
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitPhase, setSubmitPhase] = useState("");
  const [createdProfile, setCreatedProfile] = useState<EntrepreneurProfile | null>(null);
  const [error, setError] = useState("");
  const [verify, setVerify] = useState<CnicFaceResult | null>(null);
  const [videoOk, setVideoOk] = useState(true);
  const [videoSrc, setVideoSrc] = useState(BG_VIDEO);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoError = () => {
    if (videoSrc === BG_VIDEO) {
      setVideoSrc(BG_VIDEO_FALLBACK);
    } else if (videoSrc === BG_VIDEO_FALLBACK) {
      setVideoSrc(BG_VIDEO_FALLBACK_2);
    } else {
      setVideoOk(false);
    }
  };

  const [form, setForm] = useState<FormState>({
    ideaVision: "",
    ideaInterest: PITCH_CATEGORIES[0],
    founderGoals: "",
    fullName: "",
    phone: "",
    email: "",
    password: "",
    bankAccountNumber: "",
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canNext = () => {
    if (step === 0) {
      return form.ideaVision.trim() && form.ideaInterest && form.founderGoals.trim();
    }
    if (step === 1) {
      return form.fullName && form.phone && form.email && form.password.length >= 6;
    }
    if (step === 2) return !!verify && verify.faceMatchScore >= 90;
    if (step === 3) return form.bankAccountNumber.length >= 8;
    return true;
  };

  const handleSubmit = async () => {
    if (!verify) return;
    setError("");
    setSubmitting(true);
    setVerifying(true);
    setSubmitPhase("Account bana rahe hain...");
    try {
      const user = await withTimeout(
        signupUser({
          email: form.email,
          password: form.password,
          name: form.fullName,
          role: "entrepreneur",
          profile: {
            phone: form.phone,
            paymentType: "bank",
            bankAccountNumber: form.bankAccountNumber,
            ideaVision: form.ideaVision.trim(),
            ideaInterest: form.ideaInterest,
            founderGoals: form.founderGoals.trim(),
          },
        }),
        45000,
        "Account signup",
      );

      const uid = user.uid;
      const profileId = `ENT-${uid.slice(0, 8).toUpperCase()}`;
      const now = Date.now();

      setSubmitPhase("CNIC photos upload ho rahi hain...");
      const { uploadBase64Image, saveBusinessProfile } = await import(
        "@/services/firebaseService"
      );

      const uploadOne = async (fileName: string, data: string) => {
        try {
          return await withTimeout(
            uploadBase64Image(uid, fileName, data),
            30000,
            `Upload ${fileName}`,
          );
        } catch (uploadErr) {
          console.warn(`CNIC upload skipped (${fileName}):`, uploadErr);
          return "";
        }
      };

      const [cnicFrontUrl, cnicBackUrl, liveSelfieUrl] = await Promise.all([
        uploadOne("cnic-front.jpg", verify.cnicFront),
        uploadOne("cnic-back.jpg", verify.cnicBack),
        uploadOne("live-selfie.jpg", verify.liveSelfie),
      ]);

      setSubmitPhase("Profile backend par save ho rahi hai...");
      await withTimeout(
        saveBusinessProfile(uid, {
          uid,
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          about: form.ideaVision.trim(),
          category: form.ideaInterest,
          registerNumber: form.bankAccountNumber,
          isRegistered: true,
          isApproved: verify.faceMatchScore >= 90,
          score: verify.faceMatchScore,
        }),
        30000,
        "Business profile save",
      );

      const profile: EntrepreneurProfile = {
        uid,
        profileId,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        cnicFrontUrl,
        cnicBackUrl,
        liveSelfieUrl,
        faceMatchScore: verify.faceMatchScore,
        ideaVision: form.ideaVision.trim(),
        ideaInterest: form.ideaInterest,
        founderGoals: form.founderGoals.trim(),
        paymentType: "bank",
        bankAccountNumber: form.bankAccountNumber,
        isVerified: verify.faceMatchScore >= 90,
        isApproved: verify.faceMatchScore >= 90,
        metrics: {
          investorsViewedIdea: 0,
          activeSampleRequests: 0,
          unreadMessagesCount: 0,
        },
        theme: { primary: "#FFA500", secondary: "#FFD700", background: "#FFF8E1" },
        createdAt: now,
      };

      const { syncEntrepreneurToRtdb } = await import("@/services/backendSyncService");
      await withTimeout(syncEntrepreneurToRtdb(profile), 30000, "Entrepreneur sync");

      await setDoc(doc(firestore, "entrepreneurs", uid), {
        ...profile,
        createdAt: now,
      }).catch((err) => {
        console.warn("Firestore entrepreneur mirror skipped:", err);
      });

      registerLocal({
        uid: profile.uid,
        profileId: profile.profileId,
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        password: form.password,
        cnicFrontUrl: profile.cnicFrontUrl,
        paymentType: "bank",
        bankAccountNumber: profile.bankAccountNumber,
        metrics: profile.metrics,
        isRegistered: true,
        isApproved: profile.isApproved,
      });

      setCreatedProfile(profile);
      setStep(4);
    } catch (err: unknown) {
      setError(friendlyFirebaseError(err));
    } finally {
      setSubmitting(false);
      setVerifying(false);
      setSubmitPhase("");
    }
  };

  const launchDashboard = () => {
    navigate({ to: "/founder/dashboard" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {videoOk ? (
        <>
          <video
            ref={videoRef}
            key={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
            onError={handleVideoError}
            onLoadedData={() => videoRef.current?.play().catch(() => {})}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                "radial-gradient(ellipse 85% 55% at 50% 18%, rgba(255,215,0,0.35) 0%, transparent 52%), linear-gradient(180deg, rgba(255,180,50,0.12) 0%, rgba(255,248,225,0.08) 55%, rgba(0,0,0,0.25) 100%)",
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(135deg, #FFF8E1 0%, #FFE082 40%, #FFA500 100%)",
          }}
        />
      )}

      {showIntro ? (
        <>
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
          <div className="relative z-10 flex min-h-screen flex-col">
            <div className="flex items-center justify-between px-6 pt-6">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                <Lightbulb className="h-4 w-4 text-[#FFD700]" />
                <span className="text-sm font-semibold">Smart Business AI</span>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                aria-label="Back to journey"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-end px-6 pb-12 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#FFD700]">
                Founder Journey
              </p>
              <h1 className="font-display mb-3 max-w-lg text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
                Apni startup idea ko investors tak le jayein
              </h1>
              <p className="mb-8 max-w-md text-sm text-white/90 md:text-base">
                Pehle video dekhein, phir vision, CNIC verification aur bank account se apna
                verified founder profile banayein — sab data backend par save hoga.
              </p>
              <Button
                type="button"
                onClick={() => setShowIntro(false)}
                className="h-12 rounded-full px-8 text-base font-bold text-slate-900 shadow-xl"
                style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}
              >
                Start Founder Registration <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {!videoOk && (
                <p className="mt-4 max-w-sm text-xs text-white/70">
                  Video file missing — add MP4 to{" "}
                  <code className="rounded bg-white/10 px-1">public/videos/</code> for full
                  experience.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 z-[1]"
            style={{
              background: videoOk
                ? "linear-gradient(135deg, rgba(255,248,225,0.72) 0%, rgba(255,165,0,0.28) 50%, rgba(255,215,0,0.2) 100%)"
                : "#FFF8E1",
            }}
          />

          <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-8">
        <div className="mb-6 flex items-center justify-between border-b border-[#FFA500]/30 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
            >
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FFA500]">
                Entrepreneur / Founder
              </p>
              <h2 className="font-display text-lg font-bold text-slate-900">{STEPS[step]}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow hover:text-slate-900"
            aria-label="Back to journey"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === step ? 32 : 8,
                backgroundColor: i <= step ? "#FFA500" : "#FFE082",
              }}
              title={s}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-[#FFA500]/25 bg-white/95 p-6 shadow-2xl shadow-[#FFA500]/15 backdrop-blur-md md:p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="rounded-xl bg-[#FFF8E1] px-3 py-2 text-xs text-slate-600">
                Pehle apni idea, interest aur goals share karein — yeh investor desk par aapki
                founder story ban jati hai.
              </p>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Rocket className="h-3.5 w-3.5" /> Startup Idea / Vision{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                  value={form.ideaVision}
                  onChange={(e) => set("ideaVision", e.target.value)}
                  placeholder="e.g. Organic rice export startup serving Gulf markets..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Area of Interest / Category{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                  value={form.ideaInterest}
                  onChange={(e) => set("ideaInterest", e.target.value)}
                >
                  {PITCH_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" /> Founder Goals (12–24 months){" "}
                  <span className="text-red-500">*</span>
                </Label>
                <textarea
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                  value={form.founderGoals}
                  onChange={(e) => set("founderGoals", e.target.value)}
                  placeholder="Funding target, growth milestones, investor partnership goals..."
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="text-xs text-slate-500">
                Account credentials — CNIC aur face scan agle step mein hoga.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder="e.g. Ali Hassan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="founder@startup.pk"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="mb-4 text-xs text-slate-500">
                CNIC front &amp; back upload karein, phir live camera se face scan — system CNIC photo
                se match karke verify karega (jaise wholesaler / investor flow).
              </p>
              <CnicFaceVerify
                accent="amber"
                onComplete={(result) => setVerify(result)}
              />
              {verify && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="mr-1 inline h-4 w-4" />
                  Identity verified — Face match {verify.faceMatchScore}%
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="text-xs text-slate-500">
                Sirf bank account details — investor payouts yahan receive hongi.
              </p>
              <div className="rounded-2xl border border-[#FFA500]/30 bg-[#FFF8E1]/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#FFA500]">
                  <Landmark className="h-4 w-4" /> Bank Account (Required)
                </div>
                <div className="space-y-1.5">
                  <Label>Bank Account Number / IBAN <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.bankAccountNumber}
                    onChange={(e) => set("bankAccountNumber", e.target.value)}
                    placeholder="e.g. PK00XXXX00000000000000"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700">Founder summary saved:</p>
                <p className="mt-1 line-clamp-2">{form.ideaVision}</p>
                <p className="mt-1 text-[#FFA500]">{form.ideaInterest}</p>
              </div>
            </div>
          )}

          {step === 4 && createdProfile && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-400">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
              >
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-slate-900">Profile Verified</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Welcome, {createdProfile.fullName}! Your founder dashboard is ready.
                </p>
              </div>
              <div className="rounded-2xl border border-[#FFA500]/30 bg-[#FFF8E1] p-4 text-left font-mono text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Profile ID: {createdProfile.profileId}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>CNIC front &amp; back verified</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Live face scan matched ({createdProfile.faceMatchScore}%)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Bank account linked</span>
                </div>
                {createdProfile.ideaVision && (
                  <div className="flex items-start gap-2 text-[#FFA500] pt-1">
                    <Rocket className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="font-sans normal-case">{createdProfile.ideaVision}</span>
                  </div>
                )}
              </div>
              <Button
                onClick={launchDashboard}
                className="w-full text-white font-bold"
                style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
              >
                Launch Founder Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step < 4 && (
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#FFA500]/20 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (step === 0 ? setShowIntro(true) : setStep((s) => s - 1))}
                className="rounded-full"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                >
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!canNext() || submitting}
                  onClick={handleSubmit}
                  className="rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      {submitPhase || "Verifying & Creating Profile..."}
                    </>
                  ) : (
                    <>
                      Verify & Create Profile <ShieldCheck className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
          </div>
        </>
      )}
    </div>
  );
}
