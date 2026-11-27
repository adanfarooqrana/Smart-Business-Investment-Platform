import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  User, Briefcase, Mail, Lock, Phone,
  ShieldCheck, Loader2, ArrowRight, Undo2, IdCard
} from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BusinessSignupCinema } from "@/components/onboarding/BusinessSignupCinema";
import { CnicFaceVerify, type CnicFaceResult } from "@/components/verification/CnicFaceVerify";
import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import { BusinessOwnerService } from "@/services/businessOwnerService";
import {
  createEmailPasswordAndSendVerification,
  friendlyIdentityError,
} from "@/services/identityVerificationService";
import { FACE_MATCH_THRESHOLD } from "@/lib/kycService";
import { isFaceMatchAcceptable, USE_SIMULATED_KYC } from "@/lib/kycBypass";
import {
  syncStage1ToFirestore,
  syncStage2ToFirestore,
  syncStage3ToFirestore,
} from "@/services/onboardingFirestoreService";
import { sanitizeExtractedCnic, formatPakistaniCnic } from "@/lib/kycOcrService";
import {
  clearLocalOnboardingSession,
  resolveWizardUiStage,
} from "@/lib/onboardingResume";

/** Manual CNIC entry — 13 digits → XXXXX-XXXXXXX-X (no OCR heuristics). */
function normalizeManualCnic(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 13) return "";
  if (/^0{13}$/.test(digits)) return "";
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

const CATEGORIES = [
  { value: "Food & Beverage", label: "Food & Beverage" },
  { value: "SaaS / Tech", label: "SaaS / Tech" },
  { value: "Retail & E-commerce", label: "Retail & E-commerce" },
  { value: "Professional Services", label: "Professional Services" }
];

const PAKISTAN_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
  "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
  "Hyderabad", "Bahawalpur", "Sargodha", "Sukkur", "Larkana",
  "Sheikhupura", "Jhang", "Rahim Yar Khan", "Mardan", "Gujrat",
  "Kasur", "Mingora", "Dera Ghazi Khan", "Sahiwal", "Nawabshah",
  "Okara", "Mirpur Khas", "Chiniot", "Kamoke", "Mandi Bahauddin",
  "Jhelum", "Sadiqabad", "Jacobabad", "Shikarpur", "Khanewal",
  "Hafizabad", "Kohat", "Muzaffargarh", "Khanpur", "Gojra",
  "Mianwali", "Turbat", "Dadu", "Khuzdar", "Pakpattan",
  "Tando Allahyar", "Tando Adam", "Attock", "Vehari", "Wazirabad",
  "Abbottabad", "Mansehra", "Swabi", "Chakwal", "Dera Ismail Khan",
  "Charsadda", "Nowshera", "Bannu", "Haripur", "Zhob",
  "Chaman", "Gwadar", "Hub", "Lodhran", "Toba Tek Singh",
  "Bhakkar", "Layyah", "Rajanpur", "Muzaffarabad", "Mirpur",
  "Gilgit", "Skardu", "Chitral", "Hangu", "Tank",
  "Khairpur", "Naushahro Feroze", "Sanghar", "Badin", "Thatta",
  "Umerkot", "Matiari", "Tando Muhammad Khan", "Sujawal", "Jamshoro",
];

interface BusinessOwnerSignupProps {
  resume?: boolean;
  onBack: () => void;
}

export function BusinessOwnerSignup({ onBack, resume = false }: BusinessOwnerSignupProps) {
  const navigate = useNavigate();
  const { registerBusiness, approveBusiness, setIsLoggedIn } = useAppState();
  const { refreshUserData, currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [resumeReady, setResumeReady] = useState(false);
  const [businessStarted, setBusinessStarted] = useState(false);
  const [uid, setUid] = useState("");
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    cnic: "",
    businessName: "",
    location: "Karachi",
    exactLocation: "",
    category: "Food & Beverage",
    subcategory: "",
    size: "2–10 members",
    registerNumber: "",
    trademark: "",
    about: "",
    cnicFront: "",
    cnicBack: "",
    liveSelfie: "",
    faceMatchScore: 0,
  });

  const [passwordHint, setPasswordHint] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [verifyingDetails, setVerifyingDetails] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    clearLocalOnboardingSession();
  }, []);

  // Resume: 1=credentials, 2=business details, 3=KYC, completed→dashboard
  useEffect(() => {
    const existingUid = currentUser?.uid;
    if (!resume || !existingUid) {
      setResumeReady(true);
      return;
    }
    let cancelled = false;
    setResumeReady(false);
    void (async () => {
      try {
        const { getFirestoreOnboardingDoc } = await import("@/services/onboardingFirestoreService");
        let fsDoc = await getFirestoreOnboardingDoc(existingUid);
        if (cancelled) return;
        setUid(existingUid);

        try {
          await currentUser.reload();
        } catch {
          /* ignore */
        }

        const emailVerified = Boolean(currentUser.emailVerified);
        if (!emailVerified) {
          setStep(1);
          setResumeReady(true);
          return;
        }

        if (fsDoc && fsDoc.role !== "business_owner") return;
        const resolved = resolveWizardUiStage({ emailVerified: true, fsDoc });

        if (resolved.ensureStage1Doc) {
          await syncStage1ToFirestore({
            uid: existingUid,
            email: currentUser.email || formData.email || "",
            role: "business_owner",
            emailVerified: true,
            fullName: formData.fullName || undefined,
          });
          if (cancelled) return;
          fsDoc = await getFirestoreOnboardingDoc(existingUid);
        }

        if (fsDoc) {
          const rd = (fsDoc.profile?.roleDetails || {}) as Record<string, string>;
          setFormData((prev) => ({
            ...prev,
            fullName: String(fsDoc.profile?.fullName || prev.fullName || "").trim(),
            cnic:
              normalizeManualCnic(fsDoc.profile?.cnicNumber || "") ||
              sanitizeExtractedCnic(fsDoc.profile?.cnicNumber) ||
              prev.cnic,
            email: fsDoc.email || currentUser.email || prev.email,
            businessName: rd.businessName || prev.businessName,
            location: rd.location || prev.location,
            exactLocation: rd.exactLocation || prev.exactLocation,
            category: rd.category || prev.category,
            subcategory: rd.subcategory || prev.subcategory,
            size: rd.size || prev.size,
            trademark: rd.trademark || prev.trademark,
            about: rd.about || prev.about,
            phone: rd.phone || prev.phone,
            cnicFront: fsDoc.kyc?.cnicFrontUrl || prev.cnicFront,
            cnicBack: fsDoc.kyc?.cnicBackUrl || prev.cnicBack,
            liveSelfie: fsDoc.kyc?.selfieUrl || prev.liveSelfie,
            faceMatchScore: Number(fsDoc.kyc?.matchScore || prev.faceMatchScore) || 0,
          }));
        }

        if (resolved.goDashboard) {
          setIsLoggedIn(true);
          setSubmitDone(true);
          navigate({ to: "/app/score" });
          return;
        }

        setStep(resolved.stage);
        setBusinessStarted(true);
      } catch (err) {
        console.warn("Business signup resume error:", err);
        setStep(1);
      } finally {
        if (!cancelled) setResumeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, currentUser?.uid, currentUser?.email, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getPasswordHint = (pwd: string): string => {
    if (!pwd) return "";
    if (pwd.length < 8) return "Must be at least 8+ characters.";
    if (!/[a-zA-Z]/.test(pwd)) return "Must include alphabetic characters.";
    if (!/[0-9]/.test(pwd)) return "Must include numeric characters.";
    return "";
  };

  const handleRegisterCredentials = async () => {
    if (!formData.fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!formData.email || !formData.password) {
      alert("Please enter your email and password.");
      return;
    }
    const hint = getPasswordHint(formData.password);
    if (hint) {
      setPasswordHint(hint);
      return;
    }
    setPasswordHint("");

    setVerifyingDetails(true);
    setRegistrationError("");
    try {
      const user = await createEmailPasswordAndSendVerification({
        role: "business_owner",
        fullName: formData.fullName.trim(),
        email: formData.email,
        password: formData.password,
      });
      setUid(user.uid);
      setAwaitingEmailVerification(true);
    } catch (err: unknown) {
      setRegistrationError(friendlyIdentityError(err) || "Email is already in use!");
    } finally {
      setVerifyingDetails(false);
    }
  };

  const handleEmailVerified = () => {
    setAwaitingEmailVerification(false);
    setStep(2);
  };

  const handleSaveBusinessDetails = async () => {
    const cnic =
      normalizeManualCnic(formData.cnic) ||
      formatPakistaniCnic(formData.cnic) ||
      sanitizeExtractedCnic(formData.cnic);
    if (!formData.fullName.trim()) {
      setRegistrationError("Full name from Stage 1 is missing. Go back and enter your name.");
      return;
    }
    if (!formData.businessName.trim()) {
      setRegistrationError("Official Business Name is required.");
      return;
    }
    if (!formData.location.trim()) {
      setRegistrationError("Operational Location is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setRegistrationError("Phone Number is required.");
      return;
    }
    if (!cnic) {
      setRegistrationError("Enter a valid CNIC as XXXXX-XXXXXXX-X (13 digits).");
      return;
    }
    if (!formData.trademark.trim()) {
      setRegistrationError("Registered Trademark Number is required.");
      return;
    }

    setSavingDetails(true);
    setRegistrationError("");
    try {
      if (uid) {
        await syncStage2ToFirestore({
          uid,
          email: formData.email,
          role: "business_owner",
          fullName: formData.fullName.trim(),
          cnicNumber: cnic,
          roleDetails: {
            businessName: formData.businessName,
            location: formData.location,
            exactLocation: formData.exactLocation,
            category: formData.category,
            subcategory: formData.subcategory || "General",
            size: formData.size,
            trademark: formData.trademark,
            about: formData.about,
            phone: formData.phone,
          },
        });
      }
      setFormData((prev) => ({ ...prev, cnic }));
      setStep(3);
    } catch (err) {
      console.error(err);
      setRegistrationError(
        err instanceof Error ? err.message : "Failed to save business details.",
      );
    } finally {
      setSavingDetails(false);
    }
  };

  const handleKycComplete = (r: CnicFaceResult) => {
    setFormData((prev) => ({
      ...prev,
      cnicFront: r.cnicFront,
      cnicBack: r.cnicBack,
      liveSelfie: r.liveSelfie,
      faceMatchScore: r.matchConfidenceScore || r.faceMatchScore || 0,
    }));
  };

  const handleSubmitBusiness = async () => {
    if (!formData.cnicFront || !formData.cnicBack || !formData.liveSelfie) {
      alert("Please complete biometric uploading (CNIC Front, Back, and Live Selfie).");
      return;
    }
    if (!isFaceMatchAcceptable(formData.faceMatchScore, true)) {
      alert(
        USE_SIMULATED_KYC
          ? "Complete the face-match scan before proceeding."
          : `Face match must be at least ${FACE_MATCH_THRESHOLD}%. Capture a clearer live selfie and verify again.`,
      );
      return;
    }

    const cnic =
      normalizeManualCnic(formData.cnic) ||
      sanitizeExtractedCnic(formData.cnic) ||
      formData.cnic.trim();
    if (!formData.fullName.trim() || !cnic) {
      alert("Full name and CNIC number are required. Go back to Stage 2 if needed.");
      return;
    }

    setVerifyingDetails(true);
    setRegistrationError("");

    try {
      const { ensureCloudinaryUrl } = await import("@/lib/cloudinaryUpload");
      const [cnicFrontUrl, cnicBackUrl, selfieUrl] = await Promise.all([
        ensureCloudinaryUrl(formData.cnicFront, "cnic_verifications"),
        ensureCloudinaryUrl(formData.cnicBack, "cnic_verifications"),
        ensureCloudinaryUrl(formData.liveSelfie, "selfies"),
      ]);

      const roleDetails = {
        businessName: formData.businessName,
        location: formData.location,
        exactLocation: formData.exactLocation,
        category: formData.category,
        subcategory: formData.subcategory || "General",
        size: formData.size,
        trademark: formData.trademark,
        about: formData.about,
        phone: formData.phone,
      };

      await syncStage3ToFirestore({
        uid,
        email: formData.email,
        role: "business_owner",
        fullName: formData.fullName.trim(),
        cnicNumber: cnic,
        roleDetails,
        kyc: {
          status: "pending",
          cnicFrontUrl,
          cnicBackUrl,
          selfieUrl,
          matchScore: formData.faceMatchScore,
          mode: USE_SIMULATED_KYC ? "simulated" : "direct",
        },
      });

      await BusinessOwnerService.registerStep3(uid, {
        businessName: formData.businessName,
        operationalLocation: formData.location,
        exactLocation: formData.exactLocation,
        coreCategory: formData.category,
        subcategory: formData.subcategory || "General",
        teamSize: formData.size,
        trademarkNumber: formData.trademark,
        pitch: formData.about || `A premium ${formData.category} business based in ${formData.location}.`,
        phone: formData.phone,
        cnic,
      });

      await BusinessOwnerService.registerStep4(uid, {
        cnicFrontUrl,
        cnicBackUrl,
        selfieUrl,
      });

      const { submitPendingKycReview } = await import("@/services/adminKycService");
      await submitPendingKycReview({
        uid,
        role: "business_owner",
        fullName: formData.fullName.trim() || formData.businessName,
        email: formData.email,
        phoneNumber: formData.phone,
        cnic,
        businessName: formData.businessName,
        trademark: formData.trademark,
        location: formData.location,
        category: formData.category,
        registerNumber: formData.registerNumber,
        cnicFrontUrl,
        cnicBackUrl,
        liveSelfieUrl: selfieUrl,
        matchConfidenceScore: formData.faceMatchScore,
      });

      registerBusiness({
        name: formData.businessName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        category: formData.category,
        subcategory: formData.subcategory || "General",
        location: formData.location,
        size: formData.size,
        website: `https://${formData.businessName.toLowerCase().replace(/\s+/g, "")}.smartbiz.com`,
        about: formData.about || `A premium ${formData.category} business based in ${formData.location}.`,
        registerNumber: formData.registerNumber,
        trademark: formData.trademark || "None",
        cnicFront: cnicFrontUrl,
        cnicBack: cnicBackUrl,
        liveSelfie: selfieUrl,
      });

      approveBusiness();
      setIsLoggedIn(true);
      await refreshUserData(uid);

      setSubmitDone(true);
      setVerifyingDetails(false);
      navigate({ to: "/app/score" });
    } catch (err: unknown) {
      console.error(err);
      setRegistrationError(
        err instanceof Error
          ? err.message
          : friendlyIdentityError(err) || "Registration failed. Please check inputs.",
      );
      setVerifyingDetails(false);
    }
  };

  return (
    <BusinessSignupCinema>
      {!businessStarted ? (
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-2xl shadow-orange-900/40">
              <Briefcase className="h-10 w-10" />
            </div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100 backdrop-blur-md">
              Business Owner Registration
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white drop-shadow-lg md:text-5xl">
              Apna Business Launch Karein
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/85 drop-shadow md:text-base">
              Secure compliance boarding ke through apni dukaan ko digital banayein — customers, likes aur growth sab ek jagah.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                onClick={() => setBusinessStarted(true)}
                className="group h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-8 text-base font-bold text-white shadow-2xl shadow-orange-900/40 transition-all hover:scale-105 hover:from-amber-400 hover:to-orange-500"
              >
                Let's Begin
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <button
                onClick={onBack}
                className="text-xs font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Back to journey selection
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-8">
          <div className="mb-8 flex items-center justify-between border-b border-white/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Business Owner Registration</p>
                <h2 className="font-display text-lg font-bold text-white">
                  {step === 1 && "1. Credentials & Authentication"}
                  {step === 2 && "2. Business Profile & Role Details"}
                  {step === 3 && "3. Biometric & Identity Verification"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? "w-8 bg-accent"
                      : s < step
                      ? "w-2.5 bg-accent/65"
                      : "w-2.5 bg-secondary"
                  }`}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {registrationError && (
            <div className="mb-4 rounded-xl bg-destructive/15 border border-destructive/30 p-4 text-xs text-destructive">
              {registrationError}
            </div>
          )}

          {step === 1 && (
            <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              {awaitingEmailVerification ? (
                <>
                  <div className="mb-6">
                    <h3 className="font-display text-xl font-bold">1. Verify Your Email</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confirm your inbox before continuing to business details.
                    </p>
                  </div>
                  <EmailVerificationGate role="business_owner"
                    email={formData.email}
                    onVerified={handleEmailVerified}
                    accentClassName="text-amber-600"
                  />
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="font-display text-xl font-bold">1. Basic Authentication Setup</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your full name, email, and password to create your account.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="owner-name" className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner-name"
                        type="text"
                        name="fullName"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange("fullName", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="owner-email" className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="owner-password" className="flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner-password"
                        type="password"
                        placeholder="Create your secure password"
                        value={formData.password}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleInputChange("password", val);
                          setPasswordHint(getPasswordHint(val));
                        }}
                        required
                      />
                      {passwordHint && (
                        <p className="text-xs text-destructive mt-1">{passwordHint}</p>
                      )}
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={() => void handleRegisterCredentials()}
                        disabled={verifyingDetails}
                        className="w-full bg-foreground text-background hover:opacity-90 font-bold"
                      >
                        {verifyingDetails ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating account…
                          </span>
                        ) : (
                          "Continue to Email Verification"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold">2. Business Profile Details</h3>
                  <p className="text-xs text-muted-foreground mt-1">Provide business information & Trademark validation.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="rounded-full">
                  Back
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="owner-cnic" className="flex items-center gap-1">
                    <IdCard className="h-3.5 w-3.5 text-muted-foreground" /> CNIC Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="owner-cnic"
                    type="text"
                    name="cnicNumber"
                    value={formData.cnic || ""}
                    placeholder="XXXXX-XXXXXXX-X"
                    onChange={(e) => handleInputChange("cnic", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-name">Official Business Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="biz-name"
                    placeholder="Enter your business name"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-location">Operational Location <span className="text-destructive">*</span></Label>
                  <select
                    id="biz-location"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                  >
                    {PAKISTAN_CITIES.map((city) => (
                      <option key={city} value={city}>{city}, Pakistan</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-exact-location">Exact Location</Label>
                  <Input
                    id="biz-exact-location"
                    placeholder="Enter your exact business address"
                    value={formData.exactLocation}
                    onChange={(e) => handleInputChange("exactLocation", e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-cat">Core Category</Label>
                    <select
                      id="biz-cat"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-subcat">Subcategory / Type</Label>
                    <Input
                      id="biz-subcat"
                      placeholder="Enter your business subcategory"
                      value={formData.subcategory}
                      onChange={(e) => handleInputChange("subcategory", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz-size">Team Size</Label>
                    <select
                      id="biz-size"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.size}
                      onChange={(e) => handleInputChange("size", e.target.value)}
                    >
                      <option value="1 member (Sole Proprietor)">1 member</option>
                      <option value="2–10 members">2–10 members</option>
                      <option value="11–50 members">11–50 members</option>
                      <option value="50+ members">50+ members</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-trade" className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Registered Trademark Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="biz-trade"
                    placeholder="Enter your registered trademark number"
                    value={formData.trademark}
                    onChange={(e) => handleInputChange("trademark", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-about">Brief Pitch / Description</Label>
                  <textarea
                    id="biz-about"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    rows={2}
                    placeholder="Enter your business description"
                    value={formData.about}
                    onChange={(e) => handleInputChange("about", e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="owner-phone" className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="owner-phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                  />
                </div>

                <div className="pt-4 space-y-2">
                  {registrationError && step === 2 ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      {registrationError}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => void handleSaveBusinessDetails()}
                    disabled={savingDetails}
                    className="w-full bg-foreground text-background hover:opacity-90 font-bold disabled:opacity-60"
                  >
                    {savingDetails ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </span>
                    ) : (
                      <>Continue to Identity Verification <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-accent animate-pulse" />
                    3. National Identity & Biometric Verification (KYC)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Upload CNIC Front, Back, and capture a Live Selfie.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="rounded-full">
                  Back
                </Button>
              </div>

              <div className="space-y-6">
                <CnicFaceVerify
                  accent="amber"
                  resetKey={`biz-${formData.email || "guest"}-step3`}
                  onComplete={handleKycComplete}
                  onMatchFailed={() =>
                    setFormData((prev) => ({
                      ...prev,
                      liveSelfie: "",
                      faceMatchScore: 0,
                    }))
                  }
                />

                <div className="pt-4 border-t border-border">
                  <Button
                    onClick={() => void handleSubmitBusiness()}
                    disabled={
                      verifyingDetails ||
                      submitDone ||
                      !formData.liveSelfie ||
                      !isFaceMatchAcceptable(
                        formData.faceMatchScore,
                        !!(formData.cnicFront && formData.cnicBack && formData.liveSelfie),
                      )
                    }
                    className="w-full bg-foreground text-background hover:opacity-90 font-bold"
                  >
                    {verifyingDetails ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Profile &amp; Redirecting…
                      </span>
                    ) : (
                      "Done"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </BusinessSignupCinema>
  );
}
