import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export type OrbitLaunchTransitionProps = {
  accent?: string;
  label?: string;
  icon?: LucideIcon;
};

export function OrbitLaunchTransition({
  accent = "#f59e0b",
  label = "Opening...",
  icon: Icon = Sparkles,
}: OrbitLaunchTransitionProps) {
  return (
    <div
      className="journey-orbit-overlay fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ ["--orbit-accent" as string]: accent }}
    >
      <div className="journey-orbit-stage">
        <div className="journey-orbit-hoop journey-orbit-hoop-1" />
        <div className="journey-orbit-hoop journey-orbit-hoop-2" />
        <div className="journey-orbit-hoop journey-orbit-hoop-3" />
        <div className="journey-orbit-dot journey-orbit-dot-1" />
        <div className="journey-orbit-dot journey-orbit-dot-2" />
        <div className="journey-orbit-core">
          <Icon className="h-7 w-7" style={{ color: accent }} strokeWidth={2} />
        </div>
      </div>
      <p className="journey-orbit-label">{label}</p>
    </div>
  );
}
