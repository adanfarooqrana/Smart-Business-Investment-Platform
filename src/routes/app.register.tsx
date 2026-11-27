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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvestorOnboarding } from "@/components/investor/InvestorOnboarding";
import { CnicFaceVerify } from "@/components/verification/CnicFaceVerify";
import { JourneyChooser } from "@/components/onboarding/JourneyChooser";
import { BusinessSignupCinema } from "@/components/onboarding/BusinessSignupCinema";
import { WholesalerOnboarding } from "@/components/onboarding/WholesalerOnboarding";
import { EntrepreneurOnboarding } from "@/components/onboarding/EntrepreneurOnboarding";
import { registerBusinessToBackend } from "@/services/backendSyncService";
import { BusinessOwnerSignup } from "@/components/business/BusinessOwnerSignup";

export const Route = createFileRoute("/app/register")({
  component: OnboardingPortal,
  validateSearch: (search: Record<string, unknown>) => ({
    resume: search.resume === "business_owner" || search.resume === "entrepreneur" ||
      search.resume === "investor" || search.resume === "wholesaler" ? search.resume : undefined,
  }),
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
  exactLocation: string;
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

function OnboardingPortal() {
  const { business, registerBusiness, approveBusiness, registerConsultant, setIsLoggedIn } = useAppState();
  const { resume } = Route.useSearch();
  const [flow, setFlow] = useState<"choose" | "business" | "investor" | "consultant" | "entrepreneur">(
    resume === "business_owner" ? "business" : resume === "wholesaler" ? "consultant" : resume || "choose",
  );
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
  });

  // Biometric capture animation states
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  // Compliance checklist states
  const [verifyingDetails, setVerifyingDetails] = useState(false);

  const handleInputChange = (field: keyof OnboardingState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const [passwordHint, setPasswordHint] = useState("");

  // OTP verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState("");

  const handleSendOtp = () => {
    if (!formData.phone || formData.phone.length < 10) {
      setOtpError("Please enter a valid phone number.");
      return;
    }
    setOtpError("");
    setOtpSending(true);
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setOtpCode(code);
    setTimeout(() => {
      setOtpSending(false);
      setOtpSent(true);
      alert(`OTP sent! (Demo code: ${code})`);
    }, 1500);
  };

  const handleVerifyOtp = () => {
    if (otpInput === otpCode) {
      setOtpVerified(true);
      setOtpError("");
    } else {
      setOtpError("Invalid OTP. Please try again.");
    }
  };

  const getPasswordHint = (password: string): string => {
    if (!password) return "";
    if (password.length < 8) return "At least 8+ characters.";
    if (!/[a-zA-Z]/.test(password)) return "Must include alphabetic characters.";
    if (!/[0-9]/.test(password)) return "Must include numeric characters.";
    return "";
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.passwordHash) {
        alert("Please fill in all required fields.");
        return;
      }
      const hint = getPasswordHint(formData.passwordHash);
      if (hint) {
        setPasswordHint(hint);
        return;
      }
      setPasswordHint("");
    }
    setStep((prev) => prev + 1);
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
    return <InvestorOnboarding resume={resume === "investor"} onBack={() => setFlow("choose")} />;
  }

  // RENDER BUSINESS OWNER ONBOARDING FLOW
  if (flow === "business") {
    return <BusinessOwnerSignup resume={resume === "business_owner"} onBack={() => setFlow("choose")} />;
  }

  // RENDER WHOLESALER ONBOARDING FLOW
  if (flow === "consultant") {
    return <WholesalerOnboarding resume={resume === "wholesaler"} onBack={() => setFlow("choose")} />;
  }

  // RENDER ENTREPRENEUR ONBOARDING FLOW
  if (flow === "entrepreneur") {
    return <EntrepreneurOnboarding resume={resume === "entrepreneur"} onBack={() => setFlow("choose")} />;
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
              <p className="text-sm text-muted-foreground">InvestBiz platform enforces strict compliance verification for wholesalers to prevent fraud and ensure verified catalog listings.</p>
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
          </div>

          <div className="space-y-4">
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

            <div className="space-y-1.5">
              <Label htmlFor="owner-password" className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner-password"
                type="password"
                placeholder="Create secure password"
                value={formData.passwordHash}
                onChange={(e) => {
                  const val = e.target.value;
                  handleInputChange("passwordHash", val);
                  setPasswordHint(getPasswordHint(val));
                }}
                required
              />
              {passwordHint && (
                <p className="text-xs text-destructive mt-1">{passwordHint}</p>
              )}
            </div>

            <div className="pt-4">
              <Button onClick={handleNextStep} className="w-full bg-foreground text-background hover:opacity-90">
                Continue
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
                placeholder="e.g. Shop #12, 2nd Floor, Al-Rehman Plaza, Street 5, Block B"
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

            <div className="space-y-1.5">
              <Label htmlFor="biz-trade" className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Registered Trademark Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="biz-trade"
                placeholder="e.g. TM-77889"
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
                placeholder="Luna Bistro is an organic farm-to-table lunch eatery with locally curated recipes..."
                value={formData.about}
                onChange={(e) => handleInputChange("about", e.target.value)}
              />
            </div>

            {/* PHONE NUMBER + OTP VERIFICATION */}
            <div className="rounded-2xl border border-border bg-secondary/20 p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="biz-phone" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="biz-phone"
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={formData.phone}
                    onChange={(e) => {
                      handleInputChange("phone", e.target.value);
                      if (otpVerified) {
                        setOtpVerified(false);
                        setOtpSent(false);
                        setOtpInput("");
                        setOtpCode("");
                      }
                    }}
                    disabled={otpVerified}
                    required
                  />
                  {!otpVerified && (
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || !formData.phone}
                      className="shrink-0 bg-foreground text-background hover:opacity-90"
                    >
                      {otpSending ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Sending...
                        </span>
                      ) : otpSent ? "Resend OTP" : "Send OTP"}
                    </Button>
                  )}
                </div>
              </div>

              {otpSent && !otpVerified && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Label htmlFor="biz-otp" className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Enter OTP Code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="biz-otp"
                      type="text"
                      maxLength={4}
                      placeholder="Enter 4-digit OTP"
                      value={otpInput}
                      onChange={(e) => {
                        setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 4));
                        if (otpError) setOtpError("");
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpInput.length < 4}
                      className="shrink-0 bg-foreground text-background hover:opacity-90"
                    >
                      Verify
                    </Button>
                  </div>
                  {otpError && (
                    <p className="text-xs text-destructive">{otpError}</p>
                  )}
                </div>
              )}

              {otpVerified && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium animate-in fade-in duration-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Phone number verified successfully
                </div>
              )}
            </div>

            <div className="pt-4">
              <Button
                onClick={handleNextStep}
                disabled={!otpVerified}
                className="w-full bg-foreground text-background hover:opacity-90 disabled:opacity-50"
              >
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
