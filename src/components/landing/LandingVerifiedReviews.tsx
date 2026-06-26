import { useEffect, useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { useCharTypewriter, renderTypedWithKeywords } from "@/components/landing/landingUtils";
import type { TestimonialQuote } from "@/hooks/useAppState";

type LandingVerifiedReviewsProps = {
  quotes: TestimonialQuote[];
};

function FeaturedReview({ quote, active }: { quote: TestimonialQuote; active: boolean }) {
  const typed = useCharTypewriter(quote.quote, 26, active);
  const typingDone = active && typed.length >= quote.quote.length;

  return (
    <div
      className={`review-card-in grid gap-8 md:grid-cols-[220px_1fr] items-center rounded-3xl border bg-white p-6 md:p-8 shadow-xl ${
        active ? "opacity-100" : "hidden"
      }`}
      style={{
        borderColor: `${quote.color}33`,
        boxShadow: active ? `0 20px 50px ${quote.color}22, 0 0 40px ${quote.color}18` : undefined,
      }}
    >
      <div className="relative mx-auto md:mx-0">
        <div
          className="absolute -inset-2 rounded-3xl blur-xl opacity-50"
          style={{ background: `radial-gradient(circle, ${quote.color}55, transparent 70%)` }}
        />
        <img
          src={quote.imageUrl}
          alt={quote.name}
          className="relative h-48 w-48 rounded-3xl object-cover border-4 border-white shadow-2xl"
        />
        <span
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${quote.color}, ${quote.color}cc)` }}
        >
          <BadgeCheck className="h-3.5 w-3.5" /> Verified Review
        </span>
      </div>

      <div className="text-center md:text-left">
        <div className="mb-3 flex justify-center md:justify-start gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <blockquote
          className="landing-review-quote-glow font-display text-xl md:text-2xl font-semibold leading-relaxed min-h-[4.5rem]"
          style={{ color: quote.color, ["--quote-glow" as string]: quote.color }}
        >
          &ldquo;{renderTypedWithKeywords(typed)}
          {!typingDone && active && (
            <span className="ml-0.5 inline-block h-6 w-0.5 animate-pulse bg-current align-middle opacity-70" />
          )}
          &rdquo;
        </blockquote>
        <p className="mt-4 text-base font-bold text-slate-900">{quote.name}</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{quote.role}</p>
      </div>
    </div>
  );
}

export function LandingVerifiedReviews({ quotes }: LandingVerifiedReviewsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const active = quotes[activeIndex] ?? quotes[0];

  useEffect(() => {
    setTypingDone(false);
    const quote = quotes[activeIndex]?.quote ?? "";
    const typingMs = quote.length * 26 + 800;
    const timer = window.setTimeout(() => setTypingDone(true), typingMs);
    return () => window.clearTimeout(timer);
  }, [activeIndex, quotes]);

  useEffect(() => {
    if (!typingDone || quotes.length <= 1) return;
    const next = window.setTimeout(() => {
      setActiveIndex((i) => (i + 1) % quotes.length);
    }, 2400);
    return () => window.clearTimeout(next);
  }, [typingDone, quotes.length]);

  if (!active) return null;

  return (
    <section className="border-b border-slate-100 bg-gradient-to-b from-amber-50/40 to-white w-full py-12 md:py-16">
      <div className="mx-auto max-w-[960px] w-[95%]">
        <div className="mb-8 text-center space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified Reviews
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
            Trusted by growing businesses
          </h2>
        </div>

        <div className="relative min-h-[320px]">
          {quotes.map((q, i) => (
            <FeaturedReview key={q.id} quote={q} active={i === activeIndex} />
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {quotes.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show review from ${q.name}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-8 bg-amber-500" : "w-2 bg-slate-300 hover:bg-amber-300"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
