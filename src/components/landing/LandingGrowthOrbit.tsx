import { CircularOrbit } from "../../../frontend/src/components/GrowthOrbitShowcase.jsx";
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
  return <CircularOrbit steps={steps} activeIndex={activeIndex} onSelectStep={onSelectStep} totalMembers={stats.totalMembers} />;
}
