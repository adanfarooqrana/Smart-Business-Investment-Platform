import type { LucideIcon } from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";

export type GrowthStep = {
  icon: LucideIcon;
  title: string;
  body: string;
};

type LandingGrowthOrbitProps = {
  steps: GrowthStep[];
  activeIndex: number;
  onSelectStep: (index: number) => void;
};

export function LandingGrowthOrbit({ steps, activeIndex, onSelectStep }: LandingGrowthOrbitProps) {
  const stats = usePlatformStats();
  const slice = 360 / steps.length;

  return (
    <div className="relative mx-auto flex h-[340px] w-[340px] items-center justify-center">
      <div className="landing-growth-orbit-glow pointer-events-none absolute inset-6 rounded-full bg-amber-400/10 blur-3xl" />

      {/* Static guide rings */}
      <div className="pointer-events-none absolute inset-4 rounded-full border border-amber-200/40" />
      <div className="pointer-events-none absolute inset-10 rounded-full border border-dashed border-amber-300/35" />

      {/* Revolving orbit ring */}
      <div className="landing-growth-orbit-ring absolute inset-0">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const active = i === activeIndex;
          return (
            <button
              key={step.title}
              type="button"
              onClick={() => onSelectStep(i)}
              className="landing-growth-orbit-node absolute left-1/2 top-1/2"
              style={{ ["--node-angle" as string]: `${i * slice - 90}deg` }}
            >
              <div className="landing-growth-orbit-icon-wrap">
                <div
                  className={`landing-growth-orbit-icon flex h-14 w-14 items-center justify-center rounded-2xl border-2 bg-white shadow-lg transition-all duration-500 ${
                    active
                      ? "border-amber-400 scale-110 landing-growth-orbit-icon-active"
                      : "border-slate-200/90 opacity-80 hover:opacity-100"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${active ? "text-amber-600" : "text-slate-400"}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Center hub — live data */}
      <div className="relative z-10 flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full border-2 border-amber-200 bg-white shadow-xl">
        <span className="text-3xl font-black tabular-nums text-amber-600">{stats.totalMembers}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Live Members</span>
        <span className="mt-1 text-[8px] font-semibold text-emerald-600">Syncing live</span>
      </div>
    </div>
  );
}
