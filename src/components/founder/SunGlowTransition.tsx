import { useEffect, useState } from "react";

type Props = {
  active: boolean;
  onComplete: () => void;
  label?: string;
};

const SUN_LOGO = "/images/investbiz-logo.webp";

export function SunGlowTransition({ active, onComplete, label = "Loading..." }: Props) {
  const [phase, setPhase] = useState<"idle" | "glow" | "burst" | "done">("idle");

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    setPhase("glow");
    const t1 = setTimeout(() => setPhase("burst"), 900);
    const t2 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, onComplete]);

  if (!active || phase === "idle" || phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(circle at center, rgba(255,215,0,0.25) 0%, rgba(26,26,46,0.98) 70%)" }}
    >
      {/* Light rays */}
      <div className="pointer-events-none absolute inset-0 animate-pulse"
        style={{
          background: "conic-gradient(from 0deg, transparent, rgba(255,215,0,0.15), transparent, rgba(255,165,0,0.12), transparent)",
        }}
      />
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[120vh] w-1 origin-bottom -translate-x-1/2"
          style={{
            background: "linear-gradient(to top, rgba(255,215,0,0.4), transparent)",
            transform: `translateX(-50%) rotate(${i * 30}deg)`,
            opacity: phase === "burst" ? 0.8 : 0.4,
            transition: "opacity 0.6s",
          }}
        />
      ))}

      <div className="relative flex flex-col items-center">
        <div
          className={`relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-700 sm:h-40 sm:w-40 ${
            phase === "burst" ? "scale-150 opacity-0" : "scale-100 opacity-100"
          }`}
          style={{
            boxShadow: "0 0 60px rgba(255,215,0,0.8), 0 0 120px rgba(255,165,0,0.5), 0 0 200px rgba(255,215,0,0.3)",
          }}
        >
          <img
            src={SUN_LOGO}
            alt="InvestBiz"
            className="h-full w-full animate-pulse object-contain drop-shadow-[0_0_30px_rgba(255,215,0,0.9)]"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              el.parentElement!.style.background = "linear-gradient(135deg, #FFD700, #FFA500)";
            }}
          />
        </div>
        <p className="mt-6 animate-pulse font-display text-lg font-bold text-[#FFD700] drop-shadow-lg">
          {label}
        </p>
      </div>
    </div>
  );
}
