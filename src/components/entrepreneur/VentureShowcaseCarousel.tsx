import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Store, Building2 } from "lucide-react";
import type { StartupIdea } from "@/data/startupIdeas";
import type { EntrepreneurPayment } from "@/hooks/useAppState";
import {
  fetchFounderPayments,
  generateVentureShowcaseCards,
  localPaymentToRecord,
  type VentureShowcaseCard,
} from "@/services/moneyManagementService";

type Props = {
  founderId: string;
  ideas: StartupIdea[];
  localPayments: EntrepreneurPayment[];
};

export function VentureShowcaseCarousel({ founderId, ideas, localPayments }: Props) {
  const [cards, setCards] = useState<VentureShowcaseCard[]>([]);
  const [index, setIndex] = useState(0);

  const ideaTitleSet = useMemo(
    () => new Set(ideas.map((i) => i.startupTitle.toLowerCase())),
    [ideas],
  );

  const ideaIdByTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const idea of ideas) map.set(idea.startupTitle.toLowerCase(), idea.id);
    return map;
  }, [ideas]);

  useEffect(() => {
    const load = async () => {
      try {
        let payments = await fetchFounderPayments(founderId);
        if (payments.length === 0 && localPayments.length > 0) {
          payments = localPayments
            .filter((p) => ideaTitleSet.has(p.startupTitle.toLowerCase()))
            .map((p) => {
              const ideaId = ideaIdByTitle.get(p.startupTitle.toLowerCase()) ?? "local";
              const idea = ideas.find((i) => i.id === ideaId);
              const profitShare = idea?.stage1?.profitSharingPercent ?? "15% of net operating profit";
              return localPaymentToRecord(p, founderId, ideaId, profitShare);
            });
        }
        setCards(generateVentureShowcaseCards(payments, ideas));
      } catch {
        const fallback = localPayments
          .filter((p) => ideaTitleSet.has(p.startupTitle.toLowerCase()))
          .map((p) => {
            const ideaId = ideaIdByTitle.get(p.startupTitle.toLowerCase()) ?? "local";
            const idea = ideas.find((i) => i.id === ideaId);
            const profitShare = idea?.stage1?.profitSharingPercent ?? "15% of net operating profit";
            return localPaymentToRecord(p, founderId, ideaId, profitShare);
          });
        setCards(generateVentureShowcaseCards(fallback, ideas));
      }
    };
    if (founderId) load();
  }, [founderId, ideas, localPayments, ideaTitleSet, ideaIdByTitle]);

  useEffect(() => {
    if (cards.length <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % cards.length), 6000);
    return () => window.clearInterval(id);
  }, [cards.length]);

  if (cards.length === 0) {
    return (
      <section className="mt-6 rounded-3xl border border-dashed border-[#FFA500]/30 bg-gradient-to-br from-[#FFF8E1] to-white p-8 text-center">
        <Sparkles className="mx-auto mb-2 h-8 w-8 text-[#FFA500]/40" />
        <h2 className="font-display text-lg font-bold text-slate-900">Successful Venture Showcase</h2>
        <p className="mt-2 text-sm text-slate-500">
          When an investment reaches Stage 3 complete, the system auto-generates marketing creatives
          featuring your wholesaler products or business setup.
        </p>
      </section>
    );
  }

  const card = cards[index];

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-[#FFA500]/25 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-[#FFA500]/15 px-6 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFA500]">
            System-Generated Creative Ads
          </p>
          <h2 className="font-display text-lg font-bold text-slate-900">Successful Venture Showcase</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + cards.length) % cards.length)}
            className="rounded-full p-2 hover:bg-[#FFF8E1]"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5 text-[#FFA500]" />
          </button>
          <span className="px-2 text-xs text-slate-500">
            {index + 1} / {cards.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % cards.length)}
            className="rounded-full p-2 hover:bg-[#FFF8E1]"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5 text-[#FFA500]" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-col md:flex-row">
        <div className="relative h-56 md:h-auto md:w-2/5">
          <img
            src={card.imageUrl}
            alt={card.startupTitle}
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r"
          />
          <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#FFA500]">
              {card.creativeType === "wholesaler_products" ? (
                <>
                  <Store className="h-3 w-3" /> Wholesaler Products
                </>
              ) : (
                <>
                  <Building2 className="h-3 w-3" /> Business Setup
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">
            Mutual Growth Campaign · Auto-Generated
          </p>
          <h3 className="font-display text-xl font-extrabold text-slate-900 md:text-2xl">
            {card.headline}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.subline}</p>
          <p className="mt-4 rounded-xl bg-[#FFF8E1] px-4 py-2 text-xs font-medium text-[#FFA500]">
            {card.mutualGrowthTag}
          </p>
          <div className="mt-4 flex gap-1.5">
            {cards.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-[#FFA500]" : "w-1.5 bg-[#FFD700]/50"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
