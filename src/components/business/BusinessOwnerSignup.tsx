import { useState } from "react";
import {
  User, Briefcase, Mail, Lock, Phone,
  ShieldCheck, Loader2, ArrowRight, Undo2
} from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KycPendingGate } from "@/components/kyc/KycPendingGate";
import { BusinessSignupCinema } from "@/components/onboarding/BusinessSignupCinema";
import { CnicFaceVerify } from "@/components/verification/CnicFaceVerify";
import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import { BusinessOwnerService } from "@/services/businessOwnerService";
import { friendlyIdentityError } from "@/services/identityVerificationService";

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
  onBack: () => void;
}

/**
 * Steps:
 * 1 — credentials + email verification wait
 * 2 — business + CNIC details (phone at end)
 * 3 — biometric KYC
 * 4 — admin wait (KycPendingGate)
 */
export function BusinessOwnerSignup({ onBack }: BusinessOwnerSignupProps) {
  const { registerBusiness, approveBusiness, setIsLoggedIn } = useAppState();
  const { refreshUserData } = useAuth();
  const [step, setStep] = useState(1);
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
    if (!formData.fullName || !formData.email || !formData.password) {
      alert("Please fill in all required fields.");
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
      const res = await BusinessOwnerService.registerStep1({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      });
      if (res.success && res.uid) {
        setUid(res.uid);
        setAwaitingEmailVerification(true);
      }
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
    if (!formData.businessName || !formData.location || !formData.phone || !formData.cnic || !formData.trademark) {
      alert("Please fill in all required fields (Business Name, Location, Phone, CNIC, and Trademark Number).");
      return;
    }

    setVerifyingDetails(true);
    setRegistrationError("");
    try {
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
        cnic: formData.cnic,
      });
      setStep(3);
    } catch (err: unknown) {
      setRegistrationError(friendlyIdentityError(err) || "Failed to save business details.");
    } finally {
      setVerifyingDetails(false);
    }
  };

  const handleSubmitBusiness = async () => {
    if (!formData.cnicFront || !formData.cnicBack || !formData.liveSelfie) {
      alert("Please complete biometric uploading (CNIC Front, Back, and Live Selfie).");
      return;
    }
    if (formData.faceMatchScore < 70) {
      alert("Face match must be at least 70%. Capture a clearer live selfie and verify again.");
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

      await BusinessOwnerService.registerStep4(uid, {
        cnicFrontUrl,
        cnicBackUrl,
        selfieUrl,
      });

      try {
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const { firestore } = await import("@/firebase");
        await setDoc(
          doc(firestore, "users", uid),
          {
            role: "business_owner",
            cnicFrontUrl,
            cnicBackUrl,
            liveSelfieUrl: selfieUrl,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        await setDoc(
          doc(firestore, "business_owners", uid),
          {
            cnicFrontUrl,
            cnicBackUrl,
            liveSelfieUrl: selfieUrl,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (fsErr) {
        console.warn("Firestore CNIC mirror skipped:", fsErr);
      }

      const { submitPendingKycReview } = await import("@/services/adminKycService");
      await submitPendingKycReview({
        uid,
        role: "business_owner",
        fullName: formData.fullName || formData.businessName,
        email: formData.email,
        phoneNumber: formData.phone,
        cnic: formData.cnic,
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

      await refreshUserData(uid);

      setSubmitDone(true);
      setVerifyingDetails(false);
      setStep(4);
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
          {step < 4 && (
            <div className="mb-8 flex items-center justify-between border-b border-white/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Business Owner Registration</p>
                  <h2 className="font-display text-lg font-bold text-white">Secure Compliance Boarding</h2>
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
          )}

          {registrationError && (
            <div className="mb-4 rounded-xl bg-destructive/15 border border-destructive/30 p-4 text-xs text-destructive">
              {registrationError}
            </div>
          )}

          {/* STEP 1: CREDENTIALS + EMAIL VERIFICATION */}
          {step === 1 && (
            <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              {awaitingEmailVerification ? (
                <>
                  <div className="mb-6">
                    <h3 className="font-display text-xl font-bold">1. Verify Your Email</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confirm your inbox before business details and KYC.
                    </p>
                  </div>
                  <EmailVerificationGate
                    email={formData.email}
                    onVerified={handleEmailVerified}
                    accentClassName="text-amber-600"
                  />
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="font-display text-xl font-bold">1. Personal Details Setup</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create your account — email verification is required next.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="owner-name" className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner-name"
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
                        className="w-full bg-foreground text-background hover:opacity-90"
                      >
                        {verifyingDetails ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating account…
                          </span>
                        ) : (
                          "Continue"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: BUSINESS + CNIC DETAILS (phone at end) */}
          {step === 2 && (
            <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold">2. Business Profile Details</h3>
                  <p className="text-xs text-muted-foreground mt-1">Provide register details & Trademark validation.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="rounded-full">
                  Back
                </Button>
              </div>

              <div className="space-y-4">
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
                  <Label htmlFor="owner-cnic" className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> CNIC Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="owner-cnic"
                    placeholder="Enter your CNIC number (e.g. 42101-1234567-8)"
                    value={formData.cnic}
                    onChange={(e) => handleInputChange("cnic", e.target.value)}
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

                <div className="pt-4">
                  <Button
                    onClick={() => void handleSaveBusinessDetails()}
                    disabled={verifyingDetails}
                    className="w-full bg-foreground text-background hover:opacity-90 disabled:opacity-50"
                  >
                    {verifyingDetails ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </span>
                    ) : (
                      "Continue to Biometric Verification"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BIOMETRIC / ID VERIFICATION */}
          {step === 3 && (
            <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-accent animate-pulse" />
                    3. National Identity & Biometric Audit
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Upload government-issued CNIC Card and take a Live Verification Selfie.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="rounded-full">
                  Back
                </Button>
              </div>

              <div className="space-y-6">
                <CnicFaceVerify
                  accent="amber"
                  onComplete={(r) =>
                    setFormData((prev) => ({
                      ...prev,
                      cnicFront: r.cnicFront,
                      cnicBack: r.cnicBack,
                      liveSelfie: r.liveSelfie,
                      faceMatchScore: r.matchConfidenceScore || r.faceMatchScore || 0,
                    }))
                  }
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
                      formData.faceMatchScore < 70
                    }
                    className="w-full bg-foreground text-background hover:opacity-90"
                  >
                    {submitDone ? (
                      "Done, wait for admin approval"
                    ) : verifyingDetails ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing Biometrics & Securing Ledger...
                      </span>
                    ) : (
                      "Submit Profile for Admin Compliance Approval"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: WAIT FOR ADMIN APPROVAL */}
          {step === 4 && (
            <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in zoom-in-95 duration-400">
              {uid ? (
                <KycPendingGate
                  uid={uid}
                  role="business_owner"
                  email={formData.email}
                  approvedPath="/app/score"
                  onApproved={() => {
                    approveBusiness();
                    setIsLoggedIn(true);
                  }}
                />
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Session missing — please log in again after admin approval.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </BusinessSignupCinema>
  );
}
