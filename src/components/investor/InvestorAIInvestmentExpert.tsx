import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  User,
  UtensilsCrossed,
  ShoppingBag,
  Code2,
  HeartPulse,
  Sprout,
  Truck,
  Building2,
  GraduationCap,
  Stethoscope,
  Landmark,
  Sparkles,
  Brain,
  Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";

type Category = {
  id: string;
  label: string;
  icon: LucideIcon;
  intro: string;
  tagline: string;
  gradient: string;
};

const INVESTOR_CATEGORIES: Category[] = [
  {
    id: "food",
    label: "Food & Beverage",
    icon: UtensilsCrossed,
    tagline: "Cafés, QSR, cloud kitchens",
    intro: "Food & Beverage Investment Expert activated. I'll analyze unit economics, footfall, F&B margins, and PKR deployment for café chains and dining ventures.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "retail",
    label: "Retail & E-commerce",
    icon: ShoppingBag,
    tagline: "D2C, marketplaces, omni-channel",
    intro: "Retail scope locked. Inventory turns, CAC/LTV, cart conversion, and omnichannel growth — ask me anything about retail capital allocation.",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    id: "saas",
    label: "SaaS / Tech",
    icon: Code2,
    tagline: "B2B SaaS, apps, AI products",
    intro: "SaaS & Tech mode on. MRR growth, churn, activation funnels, and PKR vs USD valuation benchmarks for Pakistani tech startups.",
    gradient: "from-violet-600 to-indigo-600",
  },
  {
    id: "health",
    label: "Health & Wellness",
    icon: HeartPulse,
    tagline: "Fitness, wellness, supplements",
    intro: "Health & Wellness advisor ready. Member retention, subscription models, and regulatory compliance for wellness ventures.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: "agro",
    label: "Agrotech",
    icon: Sprout,
    tagline: "Farm-tech, supply chain",
    intro: "Agrotech investment lens active. Crop yield tech, rural distribution, and government subsidy alignment for agri ventures.",
    gradient: "from-lime-500 to-green-600",
  },
  {
    id: "logistics",
    label: "Logistics & Transport",
    icon: Truck,
    tagline: "Fleet, last-mile, freight",
    intro: "Logistics expert engaged. Fleet utilization, route density, and last-mile PKR economics for transport startups.",
    gradient: "from-slate-600 to-slate-800",
  },
  {
    id: "realestate",
    label: "Real Estate",
    icon: Building2,
    tagline: "PropTech, co-working, rental",
    intro: "Real Estate & PropTech mode. Cap rates, occupancy, rental yield, and co-working space economics in Karachi, Lahore, Islamabad.",
    gradient: "from-amber-600 to-orange-700",
  },
  {
    id: "edtech",
    label: "EdTech",
    icon: GraduationCap,
    tagline: "Online learning, upskilling",
    intro: "EdTech investment advisor online. Course completion rates, B2B school contracts, and ed-tech unit economics.",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    icon: Stethoscope,
    tagline: "Clinics, telehealth, med-devices",
    intro: "Healthcare scope active. Telehealth adoption, clinic throughput, and med-device distribution in tier-2/3 cities.",
    gradient: "from-teal-500 to-cyan-600",
  },
  {
    id: "fintech",
    label: "FinTech",
    icon: Landmark,
    tagline: "Payments, lending, wallets",
    intro: "FinTech expert locked in. JazzCash/EasyPaisa ecosystem plays, lending risk, and regulatory sandbox opportunities in Pakistan.",
    gradient: "from-yellow-500 to-amber-600",
  },
];

type Msg = { role: "user" | "bot"; text: string };

function PaisaRain({ active }: { active: boolean }) {
  if (!active) return null;
  const drops = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${(i * 3.7) % 100}%`,
    delay: (i % 7) * 0.08,
    label: i % 2 === 0 ? "₨" : "PKR",
    size: i % 3 === 0 ? "text-sm" : "text-xs",
  }));

  return (
    <div className="investor-paisa-rain-layer pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl">
      {drops.map((d) => (
        <span
          key={d.id}
          className={`investor-paisa-rain-drop absolute font-black text-amber-400 ${d.size}`}
          style={{ left: d.left, animationDelay: `${d.delay}s` }}
        >
          {d.label}
        </span>
      ))}
    </div>
  );
}

function FireBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="investor-fire-burst pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="investor-fire-core text-4xl">🔥</div>
      <div className="investor-fire-ring absolute h-24 w-24 rounded-full border-4 border-orange-500/60" />
      <div className="investor-fire-ring-2 absolute h-36 w-36 rounded-full border-2 border-red-400/40" />
    </div>
  );
}

export function InvestorAIInvestmentExpert() {
  const { investor } = useAppState();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [fireBurst, setFireBurst] = useState(false);
  const [paisaRain, setPaisaRain] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const rainTimer = useRef<number | null>(null);

  const triggerPaisaRain = useCallback(() => {
    setPaisaRain(true);
    if (rainTimer.current) window.clearTimeout(rainTimer.current);
    rainTimer.current = window.setTimeout(() => setPaisaRain(false), 2200);
  }, []);

  useEffect(
    () => () => {
      if (rainTimer.current) window.clearTimeout(rainTimer.current);
    },
    [],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, paisaRain]);

  const pickCategory = (id: string) => {
    const cat = INVESTOR_CATEGORIES.find((c) => c.id === id)!;
    setSelectedCard(id);
    setFireBurst(true);
    window.setTimeout(() => {
      setCategoryId(id);
      setFireBurst(false);
      setSelectedCard(null);
      setMessages([
        {
          role: "bot",
          text: `Assalam-o-Alaikum ${investor.name || "Investor"}! ${cat.intro}\n\n💡 I am your **AI Investment Expert** — trainable on your deal thesis soon. Ask about ROI, escrow, equity splits, or ${cat.label} deal flow.`,
        },
      ]);
      triggerPaisaRain();
    }, 650);
  };

  const send = () => {
    if (!draft.trim() || !categoryId) return;
    const text = draft.trim();
    setDraft("");
    setMessages((m) => [...m, { role: "user", text }]);
    const cat = INVESTOR_CATEGORIES.find((c) => c.id === categoryId)!;
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `(${cat.label} · Investment AI) Based on your ${investor.budgetRange || "capital range"} mandate: ${text.includes("?") ? "Here's my analysis — " : "Noted. "}${getExpertReply(text, cat.label, investor.budgetRange || "500k-5M PKR")}`,
        },
      ]);
      triggerPaisaRain();
    }, 700);
  };

  const current = INVESTOR_CATEGORIES.find((c) => c.id === categoryId);

  if (!categoryId || !current) {
    return (
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Step 03</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              AI Investment Expert
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold text-violet-700">
              <Brain className="h-3.5 w-3.5" /> Trainable · Coming Soon
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Pick your investment orbit — each category unlocks a scoped PKR-capital advisor. No noise, pure deal intelligence.
          </p>
        </div>

        {/* Unique orbit category grid */}
        <div className="relative rounded-3xl border border-orange-200/60 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 p-5 sm:p-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-40">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="investor-paisa-rise absolute font-black text-orange-400/50"
                style={{ left: `${10 + i * 18}%`, bottom: "5%", animationDelay: `${i * 0.5}s` }}
              >
                ₨
              </span>
            ))}
          </div>

          <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INVESTOR_CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              const isBurst = selectedCard === cat.id && fireBurst;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => pickCategory(cat.id)}
                  className={`investor-category-orbit group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isBurst
                      ? "border-orange-400 bg-orange-100 scale-[1.03] ring-2 ring-orange-400"
                      : "border-slate-200/80 bg-white hover:border-orange-300"
                  }`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <FireBurst show={isBurst} />
                  <div className="relative z-10 flex items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold text-slate-900">{cat.label}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-orange-600">{cat.tagline}</p>
                      <p className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-orange-500">
                        <Flame className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        Select orbit →
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-widest text-slate-400">
          10 investment orbits · fire unlock on select · paisa rain when AI speaks
        </p>
      </div>
    );
  }

  const Icon = current.icon;

  return (
    <div className="relative mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col px-4 py-6 sm:px-6">
      <PaisaRain active={paisaRain} />

      {/* Advanced AI header */}
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-orange-300/50 bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 p-4 shadow-lg shadow-orange-500/20">
        <div className="pointer-events-none absolute inset-0 investor-discover-shine opacity-30" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30">
              <Icon className="h-6 w-6 text-white" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[8px] font-black text-white ring-2 ring-white">
                AI
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-100">Investment Expert</p>
              <p className="font-display text-lg font-bold text-white">{current.label}</p>
              <p className="text-[10px] text-orange-50/80 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {investor.aiConsultantToken || "ICAI-PENDING"} · Trainable model
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCategoryId(null);
              setMessages([]);
            }}
            className="rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/25"
          >
            Change Orbit
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-b from-slate-50 to-white shadow-inner">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                  m.role === "bot"
                    ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white"
                    : "bg-slate-900 text-white"
                }`}
              >
                {m.role === "bot" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === "bot"
                    ? "border border-orange-100 bg-white text-slate-800"
                    : "bg-slate-900 text-white"
                }`}
              >
                {m.text.split("\n").map((line, li) => (
                  <p key={li} className={li > 0 ? "mt-2" : ""}>
                    {line.replace(/\*\*(.*?)\*\*/g, "$1")}
                  </p>
                ))}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-orange-100 bg-white/80 p-3 backdrop-blur-sm">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {["Best ROI in this sector?", "Escrow safe?", "Equity vs profit-share?"].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setDraft(q);
                }}
                className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-orange-800 hover:bg-orange-100"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`Ask ${current.label} investment expert…`}
              className="flex-1 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300/50"
            />
            <button
              type="button"
              onClick={send}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md hover:shadow-lg"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getExpertReply(query: string, sector: string, budget: string): string {
  const q = query.toLowerCase();
  if (q.includes("roi") || q.includes("return"))
    return `${sector} ventures in your ${budget} band typically target 18–35% annual ROI. Verify Stage 1 disclosures and compare against SmartBiz escrow milestones before deploying.`;
  if (q.includes("escrow") || q.includes("safe"))
    return "SmartBiz Escrow holds PKR via JazzCash/EasyPaisa/Card until agreement + milestones are met. Always sign the digital contract in Stage 3 before payment.";
  if (q.includes("equity") || q.includes("profit"))
    return "Equity % scales with your PKR ticket vs total raise. Profit-share deals offer faster cash returns — I can model both in your Ideas Feed Stage 2 calculator.";
  return `For ${sector}, focus on founder verification score, prior investor social proof, and market viability in Stage 2. Your ${budget} range matches 3–5 live dossiers in the feed right now.`;
}
