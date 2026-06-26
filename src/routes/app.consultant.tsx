import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bot, Send, User, UtensilsCrossed, ShoppingBag, Briefcase, Code2, Sparkles } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { InvestorAIInvestmentExpert } from "@/components/investor/InvestorAIInvestmentExpert";
import { ReviewSubmitWidget } from "@/components/ReviewSubmitWidget";

export const Route = createFileRoute("/app/consultant")({
  component: ConsultantPage,
});

const categories = [
  { id: "food", label: "Food & Beverage", icon: UtensilsCrossed, intro: "I only talk food. Menu engineering, sourcing, reviews — fire away." },
  { id: "retail", label: "Retail", icon: ShoppingBag, intro: "Retail focus mode. Inventory, footfall, conversion." },
  { id: "services", label: "Services", icon: Briefcase, intro: "Services advisor. Pricing, retention, referrals." },
  { id: "saas", label: "SaaS / Tech", icon: Code2, intro: "SaaS mode. Activation, churn, ICP." },
];

type Msg = { role: "user" | "bot"; text: string };

function ConsultantPage() {
  const { business, role } = useAppState();

  if (role === "investor") {
    return <InvestorAIInvestmentExpert />;
  }

  return <BusinessConsultantView business={business} />;
}

function BusinessConsultantView({
  business,
}: {
  business: ReturnType<typeof useAppState>["business"];
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");

  const getMappedCategoryId = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("food") || c.includes("rest") || c.includes("bist") || c.includes("bev")) return "food";
    if (c.includes("ret") || c.includes("shop") || c.includes("store")) return "retail";
    if (c.includes("saas") || c.includes("tech") || c.includes("software")) return "saas";
    return "services";
  };

  useEffect(() => {
    if (business.isRegistered) {
      const catId = getMappedCategoryId(business.category);
      setCategory(catId);
      const catObj = categories.find((x) => x.id === catId)!;
      setMessages([
        {
          role: "bot",
          text: `Hello owner of ${business.name}! Category-aware ${catObj.label} consultant activated. I see your business is based in ${business.location} and has a reputation score of ${business.score}/100. Let's optimize your operations and review responses today!`,
        },
      ]);
    } else {
      setCategory(null);
      setMessages([]);
    }
  }, [business.isRegistered, business.name, business.category, business.score, business.location]);

  const pickCategory = (id: string) => {
    const c = categories.find((x) => x.id === id)!;
    setCategory(id);
    setMessages([{ role: "bot", text: c.intro }]);
  };

  const send = () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    setMessages((m) => [...m, { role: "user", text }]);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: business.isRegistered
            ? `(${category} mode) Based on ${business.name}'s live score (${business.score}/100) and recent customer feedback, I recommend focusing on service reliability first. Standardizing your team's top 3 service steps will quickly boost reviews and catch the attention of more investors.`
            : `(${category} mode) Based on standard industry benchmarks for guest audits, I'd suggest focusing on customer retention first. Tighten service bottlenecks, then run a local referral loop.`,
        },
      ]);
    }, 600);
  };

  if (!category) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 03</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">AI Consultant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a category — your advisor stays scoped to it. No off-topic noise.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => pickCategory(c.id)}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <c.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <div className="font-display text-lg font-semibold">{c.label}</div>
                <div className="text-sm text-muted-foreground">Scoped advisor for {c.label.toLowerCase()}.</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const current = categories.find((c) => c.id === category)!;

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <current.icon className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">{current.label} advisor</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Scoped mode active
            </div>
          </div>
        </div>
        <button
          onClick={() => setCategory(null)}
          className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
        >
          Change category
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-card">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "bot" ? "bg-accent" : "bg-foreground text-background"}`}>
              {m.role === "bot" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "bot" ? "bg-secondary" : "bg-foreground text-background"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card p-2 shadow-card">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Ask anything about ${current.label.toLowerCase()}…`}
          className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button onClick={send} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background hover:opacity-90">
          <Send className="h-4 w-4" />
        </button>
      </div>

      <ReviewSubmitWidget className="mt-6" />
    </div>
  );
}
