import { emptyFounderEvidence, FounderEvidenceFields, founderEvidenceReady, submitFounderEvidence } from "@/components/founder/FounderEvidenceFields";
import { BrandLogo } from "@/components/BrandLogo";
import { useCallback, useEffect, useRef, useState } from "react";
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
  IdCard,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ref, update as rtdbUpdate } from "firebase/database";
import type { EntrepreneurProfile } from "@/services/entrepreneurService";
import { auth, database } from "@/firebase";
import { getFirestoreOnboardingDoc } from "@/services/onboardingFirestoreService";
import { useAppState } from "@/hooks/useAppState";
import { CnicFaceVerify, type CnicFaceResult } from "@/components/verification/CnicFaceVerify";
import { checkDuplicateFounderCredentials, initializeFounderProfile, FOUNDER_PROFILE } from "@/services/founderFirebaseService";
import { submitPendingKycReview } from "@/services/adminKycService";
import { KycPendingGate } from "@/components/kyc/KycPendingGate";
import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import {
  createEmailPasswordAndSendVerification,
  friendlyIdentityError,
} from "@/services/identityVerificationService";

const BG_VIDEO = "/videos/8716432-uhd_3840_2160_25fps.mp4";
const BG_VIDEO_FALLBACK = "/videos/business-signup.mp4";
const BG_VIDEO_FALLBACK_2 = "/videos/investor-signup.mp4";

const STEPS = [
  "Account & Email",
  "CNIC, Banking & Phone",
  "Biometric KYC",
  "Admin Approval",
];

const PAKISTAN_BANKS = [
  "HBL — Habib Bank Limited",
  "UBL — United Bank Limited",
  "MCB Bank",
  "Allied Bank",
  "Meezan Bank",
  "Bank Alfalah",
  "Askari Bank",
  "Standard Chartered Pakistan",
  "Faysal Bank",
  "JS Bank",
  "Bank of Punjab",
  "Samba Bank",
  "Dubai Islamic Bank",
  "Other / Not listed",
] as const;

interface ExtendedEntrepreneurProfile extends EntrepreneurProfile {
  cnicNumber?: string;
  status?: string;
}

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

type FormState = {
  photoDataUrl: string;
  fullName: string;
  email: string;
  password: string;
  cnicNumber: string;
  bankName: string;
  accountTitle: string;
  bankAccountNumber: string;
  phone: string;
};

export function EntrepreneurOnboarding({ onBack, resume = false }: { onBack: () => void; resume?: boolean }) {
  const navigate = useNavigate();
  const { registerEntrepreneur: registerLocal } = useAppState();
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(0);
  const [founderEvidence, setFounderEvidence] = useState(() => emptyFounderEvidence());
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitPhase, setSubmitPhase] = useState("");
  const [submitDone, setSubmitDone] = useState(false);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [verify, setVerify] = useState<CnicFaceResult | null>(null);
  const [videoOk, setVideoOk] = useState(true);
  const [videoSrc, setVideoSrc] = useState(BG_VIDEO);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

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
    photoDataUrl: "",
    fullName: "",
    email: "",
    password: "",
    cnicNumber: "",
    bankName: "",
    accountTitle: "",
    bankAccountNumber: "",
    phone: "",
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!resume) return;
    let cancelled = false;
    void (async () => {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user?.emailVerified || !user.email) return;
      const progress = await getFirestoreOnboardingDoc(user.uid);
      if (cancelled || auth.currentUser?.uid !== user.uid ||
          progress?.role !== "entrepreneur" || !progress.emailVerified) return;
      setForm((form) => ({
        ...form,
        email: user.email || form.email,
        fullName: progress.profile?.fullName || user.displayName || form.fullName,
      }));
      setShowIntro(false);
      setStep(1);
    })();
    return () => { cancelled = true; };
  }, [resume]);

  const handleEmailVerified = useCallback(() => {
    setAwaitingEmail(false);
    setStep(1);
  }, []);

  const canNext = () => {
    if (step === 0) {
      return form.fullName.trim() && form.email.trim() && form.password.length >= 6;
    }
    if (step === 1) {
      return (
        !!form.cnicNumber.trim() &&
        !!form.bankName.trim() &&
        !!form.accountTitle.trim() &&
        !!form.bankAccountNumber.trim() &&
        !!form.phone.trim()
      );
    }
    if (step === 2) {
      return !!verify && verify.faceMatchScore >= 70 && founderEvidenceReady(founderEvidence);
    }
    return true;
  };

  const handleCreateAccountAndSendEmail = async () => {
    if (!canNext()) return;
    setError("");
    setCreatingAccount(true);
    try {
      await createEmailPasswordAndSendVerification({
        role: "entrepreneur",
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      });
      setAwaitingEmail(true);
    } catch (err: unknown) {
      setError(friendlyIdentityError(err));
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleSubmit = async () => {
    if (!verify || !founderEvidenceReady(founderEvidence)) return;
    setError("");
    setSubmitting(true);
    setVerifying(true);
    setSubmitPhase("Validating unique credentials...");
    try {
      const user = auth.currentUser;
      if (!user?.uid) {
        throw new Error("Session expired. Please complete email signup again.");
      }
      if (!user.emailVerified) {
        throw new Error("Email verify karein pehle.");
      }
      if (!form.phone.trim()) {
        throw new Error("Phone number is required.");
      }

      await checkDuplicateFounderCredentials(form.email, form.cnicNumber, form.phone);

      const uid = user.uid;
      const profileId = `FND-${uid.slice(0, 6).toUpperCase()}`;

      setSubmitPhase("Saving private banking and reference evidence...");
      await submitFounderEvidence(user, founderEvidence);

      setSubmitPhase("Founder profile initialize ho raha hai...");
      await initializeFounderProfile(uid, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        cnicNumber: form.cnicNumber.trim(),
        accountTitle: form.accountTitle.trim(),
        bankName: form.bankName.trim(),
        iban: form.bankAccountNumber.trim(),
      });

      setSubmitPhase("CNIC photos upload ho rahi hain...");
      const { ensureCloudinaryUrl } = await import("@/lib/cloudinaryUpload");

      const uploadOne = async (data: string, folder: "cnic_verifications" | "selfies") => {
        try {
          return await withTimeout(
            ensureCloudinaryUrl(data, folder),
            45000,
            "Cloudinary upload",
          );
        } catch (uploadErr) {
          console.warn(`CNIC Cloudinary upload skipped:`, uploadErr);
          return "";
        }
      };

      const [cnicFrontUrl, cnicBackUrl, liveSelfieUrl] = await Promise.all([
        uploadOne(verify.cnicFront, "cnic_verifications"),
        uploadOne(verify.cnicBack, "cnic_verifications"),
        uploadOne(verify.liveSelfie, "selfies"),
      ]);

      const photoUrl = form.photoDataUrl ? await ensureCloudinaryUrl(form.photoDataUrl, "profiles") : "";

      // Persist KYC assets into nested founders/{uid}/profile (pending admin approval)
      await rtdbUpdate(ref(database, FOUNDER_PROFILE(uid)), {
        photoUrl,
        cnicFrontUrl: cnicFrontUrl || "",
        cnicBackUrl: cnicBackUrl || "",
        liveSelfieUrl: liveSelfieUrl || "",
        faceMatchScore: verify.faceMatchScore || 0,
        matchConfidenceScore: verify.matchConfidenceScore || verify.faceMatchScore || 0,
        status: "pending",
        kycStatus: "pending",
        isApproved: false,
      });

      // Also mirror Cloudinary URLs to Firestore users/{uid}
      try {
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const { firestore } = await import("@/firebase");
        await setDoc(
          doc(firestore, "users", uid),
          {
            cnicFrontUrl: cnicFrontUrl || null,
            cnicBackUrl: cnicBackUrl || null,
            liveSelfieUrl: liveSelfieUrl || null,
            role: "founder",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (fsErr) {
        console.warn("Firestore CNIC mirror skipped:", fsErr);
      }

      const frontData = cnicFrontUrl || verify.cnicFront || "";
      const backData = cnicBackUrl || verify.cnicBack || "";
      const selfieData = liveSelfieUrl || verify.liveSelfie || "";

      await submitPendingKycReview({
        uid,
        role: "founder",
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phone.trim(),
        cnic: form.cnicNumber.trim(),
        bankName: form.bankName.trim(),
        accountTitle: form.accountTitle.trim(),
        accountNumber: form.bankAccountNumber.trim(),
        cnicFrontUrl: frontData,
        cnicBackUrl: backData,
        liveSelfieUrl: selfieData,
        matchConfidenceScore: verify.matchConfidenceScore || verify.faceMatchScore || 0,
      });

      setSubmitPhase("Done, wait for admin approval");
      setSubmitDone(true);
      registerLocal({
        uid,
        profileId,
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        cnicFrontUrl: cnicFrontUrl || "",
        paymentType: "bank",
        bankAccountNumber: form.bankAccountNumber,
        metrics: {
          investorsViewedIdea: 0,
          activeSampleRequests: 0,
          unreadMessagesCount: 0,
        },
        isRegistered: true,
        isApproved: false,
      });

      setPendingUid(uid);
      setStep(3);
    } catch (err: unknown) {
      setError(friendlyIdentityError(err));
    } finally {
      setSubmitting(false);
      setVerifying(false);
      setSubmitPhase("");
    }
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
                <BrandLogo className="h-7 w-7" />
                <span className="text-sm font-semibold">InvestBiz</span>
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
                Pehle video dekhein, phir CNIC verification aur bank account se apna
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

              {/* STEP 0: ACCOUNT & EMAIL */}
              {step === 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  {awaitingEmail ? (
                    <EmailVerificationGate role="entrepreneur"
                      email={form.email.trim()}
                      onVerified={handleEmailVerified}
                      accentClassName="text-amber-600"
                    />
                  ) : (
                    <>
                      <p className="text-xs text-slate-500">
                        Create your account with email and password. We will send a verification
                        link before profile details.
                      </p>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> Full Name{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={form.fullName}
                          onChange={(e) => set("fullName", e.target.value)}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      <label className="block space-y-2 text-sm">
                        Public profile photo (optional)
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { setError("Profile photo must be 5 MB or smaller"); return; }
                          const reader = new FileReader();
                          reader.onload = () => set("photoDataUrl", String(reader.result));
                          reader.readAsDataURL(file);
                        }} />
                        {form.photoDataUrl && <img src={form.photoDataUrl} alt="Profile photo preview" className="h-18 w-18 rounded-full object-cover" />}
                      </label>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> Email Address{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          placeholder="Enter your email address"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5" /> Password{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => set("password", e.target.value)}
                          placeholder="Create your secure password"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 1: CNIC NUMBER, BANKING + PHONE (no photo upload) */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300 max-h-[60vh] overflow-y-auto pr-2">
                  <p className="rounded-xl bg-[#FFF8E1] px-3 py-2 text-xs text-slate-600 font-medium">
                    Enter your CNIC number, banking details, and phone number.
                  </p>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      <IdCard className="h-3.5 w-3.5" /> CNIC Number{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.cnicNumber}
                      onChange={(e) => set("cnicNumber", e.target.value)}
                      placeholder="42101-XXXXXXX-X"
                      required
                    />
                  </div>

                  <div className="rounded-2xl border border-[#FFA500]/25 bg-[#FFF8E1]/40 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5" /> Bank Details
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>
                          Bank Name <span className="text-red-500">*</span>
                        </Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFA500]"
                          value={form.bankName}
                          onChange={(e) => set("bankName", e.target.value)}
                        >
                          <option value="" disabled>
                            Select your bank
                          </option>
                          {PAKISTAN_BANKS.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>
                          Account Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={form.accountTitle}
                          onChange={(e) => set("accountTitle", e.target.value)}
                          placeholder="Legal account ownership title"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5" /> Bank Account Number / IBAN{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={form.bankAccountNumber}
                        onChange={(e) => set("bankAccountNumber", e.target.value)}
                        placeholder="PK00XXXX0000000000000000"
                        className="font-mono text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> Phone Number{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+92 300 1234567"
                      required
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: BIOMETRIC KYC — CNIC photos + live selfie */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300 max-h-[60vh] overflow-y-auto pr-2">
                  <p className="rounded-xl bg-[#FFF8E1] px-3 py-2 text-xs text-slate-600 font-medium">
                    Upload CNIC Front and Back, then capture a live webcam selfie.
                    Facial match of 70% or greater is required before admin review.
                  </p>
                  <FounderEvidenceFields value={founderEvidence} onChange={setFounderEvidence} />
                  <CnicFaceVerify
                    accent="amber"
                    onComplete={(result) => setVerify(result)}
                    onMatchFailed={() => setVerify(null)}
                  />
                  {verify && verify.faceMatchScore >= 70 && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="mr-1 inline h-4 w-4" />
                      Face matched successfully ({Math.round(verify.faceMatchScore)}% confidence)!
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: WAIT FOR ADMIN APPROVAL */}
              {step === 3 && pendingUid && (
                <div className="animate-in zoom-in-95 duration-400">
                  <KycPendingGate
                    uid={pendingUid}
                    role="founder"
                    email={form.email}
                    approvedPath="/founder/dashboard"
                  />
                </div>
              )}

              {step < 3 && (
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#FFA500]/20 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (step === 0) {
                        if (awaitingEmail) {
                          setAwaitingEmail(false);
                        } else {
                          setShowIntro(true);
                        }
                      } else {
                        setStep((s) => s - 1);
                      }
                    }}
                    className="rounded-full"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>

                  {step === 0 && !awaitingEmail && (
                    <Button
                      type="button"
                      disabled={!canNext() || creatingAccount}
                      onClick={() => void handleCreateAccountAndSendEmail()}
                      className="rounded-full text-white"
                      style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                    >
                      {creatingAccount ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Creating account…
                        </>
                      ) : (
                        <>
                          Continue <ArrowRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}

                  {step === 1 && (
                    <Button
                      type="button"
                      disabled={!canNext()}
                      onClick={() => setStep(2)}
                      className="rounded-full text-white"
                      style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                    >
                      Continue <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}

                  {step === 2 && (
                    <Button
                      type="button"
                      disabled={!canNext() || submitting || submitDone}
                      onClick={() => void handleSubmit()}
                      className="rounded-full text-white"
                      style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
                    >
                      {submitDone ? (
                        "Done, wait for admin approval"
                      ) : verifying || submitting ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          {submitPhase || "Submitting…"}
                        </>
                      ) : (
                        <>
                          Submit for Admin Approval <ShieldCheck className="ml-1 h-4 w-4" />
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
