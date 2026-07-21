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
      className={`grid items-center gap-6 md:grid-cols-[220px_1fr] lg:gap-8 ${
        active ? "opacity-100" : "hidden"
      }`}
    >
      <div className="relative mx-auto md:mx-0">
        <img
          src={quote.imageUrl}
          alt={quote.name}
          className="relative h-48 w-48 rounded-2xl object-cover shadow-sm"
        />
        <span className="absolute -bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 shadow-sm">
          <BadgeCheck className="h-3.5 w-3.5" /> Verified Review
        </span>
      </div>

      <div className="text-center md:text-left">
        <div className="mb-3 flex justify-center gap-1 md:justify-start">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <blockquote className="font-display min-h-[4.5rem] text-xl font-semibold leading-relaxed text-slate-900 md:text-2xl">
          &ldquo;{renderTypedWithKeywords(typed)}
          {!typingDone && active && (
            <span className="ml-0.5 inline-block h-6 w-0.5 animate-pulse bg-amber-500 align-middle opacity-70" />
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
    <section className="my-2 w-full bg-[#f5f5f5] px-4 md:my-3">
      <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-slate-200/90 bg-white px-6 py-6 shadow-sm md:px-10 md:py-8">
        <div className="mb-4 space-y-2 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-600">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified Reviews
          </p>
          <h2 className="font-display text-3xl font-extrabold text-slate-900 md:text-4xl">
            Trusted by growing businesses
          </h2>
        </div>

        <div className="relative mx-auto min-h-[240px] max-w-4xl">
          {quotes.map((q, i) => (
            <FeaturedReview key={q.id} quote={q} active={i === activeIndex} />
          ))}
        </div>

        <div className="mt-4 flex justify-center gap-2">
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
