import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Gauge,
  Globe,
  Star,
  TrendingUp,
  Users,
  Sparkles,
  ExternalLink,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Bot,
  Boxes,
} from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveLandingPage, updateBusinessScore } from "@/services/firebaseService";

const LANDING_TEMPLATES = [
  { id: "cafe-modern", name: "Urban Cafe Modern", preview: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80" },
  { id: "bistro-gourmet", name: "Gourmet Bistro Dark", preview: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80" },
  { id: "saas-sleek", name: "SaaS Enterprise", preview: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&q=80" },
  { id: "retail-boutique", name: "Retail Boutique", preview: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80" },
];

function ScoreRing({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-slate-900">{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Score</span>
      </div>
    </div>
  );
}

export function BusinessScorePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { sessionReady, isBusinessRegistered } = useBusinessSession();
  const {
    business,
    weaknessFeedback,
    createLandingPage,
    updateBusinessProfile,
  } = useAppState();

  const [selectedTemplate, setSelectedTemplate] = useState(
    business.landingPageTemplate || "cafe-modern",
  );
  const [aboutText, setAboutText] = useState(
    business.landingPageAbout || business.about || "",
  );
  const [socials, setSocials] = useState(business.socialLinks ?? {
    instagram: "",
    facebook: "",
    twitter: "",
    linkedin: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedTemplate(business.landingPageTemplate || "cafe-modern");
    setAboutText(business.landingPageAbout || business.about || "");
    setSocials(business.socialLinks ?? { instagram: "", facebook: "", twitter: "", linkedin: "" });
  }, [business.landingPageTemplate, business.landingPageAbout, business.about, business.socialLinks]);

  const landingSlug = useMemo(
    () =>
      (business.name || "my-business")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "my-business",
    [business.name],
  );

  const avgRating = useMemo(() => {
    if (!business.reviews?.length) return 0;
    return business.reviews.reduce((s, r) => s + r.rating, 0) / business.reviews.length;
  }, [business.reviews]);

  const syncToFirebase = async (score: number) => {
    const uid = currentUser?.uid ?? business.uid;
    if (!uid) return;
    try {
      await updateBusinessScore(uid, score);
    } catch (err) {
      console.warn("Score sync skipped:", err);
    }
  };

  const handleGenerateLanding = async () => {
    setSaving(true);
    createLandingPage(selectedTemplate, aboutText);
    updateBusinessProfile({
      landingPageTemplate: selectedTemplate,
      landingPageAbout: aboutText,
      socialLinks: socials,
      website: `https://${landingSlug}.smartbiz.ai`,
    });

    const uid = currentUser?.uid ?? business.uid;
    if (uid) {
      try {
        await saveLandingPage(uid, selectedTemplate, aboutText);
        const score = business.score;
        await syncToFirebase(score);
      } catch (err) {
        console.warn("Landing save to Firebase:", err);
      }
    }
    setSaving(false);
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-amber-600 animate-pulse font-semibold">Loading Business Dashboard...</p>
      </div>
    );
  }

  if (!isBusinessRegistered) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Gauge className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-900">Business workspace required</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Register as a business owner to unlock reputation score, AI website, and growth tools.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/app/register" })}>
            Sign Up
          </Button>
          <Button onClick={() => navigate({ to: "/app/login" })}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-8">
        {/* Hero */}
        <div className="rounded-3xl border border-amber-200/60 bg-white p-6 md:p-8 shadow-xl shadow-amber-500/5">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <ScoreRing score={business.score} />
            <div className="flex-1 text-center lg:text-left space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                <Sparkles className="h-3.5 w-3.5" /> SmartBiz Reputation Engine
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                {business.name || "Your Business"}
              </h1>
              <p className="text-sm text-slate-500">
                {business.category}
                {business.location ? ` · ${business.location}` : ""}
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-1">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  {business.isApproved ? "Verified" : "Pending verification"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  Profile {business.profileCompletion}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Live Visitors", value: business.visitors, icon: Users, color: "text-blue-600" },
              { label: "Reviews", value: business.reviews?.length ?? 0, icon: Star, color: "text-amber-600" },
              { label: "Avg Rating", value: avgRating ? avgRating.toFixed(1) : "—", icon: TrendingUp, color: "text-emerald-600" },
              { label: "Active Deals", value: business.deals?.length ?? 0, icon: Gauge, color: "text-violet-600" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
                  <Icon className={`mx-auto mb-2 h-5 w-5 ${stat.color}`} />
                  <p className="text-xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { to: "/app/analytics", label: "Live Visitors & Reviews", icon: BarChart3 },
            { to: "/app/consultant", label: "AI Strategy Consultant", icon: Bot },
            { to: "/app/wholesale", label: "Wholesale Sourcing", icon: Boxes },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <Icon className="h-5 w-5 text-amber-500" />
                {item.label}
                <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
              </Link>
            );
          })}
        </div>

        {/* AI Website generator */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-500" /> AI Website Generate & Manage
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Template choose karein, about likhein — landing page turant live ho jati hai.
              </p>
            </div>
            {business.landingPageCreated && (
              <Link
                to="/landing/$slug"
                params={{ slug: landingSlug }}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-400"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Live page dekhein
              </Link>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LANDING_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tpl.id)}
                className={`overflow-hidden rounded-2xl border text-left transition-all ${
                  selectedTemplate === tpl.id
                    ? "border-amber-400 ring-2 ring-amber-400/40 shadow-lg"
                    : "border-slate-200 hover:border-amber-200"
                }`}
              >
                <img src={tpl.preview} alt={tpl.name} className="h-24 w-full object-cover" />
                <div className="p-3">
                  <p className="text-xs font-bold text-slate-800">{tpl.name}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="landing-about">Landing page about text</Label>
            <Textarea
              id="landing-about"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              rows={3}
              placeholder="Apni business ki story, quality, aur unique value likhein..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["instagram", Instagram, "Instagram URL"],
                ["facebook", Facebook, "Facebook URL"],
                ["twitter", Twitter, "Twitter / X URL"],
                ["linkedin", Linkedin, "LinkedIn URL"],
              ] as const
            ).map(([key, Icon, placeholder]) => (
              <div key={key} className="relative">
                <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={socials[key]}
                  onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="pl-10"
                />
              </div>
            ))}
          </div>

          <Button
            onClick={handleGenerateLanding}
            disabled={saving || !aboutText.trim()}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-white hover:from-amber-400 hover:to-orange-400"
          >
            {business.landingPageCreated ? "Update landing page" : "Generate landing page"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {business.landingPageCreated && (
            <p className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Landing page active — score boost applied
            </p>
          )}
        </div>

        {/* Reviews preview + weaknesses */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Recent Reviews</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(business.reviews ?? []).slice(0, 5).map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">&ldquo;{r.text}&rdquo;</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">— {r.name}</p>
                </div>
              ))}
              {!business.reviews?.length && (
                <p className="text-sm text-slate-400">Abhi koi review nahi. Landing page share karein!</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">AI Growth Signals</h3>
            <div className="space-y-3">
              {(weaknessFeedback ?? []).slice(0, 4).map((w) => (
                <div key={w.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-xs text-slate-600 leading-relaxed">{w.text}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{w.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
