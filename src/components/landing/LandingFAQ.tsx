import { useEffect, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCharTypewriter } from "@/components/landing/landingUtils";

export type FaqItem = { q: string; a: string };

type LandingFAQProps = {
  items: FaqItem[];
};

function FaqAnswer({ text, active }: { text: string; active: boolean }) {
  const typed = useCharTypewriter(text, 18, active);
  const done = !active || typed.length >= text.length;

  return (
    <p className="text-sm text-slate-600 leading-relaxed">
      {active ? typed : text}
      {active && !done && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-500 align-middle" />
      )}
    </p>
  );
}

export function LandingFAQ({ items }: LandingFAQProps) {
  const [openIndex, setOpenIndex] = useState(0);
  const [glowIndex, setGlowIndex] = useState(0);
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    setTypingDone(false);
    const answer = items[openIndex]?.a ?? "";
    const ms = answer.length * 18 + 1200;
    const t = window.setTimeout(() => setTypingDone(true), ms);
    return () => window.clearTimeout(t);
  }, [openIndex, items]);

  useEffect(() => {
    if (!typingDone) return;
    const t = window.setTimeout(() => {
      setOpenIndex((i) => (i + 1) % items.length);
      setGlowIndex((g) => (g + 1) % items.length);
    }, 2800);
    return () => window.clearTimeout(t);
  }, [typingDone, items.length]);

  return (
    <section id="faq" className="relative mx-auto max-w-4xl py-12 md:py-14 w-[95%] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-amber-300/30 blur-3xl animate-pulse-glow" />
      </div>

      <div className="relative mb-8 text-center">
        <span
          className="faq-qmark absolute left-[12%] top-0 text-3xl font-black text-amber-400"
          style={{ textShadow: "0 0 24px rgba(251,191,36,0.65)" }}
        >
          ?
        </span>
        <span
          className="faq-qmark absolute right-[14%] top-4 text-4xl font-black text-orange-400"
          style={{ animationDelay: "1.1s", textShadow: "0 0 28px rgba(249,115,22,0.55)" }}
        >
          ?
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
          Frequently asked questions
        </h2>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => {
          const open = openIndex === i;
          const glowing = glowIndex === i || open;
          return (
            <div
              key={item.q}
              className={`faq-item rounded-2xl border bg-white overflow-hidden transition-all duration-500 ${
                open ? "faq-item-open border-amber-300/80 shadow-lg shadow-amber-500/15" : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setOpenIndex(i);
                  setGlowIndex(i);
                  setTypingDone(false);
                }}
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
              >
                <span
                  className={`faq-qmark-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-all duration-300 ${
                    glowing
                      ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.55)]"
                      : "bg-amber-50 text-amber-600 border border-amber-200"
                  }`}
                >
                  ?
                </span>
                <span className="flex-1 font-semibold text-slate-900 text-sm">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? "rotate-180 text-amber-500" : ""}`}
                />
              </button>
              <div
                className={`grid transition-all duration-500 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-amber-100/80 bg-gradient-to-b from-amber-50/40 to-white px-5 pb-4 pt-3">
                    <FaqAnswer text={item.a} active={open} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Admin monitor card */}
        <Link
          to="/admin/login"
          className="faq-admin-card group mt-4 flex items-center gap-4 rounded-2xl border border-slate-800/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 shadow-xl transition-all hover:scale-[1.01] hover:shadow-amber-500/20"
        >
          <div className="faq-admin-glow flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_28px_rgba(251,191,36,0.45)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Admin Control</p>
            <p className="font-display text-base font-bold text-white">Platform monitor & reviews</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified reviews add/delete karein, live stats dekhein, AI agent control
            </p>
          </div>
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-300 group-hover:bg-amber-500/20">
            Open Panel →
          </span>
        </Link>
      </div>
    </section>
  );
}
