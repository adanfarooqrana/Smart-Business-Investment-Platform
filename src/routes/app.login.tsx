import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  Lock,
  LogIn,
  Loader2,
  Lightbulb,
  Briefcase,
  TrendingUp,
  Boxes,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState, repairAppState } from "@/hooks/useAppState";
import { getUserRole } from "@/services/firebaseService";
import { hydrateEntrepreneurFromRtdb } from "@/hooks/useFounderSession";
import { hydrateInvestorFromRtdb } from "@/hooks/useInvestorSession";
import { hydrateBusinessFromRtdb } from "@/hooks/useBusinessSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/login")({
  component: LoginPage,
});

const ROLE_CARDS = [
  { id: "entrepreneur", label: "Founder", icon: Lightbulb, color: "from-amber-400 to-orange-500" },
  { id: "business", label: "Business Owner", icon: Briefcase, color: "from-slate-700 to-slate-900" },
  { id: "investor", label: "Investor", icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
  { id: "consultant", label: "Wholesaler", icon: Boxes, color: "from-violet-500 to-purple-600" },
] as const;

function friendlyAuthError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Incorrect email or password. Please try again.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Check your internet connection and try again.";
  }
  if (err instanceof Error) return err.message;
  return "Login failed. Please try again.";
}

function LoginPage() {
  const navigate = useNavigate();
  const { login, refreshUserData } = useAuth();
  const {
    setRole,
    setIsLoggedIn,
    registerEntrepreneur,
    registerInvestor,
    registerBusiness,
    registerConsultant,
    entrepreneur,
    investor,
    business,
    consultant,
  } = useAppState();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tryLocalLogin = (loginEmail: string, loginPassword: string): boolean => {
    repairAppState();
    const e = loginEmail.trim().toLowerCase();
    const p = loginPassword;

    if (entrepreneur?.isRegistered && entrepreneur?.email?.toLowerCase() === e && entrepreneur?.password === p) {
      registerEntrepreneur({ ...entrepreneur, email: entrepreneur.email, password: p });
      navigate({ to: "/founder/dashboard" });
      return true;
    }
    if (investor?.isRegistered && investor?.email?.toLowerCase() === e && investor?.password === p) {
      registerInvestor({ ...investor, email: investor.email, password: p });
      navigate({ to: "/app/investor" });
      return true;
    }
    if (business?.isRegistered && business?.email?.toLowerCase() === e && business?.password === p) {
      registerBusiness({ ...business, email: business.email, password: p });
      navigate({ to: "/app/score" });
      return true;
    }
    if (consultant?.isRegistered && consultant?.email?.toLowerCase() === e && consultant?.password === p) {
      registerConsultant({ ...consultant, email: consultant.email, password: p });
      navigate({ to: "/app/wholesale" });
      return true;
    }
    return false;
  };

  const routeAfterFirebaseLogin = async (
    uid: string,
    loginEmail: string,
    loginPassword: string,
    displayName?: string,
  ) => {
    repairAppState();
    const userData = await refreshUserData(uid);
    let role = userData?.role ?? (await getUserRole(uid));

    if (!role) {
      const { getEntrepreneurProfile } = await import("@/services/entrepreneurService");
      const founderProfile = await getEntrepreneurProfile(uid).catch(() => null);
      if (founderProfile) role = "entrepreneur";
    }

    const fallback = {
      email: loginEmail,
      password: loginPassword,
      name: displayName ?? userData?.name ?? loginEmail.split("@")[0],
    };

    if (role === "entrepreneur") {
      await hydrateEntrepreneurFromRtdb(uid, registerEntrepreneur, fallback);
      setRole("entrepreneur");
      setIsLoggedIn(true);
      navigate({ to: "/founder/dashboard" });
      return;
    }

    if (role === "investor") {
      await hydrateInvestorFromRtdb(uid, registerInvestor, fallback);
      setRole("investor");
      setIsLoggedIn(true);
      navigate({ to: "/app/investor" });
      return;
    }

    if (role === "business_owner" || role === "business") {
      await hydrateBusinessFromRtdb(uid, registerBusiness, fallback);
      setRole("business");
      setIsLoggedIn(true);
      navigate({ to: "/app/score" });
      return;
    }

    if (role === "wholesaler") {
      const { getConsultantProfile } = await import("@/services/firebaseService");
      const profile = await getConsultantProfile(uid).catch(() => null);
      if (profile) {
        registerConsultant({
          name: String(profile.name ?? fallback.name),
          email: String(profile.email ?? fallback.email),
          phone: String(profile.phone ?? ""),
          password: loginPassword,
          specialty: String(profile.specialty ?? "Mobile Accessories"),
          experience: String(profile.experience ?? "National Shipping"),
          location: String(profile.location ?? ""),
          bio: String(profile.bio ?? ""),
          isRegistered: true,
          isApproved: true,
        });
      } else {
        registerConsultant({
          name: fallback.name,
          email: fallback.email,
          password: loginPassword,
          phone: "",
          specialty: "Mobile Accessories",
          experience: "National Shipping",
          location: "",
          bio: "",
          isRegistered: true,
          isApproved: true,
        });
      }
      setRole("consultant");
      setIsLoggedIn(true);
      navigate({ to: "/app/wholesale" });
      return;
    }

    await hydrateEntrepreneurFromRtdb(uid, registerEntrepreneur, fallback);
    setRole("entrepreneur");
    setIsLoggedIn(true);
    navigate({ to: "/founder/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    repairAppState();

    const loginEmail = email.trim();
    const loginPassword = password;

    if (!loginEmail || !loginPassword) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const cred = await login(loginEmail, loginPassword);
      await routeAfterFirebaseLogin(cred.uid, loginEmail, loginPassword, cred.displayName ?? undefined);
    } catch (firebaseErr) {
      if (tryLocalLogin(loginEmail, loginPassword)) return;
      setError(friendlyAuthError(firebaseErr));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/40">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 20%, rgba(255,215,0,0.25) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(255,165,0,0.15) 0%, transparent 50%)",
        }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 py-12 lg:flex-row lg:items-start lg:justify-between lg:py-16">
        <div className="max-w-md text-center lg:text-left">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
            SmartBiz Grow Login
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Open your dashboard
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Sign in as a founder, business owner, investor, or wholesaler. Your profile loads
            automatically from your Firebase account.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {ROLE_CARDS.map(({ id, label, icon: Icon, color }) => (
              <div
                key={id}
                className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-md`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
              >
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Sign In</h2>
                <p className="text-xs text-slate-500">Use your registered email</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="flex items-center gap-1.5 text-slate-700">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  disabled={loading}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="flex items-center gap-1.5 text-slate-700">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> Password
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    disabled={loading}
                    className="h-11 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl text-base font-bold text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #1e293b, #334155)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link to="/app/register" className="font-semibold text-amber-700 hover:text-amber-800 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
