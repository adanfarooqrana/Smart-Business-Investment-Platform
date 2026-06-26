import { useEffect, useRef, useState, type ReactNode } from "react";

export const ROTATING_PHRASES = [
  "brand design",
  "business scaling",
  "AI automation",
  "pitching investors",
];

export function CountUp({
  target,
  duration = 2000,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(eased * target);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <div ref={ref}>
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString()}
      {suffix}
    </div>
  );
}

export function useCharTypewriter(text: string, speed = 28, active = true) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!active) {
      setOut("");
      return;
    }
    setOut("");
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(t);
    }, speed);
    return () => window.clearInterval(t);
  }, [text, speed, active]);
  return out;
}

const REVIEW_KEYWORDS = [
  "SmartBiz",
  "AI",
  "Sales",
  "investors",
  "investment",
  "Packaging",
  "supply",
  "Escrow",
  "online",
  "verified",
  "affordable",
  "trust",
  "Funds",
];

/** Renders typed text with glowing keyword highlights as each word completes */
export function renderTypedWithKeywords(typed: string, keywords = REVIEW_KEYWORDS) {
  if (!typed) return null;
  const lowerTyped = typed.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;

  while (cursor < typed.length) {
    let matched: { word: string; index: number } | null = null;
    for (const kw of keywords) {
      const idx = lowerTyped.indexOf(kw.toLowerCase(), cursor);
      if (idx === cursor) {
        matched = { word: typed.slice(cursor, cursor + kw.length), index: idx };
        break;
      }
    }
    if (matched) {
      parts.push(
        <span key={`kw-${cursor}`} className="review-keyword-glow">
          {matched.word}
        </span>,
      );
      cursor += matched.word.length;
      continue;
    }
    const nextKw = keywords
      .map((kw) => lowerTyped.indexOf(kw.toLowerCase(), cursor + 1))
      .filter((i) => i > cursor)
      .sort((a, b) => a - b)[0];
    const end = nextKw !== undefined ? nextKw : typed.length;
    parts.push(<span key={`t-${cursor}`}>{typed.slice(cursor, end)}</span>);
    cursor = end;
  }
  return parts;
}

export function useTypewriter(
  phrases: string[],
  typingSpeed = 80,
  erasingSpeed = 45,
  pauseMs = 1600,
) {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!isErasing && displayed.length < current.length) {
      timer = setTimeout(
        () => setDisplayed(current.slice(0, displayed.length + 1)),
        typingSpeed,
      );
    } else if (!isErasing && displayed.length === current.length) {
      timer = setTimeout(() => setIsErasing(true), pauseMs);
    } else if (isErasing && displayed.length > 0) {
      timer = setTimeout(
        () => setDisplayed(current.slice(0, displayed.length - 1)),
        erasingSpeed,
      );
    } else if (isErasing && displayed.length === 0) {
      setIsErasing(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }

    return () => clearTimeout(timer);
  }, [displayed, isErasing, phraseIdx, phrases, typingSpeed, erasingSpeed, pauseMs]);

  return displayed;
}
