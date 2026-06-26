import { useEffect, useState } from "react";
import type { StartupIdea } from "@/data/startupIdeas";
import {
  backfillInvestorFeedForFounder,
  subscribeToPitchedIdeasByFounder,
} from "@/services/pitchIdeaService";

export function useFounderPitchedIdeas(founderUid: string | undefined) {
  const [ideas, setIdeas] = useState<StartupIdea[]>([]);
  const [loading, setLoading] = useState(!!founderUid);

  useEffect(() => {
    if (!founderUid) {
      setIdeas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let settled = false;

    const finish = (next: StartupIdea[]) => {
      if (settled) return;
      settled = true;
      setIdeas(next);
      setLoading(false);
    };

    const timeout = window.setTimeout(() => finish([]), 12_000);

    void backfillInvestorFeedForFounder(founderUid).catch((err) =>
      console.warn("Founder feed backfill:", err),
    );

    const unsubscribe = subscribeToPitchedIdeasByFounder(founderUid, (next) => {
      window.clearTimeout(timeout);
      finish(next);
    });

    return () => {
      settled = true;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [founderUid]);

  return { ideas, loading };
}
