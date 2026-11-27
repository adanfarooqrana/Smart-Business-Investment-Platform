import { useEffect, useRef, useState, useMemo } from "react";
import { ThumbsUp, Heart, Users, Star, Store } from "lucide-react";

/** Drop your video at public/videos/business-signup.mp4 */
export const BUSINESS_SIGNUP_VIDEO_SRC = "/videos/business-signup.mp4";

const EMOJIS = ["👍", "❤️", "🔥", "⭐", "👏", "🙌", "💬", "😍"];
const FLOAT_ICONS = [ThumbsUp, Heart, Users, Star, Store];

type BusinessSignupCinemaProps = {
  children: React.ReactNode;
};

export function BusinessSignupCinema({ children }: BusinessSignupCinemaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOk, setVideoOk] = useState(false);

  const attemptPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play()
      .then(() => setVideoOk(true))
      .catch((err) => {
        console.warn("[BusinessSignupCinema] Autoplay attempt:", err);
      });
  };

  useEffect(() => {
    attemptPlay();
  }, []);

  const emojiTokens = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        left: `${4 + (i * 6.1) % 92}%`,
        delay: `${(i * 0.45) % 6}s`,
        dur: `${4 + (i % 4) * 0.8}s`,
        size: i % 3 === 0 ? "26px" : i % 3 === 1 ? "20px" : "32px",
        glyph: EMOJIS[i % EMOJIS.length],
      })),
    [],
  );

  const reactionBubbles = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        Icon: FLOAT_ICONS[i % FLOAT_ICONS.length],
        left: `${8 + (i * 13) % 84}%`,
        delay: `${(i * 0.8) % 5}s`,
        dur: `${5 + (i % 3)}s`,
      })),
    [],
  );

  return (
    <div className="business-signup-cinema relative min-h-screen w-full overflow-hidden">
      {/* Background video */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          videoOk ? "opacity-100" : "opacity-0"
        }`}
        src={BUSINESS_SIGNUP_VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={attemptPlay}
        onLoadedData={attemptPlay}
        onCanPlayThrough={attemptPlay}
        onError={() => setVideoOk(false)}
      />

      {/* Fallback gradient when video missing */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-slate-800 via-amber-700 to-orange-600 transition-opacity duration-700 ${
          videoOk ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Floating people / likes emojis */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {emojiTokens.map((e, i) => (
          <span
            key={`emoji-${i}`}
            className="business-emoji absolute select-none drop-shadow-lg"
            style={{
              left: e.left,
              bottom: "-8%",
              fontSize: e.size,
              animationDelay: e.delay,
              animationDuration: e.dur,
            }}
          >
            {e.glyph}
          </span>
        ))}

        {/* Reaction icon bubbles */}
        {reactionBubbles.map((b, i) => {
          const Icon = b.Icon;
          return (
            <span
              key={`bubble-${i}`}
              className="business-reaction absolute flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-amber-600 shadow-lg"
              style={{
                left: b.left,
                bottom: "-8%",
                animationDelay: b.delay,
                animationDuration: b.dur,
              }}
            >
              <Icon className="h-5 w-5" />
            </span>
          );
        })}
      </div>

      {/* Readability overlays — lighter so video stays visible */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/45" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.35)_100%)]" />

      {/* Form content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
