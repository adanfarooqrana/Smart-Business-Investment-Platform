import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Flag, Sparkles, CheckCircle2, Loader2, Globe } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StartupIdea } from "@/data/startupIdeas";
import {
  type AiChatMessage,
  type InvestorStage,
  buildWelcomeMessage,
  generateInvestorAiResponse,
  getAiTitle,
} from "@/lib/investorIntelligentAi";
import { useAppState } from "@/hooks/useAppState";

type InvestorIntelligentAIProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: StartupIdea;
  stage?: InvestorStage;
  activeTerm?: string;
  onActiveTermChange?: (term: string) => void;
};

export function InvestorIntelligentAI({
  open,
  onOpenChange,
  idea,
  stage = 1,
  activeTerm,
  onActiveTermChange,
}: InvestorIntelligentAIProps) {
  const { investor, flagStage1InvestorQuery } = useAppState();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [lastDetectedTerm, setLastDetectedTerm] = useState(stage === 2 ? "Market Viability" : "Idea Description");
  const [flagSuccess, setFlagSuccess] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContextKey = `${idea.id}-${stage}-${open}`;

  const aiTitle = getAiTitle(stage);
  const isStage2 = stage === 2;

  useEffect(() => {
    if (open) {
      setMessages([buildWelcomeMessage(idea, stage)]);
      setLastDetectedTerm(activeTerm || (stage === 2 ? "Market Viability" : "Idea Description"));
      setFlagSuccess(null);
    }
  }, [chatContextKey, idea, open, activeTerm, stage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const submitFlag = useCallback(
    (term: string, userMessage: string, aiFlagMessage?: string, flagStage?: "Stage 1" | "Stage 2") => {
      const query = flagStage1InvestorQuery({
        ideaId: idea.id,
        startupTitle: idea.startupTitle,
        founderName: idea.founderName,
        investorName: investor.name || "Verified Investor",
        flaggedTerm: term,
        message: aiFlagMessage || userMessage,
        stage: flagStage ?? (isStage2 ? "Stage 2" : "Stage 1"),
      });
      setFlagSuccess(query.id);
      setTimeout(() => setFlagSuccess(null), 4000);
    },
    [flagStage1InvestorQuery, idea, investor.name, isStage2],
  );

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isThinking) return;

    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    await new Promise((r) => setTimeout(r, 650));

    const result = generateInvestorAiResponse(
      trimmed,
      idea,
      investor.name || "Verified Investor",
      stage,
      activeTerm || lastDetectedTerm,
    );

    if (result.detectedTerm) {
      setLastDetectedTerm(result.detectedTerm);
      onActiveTermChange?.(result.detectedTerm);
    }

    if (result.shouldFlagForFounder && result.flagMessage) {
      submitFlag(result.detectedTerm || lastDetectedTerm, trimmed, result.flagMessage, result.flagStage);
    }

    const assistantMsg: AiChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: result.reply,
      flaggedTerm: result.shouldFlagForFounder ? result.detectedTerm : undefined,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsThinking(false);
  };

  const handleFlagProblem = () => {
    const term = activeTerm || lastDetectedTerm;
    handleSend(`Tell the founder to clarify this point: ${term}. Please clarify the ${term} for ${idea.startupTitle}.`);
  };

  const quickChips =
    stage === 2
      ? [
          "Is this business viable in this market?",
          "What's the founder confidence score?",
          `Explain the ${formatPkrShort(idea.stage2.currentValuationPkr)} valuation`,
        ]
      : [
          `Is ${idea.stage1.expectedRoi} ROI good?`,
          "Explain the equity offer",
          "Is EBITDA realistic?",
        ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-0 sm:max-w-lg"
      >
        <SheetHeader
          className={`border-b px-6 py-5 text-left ${
            isStage2
              ? "border-orange-200/60 bg-gradient-to-r from-amber-500 to-orange-600"
              : "border-slate-200/80 bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-lg ${
                isStage2 ? "bg-white text-orange-600" : "bg-amber-400 text-slate-900"
              }`}
            >
              {isStage2 ? <Globe className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            <div>
              <SheetTitle className="font-display text-base font-bold text-white">{aiTitle}</SheetTitle>
              <SheetDescription className={`text-xs ${isStage2 ? "text-orange-100" : "text-slate-300"}`}>
                Context: {idea.startupTitle} &bull; Stage {stage} {isStage2 ? "Validation" : "Terms"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {flagSuccess && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Query sent to {idea.founderName}'s dashboard — marked "Query from Stage {stage} Investor"
          </div>
        )}

        <div className="investor-feed-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? isStage2
                      ? "rounded-tr-sm bg-gradient-to-br from-amber-600 to-orange-600 text-white"
                      : "rounded-tr-sm bg-slate-900 text-white"
                    : "rounded-tl-sm border border-slate-200/80 bg-white text-slate-700"
                }`}
              >
                {msg.role === "assistant" && (
                  <Sparkles className={`mb-1.5 h-3 w-3 ${isStage2 ? "text-orange-500" : "text-amber-500"}`} />
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.flaggedTerm && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                    <Flag className="h-2.5 w-2.5" /> Flagged: {msg.flaggedTerm}
                  </span>
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isStage2 ? "Running local market analysis…" : "Analyzing Stage 1 terms…"}
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="border-t border-slate-200/80 bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSend(chip)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  isStage2
                    ? "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFlagProblem}
            className="w-full rounded-xl border-amber-300/60 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-semibold"
          >
            <Flag className="h-3.5 w-3.5 mr-1.5" />
            Flag Problem — Notify Founder ({activeTerm || lastDetectedTerm})
          </Button>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isStage2 ? "Ask about market viability, valuation…" : "Ask about ROI, equity, EBITDA…"}
              className="rounded-xl text-xs h-10 flex-1"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isThinking}
              className={`h-10 w-10 shrink-0 rounded-xl text-white ${
                isStage2 ? "bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90" : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatPkrShort(amount: number): string {
  if (amount >= 1_000_000) return `PKR ${(amount / 1_000_000).toFixed(1)}M`;
  return `PKR ${amount.toLocaleString()}`;
}

export function InvestorAiFloatingButton({ onClick, stage = 1 }: { onClick: () => void; stage?: InvestorStage }) {
  const isStage2 = stage === 2;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl sm:bottom-8 sm:right-8 ${
        isStage2
          ? "bg-gradient-to-br from-amber-500 to-orange-600 ring-4 ring-orange-400/30 hover:ring-orange-400/50"
          : "bg-gradient-to-br from-slate-900 to-slate-700 ring-4 ring-amber-400/25 hover:ring-amber-400/40"
      }`}
      title={isStage2 ? "Open Market Expert AI" : "Open Investor Intelligent AI"}
    >
      {isStage2 ? <Globe className="h-6 w-6 transition-transform group-hover:scale-110" /> : <Bot className="h-6 w-6 transition-transform group-hover:scale-110" />}
      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-orange-600">
        I
      </span>
    </button>
  );
}
