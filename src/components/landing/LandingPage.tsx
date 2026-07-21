import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Boxes,
  Globe,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { LandingCommunityPreview } from "@/components/landing/LandingCommunityPreview";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingGrowthOrbit } from "@/components/landing/LandingGrowthOrbit";
import { LandingGuestAIConsultant } from "@/components/landing/LandingGuestAIConsultant";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { CountUp } from "@/components/landing/landingUtils";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { formatBusinessCount, formatFundingPkr } from "@/services/platformStatsService";

const GROWTH_STEPS = [
  {
    icon: Briefcase,
    title: "Register Business",
    body: "Register your business and get manage all business in one dashboard — profile, tools, and growth in a single place.",
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
    q: "How do we create a Business Owner account?",
    a: "Go to Register, choose Business Owner, verify your email, complete your business profile and CNIC KYC, then submit for admin approval. Once approved, your dashboard and storefront tools unlock.",
  },
  {
    q: "How do we create an Investor account?",
    a: "Select Investor during registration, verify email, fill your investor profile and KYC details, then wait for admin verification. After approval you can browse founder pitches and deploy capital with escrow protection.",
  },
  {
    q: "How do we create a Founder account?",
    a: "Choose Founder / Entrepreneur at signup, verify email, complete your founder profile and identity checks, then submit for review. Approved founders can pitch ideas to the investor feed and track funding progress.",
  },
  {
    q: "How do we create a Wholesaler account?",
    a: "Register as Wholesaler, verify your email, add supplier profile details and KYC documents, then get admin approval. After that you can list catalogs, receive packaging requests, and fulfil bulk orders.",
  },
  {
    q: "How can I get consultancy to grow my business?",
    a: "Use the Guest AI Consultant on this page for instant growth guidance, or register as a Business Owner to unlock the full AI Growth Desk with category-aware marketing blueprints and weekly recommendations.",
  },
];

/** Symmetric floating white section card on #f5f5f5 canvas */
function LandingSection({
  id,
  children,
  cardClassName = "",
}: {
  id?: string;
  children: ReactNode;
  cardClassName?: string;
}) {
  return (
    <section id={id} className="my-2 w-full bg-[#f5f5f5] px-4 md:my-3">
      <div
        className={`mx-auto max-w-7xl rounded-[2.5rem] border border-slate-200/90 bg-white px-6 py-6 shadow-sm md:px-10 md:py-8 ${cardClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

export function LandingPage() {
  const platformStats = usePlatformStats();
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
    <div className="min-h-screen bg-[#f5f5f5]">
      <SiteHeader />

      <main className="mx-auto flex w-full flex-col items-center bg-[#f5f5f5] pb-2 md:pb-3">
        <LandingHero />

        <LandingSection>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
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
              },
              {
                value: <CountUp target={platformStats.investors} suffix="+" />,
                label: "Investors",
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
              },
              {
                value: <CountUp target={platformStats.wholesalers} suffix="+" />,
                label: "Verified Wholesalers",
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl font-extrabold text-amber-500 md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </LandingSection>

        <LandingSection id="how">
          <div className="mx-auto mb-4 max-w-3xl space-y-2 text-center">
            <h2 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
              Rank, Match, and Scale Your Business in One Continuous Orbit
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600">
              Every system feeds the next automatically. Complete our interactive steps to compile reputation scores,
              trigger industry advisory, and connect directly to capital.
            </p>
          </div>

          <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
            <div className="flex h-full flex-col gap-4">
              <div className="flex flex-1 flex-col justify-center space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-6">
                <h3 className="font-display flex items-center gap-2.5 text-2xl font-extrabold text-slate-900">
                  <ActiveStepIcon className="h-6 w-6 shrink-0 text-amber-500" />
                  {GROWTH_STEPS[activeStep].title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  {GROWTH_STEPS[activeStep].body}
                </p>
                <Link
                  to="/app/register"
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800"
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
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      i === activeStep
                        ? "bg-amber-500 text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300"
                    }`}
                  >
                    {i + 1}. {step.title.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <LandingGrowthOrbit
                steps={GROWTH_STEPS}
                activeIndex={activeStep}
                onSelectStep={setActiveStep}
              />
            </div>
          </div>
        </LandingSection>

        <LandingGuestAIConsultant />

        <LandingSection id="wholesale" cardClassName="!py-12 md:!py-16">
          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-6">
              <h3 className="mb-4 text-2xl font-bold text-slate-900">Verified Wholesaler Network</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Wholesalers", val: platformStats.wholesalers },
                  { label: "Bulk orders", val: platformStats.sampleOrders },
                  { label: "Packaging ideas", val: platformStats.packagingPosts },
                  { label: "Community posts", val: platformStats.communityPosts },
                ].map((item) => (
                  <div key={item.label} className="text-center sm:text-left">
                    <p className="text-lg font-extrabold text-slate-900">{item.val}</p>
                    <p className="text-[10px] font-semibold uppercase text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 py-2">
              <h2 className="font-display text-3xl font-extrabold text-slate-900 md:text-4xl">
                Source products and win bulk orders at scale
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                List your catalog, receive packaging requests, and fulfil orders from verified businesses across
                Pakistan.
              </p>
              <Link
                to="/app/register"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                Find Wholesaler now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </LandingSection>

        <LandingCommunityPreview />

        <LandingFAQ items={FAQ_ITEMS} />

        <LandingSection cardClassName="!bg-amber-50">
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <Globe className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="font-display text-3xl font-extrabold text-slate-900">
              Ready to grow with Smart Business AI?
            </h2>
            <p className="text-sm text-slate-600">
              Join {platformStats.totalMembers.toLocaleString()}+ members building, investing, and scaling together.
            </p>
            <Link
              to="/app/register"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </LandingSection>
      </main>
    </div>
  );
}
