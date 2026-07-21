import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCharTypewriter } from "@/components/landing/landingUtils";

export type FaqItem = { q: string; a: string };

type LandingFAQProps = {
  items: FaqItem[];
};

function FaqAnswer({ text, active }: { text: string; active: boolean }) {
  const typed = useCharTypewriter(text, 18, active);
  const done = !active || typed.length >= text.length;

  return (
    <p className="text-sm leading-relaxed text-slate-600">
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
    <section id="faq" className="my-2 w-full bg-[#f5f5f5] px-4 md:my-3">
      <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-slate-200/90 bg-white px-6 py-6 shadow-sm md:px-10 md:py-8">
        <div className="relative mb-4 text-center">
          <h2 className="font-display text-3xl font-extrabold text-slate-900 md:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto max-w-3xl divide-y divide-slate-100">
          {items.map((item, i) => {
            const open = openIndex === i;
            const glowing = glowIndex === i || open;
            return (
              <div key={item.q} className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenIndex(i);
                    setGlowIndex(i);
                    setTypingDone(false);
                  }}
                  className="flex w-full items-center gap-3 py-2 text-left"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-all duration-300 ${
                      glowing
                        ? "bg-amber-500 text-white"
                        : "border border-amber-200 bg-amber-50 text-amber-600"
                    }`}
                  >
                    ?
                  </span>
                  <span className="flex-1 text-sm font-semibold text-slate-900">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${
                      open ? "rotate-180 text-amber-500" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-500 ease-out ${
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pb-4 pl-12 pr-5">
                      <FaqAnswer text={item.a} active={open} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
