import { useEffect, useRef, useState } from "react";
import { Sun } from "lucide-react";

/** Drop your video at public/videos/investor-signup.mp4 */
export const INVESTOR_SIGNUP_VIDEO_SRC = "/videos/investor-signup.mp4";

type InvestorSignupCinemaProps = {
  children: React.ReactNode;
};

export function InvestorSignupCinema({ children }: InvestorSignupCinemaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOk, setVideoOk] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => setVideoOk(false));
  }, []);

  return (
    <div className="investor-signup-cinema relative min-h-screen w-full overflow-hidden">
      {/* Background video */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          videoOk ? "opacity-100" : "opacity-0"
        }`}
        src={INVESTOR_SIGNUP_VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVideoOk(true)}
        onLoadedData={() => setVideoOk(true)}
        onError={() => setVideoOk(false)}
      />

      {/* Fallback gradient when video missing */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-orange-700 via-amber-600 to-yellow-500 transition-opacity duration-700 ${
          videoOk ? "opacity-30" : "opacity-100"
        }`}
      />

      {/* Sun glow — center top */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="investor-signup-sun-glow absolute left-1/2 top-[8%] h-72 w-72 -translate-x-1/2 rounded-full sm:h-96 sm:w-96" />
        <div className="investor-signup-sun-core absolute left-1/2 top-[10%] flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-[0_0_80px_30px_rgba(251,191,36,0.45)] sm:h-24 sm:w-24">
          <Sun className="h-10 w-10 text-amber-950 investor-signup-sun-spin sm:h-12 sm:w-12" />
        </div>
        <div className="investor-sun-rays investor-sun-rays-lit absolute inset-0 opacity-40" />
      </div>

      {/* Money / PKR rising animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="investor-signup-paisa absolute font-black text-amber-200/90 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
            style={{
              left: `${4 + (i * 5.2) % 92}%`,
              bottom: "-5%",
              fontSize: i % 3 === 0 ? "14px" : i % 3 === 1 ? "11px" : "16px",
              animationDelay: `${i * 0.35}s`,
              animationDuration: `${2.2 + (i % 4) * 0.4}s`,
            }}
          >
            {i % 2 === 0 ? "₨" : "PKR"}
          </span>
        ))}
      </div>

      {/* Readability overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]" />

      {/* Form content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
