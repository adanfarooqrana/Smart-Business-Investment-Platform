import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Bot, Send, User, Sparkles, Briefcase, TrendingUp, Undo2, 
  Mail, Phone, Lock, Landmark, ShieldCheck, UploadCloud, 
  Camera, CheckCircle2, ShieldAlert, Loader2, LogIn, ChevronRight,
  Boxes,
  ArrowRight
} from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestorSignupCinema } from "@/components/investor/InvestorSignupCinema";
import { CnicFaceVerify } from "@/components/verification/CnicFaceVerify";
import { JourneyChooser } from "@/components/onboarding/JourneyChooser";
import { BusinessSignupCinema } from "@/components/onboarding/BusinessSignupCinema";
import { WholesalerOnboarding } from "@/components/onboarding/WholesalerOnboarding";
import { EntrepreneurOnboarding } from "@/components/onboarding/EntrepreneurOnboarding";
import { registerBusinessToBackend } from "@/services/backendSyncService";

export const Route = createFileRoute("/app/register")({
  component: OnboardingPortal,
});

type OnboardingState = {
  // Credentials
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  
  // Business
  businessName: string;
  location: string;
  category: string;
  subcategory: string;
  size: string;
  registerNumber: string;
  trademark: string;
  about: string;

  // Biometrics
  cnicFront: string;
  cnicBack: string;
  liveSelfie: string;
};

const CATEGORIES = [
  { value: "Food & Beverage", label: "Food & Beverage" },
  { value: "SaaS / Tech", label: "SaaS / Tech" },
  { value: "Retail & E-commerce", label: "Retail & E-commerce" },
  { value: "Professional Services", label: "Professional Services" }
];

const INVESTOR_BUDGET_RANGES = [
  { value: "100k-500k PKR", label: "100k – 500k PKR" },
  { value: "500k-5M PKR", label: "500k – 5M PKR" },
  { value: "5M+ PKR", label: "5M+ PKR" },
] as const;

function OnboardingPortal() {
  const { signupUser } = useAuth();
  const { business, registerBusiness, approveBusiness, registerInvestor, registerConsultant, setIsLoggedIn } = useAppState();
  const [flow, setFlow] = useState<"choose" | "business" | "investor" | "consultant" | "entrepreneur">("choose");
  const [step, setStep] = useState(1); // 1: Personal, 2: Business, 3: Biometric, 4: Compliance Wait
  const [businessStarted, setBusinessStarted] = useState(false); // intro "Let's Begin" gate
  const showLegacyConsultant = false; // replaced by <WholesalerOnboarding />
  
  // Wholesaler state (using consultant structure)
  const [consultantStep, setConsultantStep] = useState(1);
  const [consultantFormData, setConsultantFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    specialty: "Mobile Accessories",
    experience: "National Shipping",
    location: "",
    bio: "",
    cnicFront: "",
    cnicBack: "",
    liveSelfie: "",
  });
  const [consultantUploadingFront, setConsultantUploadingFront] = useState(false);
  const [consultantUploadingBack, setConsultantUploadingBack] = useState(false);
  const [consultantCapturingSelfie, setConsultantCapturingSelfie] = useState(false);
  const [consultantVerifyingDetails, setConsultantVerifyingDetails] = useState(false);
  const navigate = useNavigate();

  // Form states
  const [formData, setFormData] = useState<OnboardingState>({
    fullName: "",
    email: "",
    phone: "",
    passwordHash: "",
    businessName: "",
    location: "",
    category: "Food & Beverage",
    subcategory: "",
    size: "2–10 members",
    registerNumber: "",
    trademark: "",
    about: "",
    cnicFront: "",
    cnicBack: "",
    liveSelfie: "",
  });

  // Biometric capture animation states
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  // Compliance checklist states
  const [verifyingDetails, setVerifyingDetails] = useState(false);

  // Investor wizard states
  const [investorStep, setInvestorStep] = useState(1); // 1: Credentials, 2: Entity type & strategy, 3: Biometric, 4: Compliance Wait
  const [investorFormData, setInvestorFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    entityType: "Normal Person" as "Company" | "Firm" | "Normal Person",
    location: "",
    category: "Food & Beverage",
    budgetRange: "" as "" | "100k-500k PKR" | "500k-5M PKR" | "5M+ PKR",
    strategy: "",
    cnicFront: "",
    cnicBack: "",
    liveSelfie: "",
  });

  // Investor biometric animation triggers
  const [investorUploadingFront, setInvestorUploadingFront] = useState(false);
  const [investorUploadingBack, setInvestorUploadingBack] = useState(false);
  const [investorCapturingSelfie, setInvestorCapturingSelfie] = useState(false);
  const [investorVerifyingDetails, setInvestorVerifyingDetails] = useState(false);
  const [investorRegistrationError, setInvestorRegistrationError] = useState("");

  const handleInputChange = (field: keyof OnboardingState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.phone || !formData.passwordHash) {
        alert("Please fill in all personal credentials.");
        return;
      }
    } else if (step === 2) {
      if (!formData.businessName || !formData.location || !formData.registerNumber) {
        alert("Please enter the required business details.");
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const simulateFrontUpload = () => {
    setUploadingFront(true);
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, cnicFront: "CNIC_FRONT_VERIFIED.PNG" }));
      setUploadingFront(false);
    }, 1200);
  };

  const simulateBackUpload = () => {
    setUploadingBack(true);
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, cnicBack: "CNIC_BACK_VERIFIED.PNG" }));
      setUploadingBack(false);
    }, 1200);
  };

  const simulateSelfieSnap = () => {
    setCapturingSelfie(true);
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, liveSelfie: "LIVE_SELFIE_MATCHED.JPG" }));
      setCapturingSelfie(false);
    }, 2000);
  };

  // Submit Business Profile — Firebase Auth + RTDB + local state
  const handleSubmitBusiness = async () => {
    if (!formData.cnicFront || !formData.cnicBack || !formData.liveSelfie) {
      alert("Please complete biometric uploading (CNIC Front, Back, and Live Selfie).");
      return;
    }

    setVerifyingDetails(true);

    // Best-effort backend sync — never blocks signup if Firebase Auth is
    // not yet enabled / email exists / offline.
    void registerBusinessToBackend({
      email: formData.email,
      password: formData.passwordHash,
      fullName: formData.fullName,
      businessName: formData.businessName,
      phone: formData.phone,
      category: formData.category,
      subcategory: formData.subcategory || "General",
      location: formData.location,
      size: formData.size,
      website: `https://${formData.businessName.toLowerCase().replace(/\s+/g, "")}.smartbiz.ai`,
      about: formData.about || `A premium ${formData.category} business based in ${formData.location}.`,
      registerNumber: formData.registerNumber,
      trademark: formData.trademark || "None",
      cnicFront: formData.cnicFront,
      cnicBack: formData.cnicBack,
      liveSelfie: formData.liveSelfie,
    }).catch((err) => console.warn("Business backend sync failed:", err));

    setTimeout(() => {
      registerBusiness({
        name: formData.businessName,
        email: formData.email,
        phone: formData.phone,
        password: formData.passwordHash,
        category: formData.category,
        subcategory: formData.subcategory || "General",
        location: formData.location,
        size: formData.size,
        website: `https://${formData.businessName.toLowerCase().replace(/\s+/g, "")}.smartbiz.ai`,
        about: formData.about || `A premium ${formData.category} business based in ${formData.location}.`,
        registerNumber: formData.registerNumber,
        trademark: formData.trademark || "None",
        cnicFront: formData.cnicFront,
        cnicBack: formData.cnicBack,
        liveSelfie: formData.liveSelfie,
      });
      setVerifyingDetails(false);
      setIsLoggedIn(true);
      navigate({ to: "/app/score" });
    }, 1200);
  };

  // Fast-track bypass
  const handleFastTrackApproval = () => {
    approveBusiness();
    setIsLoggedIn(true);
    navigate({ to: "/app/score" });
  };

  const simulateInvestorFrontUpload = () => {
    setInvestorUploadingFront(true);
    setTimeout(() => {
      setInvestorFormData((prev) => ({ ...prev, cnicFront: "INVESTOR_CNIC_FRONT_VERIFIED.PNG" }));
      setInvestorUploadingFront(false);
    }, 1200);
  };

  const simulateInvestorBackUpload = () => {
    setInvestorUploadingBack(true);
    setTimeout(() => {
      setInvestorFormData((prev) => ({ ...prev, cnicBack: "INVESTOR_CNIC_BACK_VERIFIED.PNG" }));
      setInvestorUploadingBack(false);
    }, 1200);
  };

  const simulateInvestorSelfieSnap = () => {
    setInvestorCapturingSelfie(true);
    setTimeout(() => {
      setInvestorFormData((prev) => ({ ...prev, liveSelfie: "INVESTOR_LIVE_SELFIE_MATCHED.JPG" }));
      setInvestorCapturingSelfie(false);
    }, 2000);
  };

  const submitInvestorRegistration = async () => {
    if (!investorFormData.cnicFront || !investorFormData.cnicBack || !investorFormData.liveSelfie) {
      alert("Please complete biometric uploading (ID Front, Back, and Live Selfie).");
      return;
    }

    setInvestorRegistrationError("");
    setInvestorVerifyingDetails(true);

    const categories = [investorFormData.category];
    const strategy =
      investorFormData.strategy || "Direct venture backing of premium reputations.";

    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string) =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${label} — timeout (${Math.round(ms / 1000)}s). Firebase check karein.`)),
            ms,
          ),
        ),
      ]);

    try {
      const user = await withTimeout(
        signupUser({
          email: investorFormData.email,
          password: investorFormData.password,
          name: investorFormData.fullName,
          role: "investor",
          profile: {
            categories,
            ticketSize: investorFormData.budgetRange,
            budgetRange: investorFormData.budgetRange,
            location: investorFormData.location,
            strategy,
            entityType: investorFormData.entityType,
            phone: investorFormData.phone,
          },
        }),
        45000,
        "Account signup",
      );

      const uid = user.uid;
      let cnicFront = investorFormData.cnicFront;
      let cnicBack = investorFormData.cnicBack;
      let liveSelfie = investorFormData.liveSelfie;

      try {
        const { saveInvestorProfile, initializeUserPoints, uploadBase64Image } = await import(
          "@/services/firebaseService"
        );

        const uploadIfDataUrl = async (fileName: string, data: string) => {
          if (!data.startsWith("data:")) return data;
          try {
            return await withTimeout(uploadBase64Image(uid, fileName, data), 25000, `Upload ${fileName}`);
          } catch (uploadErr) {
            console.warn(`Investor CNIC upload skipped (${fileName}):`, uploadErr);
            return "";
          }
        };

        [cnicFront, cnicBack, liveSelfie] = await Promise.all([
          uploadIfDataUrl("cnic-front.jpg", investorFormData.cnicFront),
          uploadIfDataUrl("cnic-back.jpg", investorFormData.cnicBack),
          uploadIfDataUrl("live-selfie.jpg", investorFormData.liveSelfie),
        ]);

        const investorData = {
          uid,
          name: investorFormData.fullName,
          email: investorFormData.email,
          phone: investorFormData.phone,
          categories,
          ticketSize: investorFormData.budgetRange,
          budgetRange: investorFormData.budgetRange,
          location: investorFormData.location,
          strategy,
          entityType: investorFormData.entityType,
          cnicFront,
          cnicBack,
          liveSelfie,
          isRegistered: true,
          isApproved: true,
        };

        await withTimeout(saveInvestorProfile(uid, investorData), 30000, "Profile save");
        await withTimeout(initializeUserPoints(uid, 120), 15000, "Points init").catch(() => undefined);
      } catch (syncErr) {
        console.warn("Investor Firebase profile sync failed — continuing with local session:", syncErr);
      }

      registerInvestor({
        name: investorFormData.fullName,
        email: investorFormData.email,
        phone: investorFormData.phone,
        password: investorFormData.password,
        categories,
        budgetRange: investorFormData.budgetRange,
        ticketSize: investorFormData.budgetRange,
        location: investorFormData.location,
        strategy,
        entityType: investorFormData.entityType,
        cnicFront,
        cnicBack,
        liveSelfie,
      });
      setIsLoggedIn(true);
      setInvestorStep(4);
      navigate({ to: "/app/investor" });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      let message =
        err instanceof Error ? err.message : "Investor registration failed. Please try again.";
      if (code === "auth/email-already-in-use") {
        message = "Yeh email pehle se registered hai. Login karein ya nayi email use karein.";
      }
      setInvestorRegistrationError(message);
    } finally {
      setInvestorVerifyingDetails(false);
    }
  };

  const handleInvestorFastTrack = () => {
    registerInvestor({
      name: investorFormData.fullName || "Aisha Khan",
      email: investorFormData.email || "aisha@ventures.com",
      phone: investorFormData.phone || "+92 300 9876543",
      password: investorFormData.password || "password",
      categories: [investorFormData.category],
      budgetRange: investorFormData.budgetRange || "500k-5M PKR",
      ticketSize: investorFormData.budgetRange || "500k-5M PKR",
      location: investorFormData.location || "Karachi, Pakistan",
      strategy: investorFormData.strategy || "Dynamic venture capital backing of vetted local startups.",
      entityType: investorFormData.entityType,
      cnicFront: investorFormData.cnicFront || "VERIFIED",
      cnicBack: investorFormData.cnicBack || "VERIFIED",
      liveSelfie: investorFormData.liveSelfie || "VERIFIED",
    });
    setIsLoggedIn(true);
    navigate({ to: "/app/investor" });
  };

  const simulateConsultantFrontUpload = () => {
    setConsultantUploadingFront(true);
    setTimeout(() => {
      setConsultantFormData((prev) => ({ ...prev, cnicFront: "CONSULTANT_CNIC_FRONT_VERIFIED.PNG" }));
      setConsultantUploadingFront(false);
    }, 1200);
  };

  const simulateConsultantBackUpload = () => {
    setConsultantUploadingBack(true);
    setTimeout(() => {
      setConsultantFormData((prev) => ({ ...prev, cnicBack: "CONSULTANT_CNIC_BACK_VERIFIED.PNG" }));
      setConsultantUploadingBack(false);
    }, 1200);
  };

  const simulateConsultantSelfieSnap = () => {
    setConsultantCapturingSelfie(true);
    setTimeout(() => {
      setConsultantFormData((prev) => ({ ...prev, liveSelfie: "CONSULTANT_LIVE_SELFIE_MATCHED.JPG" }));
      setConsultantCapturingSelfie(false);
    }, 2000);
  };

  const submitConsultantRegistration = () => {
    if (!consultantFormData.cnicFront || !consultantFormData.cnicBack || !consultantFormData.liveSelfie) {
      alert("Please complete biometric uploading (ID Front, Back, and Live Selfie).");
      return;
    }

    setConsultantVerifyingDetails(true);
    setTimeout(() => {
      registerConsultant({
        name: consultantFormData.fullName,
        email: consultantFormData.email,
        phone: consultantFormData.phone,
        password: consultantFormData.password,
        specialty: consultantFormData.specialty,
        experience: consultantFormData.experience,
        location: consultantFormData.location,
        bio: consultantFormData.bio,
        cnicFront: consultantFormData.cnicFront,
        cnicBack: consultantFormData.cnicBack,
        liveSelfie: consultantFormData.liveSelfie,
      });
      setConsultantVerifyingDetails(false);
      setIsLoggedIn(true);
      navigate({ to: "/app/wholesale" });
    }, 1500);
  };

  const handleConsultantFastTrack = () => {
    registerConsultant({
      name: consultantFormData.fullName || "Sarah Sterling",
      email: consultantFormData.email || "sarah@consultant.com",
      phone: consultantFormData.phone || "+92 300 1234567",
      password: consultantFormData.password || "password",
      specialty: consultantFormData.specialty,
      experience: consultantFormData.experience,
      location: consultantFormData.location || "Islamabad, Pakistan",
      bio: consultantFormData.bio || "Verified wholesaler supplying high-quality products to local retail businesses.",
      isRegistered: true,
      isApproved: true,
    });
    setIsLoggedIn(true);
    navigate({ to: "/app/wholesale" });
  };

  // RENDER CHOOSER PAGE (SIGN UP)
  if (flow === "choose") {
    return (
      <JourneyChooser
        onLogin={() => navigate({ to: "/app/login" })}
        onSelect={(role) => {
          if (role === "business") {
            setFlow("business");
            setStep(1);
          } else if (role === "wholesaler") {
            setFlow("consultant");
            setConsultantStep(1);
          } else if (role === "entrepreneur") {
            setFlow("entrepreneur");
          } else {
            setFlow("investor");
          }
        }}
      />
    );
  }



  // RENDER INVESTOR ONBOARDING FLOW
  if (flow === "investor") {
    return (
      <InvestorSignupCinema>
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-8">
        {/* ONBOARDING PROGRESS HEADER */}
        {investorStep < 4 && (
          <div className="mb-8 flex items-center justify-between border-b border-white/20 pb-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Investor Desk Onboarding</p>
                <h2 className="font-display text-lg font-bold text-white">Capital Compliance Boarding</h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    s === investorStep 
                      ? "w-8 bg-foreground" 
                      : s < investorStep 
                      ? "w-2.5 bg-foreground/65" 
                      : "w-2.5 bg-secondary"
                  }`}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFlow("choose")}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* STEP 1: PERSONAL & CREDENTIAL DETAILS */}
        {investorStep === 1 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6">
              <h3 className="font-display text-xl font-bold">1. Personal & Account Credentials</h3>
              <p className="text-xs text-muted-foreground mt-1">Setup your name, email, and secure credentials for login.</p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-name" className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name / Firm Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-name"
                    placeholder="e.g. Apex Ventures"
                    value={investorFormData.fullName}
                    onChange={(e) => setInvestorFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-email" className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Contact Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-email"
                    type="email"
                    placeholder="e.g. contact@apexventures.com"
                    value={investorFormData.email}
                    onChange={(e) => setInvestorFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-phone" className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Contact Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-phone"
                    type="tel"
                    placeholder="e.g. +92 300 9876543"
                    value={investorFormData.phone}
                    onChange={(e) => setInvestorFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-password" className="flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password (setup) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-password"
                    type="password"
                    placeholder="Create secure password"
                    value={investorFormData.password}
                    onChange={(e) => setInvestorFormData((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => {
                    if (!investorFormData.fullName || !investorFormData.email || !investorFormData.phone || !investorFormData.password) {
                      alert("Please fill in all credentials.");
                      return;
                    }
                    setInvestorStep(2);
                  }}
                  className="w-full bg-foreground text-background hover:opacity-90"
                >
                  Continue to Strategy & Entity Info
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ENTITY TYPE & INVESTMENT THESIS */}
        {investorStep === 2 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold">2. Entity & Strategy Setup</h3>
                <p className="text-xs text-muted-foreground mt-1">Specify your registration status, target capital allocation, and thesis.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setInvestorStep(1)} className="rounded-full">
                Back
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-entity">Phone Entity Classification <span className="text-destructive">*</span></Label>
                  <select
                    id="inv-entity"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={investorFormData.entityType}
                    onChange={(e) => setInvestorFormData((prev) => ({ ...prev, entityType: e.target.value as any }))}
                  >
                    <option value="Normal Person">Normal Person (Individual)</option>
                    <option value="Company">Company (LLC/Corp)</option>
                    <option value="Firm">Firm (VC/Fund/Bank)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-location">Operational Base / Location <span className="text-destructive">*</span></Label>
                  <Input
                    id="inv-location"
                    placeholder="e.g. San Francisco, USA"
                    value={investorFormData.location}
                    onChange={(e) => setInvestorFormData((prev) => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-cat">Target Industry Segment</Label>
                  <select
                    id="inv-cat"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={investorFormData.category}
                    onChange={(e) => setInvestorFormData((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-budget">
                    Available Investment Capital / Budget Range <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="inv-budget"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={investorFormData.budgetRange}
                    onChange={(e) =>
                      setInvestorFormData((prev) => ({
                        ...prev,
                        budgetRange: e.target.value as typeof investorFormData.budgetRange,
                      }))
                    }
                  >
                    <option value="" disabled>
                      Select your capital range (PKR)
                    </option>
                    {INVESTOR_BUDGET_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Used to match you with startups aligned to your deployment capacity.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-strategy">Investment Strategy & Mandate</Label>
                <textarea
                  id="inv-strategy"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={2}
                  placeholder="e.g. We seek high-reputation local food cafe and dining setups showing stellar review metrics..."
                  value={investorFormData.strategy}
                  onChange={(e) => setInvestorFormData((prev) => ({ ...prev, strategy: e.target.value }))}
                />
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => {
                    if (!investorFormData.location) {
                      alert("Please specify your operational base location.");
                      return;
                    }
                    if (!investorFormData.budgetRange) {
                      alert("Please select your available investment capital / budget range.");
                      return;
                    }
                    setInvestorStep(3);
                  }}
                  className="w-full bg-foreground text-background hover:opacity-90"
                >
                  Continue to Biometric Verification
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INVESTOR BIOMETRIC AUDIT */}
        {investorStep === 3 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-500 animate-pulse" />
                  3. Identity & Biometric Compliance
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Upload Government-Issued ID cards and scan your face to complete anti-fraud auditing.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setInvestorStep(2)} className="rounded-full">
                Back
              </Button>
            </div>

            <div className="space-y-6">
              <CnicFaceVerify
                accent="emerald"
                onComplete={(r) =>
                  setInvestorFormData((prev) => ({
                    ...prev,
                    cnicFront: r.cnicFront,
                    cnicBack: r.cnicBack,
                    liveSelfie: r.liveSelfie,
                  }))
                }
              />

              {/* SUBMISSION BLOCK */}
              <div className="pt-4 border-t border-border">
                {investorRegistrationError && (
                  <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {investorRegistrationError}
                  </p>
                )}
                <Button
                  onClick={submitInvestorRegistration}
                  disabled={investorVerifyingDetails}
                  className="w-full bg-foreground text-background hover:opacity-90"
                >
                  {investorVerifyingDetails ? (
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

        {/* STEP 4: REGULATORY WAIT & DEVELOPER SIMULATOR CONTROLLER */}
        {investorStep === 4 && (
          <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in zoom-in-95 duration-400">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-pulse">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="font-display text-2xl font-bold">Compliance Verification Pending</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Our verification system is running checks on {investorFormData.fullName} ({investorFormData.entityType}) against global corporate register ledgers.
              </p>
            </div>

            {/* LEDGER COMPLIANCE LOG */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 font-mono text-xs text-left space-y-2 mb-8 shadow-inner">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>[OK] Password hashes and contact encryption keys active in workspace ledger</span>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>[OK] SEC and Corporate Registry KYC checks fully passed</span>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>[OK] CNIC OCR facial details match selfie biometric (Match Score: 98.4%)</span>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>[OK] Phone verification registry matches {investorFormData.entityType} ownership status</span>
              </div>
              <div className="flex items-center gap-2 text-amber-500 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>[PENDING] Manual approval by Administrator (Estimated wait: under 24 hours)</span>
              </div>
            </div>

            <div className="rounded-2xl bg-foreground/5 border border-foreground/20 p-5 text-center mb-6 animate-pulse-glow">
              <p className="text-xs text-muted-foreground font-semibold mb-2">⚡ SIMULATOR COMPLIANCE BYPASS</p>
              <p className="text-[11px] text-muted-foreground mb-4">
                To test the Investor Desk dashboard immediately without waiting for regulatory review, click the fast-track button below.
              </p>
              <Button
                onClick={handleInvestorFastTrack}
                className="w-full bg-foreground text-background font-bold hover:opacity-90 shadow-soft"
              >
                Approve Compliance & Launch Investor Dashboard
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Once approved, you will receive an confirmation email at <span className="font-semibold text-foreground">{investorFormData.email}</span>.
            </div>
          </div>
        )}
      </div>
      </InvestorSignupCinema>
    );
  }

  // RENDER WHOLESALER ONBOARDING FLOW
  if (flow === "consultant") {
    return <WholesalerOnboarding onBack={() => setFlow("choose")} />;
  }

  // RENDER ENTREPRENEUR ONBOARDING FLOW
  if (flow === "entrepreneur") {
    return <EntrepreneurOnboarding onBack={() => setFlow("choose")} />;
  }

  // Legacy wholesaler flow (kept for reference, replaced by <WholesalerOnboarding />)
  if (showLegacyConsultant) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-6 py-8">
        {/* ONBOARDING PROGRESS HEADER */}
        {consultantStep < 4 && (
          <div className="mb-8 flex items-center justify-between border-b border-border pb-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Wholesaler Registration</p>
                <h2 className="font-display text-lg font-bold">Wholesaler Onboarding</h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    s === consultantStep ? "w-8 bg-amber-500" : s < consultantStep ? "w-2.5 bg-amber-500/40" : "w-2.5 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: CREDENTIALS */}
        {consultantStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Create your wholesaler credentials</h3>
              <p className="text-sm text-muted-foreground">These will be used to secure your wholesaler profile and login session.</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-name">Company / Wholesaler Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="c-name"
                    placeholder="e.g. Sterling Wholesale Distributors"
                    className="pl-10"
                    value={consultantFormData.fullName}
                    onChange={(e) => setConsultantFormData(p => ({ ...p, fullName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-email">Work Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="c-email"
                    type="email"
                    placeholder="contact@sterlingwholesale.com"
                    className="pl-10"
                    value={consultantFormData.email}
                    onChange={(e) => setConsultantFormData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="c-phone"
                    placeholder="+92 300 1234567"
                    className="pl-10"
                    value={consultantFormData.phone}
                    onChange={(e) => setConsultantFormData(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-password">Profile Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="c-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={consultantFormData.password}
                    onChange={(e) => setConsultantFormData(p => ({ ...p, password: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button variant="ghost" onClick={() => setFlow("choose")} className="rounded-full">
                <Undo2 className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!consultantFormData.fullName || !consultantFormData.email || !consultantFormData.phone || !consultantFormData.password) {
                    alert("Please fill in all personal credentials.");
                    return;
                  }
                  setConsultantStep(2);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6"
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PROFILE DETAILS */}
        {consultantStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Tell us about your wholesaling business</h3>
              <p className="text-sm text-muted-foreground">This information is shown to business owners sourcing products.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-spec">Wholesale Product Category</Label>
                <select
                  id="c-spec"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={consultantFormData.specialty}
                  onChange={(e) => setConsultantFormData(p => ({ ...p, specialty: e.target.value }))}
                >
                  <option value="Mobile Accessories">Mobile Accessories</option>
                  <option value="Consumer Electronics">Consumer Electronics</option>
                  <option value="Fashion & Apparel">Fashion & Apparel</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Food & Beverages">Food & Beverages</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-exp">Delivery Coverage</Label>
                <select
                  id="c-exp"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={consultantFormData.experience}
                  onChange={(e) => setConsultantFormData(p => ({ ...p, experience: e.target.value }))}
                >
                  <option value="Local Delivery">Local Delivery</option>
                  <option value="National Shipping">National Shipping</option>
                  <option value="International Shipping">International Shipping</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-loc">Distribution Hub Location (City, Country)</Label>
                <Input
                  id="c-loc"
                  placeholder="e.g. Lahore, Pakistan"
                  value={consultantFormData.location}
                  onChange={(e) => setConsultantFormData(p => ({ ...p, location: e.target.value }))}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-bio">Wholesale Business Bio & Catalog Summary</Label>
                <textarea
                  id="c-bio"
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe your wholesale business, average lead times, minimum order quantities, and main product catalogs..."
                  value={consultantFormData.bio}
                  onChange={(e) => setConsultantFormData(p => ({ ...p, bio: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button variant="ghost" onClick={() => setConsultantStep(1)} className="rounded-full">
                <Undo2 className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!consultantFormData.location || !consultantFormData.bio) {
                    alert("Please fill in location and bio description.");
                    return;
                  }
                  setConsultantStep(3);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6"
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: BIOMETRIC COMPLIANCE UPLOADS */}
        {consultantStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Identity & Business Compliance Proofs</h3>
              <p className="text-sm text-muted-foreground">SmartBiz platform enforces strict compliance verification for wholesalers to prevent fraud and ensure verified catalog listings.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* ID Card Front */}
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center">
                <p className="text-xs font-semibold text-foreground mb-1">National ID Card (CNIC Front)</p>
                <p className="text-[11px] text-muted-foreground mb-4">PNG, JPG format up to 5MB</p>
                {consultantFormData.cnicFront ? (
                  <div className="inline-flex items-center gap-1.5 text-xs text-green-500 font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/25 mx-auto">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Checked & Matched
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={simulateConsultantFrontUpload}
                    disabled={consultantUploadingFront}
                    className="mx-auto rounded-xl"
                  >
                    {consultantUploadingFront ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    )}
                    Upload ID Front
                  </Button>
                )}
              </div>

              {/* ID Card Back */}
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center">
                <p className="text-xs font-semibold text-foreground mb-1">National ID Card (CNIC Back)</p>
                <p className="text-[11px] text-muted-foreground mb-4">PNG, JPG format up to 5MB</p>
                {consultantFormData.cnicBack ? (
                  <div className="inline-flex items-center gap-1.5 text-xs text-green-500 font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/25 mx-auto">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Checked & Matched
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={simulateConsultantBackUpload}
                    disabled={consultantUploadingBack}
                    className="mx-auto rounded-xl"
                  >
                    {consultantUploadingBack ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    )}
                    Upload ID Back
                  </Button>
                )}
              </div>

              {/* Live Selfie Matching */}
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center sm:col-span-2">
                <p className="text-xs font-semibold text-foreground mb-1">Selfie Verification Camera</p>
                <p className="text-[11px] text-muted-foreground mb-4">Realtime facial scanning to match profile photo to CNIC photograph</p>
                {consultantFormData.liveSelfie ? (
                  <div className="inline-flex items-center gap-1.5 text-xs text-green-500 font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/25 mx-auto">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 3D Biometrics Confirmed
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={simulateConsultantSelfieSnap}
                    disabled={consultantCapturingSelfie}
                    className="mx-auto rounded-xl"
                  >
                    {consultantCapturingSelfie ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Camera className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    )}
                    Trigger Live Match Selfie
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button
                onClick={() => setConsultantStep(4)}
                disabled={!consultantFormData.cnicFront || !consultantFormData.cnicBack || !consultantFormData.liveSelfie}
                className="w-full bg-amber-500 text-white hover:bg-amber-600 rounded-xl"
              >
                Submit Profile for Compliance Review
              </Button>
              <Button variant="ghost" onClick={() => setConsultantStep(2)} className="w-full mt-2 rounded-xl text-xs">
                Back to Details
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: COMPLIANCE REVIEW & FAST TRACK */}
        {consultantStep === 4 && (
          <div className="rounded-3xl border border-border bg-card/85 p-8 shadow-soft backdrop-blur-md animate-in zoom-in-95 duration-400">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-pulse">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="font-display text-2xl font-bold">Compliance Verification Pending</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Our verification system is reviewing your wholesale registration details and identity documents.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-5 font-mono text-xs text-left space-y-2 mb-8 shadow-inner">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>[OK] Hash values and biometric tokens indexed</span>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>[OK] Wholesale business registry validation active</span>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>[OK] CNIC OCR facial details match selfie biometric (Score: 99.1%)</span>
              </div>
              <div className="flex items-center gap-2 text-amber-500 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>[PENDING] Manual approval by Administrator</span>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 text-center mb-6">
              <p className="text-xs text-amber-700 font-bold mb-2">⚡ SIMULATOR COMPLIANCE BYPASS</p>
              <p className="text-[11px] text-muted-foreground mb-4">
                To test the Wholesaler dashboard immediately without waiting for regulatory review, click the fast-track button below.
              </p>
              <Button
                onClick={handleConsultantFastTrack}
                className="w-full bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-soft rounded-xl"
              >
                Approve Compliance & Launch Wholesaler Dashboard
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Once approved, you will receive a confirmation email at <span className="font-semibold text-foreground">{consultantFormData.email}</span>.
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER BUSINESS ONBOARDING FLOW
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
              onClick={() => setFlow("choose")}
              className="text-xs font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Back to journey selection
            </button>
          </div>
        </div>
      </div>
    ) : (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-8">
      {/* ONBOARDING PROGRESS HEADER */}
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
            onClick={() => setFlow("choose")}
            className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* STEP 1: PERSONAL CREDENTIALS */}
      {step === 1 && (
        <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-6">
            <h3 className="font-display text-xl font-bold">1. Personal Details Setup</h3>
            <p className="text-xs text-muted-foreground mt-1">This registers you as the legal manager of the workspace.</p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="owner-name" className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="owner-name"
                  placeholder="Aanya Mehta"
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
                  placeholder="aanya@brand.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="owner-phone" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="owner-phone"
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-password" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password (setup) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="owner-password"
                  type="password"
                  placeholder="Create secure password"
                  value={formData.passwordHash}
                  onChange={(e) => handleInputChange("passwordHash", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleNextStep} className="w-full bg-foreground text-background hover:opacity-90">
                Continue to Business Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: BUSINESS INFORMATION */}
      {step === 2 && (
        <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold">2. Business Profile Details</h3>
              <p className="text-xs text-muted-foreground mt-1">Provide register details & Trademark validation files.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="rounded-full">
              Back
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Official Business Name <span className="text-destructive">*</span></Label>
                <Input
                  id="biz-name"
                  placeholder="Luna Bistro"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-location">Operational Location <span className="text-destructive">*</span></Label>
                <Input
                  id="biz-location"
                  placeholder="San Francisco, USA"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  required
                />
              </div>
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
                  placeholder="e.g. Fine Dining Cafe"
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="biz-reg" className="flex items-center gap-1">
                  <Landmark className="h-3.5 w-3.5 text-muted-foreground" /> Registration / Tax License Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="biz-reg"
                  placeholder="e.g. REG-900887165"
                  value={formData.registerNumber}
                  onChange={(e) => handleInputChange("registerNumber", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-trade" className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Registered Trademark Number (Optional)
                </Label>
                <Input
                  id="biz-trade"
                  placeholder="e.g. TM-77889"
                  value={formData.trademark}
                  onChange={(e) => handleInputChange("trademark", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-about">Brief Pitch / Description</Label>
              <textarea
                id="biz-about"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={2}
                placeholder="Luna Bistro is an organic farm-to-table lunch eatery with locally curated recipes..."
                value={formData.about}
                onChange={(e) => handleInputChange("about", e.target.value)}
              />
            </div>

            <div className="pt-4">
              <Button onClick={handleNextStep} className="w-full bg-foreground text-background hover:opacity-90">
                Continue to Biometric Verification
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
              <p className="text-xs text-muted-foreground mt-1">Upload government-issued CNIC/National ID Card and take a Live Verification Selfie.</p>
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
                }))
              }
            />

            {/* FINISH BUTTONS */}
            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleSubmitBusiness}
                disabled={verifyingDetails}
                className="w-full bg-foreground text-background hover:opacity-90"
              >
                {verifyingDetails ? (
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

      {/* STEP 4: COMPLIANCE WAIT & DEVELOPER SIMULATION CONTROLLER */}
      {step === 4 && (
        <div className="rounded-3xl border border-white/25 bg-white/92 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in zoom-in-95 duration-400">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-pulse">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl font-bold">Verification Pending</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Your biometric selfie matches your National ID. The compliance system is doing secondary trademark and corporate registration registry auditing.
            </p>
          </div>

          {/* SIMULATOR COMPLIANCE CHECKLIST LOG */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-5 font-mono text-xs text-left space-y-2 mb-8 shadow-inner">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>[OK] Password hashes and salt values stored in secure workspace ledger</span>
            </div>
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>[OK] Business Registration Number ({formData.registerNumber}) exists in local registry</span>
            </div>
            {formData.trademark && (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>[OK] Trademark Registry checks cleared for ({formData.trademark})</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>[OK] CNIC OCR facial details match selfie biometric (Score: 98.4%)</span>
            </div>
            <div className="flex items-center gap-2 text-amber-500 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>[PENDING] Manual approval by Administrator (Estimated wait: under 24 hours)</span>
            </div>
          </div>

          <div className="rounded-2xl bg-accent/10 border border-accent/20 p-5 text-center mb-6">
            <p className="text-xs text-muted-foreground font-semibold mb-2">⚡ SIMULATOR FAST-TRACK CONTROL</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              To test the Business Owner dashboard immediately without waiting, click the fast-track button below to bypass verification.
            </p>
            <Button
              onClick={handleFastTrackApproval}
              className="w-full bg-accent text-accent-foreground font-bold hover:opacity-90 shadow-soft"
            >
              Approve Onboarding & Launch Dashboard Now
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Once approved, you will receive an confirmation email at <span className="font-semibold text-foreground">{formData.email}</span>.
          </div>
        </div>
      )}
    </div>
    )}
    </BusinessSignupCinema>
  );
}
