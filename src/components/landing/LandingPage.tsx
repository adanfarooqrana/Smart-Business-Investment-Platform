import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Boxes,
  Globe,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroVideo } from "@/components/HeroVideo";
import { LandingCommunityPreview } from "@/components/landing/LandingCommunityPreview";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingGrowthOrbit } from "@/components/landing/LandingGrowthOrbit";
import { LandingGuestAIConsultant } from "@/components/landing/LandingGuestAIConsultant";
import { LandingVerifiedReviews } from "@/components/landing/LandingVerifiedReviews";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { CountUp } from "@/components/landing/landingUtils";
import { useLandingTestimonials } from "@/hooks/useLandingTestimonials";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { formatBusinessCount, formatFundingPkr } from "@/services/platformStatsService";

const GROWTH_STEPS = [
  {
    icon: Briefcase,
    title: "Register & Verify",
    body: "Create your business profile, upload CNIC verification, and unlock your SmartBiz reputation score.",
  },
  {
    icon: Bot,
    title: "AI Growth Desk",
    body: "Receive category-aware AI consultancy, marketing blueprints, and weekly growth recommendations.",
  },
  {
    icon: TrendingUp,
    title: "Investor Matching",
    body: "Pitch to verified investors, track ROI, and deploy capital through protected escrow workflows.",
  },
  {
    icon: Boxes,
    title: "Wholesale Supply",
    body: "Connect with verified wholesalers, request packaging, and fulfil bulk orders from one dashboard.",
  },
  {
    icon: Users,
    title: "Community Scale",
    body: "Share strategies in the Community Lounge, gain votes, and grow visibility across the ecosystem.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Who can join Smart Business AI?",
    a: "Business owners, wholesalers, investors, and entrepreneurs can all register and get role-specific dashboards.",
  },
  {
    q: "Is my data connected to Firebase?",
    a: "Yes — profiles, community posts, stats, and investor feeds sync to Firebase Realtime Database in real time.",
  },
  {
    q: "How does investor matching work?",
    a: "Founders pitch ideas to the investor feed. Verified investors review vetted deals with escrow protection.",
  },
  {
    q: "Can I interact on the landing page?",
    a: "Community preview posts support live votes. Full lounge access is available after registration.",
  },
];

export function LandingPage() {
  const platformStats = usePlatformStats();
  const testimonialQuotes = useLandingTestimonials();
  const businessStat = formatBusinessCount(platformStats.businessOwners);
  const fundingStat = formatFundingPkr(platformStats.fundingDeployedPkr);

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % GROWTH_STEPS.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const ActiveStepIcon = GROWTH_STEPS[activeStep].icon;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main className="w-full mx-auto flex flex-col items-center bg-white">
        <LandingHero />

        {/* Live stats band */}
        <section className="relative overflow-hidden border-b border-slate-100 w-full">
          <HeroVideo />
          <div className="mx-auto w-[95%] max-w-[1600px] py-10 md:py-12 relative z-10">
            <div className="mx-auto flex flex-col sm:grid sm:grid-cols-2 md:flex md:flex-row gap-5 items-stretch justify-around rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-yellow-50/80 to-amber-100/50 p-8 shadow-xl shadow-amber-500/10 backdrop-blur-sm relative overflow-hidden w-full">
              <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl animate-pulse-glow" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-yellow-300/20 blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />

              {[
                {
                  value: (
                    <CountUp
                      target={businessStat.value}
                      suffix={businessStat.suffix}
                      decimals={businessStat.suffix.includes("k") ? 1 : 0}
                    />
                  ),
                  label: "Small Businesses Grown",
                  accent: "text-amber-600",
                },
                {
                  value: <CountUp target={platformStats.investors} suffix="+" />,
                  label: "Investors",
                  accent: "text-slate-900",
                },
                {
                  value: (
                    <CountUp
                      target={fundingStat.value}
                      prefix={fundingStat.prefix}
                      suffix={fundingStat.suffix}
                      decimals={1}
                    />
                  ),
                  label: "Funding",
                  accent: "text-slate-900",
                },
                {
                  value: <CountUp target={platformStats.wholesalers} suffix="+" />,
                  label: "Verified Wholesalers",
                  accent: "text-slate-900",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="relative text-center rounded-2xl bg-white border border-amber-200/40 py-5 px-3 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 w-full md:flex-1"
                >
                  <div className={`font-display text-3xl font-black md:text-4xl ${stat.accent}`}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700/60 mt-1.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-slate-100 bg-slate-50 relative overflow-hidden w-full">
          <div className="absolute right-0 top-1/4 h-[500px] w-[500px] rounded-full bg-amber-400/5 blur-3xl pointer-events-none" />
          <div className="mx-auto max-w-[1600px] w-[95%] py-12 md:py-14 relative">
            <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-4 py-1.5 text-xs font-bold text-amber-700">
                <Sparkles className="h-3.5 w-3.5" /> Growth Engine Visualization
              </p>
              <h2 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
                Rank, Match, and Scale Your Business in One Continuous Orbit
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
                Every system feeds the next automatically. Complete our interactive steps to compile reputation scores,
                trigger industry advisory, and connect directly to capital.
              </p>
            </div>

            <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] items-center">
              <div className="space-y-6">
                <div
                  className="rounded-3xl border border-white/20 p-8 shadow-2xl space-y-6 relative overflow-hidden"
                  style={{ backgroundColor: "#6B6C6E" }}
                >
                  <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-amber-400/15 to-transparent blur-xl pointer-events-none" />
                  <div className="space-y-3">
                    <h3 className="font-display text-2xl font-black text-white flex items-center gap-2.5">
                      <ActiveStepIcon className="h-6 w-6 text-amber-300 shrink-0 animate-pulse" />
                      {GROWTH_STEPS[activeStep].title}
                    </h3>
                    <p className="text-sm text-white font-medium leading-relaxed">
                      {GROWTH_STEPS[activeStep].body}
                    </p>
                  </div>
                  <Link
                    to="/app/register"
                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/40 hover:shadow-amber-400/50 hover:scale-[1.02]"
                  >
                    Start now <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  {GROWTH_STEPS.map((step, i) => (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => setActiveStep(i)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        i === activeStep
                          ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-amber-300"
                      }`}
                    >
                      {i + 1}. {step.title.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <LandingGrowthOrbit
                steps={GROWTH_STEPS}
                activeIndex={activeStep}
                onSelectStep={setActiveStep}
              />
            </div>
          </div>
        </section>

        <LandingGuestAIConsultant />

        {/* Wholesale */}
        <section id="wholesale" className="relative overflow-hidden border-b border-slate-100 bg-slate-950 w-full">
          <div className="tech-grid tech-grid-dark tech-grid-anim absolute inset-0 opacity-30 pointer-events-none" />
          <div className="mx-auto max-w-[1600px] w-[95%] py-12 md:py-14 relative z-10">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div className="rounded-3xl border border-amber-500/20 bg-slate-900/80 p-6 neon-pulse">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Supply chain live</p>
                <h3 className="text-2xl font-bold text-white mb-4">Verified Wholesaler Network</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Wholesalers", val: platformStats.wholesalers },
                    { label: "Bulk orders", val: platformStats.sampleOrders },
                    { label: "Packaging ideas", val: platformStats.packagingPosts },
                    { label: "Community posts", val: platformStats.communityPosts },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                      <p className="text-lg font-black text-amber-400">{item.val}</p>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-5">
                <p className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 text-xs font-bold text-amber-400">
                  <Boxes className="h-3.5 w-3.5" /> Wholesale Hub
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white">
                  Source products and win bulk orders at scale
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  List your catalog, receive packaging requests, and fulfil orders from verified businesses across Pakistan.
                </p>
                <Link
                  to="/app/register"
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400"
                >
                  Find Wholesaler now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <LandingVerifiedReviews quotes={testimonialQuotes} />

        <LandingCommunityPreview />

        <LandingFAQ items={FAQ_ITEMS} />

        {/* CTA footer */}
        <section className="w-full bg-slate-900 py-14">
          <div className="mx-auto max-w-3xl w-[95%] text-center space-y-6">
            <Globe className="h-10 w-10 text-amber-400 mx-auto" />
            <h2 className="font-display text-3xl font-extrabold text-white">Ready to grow with Smart Business AI?</h2>
            <p className="text-slate-400 text-sm">
              Join {platformStats.totalMembers.toLocaleString()}+ members building, investing, and scaling together.
            </p>
            <Link
              to="/app/register"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-8 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
