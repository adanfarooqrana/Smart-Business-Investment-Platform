import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import {
  Boxes,
  Undo2,
  ArrowRight,
  ArrowLeft,
  Upload,
  MapPin,
  Factory,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Trash2,
  User,
  IdCard,
  Store,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationMapPicker, type PickedLocation } from "@/components/verification/LocationMapPicker";
import { CnicFaceVerify, type CnicFaceResult } from "@/components/verification/CnicFaceVerify";
import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import {
  createEmailPasswordAndSendVerification,
  friendlyIdentityError,
} from "@/services/identityVerificationService";
import {
  syncStage1ToFirestore,
  syncStage2ToFirestore,
  syncStage3ToFirestore,
} from "@/services/onboardingFirestoreService";
import { sanitizeExtractedCnic } from "@/lib/kycOcrService";
import { USE_SIMULATED_KYC, isFaceMatchAcceptable } from "@/lib/kycBypass";
import {
  clearLocalOnboardingSession,
  resolveWizardUiStage,
} from "@/lib/onboardingResume";

/** Auto format CNIC to 13 digits: XXXXX-XXXXXXX-X */
function autoFormatCnic(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** 3-Stage Flow: Credentials → Business Details → KYC */
const STEPS = ["Credentials", "Business Details", "Biometric Verification"];

export function WholesalerOnboarding({ onBack, resume = false }: { onBack: () => void; resume?: boolean }) {
  const navigate = useNavigate();
  const { signupUser, login, currentUser } = useAuth();
  const { registerConsultant, setWholesalerProducts, updateWholesalerProfile } = useAppState();

  // 0-based UI: 0=creds, 1=business details, 2=KYC
  const [step, setStep] = useState(0);
  const [resumeReady, setResumeReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [error, setError] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    shopName: "",
    email: "",
    phone: "",
    password: "",
    cnicNumber: "",
    specialty: "Mobile Accessories",
    experience: "National Shipping",
    bio: "",
    sourcingFrom: "",
  });
  /** source = buy from factories/suppliers | own_factory = manufacture themselves */
  const [supplyMode, setSupplyMode] = useState<"source" | "own_factory" | "">("");
  const [loc, setLoc] = useState<PickedLocation | null>(null);
  const [factoryImages, setFactoryImages] = useState<string[]>([]);
  const factoryRef = useRef<HTMLInputElement>(null);
  const [verify, setVerify] = useState<CnicFaceResult | null>(null);

  useEffect(() => {
    clearLocalOnboardingSession();
  }, []);

  useEffect(() => {
    const uid = currentUser?.uid || auth.currentUser?.uid;
    if (!resume || !uid) {
      setResumeReady(true);
      return;
    }
    let cancelled = false;
    setResumeReady(false);
    void (async () => {
      try {
        await currentUser?.reload().catch(() => {});
        if (cancelled) return;

        const { getFirestoreOnboardingDoc } = await import("@/services/onboardingFirestoreService");
        let fsDoc = await getFirestoreOnboardingDoc(uid);
        if (cancelled) return;

        setForm((f) => ({
          ...f,
          email: currentUser?.email || f.email,
        }));

        if (!currentUser?.emailVerified) {
          setStep(0);
          setResumeReady(true);
          return;
        }

        if (fsDoc && fsDoc.role !== "wholesaler") return;
        const resolved = resolveWizardUiStage({ emailVerified: true, fsDoc });

        if (resolved.ensureStage1Doc) {
          await syncStage1ToFirestore({
            uid,
            email: currentUser?.email || form.email || "",
            role: "wholesaler",
            emailVerified: true,
            fullName: form.fullName || undefined,
          });
          if (cancelled) return;
          fsDoc = await getFirestoreOnboardingDoc(uid);
        }

        if (fsDoc) {
          const rd = (fsDoc.profile?.roleDetails || {}) as Record<string, string>;
          setForm((prev) => ({
            ...prev,
            fullName: String(fsDoc.profile?.fullName || prev.fullName || "").trim(),
            shopName: String(rd.shopName || rd.businessName || prev.shopName || "").trim(),
            cnicNumber: sanitizeExtractedCnic(fsDoc.profile?.cnicNumber) || prev.cnicNumber,
            email: fsDoc.email || currentUser?.email || prev.email,
            phone: rd.phone || prev.phone,
            specialty: rd.specialty || prev.specialty,
            experience: rd.experience || prev.experience,
            bio: rd.bio || prev.bio,
            sourcingFrom: rd.sourcingFrom || prev.sourcingFrom,
          }));
          if (rd.location && !loc) {
            setLoc({
              address: rd.location,
              lat: Number((rd as { lat?: number }).lat) || 0,
              lng: Number((rd as { lng?: number }).lng) || 0,
            });
          }
          if (fsDoc.kyc?.cnicFrontUrl && fsDoc.kyc?.cnicBackUrl && fsDoc.kyc?.selfieUrl) {
            setVerify({
              cnicFront: fsDoc.kyc.cnicFrontUrl,
              cnicBack: fsDoc.kyc.cnicBackUrl,
              liveSelfie: fsDoc.kyc.selfieUrl,
              faceMatchScore: Number(fsDoc.kyc.matchScore || 0),
              matchConfidenceScore: Number(fsDoc.kyc.matchScore || 0),
            });
          }
        }

        if (resolved.goDashboard) {
          navigate({ to: "/app/wholesale" });
          return;
        }

        setStep((resolved.stage - 1) as 0 | 1 | 2);
      } catch (err) {
        console.warn("Wholesaler resume error:", err);
        setStep(0);
      } finally {
        if (!cancelled) setResumeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, currentUser?.uid, currentUser?.email, navigate]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const readImg = (file: File | undefined, cb: (v: string) => void) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => cb(r.result as string);
    r.readAsDataURL(file);
  };

  const handleEmailVerified = () => {
    setAwaitingEmailVerification(false);
    setStep(1);
  };

  const handleKycComplete = (result: CnicFaceResult) => {
    setVerify(result);
  };

  const canNext = () => {
    if (step === 0) {
      return Boolean(form.fullName.trim() && form.email.trim() && form.password);
    }
    if (step === 1) {
      const cnic = sanitizeExtractedCnic(form.cnicNumber) || (form.cnicNumber.replace(/\D/g, "").length === 13 ? form.cnicNumber : "");
      return Boolean(form.fullName.trim() && form.shopName.trim() && cnic && form.phone.trim() && loc && supplyMode);
    }
    if (step === 2) {
      return (
        !!verify &&
        isFaceMatchAcceptable(
          verify.faceMatchScore,
          !!(verify.cnicFront && verify.cnicBack && verify.liveSelfie),
        )
      );
    }
    return true;
  };

  const saveBusinessDetails = async () => {
    const cnicNumber =
      sanitizeExtractedCnic(form.cnicNumber) ||
      (form.cnicNumber.replace(/\D/g, "").length === 13 ? autoFormatCnic(form.cnicNumber) : "");
    if (!form.fullName.trim() || !form.shopName.trim() || !cnicNumber) {
      setError("Full name, Wholesale Shop Name, and a valid 13-digit CNIC (XXXXX-XXXXXXX-X) are required.");
      return;
    }
    if (!form.phone.trim() || !loc || !supplyMode) {
      setError("Phone, location, and supply mode are required.");
      return;
    }
    const uid = currentUser?.uid || auth.currentUser?.uid;
    if (!uid) {
      setError("Session missing. Please verify email again.");
      return;
    }

    setSavingDetails(true);
    setError("");
    try {
      await syncStage2ToFirestore({
        uid,
        email: form.email.trim(),
        role: "wholesaler",
        fullName: form.fullName.trim(),
        cnicNumber,
        roleDetails: {
          shopName: form.shopName.trim(),
          phone: form.phone,
          specialty: form.specialty,
          experience: form.experience,
          location: loc.address || "",
          lat: loc.lat,
          lng: loc.lng,
          bio: form.bio,
          sourcingFrom:
            supplyMode === "source"
              ? form.sourcingFrom.trim() || ""
              : supplyMode === "own_factory"
                ? "Own factory"
                : "",
          supplyMode,
        },
      });
      setForm((prev) => ({ ...prev, cnicNumber }));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const finish = async () => {
    setError("");
    if (!verify) {
      setError("Complete biometric verification first.");
      return;
    }
    if (
      !isFaceMatchAcceptable(
        verify.faceMatchScore,
        !!(verify.cnicFront && verify.cnicBack && verify.liveSelfie),
      )
    ) {
      setError("Complete the face-match scan before continuing.");
      return;
    }

    setSubmitting(true);

    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string) =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `${label} — timeout (${Math.round(ms / 1000)}s). Check your internet or Firebase.`,
                ),
              ),
            ms,
          ),
        ),
      ]);

    const completeLocalSession = () => {
      setWholesalerProducts([]);
      const sourcingNote =
        supplyMode === "source" ? form.sourcingFrom.trim() : supplyMode === "own_factory" ? "Own factory" : "";
      registerConsultant({
        name: form.fullName,
        shopName: form.shopName.trim(),
        email: form.email,
        phone: form.phone,
        password: form.password,
        specialty: form.specialty,
        experience: form.experience,
        location: loc?.address || "",
        bio: form.bio,
        cnicFront: verify?.cnicFront,
        cnicBack: verify?.cnicBack,
        liveSelfie: verify?.liveSelfie,
        faceMatchScore: verify?.faceMatchScore,
        sourcingFrom: sourcingNote || undefined,
      });
      updateWholesalerProfile({
        shopName: form.shopName.trim(),
        lat: loc?.lat,
        lng: loc?.lng,
        mapAddress: loc?.address,
        seoKeywords: [],
        factoryImages: supplyMode === "own_factory" ? factoryImages : [],
        materials: [],
        sourcingFrom: sourcingNote || undefined,
        profilePrompt: form.bio,
      });
      navigate({ to: "/app/wholesale" });
    };

    try {
      let user = currentUser || auth.currentUser;
      if (!user) {
        try {
          user = await withTimeout(
            signupUser({
              email: form.email,
              password: form.password,
              name: form.fullName,
              role: "wholesaler",
              profile: {
                specialty: form.specialty,
                experience: form.experience,
                location: loc?.address || "",
                bio: form.bio,
                phone: form.phone,
                sourcingFrom:
                  supplyMode === "source"
                    ? form.sourcingFrom.trim() || ""
                    : supplyMode === "own_factory"
                      ? "Own factory"
                      : "",
              },
            }),
            45000,
            "Account signup",
          );
        } catch (signupErr: unknown) {
          const code =
            signupErr && typeof signupErr === "object" && "code" in signupErr
              ? String((signupErr as { code: string }).code)
              : "";
          if (code === "auth/email-already-in-use") {
            user = await withTimeout(login(form.email, form.password), 20000, "Login");
          } else {
            throw signupErr;
          }
        }
      }

      const uid = user.uid;

      if (!user.emailVerified) {
        setError("Please verify your email before submitting.");
        setStep(0);
        setAwaitingEmailVerification(true);
        setSubmitting(false);
        return;
      }

      completeLocalSession();

      void (async () => {
        try {
          const { saveConsultantProfile, uploadBase64Image } = await import(
            "@/services/firebaseService"
          );

          const uploadIfDataUrl = async (fileName: string, data: string) => {
            if (!data?.startsWith("data:")) return data || "";
            try {
              return await withTimeout(
                uploadBase64Image(uid, fileName, data),
                15000,
                `Upload ${fileName}`,
              );
            } catch (uploadErr) {
              console.warn(`Wholesaler upload skipped (${fileName}):`, uploadErr);
              return "";
            }
          };

          let cnicFront = verify?.cnicFront ?? "";
          let cnicBack = verify?.cnicBack ?? "";
          let liveSelfie = verify?.liveSelfie ?? "";
          if (verify) {
            [cnicFront, cnicBack, liveSelfie] = await Promise.all([
              uploadIfDataUrl("cnic-front.jpg", verify.cnicFront),
              uploadIfDataUrl("cnic-back.jpg", verify.cnicBack),
              uploadIfDataUrl("live-selfie.jpg", verify.liveSelfie),
            ]);
          }

          const cnicNumber =
            sanitizeExtractedCnic(form.cnicNumber) ||
            (form.cnicNumber.replace(/\D/g, "").length === 13 ? autoFormatCnic(form.cnicNumber) : form.cnicNumber.trim());
          const roleDetails = {
            shopName: form.shopName.trim(),
            phone: form.phone,
            specialty: form.specialty,
            experience: form.experience,
            location: loc?.address || "",
            bio: form.bio,
            sourcingFrom:
              supplyMode === "source"
                ? form.sourcingFrom.trim() || ""
                : supplyMode === "own_factory"
                  ? "Own factory"
                  : "",
          };

          await syncStage3ToFirestore({
            uid,
            email: form.email,
            role: "wholesaler",
            fullName: form.fullName,
            cnicNumber,
            roleDetails,
            kyc: {
              status: "pending",
              cnicFrontUrl: cnicFront,
              cnicBackUrl: cnicBack,
              selfieUrl: liveSelfie,
              matchScore: verify?.matchConfidenceScore || verify?.faceMatchScore || 0,
              mode: USE_SIMULATED_KYC ? "simulated" : "direct",
            },
          });

          await withTimeout(
            saveConsultantProfile(uid, {
              uid,
              name: form.fullName,
              shopName: form.shopName.trim(),
              email: form.email,
              phone: form.phone,
              specialty: form.specialty,
              experience: form.experience,
              location: loc?.address || "",
              bio: form.bio,
              cnicFront,
              cnicBack,
              liveSelfie,
              isRegistered: true,
              isApproved: false,
              lat: loc?.lat,
              lng: loc?.lng,
              seoKeywords: [],
              factoryImageCount: supplyMode === "own_factory" ? factoryImages.length : 0,
              materials: [],
              products: [],
              sourcingFrom:
                supplyMode === "source"
                  ? form.sourcingFrom.trim() || ""
                  : supplyMode === "own_factory"
                    ? "Own factory"
                    : "",
            } as Parameters<typeof saveConsultantProfile>[1]),
            20000,
            "Profile save",
          );

          try {
            const { submitPendingKycReview } = await import("@/services/adminKycService");
            await submitPendingKycReview({
              uid,
              role: "wholesaler",
              fullName: form.fullName,
              email: form.email,
              phoneNumber: form.phone,
              cnic: cnicNumber,
              cnicFrontUrl: cnicFront,
              cnicBackUrl: cnicBack,
              liveSelfieUrl: liveSelfie,
              matchConfidenceScore: verify?.faceMatchScore || verify?.matchConfidenceScore || 0,
            });
          } catch (kycErr) {
            console.warn("Wholesaler KYC review submit skipped:", kycErr);
          }
        } catch (syncErr) {
          console.warn("Wholesaler Firebase profile sync failed — local session active:", syncErr);
        }
      })();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      if (message.includes("timeout") || message.toLowerCase().includes("network")) {
        completeLocalSession();
        return;
      }
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/email-already-in-use") {
        setError("This email is already registered. Sign in with the correct password or use a new email.");
      } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Email exists but the password is wrong. Try from the login page.");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const next = async () => {
    if (submitting || creatingAccount || savingDetails) return;
    if (step === 0) {
      if (awaitingEmailVerification) return;
      if (!form.fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      setError("");
      setCreatingAccount(true);
      try {
        await createEmailPasswordAndSendVerification({
          role: "wholesaler",
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        setAwaitingEmailVerification(true);
      } catch (err: unknown) {
        const code =
          err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
        if (code === "auth/email-already-in-use") {
          try {
            await login(form.email, form.password);
            try {
              await currentUser?.reload();
            } catch {
              /* ignore */
            }
            const u = auth.currentUser;
            if (u && !u.emailVerified) {
              setAwaitingEmailVerification(true);
            } else {
              setStep(1);
            }
          } catch (loginErr) {
            setError(friendlyIdentityError(loginErr));
          }
        } else {
          setError(friendlyIdentityError(err));
        }
      } finally {
        setCreatingAccount(false);
      }
      return;
    }
    if (step === 1) {
      await saveBusinessDetails();
      return;
    }
    void finish();
  };

  const back = () => {
    if (awaitingEmailVerification) {
      setAwaitingEmailVerification(false);
      return;
    }
    if (step === 0) onBack();
    else setStep((s) => s - 1);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-8">
      <div className="mb-6 flex items-center justify-between border-b border-amber-200/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
              Wholesaler Registration
            </p>
            <h2 className="font-display text-lg font-bold">{STEPS[step]}</h2>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Back to journey"
        >
          <Undo2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              i === step ? "w-8 bg-amber-500" : i < step ? "w-2 bg-amber-400/60" : "w-2 bg-slate-200"
            }`}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-amber-200/60 bg-white p-6 shadow-lg shadow-amber-500/5 md:p-8">
        {step === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {awaitingEmailVerification ? (
              <EmailVerificationGate role="wholesaler"
                email={form.email}
                onVerified={handleEmailVerified}
                accentClassName="text-amber-600"
              />
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Enter your full name, email, and password to create your wholesaler account.
                </p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-500" /> Full Name{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      name="fullName"
                      value={form.fullName}
                      onChange={(e) => set("fullName", e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="Create your secure password"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-slate-800 font-semibold">
                <Store className="h-3.5 w-3.5 text-amber-600" /> Wholesale Shop Name{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                name="shopName"
                value={form.shopName}
                onChange={(e) => set("shopName", e.target.value)}
                placeholder="e.g. Gujranwala Wholesale Traders / Al-Madina Tech Hub"
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-slate-800 font-semibold">
                <IdCard className="h-3.5 w-3.5 text-slate-500" /> CNIC Number (13 Digits){" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                name="cnicNumber"
                value={form.cnicNumber || ""}
                placeholder="XXXXX-XXXXXXX-X"
                maxLength={15}
                onChange={(e) => set("cnicNumber", autoFormatCnic(e.target.value))}
                className="bg-white"
              />
              <p className="text-[11px] font-medium text-amber-700/80">
                Enter 13 digits CNIC number (Format: XXXXX-XXXXXXX-X)
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+92 3xx xxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Product Category</Label>
                <select
                  value={form.specialty}
                  onChange={(e) => set("specialty", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>Mobile Accessories</option>
                  <option>Food &amp; Grocery</option>
                  <option>Garments &amp; Fabric</option>
                  <option>Packaging</option>
                  <option>Electronics</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Coverage</Label>
                <select
                  value={form.experience}
                  onChange={(e) => set("experience", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>National Shipping</option>
                  <option>City Only</option>
                  <option>Province Wide</option>
                  <option>International</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                <MapPin className="h-4 w-4" /> Business location{" "}
                <span className="text-red-500">*</span>
              </p>
              <LocationMapPicker value={loc} onChange={setLoc} accent="amber" height={240} />
            </div>

            <div className="space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4">
              <Label className="flex items-center gap-1.5 text-slate-800">
                <Factory className="h-3.5 w-3.5 text-amber-600" />
                How do you get your products? <span className="text-red-500">*</span>
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSupplyMode("source");
                    setFactoryImages([]);
                  }}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    supplyMode === "source"
                      ? "border-amber-500 bg-white shadow-sm ring-2 ring-amber-400/40"
                      : "border-slate-200 bg-white/70 hover:border-amber-300"
                  }`}
                >
                  <p className="font-semibold text-slate-900">Source from factories</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    I buy / source from other factories or suppliers
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSupplyMode("own_factory");
                    set("sourcingFrom", "");
                  }}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    supplyMode === "own_factory"
                      ? "border-amber-500 bg-white shadow-sm ring-2 ring-amber-400/40"
                      : "border-slate-200 bg-white/70 hover:border-amber-300"
                  }`}
                >
                  <p className="font-semibold text-slate-900">Own factory</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    I manufacture or warehouse goods myself
                  </p>
                </button>
              </div>

              {supplyMode === "source" && (
                <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label>Sourcing (factories / suppliers)</Label>
                  <textarea
                    value={form.sourcingFrom}
                    onChange={(e) => set("sourcingFrom", e.target.value)}
                    rows={3}
                    placeholder="e.g. Packing from Lahore factories; electronics from China suppliers…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                  />
                </div>
              )}

              {supplyMode === "own_factory" && (
                <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label>Upload factory / workshop images</Label>
                  <p className="text-[11px] text-slate-500">
                    Photos of your factory or warehouse (optional).
                  </p>
                  <input
                    ref={factoryRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      Array.from(e.target.files || []).forEach((f) =>
                        readImg(f, (v) => setFactoryImages((a) => [...a, v])),
                      );
                      e.target.value = "";
                    }}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {factoryImages.map((img, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                        <img src={img} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFactoryImages((a) => a.filter((_, idx) => idx !== i))}
                          className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => factoryRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 hover:border-amber-400"
                    >
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px]">Add</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <ShieldCheck className="h-4 w-4" /> Identity &amp; CNIC Biometric Verification
            </p>
            <CnicFaceVerify
              accent="amber"
              resetKey={`wholesaler-${form.email || "guest"}-stage3`}
              onComplete={handleKycComplete}
            />
            {verify && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Identity verified — click Done to open your dashboard.
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={back}
            disabled={submitting || creatingAccount || savingDetails}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Journey" : "Back"}
          </Button>
          {!awaitingEmailVerification && (
            <Button
              type="button"
              onClick={() => void next()}
              disabled={!canNext() || submitting || creatingAccount || savingDetails}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold disabled:opacity-50 px-6"
            >
              {creatingAccount || submitting || savingDetails ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Please wait…
                </>
              ) : step === STEPS.length - 1 ? (
                "Done"
              ) : (
                <>
                  Continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
