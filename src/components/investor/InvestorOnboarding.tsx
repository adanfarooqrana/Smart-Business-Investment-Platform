import { useCallback, useState } from "react";
import {
  TrendingUp,
  Undo2,
  User,
  Mail,
  Lock,
  Landmark,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  CreditCard,
  IdCard,
  Phone,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/hooks/useAppState";
import { auth } from "@/firebase";
import { commitInvestorProfile } from "@/services/investorCoreService";
import { submitPendingKycReview } from "@/services/adminKycService";
import {
  createEmailPasswordAndSendVerification,
  friendlyIdentityError,
} from "@/services/identityVerificationService";
import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import { KycPendingGate } from "@/components/kyc/KycPendingGate";
import { InvestorSignupCinema } from "@/components/investor/InvestorSignupCinema";
import { CnicFaceVerify } from "@/components/verification/CnicFaceVerify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InvestorOnboardingProps = {
  onBack: () => void;
};

type InvestorFormData = {
  fullName: string;
  email: string;
  password: string;
  cnic: string;
  bankName: string;
  accountTitleName: string;
  accountNumber: string;
  phone: string;
  cnicFront: string;
  cnicBack: string;
  liveSelfie: string;
  faceMatchScore: number;
};

const EMPTY_FORM: InvestorFormData = {
  fullName: "",
  email: "",
  password: "",
  cnic: "",
  bankName: "",
  accountTitleName: "",
  accountNumber: "",
  phone: "",
  cnicFront: "",
  cnicBack: "",
  liveSelfie: "",
  faceMatchScore: 0,
};

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

/** Min 8 chars, ≥1 letter, ≥1 digit */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/** Pakistani CNIC: xxxxx-xxxxxxx-x or 13 digits */
const CNIC_RULE = /^(?:\d{5}-\d{7}-\d|\d{13})$/;

function getPasswordError(password: string): string {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password)) return "Password must include at least one alphabetic character (a-z / A-Z).";
  if (!/\d/.test(password)) return "Password must include at least one numeric digit (0-9).";
  if (!PASSWORD_RULE.test(password)) {
    return "Password must be 8+ characters with letters and numbers.";
  }
  return "";
}

function getCnicError(cnic: string): string {
  const trimmed = cnic.trim();
  if (!trimmed) return "CNIC number is required.";
  if (!CNIC_RULE.test(trimmed)) {
    return "Enter a valid Pakistani CNIC (e.g. 34101-XXXXXXX-X or 13 digits).";
  }
  return "";
}

/**
 * Multi-step Investor Onboarding Wizard
 * Step 1 — credentials + email verify · Step 2 — CNIC/bank/phone/KYC · Step 3 — admin wait
 */
export function InvestorOnboarding({ onBack }: InvestorOnboardingProps) {
  const { currentUser } = useAuth();
  const { registerInvestor, setIsLoggedIn } = useAppState();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<InvestorFormData>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [stepError, setStepError] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [registrationError, setRegistrationError] = useState("");

  const setField = <K extends keyof InvestorFormData>(field: K, value: InvestorFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value ?? ("" as InvestorFormData[K]) }));
  };

  const handlePasswordChange = (value: string) => {
    setField("password", value);
    setPasswordHint(getPasswordError(value));
    if (stepError) setStepError("");
  };

  const handleEmailVerified = useCallback(() => {
    setAwaitingEmailVerification(false);
    setStep(2);
  }, []);

  const validateStep1 = (): boolean => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
      setStepError("Please fill in Full Name, Contact Email, and Password.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setStepError("Please enter a valid contact email address.");
      return false;
    }
    const pwdErr = getPasswordError(formData.password);
    if (pwdErr) {
      setPasswordHint(pwdErr);
      setStepError(pwdErr);
      return false;
    }
    setPasswordHint("");
    setStepError("");
    return true;
  };

  const validateStep2 = (): string => {
    const cnicErr = getCnicError(formData.cnic);
    if (cnicErr) return cnicErr;
    if (!formData.bankName.trim()) return "Please select a bank name.";
    if (!formData.accountTitleName.trim()) return "Account Title Name is required.";
    if (!formData.accountNumber.trim() || formData.accountNumber.trim().length < 8) {
      return "Enter a valid Account Number / IBAN.";
    }
    if (!formData.phone.trim()) return "Phone number is required.";
    if (!formData.cnicFront || !formData.cnicBack || !formData.liveSelfie) {
      return "Please complete biometric verification (CNIC Front, Back, and Live Selfie).";
    }
    if (formData.faceMatchScore < 70) {
      return "Face match must be at least 70%. Capture a clearer live selfie and verify again.";
    }
    return "";
  };

  const handleCreateAccountAndSendVerification = async () => {
    if (!validateStep1()) return;

    setIsCreatingAccount(true);
    setStepError("");
    try {
      await createEmailPasswordAndSendVerification({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
      });
      setAwaitingEmailVerification(true);
    } catch (err: unknown) {
      setStepError(friendlyIdentityError(err));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const submitComplianceProfile = async () => {
    const step2Err = validateStep2();
    if (step2Err) {
      setStepError(step2Err);
      setRegistrationError(step2Err);
      return;
    }
    setStepError("");

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setRegistrationError("Session missing. Please verify email again and continue.");
      return;
    }

    setRegistrationError("");
    setIsSubmitting(true);

    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string) =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${label} — timeout (${Math.round(ms / 1000)}s).`)),
            ms,
          ),
        ),
      ]);

    try {
      await withTimeout(
        commitInvestorProfile(uid, {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          cnic: formData.cnic.trim(),
          bankDetails: {
            bankName: formData.bankName.trim(),
            accountTitle: formData.accountTitleName.trim(),
            accountNumber: formData.accountNumber.trim(),
          },
          mobilePhoneForOtp: formData.phone.trim(),
        }),
        30000,
        "Profile commit",
      );

      let cnicFrontUrl = formData.cnicFront;
      let cnicBackUrl = formData.cnicBack;
      let liveSelfieUrl = formData.liveSelfie;
      try {
        const { uploadBase64Image } = await import("@/services/firebaseService");
        const [f, b, s] = await Promise.all([
          uploadBase64Image(uid, "cnic-front.jpg", formData.cnicFront).catch(() => ""),
          uploadBase64Image(uid, "cnic-back.jpg", formData.cnicBack).catch(() => ""),
          uploadBase64Image(uid, "live-selfie.jpg", formData.liveSelfie).catch(() => ""),
        ]);
        if (f) cnicFrontUrl = f;
        if (b) cnicBackUrl = b;
        if (s) liveSelfieUrl = s;
      } catch (uploadErr) {
        console.warn("Investor KYC image upload skipped:", uploadErr);
      }

      await submitPendingKycReview({
        uid,
        role: "investor",
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phone.trim(),
        cnic: formData.cnic.trim(),
        bankName: formData.bankName.trim(),
        accountTitle: formData.accountTitleName.trim(),
        accountNumber: formData.accountNumber.trim(),
        cnicFrontUrl,
        cnicBackUrl,
        liveSelfieUrl,
        matchConfidenceScore: formData.faceMatchScore,
      });

      registerInvestor({
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        categories: ["General"],
        budgetRange: "",
        ticketSize: "",
        location: "Pakistan",
        strategy: `Bank: ${formData.bankName}`,
        entityType: "Normal Person",
        cnicFront: formData.cnicFront,
        cnicBack: formData.cnicBack,
        liveSelfie: formData.liveSelfie,
      });

      setIsLoggedIn(true);
      setSubmitDone(true);
      setStep(3);
    } catch (err: unknown) {
      setRegistrationError(friendlyIdentityError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const gateUid = auth.currentUser?.uid || currentUser?.uid || "";

  return (
    <InvestorSignupCinema>
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-8">
        {step < 3 && (
          <div className="mb-8 flex items-center justify-between border-b border-white/20 pb-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                  Investor Desk Onboarding
                </p>
                <h2 className="font-display text-lg font-bold text-white">Capital Compliance Boarding</h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? "w-8 bg-foreground"
                      : s < step
                        ? "w-2.5 bg-foreground/65"
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

        {/* STEP 1 — Credentials + email verification gate */}
        {step === 1 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6">
              <h3 className="font-display text-xl font-bold">1. Personal & Account Credentials</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Setup your name, email, and secure credentials — then verify email before continuing.
              </p>
            </div>

            {awaitingEmailVerification ? (
              <EmailVerificationGate
                email={formData.email.trim()}
                onVerified={handleEmailVerified}
                accentClassName="text-amber-600"
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-name" className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-name"
                    placeholder="e.g. Ali Hassan"
                    value={formData.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-email" className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Contact Email{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-email"
                    type="email"
                    placeholder="e.g. contact@apexventures.com"
                    value={formData.email}
                    onChange={(e) => setField("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-password" className="flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password (setup){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="inv-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 chars · letters + numbers"
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordHint ? (
                    <p className="text-xs font-semibold text-destructive">{passwordHint}</p>
                  ) : formData.password ? (
                    <p className="text-xs font-semibold text-emerald-600">Password meets security rules.</p>
                  ) : null}
                </div>

                {stepError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {stepError}
                  </p>
                ) : null}

                <div className="pt-4">
                  <Button
                    onClick={() => void handleCreateAccountAndSendVerification()}
                    disabled={isCreatingAccount}
                    className="w-full bg-foreground text-background hover:opacity-90"
                  >
                    {isCreatingAccount ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account…
                      </span>
                    ) : (
                      "Continue — Verify Email"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — CNIC, banking, phone + biometric KYC */}
        {step === 2 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6">
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500 animate-pulse" />
                2. Finances, CNIC &amp; Biometric Compliance
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Enter banking specs and upload CNIC + live selfie for regulatory review.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-cnic" className="flex items-center gap-1">
                  <IdCard className="h-3.5 w-3.5 text-muted-foreground" /> CNIC Number{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inv-cnic"
                  inputMode="numeric"
                  placeholder="e.g. 34101-XXXXXXX-X"
                  value={formData.cnic}
                  onChange={(e) => {
                    setField("cnic", e.target.value);
                    if (stepError) setStepError("");
                  }}
                  required
                />
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5" /> Bank Details
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-bank">
                      Bank Name <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="inv-bank"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.bankName}
                      onChange={(e) => setField("bankName", e.target.value)}
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
                    <Label htmlFor="inv-account-title">
                      Account Title Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="inv-account-title"
                      placeholder="Legal account ownership title"
                      value={formData.accountTitleName}
                      onChange={(e) => setField("accountTitleName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-iban" className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Account Number / IBAN{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-iban"
                    placeholder="e.g. PK00XXXX00000000000000"
                    value={formData.accountNumber}
                    onChange={(e) => setField("accountNumber", e.target.value)}
                    className="font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <CnicFaceVerify
                accent="emerald"
                onComplete={(r) =>
                  setFormData((prev) => ({
                    ...prev,
                    cnicFront: r.cnicFront || "",
                    cnicBack: r.cnicBack || "",
                    liveSelfie: r.liveSelfie || "",
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

              <div className="space-y-1.5">
                <Label htmlFor="inv-phone" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inv-phone"
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={(e) => {
                    setField("phone", e.target.value);
                    if (stepError) setStepError("");
                  }}
                  required
                />
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                {stepError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {stepError}
                  </p>
                ) : null}
                {registrationError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {registrationError}
                  </p>
                ) : null}
                <Button
                  onClick={() => void submitComplianceProfile()}
                  disabled={
                    isSubmitting ||
                    submitDone ||
                    formData.faceMatchScore < 70 ||
                    !formData.liveSelfie
                  }
                  className="w-full bg-foreground text-background hover:opacity-90"
                >
                  {submitDone ? (
                    "Done, wait for admin approval"
                  ) : isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Analyzing compliance biometric records...
                    </span>
                  ) : (
                    "Submit Profile for Regulatory Compliance Review"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Wait for admin approval */}
        {step === 3 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in zoom-in-95 duration-400">
            {gateUid ? (
              <KycPendingGate
                uid={gateUid}
                role="investor"
                email={formData.email}
                approvedPath="/app/investor"
              />
            ) : (
              <p className="text-center text-sm text-slate-500">
                Session missing — please log in again after admin approval.
              </p>
            )}
          </div>
        )}
      </div>
    </InvestorSignupCinema>
  );
}
