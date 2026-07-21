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
      <div className="landing-growth-orbit-glow pointer-events-none absolute inset-6 rounded-full bg-amber-400/15 blur-3xl" />

      {/* Static guide rings */}
      <div className="pointer-events-none absolute inset-4 rounded-full border border-slate-200" />
      <div className="pointer-events-none absolute inset-10 rounded-full border border-dashed border-slate-200" />

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
                  className={`landing-growth-orbit-icon flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500 ${
                    active
                      ? "scale-110 border-2 border-amber-400 bg-white text-amber-500 shadow-md landing-growth-orbit-icon-active"
                      : "border border-slate-200 bg-slate-50 text-slate-600 opacity-90 hover:opacity-100"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${active ? "text-amber-500" : "text-slate-600"}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Center hub — live data */}
      <div className="relative z-10 flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full border border-slate-100 bg-white shadow-md">
        <span className="text-3xl font-extrabold tabular-nums text-slate-900">{stats.totalMembers}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Live Members</span>
        <span className="mt-1 text-[8px] font-medium text-amber-500">Syncing live</span>
      </div>
    </div>
  );
}
