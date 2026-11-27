import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/hooks/useAppState";
import { auth } from "@/firebase";
import {
  createEmailPasswordAndSendVerification,
  friendlyIdentityError,
  VerificationDeliveryError,
  reloadAndCheckEmailVerified,
} from "@/services/identityVerificationService";
import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import { InvestorKycVerification, type InvestorKycStatus } from "@/components/investor/InvestorKycVerification";
import { backendRequest } from "@/lib/backendClient";
import { InvestorSignupCinema } from "@/components/investor/InvestorSignupCinema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  syncStage1ToFirestore,
} from "@/services/onboardingFirestoreService";
import { sanitizeExtractedCnic } from "@/lib/kycOcrService";
import {
  clearLocalOnboardingSession,
} from "@/lib/onboardingResume";

type InvestorOnboardingProps = {
  resume?: boolean;
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

export function InvestorOnboarding({ onBack, resume = false }: InvestorOnboardingProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { registerInvestor, setIsLoggedIn } = useAppState();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<InvestorFormData>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [stepError, setStepError] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);
  const [mailDelivery, setMailDelivery] = useState<"accepted" | "pending">("pending");
  const [mailError, setMailError] = useState("");
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    clearLocalOnboardingSession();
  }, []);

  useEffect(() => {
    if (!resume || !currentUser?.uid) return;
    let cancelled = false;
    void (async () => {
      try {
        await currentUser.reload();
        if (cancelled) return;
        const email = currentUser.email || "";
        setFormData((previous) => ({ ...previous, email }));
        if (!currentUser.emailVerified) {
          setAwaitingEmailVerification(true);
          return;
        }
        await syncStage1ToFirestore({
          uid: currentUser.uid, email, role: "investor", emailVerified: true,
        });
        if (!cancelled) setAlreadyVerified(true);
      } catch (error) {
        if (!cancelled) setStepError(friendlyIdentityError(error));
      }
    })();
    return () => { cancelled = true; };
  }, [resume, currentUser?.uid]);

  const setField = <K extends keyof InvestorFormData>(field: K, value: InvestorFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value ?? ("" as InvestorFormData[K]) }));
  };

  const handlePasswordChange = (value: string) => {
    setField("password", value);
    setPasswordHint(getPasswordError(value));
    if (stepError) setStepError("");
  };

  const handleEmailVerified = () => {
    setAwaitingEmailVerification(false);
    setStep(3);
  };

  const validateStage1 = (): boolean => {
    if (!formData.fullName.trim()) {
      setStepError("Please enter your full name.");
      return false;
    }
    if (!formData.email.trim() || !formData.password) {
      setStepError("Please fill in Contact Email and Password.");
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

  const validateStage2 = (): string => {
    const cnic = sanitizeExtractedCnic(formData.cnic);
    if (!cnic) return "Valid CNIC number is required (XXXXX-XXXXXXX-X).";
    if (!formData.bankName.trim()) return "Please select a bank name.";
    if (!formData.accountTitleName.trim()) return "Account Title Name is required.";
    if (!formData.accountNumber.trim() || formData.accountNumber.trim().length < 8) {
      return "Enter a valid Account Number / IBAN.";
    }
    if (!formData.phone.trim()) return "Phone number is required.";
    if (!formData.fullName.trim()) return "Full name from Stage 1 is missing.";
    return "";
  };

  const handleCreateAccountAndSendVerification = async () => {
    if (!validateStage1()) return;

    setIsCreatingAccount(true);
    setStepError("");
    setMailError("");
    setAlreadyVerified(false);
    try {
      const user = await createEmailPasswordAndSendVerification({
        role: "investor",
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      if (user.emailVerified && await reloadAndCheckEmailVerified(formData.email, "investor")) {
        setAlreadyVerified(true);
        return;
      }
      setMailDelivery("accepted");
      setAwaitingEmailVerification(true);
    } catch (err: unknown) {
      if (err instanceof VerificationDeliveryError) {
        setMailDelivery("pending");
        setMailError(err.message);
        setAwaitingEmailVerification(true);
        return;
      }
      setStepError(friendlyIdentityError(err));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const enterDashboard = (status: InvestorKycStatus) => {
    const user = auth.currentUser;
    if (!user || status.stage !== 3 || !status.livenessPassed) return;
    registerInvestor({
      name: status.fullName,
      email: user.email || "",
      phone: formData.phone.trim(),
      password: "",
      categories: ["General"],
      entityType: "Normal Person",
      location: "Pakistan",
    });
    setIsLoggedIn(true);
    navigate({ to: "/app/investor" });
  };

  const handleSaveFinancialDetails = async () => {
    const error = validateStage2();
    if (error) { setStepError(error); return; }
    const user = auth.currentUser;
    if (!user) { setStepError("Sign in again to save banking details."); return; }
    setSavingDetails(true);
    setStepError("");
    try {
      await backendRequest(user, "/api/kyc/investor-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: formData.bankName.trim(),
          accountTitle: formData.accountTitleName.trim() || formData.fullName,
          accountNumber: formData.accountNumber.trim(),
          phone: formData.phone.trim(),
        }),
      });
      setStep(3);
    } catch (error) {
      setStepError(friendlyIdentityError(error));
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <InvestorSignupCinema>
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-8">
        <div className="mb-8 flex items-center justify-between border-b border-white/20 pb-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                Investor Desk Onboarding
              </p>
              <h2 className="font-display text-lg font-bold text-white">
                {step === 1 && "1. Credentials & Authentication"}
                {step === 2 && "Optional banking details"}
                {step === 3 && "Investor identity verification"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
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

        {step === 1 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6">
              <h3 className="font-display text-xl font-bold">1. Personal & Account Credentials</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your full name, email, and password — then verify your email before continuing.
              </p>
            </div>

            {alreadyVerified ? (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <h3 className="font-semibold">Email already verified</h3>
                <p>Firebase confirmed {formData.email} was previously verified.</p>
                <Button type="button" onClick={handleEmailVerified}>Continue to CNIC</Button>
              </div>
            ) : awaitingEmailVerification ? (
              <EmailVerificationGate role="investor"
                email={formData.email.trim()}
                onVerified={handleEmailVerified}
                delivery={mailDelivery}
                deliveryError={mailError}
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
                    type="text"
                    name="fullName"
                    placeholder="Enter your full name"
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
                    placeholder="Enter your email address"
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
                      placeholder="Create your secure password"
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
                    className="w-full bg-foreground text-background hover:opacity-90 font-bold"
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

        {step === 2 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-amber-600" />
                  Optional banking details Details
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter CNIC, banking specs, and phone details after identity verification.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(3)} className="rounded-full">
                Back
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-cnic" className="flex items-center gap-1">
                  <IdCard className="h-3.5 w-3.5 text-muted-foreground" /> CNIC Number{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inv-cnic"
                  type="text"
                  name="cnicNumber"
                  value={formData.cnic || ""}
                  placeholder="e.g. 34102-9612657-9"
                  readOnly
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

              {stepError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {stepError}
                </p>
              ) : null}

              <div className="pt-4 border-t border-border">
                <Button
                  onClick={() => void handleSaveFinancialDetails()}
                  disabled={savingDetails}
                  className="w-full bg-foreground text-background hover:opacity-90 font-bold"
                >
                  {savingDetails ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </span>
                  ) : (
                    <>Save banking details <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <InvestorKycVerification
            onDashboard={enterDashboard}
            onProfileDetails={(status) => {
              setFormData((form) => ({
                ...form,
                fullName: status.fullName || form.fullName,
                cnic: status.cnicNumber || form.cnic,
              }));
              setStepError("");
              setStep(2);
            }}
          />
        )}
      </div>
    </InvestorSignupCinema>
  );
}
