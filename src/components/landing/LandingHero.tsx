import { CheckCircle2 } from "lucide-react";
import { HeroGrowthDashboard } from "@/components/landing/HeroGrowthDashboard";
import { HeroLaunchLink } from "@/components/landing/HeroLaunchLink";
import { ROTATING_PHRASES, useTypewriter } from "@/components/landing/landingUtils";

export function LandingHero() {
  const typewritten = useTypewriter(ROTATING_PHRASES);

  return (
    <section className="my-3 w-full bg-[#f5f5f5] px-4">
      <div className="mx-auto flex min-h-[520px] max-w-7xl items-center rounded-[2.5rem] border border-slate-200/90 bg-white px-6 py-10 shadow-sm md:px-12 md:py-14">
        <div className="grid w-full grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="w-full space-y-4">
            <h1 className="font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-900 md:text-5xl">
              Work with the world&apos;s best in{" "}
              <span className="relative inline-block">
                <span className="text-amber-500">{typewritten}</span>
                <span className="ml-0.5 inline-block h-8 w-0.5 align-middle bg-amber-500 animate-pulse md:h-9" />
              </span>
            </h1>

            <ul className="space-y-2">
              {[
                "Business Manage in one dashboard",
                "Business Receive Funding",
                "Investors",
                "Wholesalers",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-sm leading-relaxed text-slate-600">{item}</span>
                </li>
              ))}
            </ul>

            <HeroLaunchLink
              to="/app/register"
              launchLabel="Starting your business"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-7 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800"
            >
              Start your business now
            </HeroLaunchLink>
          </div>

          <div className="relative flex w-full items-center justify-center">
            <HeroGrowthDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}
