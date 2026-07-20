import { CheckCircle2 } from "lucide-react";
import { HeroGrowthDashboard } from "@/components/landing/HeroGrowthDashboard";
import { HeroLaunchLink } from "@/components/landing/HeroLaunchLink";
import { ROTATING_PHRASES, useTypewriter } from "@/components/landing/landingUtils";

export function LandingHero() {
  const typewritten = useTypewriter(ROTATING_PHRASES);

  return (
    <section className="relative overflow-hidden border-b border-slate-100 bg-white w-full">
      <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-amber-400/8 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-56 w-56 rounded-full bg-orange-400/6 blur-3xl" />

      <div className="mx-auto max-w-[1600px] w-[95%] pt-2 pb-12 md:pt-4 md:pb-14">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center justify-between w-full">
          <div className="space-y-8 w-full lg:max-w-[46%]">
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
                Work with the world&apos;s best in{" "}
                <span className="relative inline-block">
                  <span className="text-amber-500">{typewritten}</span>
                  <span className="ml-0.5 inline-block h-9 w-0.5 align-middle bg-amber-500 animate-pulse" />
                </span>
              </h1>
            </div>

            <ul className="space-y-4">
              {[
                "Generate your brief and receive custom strategies – for free",
                "Browse real-world business growth and template designs",
                "Match with top-rated AI consultants and verified investors",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-200">
                    <CheckCircle2 className="h-3 w-3 text-amber-600" />
                  </span>
                  <span className="text-sm text-slate-600 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            <HeroLaunchLink
              to="/app/register"
              launchLabel="Starting your business"
              className="hero-cta-glow inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-slate-800 hover:-translate-y-0.5 shadow-xl shadow-slate-900/20"
            >
              Start your business now
            </HeroLaunchLink>
          </div>

          <div className="relative flex w-full items-center justify-center lg:max-w-[50%]">
            <HeroGrowthDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}
