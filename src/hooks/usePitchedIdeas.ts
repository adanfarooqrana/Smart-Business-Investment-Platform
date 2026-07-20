import { useEffect, useState } from "react";
import type { StartupIdea } from "@/data/startupIdeas";
import { streamFounderPitchesForInvestorFeed } from "@/services/investorCoreService";

/** Live investor feed — founders/{uid}/pitches/{pitchId} via investorCoreService only. */
export function usePitchedIdeas() {
  const [pitchedIdeas, setPitchedIdeas] = useState<StartupIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = streamFounderPitchesForInvestorFeed((ideas) => {
        if (!active) return;
        setPitchedIdeas(ideas);
        setLoading(false);
        setError(null);
      });
    } catch (err) {
      console.error("usePitchedIdeas subscribe error:", err);
      if (active) {
        setPitchedIdeas([]);
        setLoading(false);
        setError("Failed to connect to founder pitches.");
      }
    }

    const timeout = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 12_000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      try {
        unsubscribe?.();
      } catch (err) {
        console.error("usePitchedIdeas cleanup error:", err);
      }
      setPitchedIdeas([]);
    };
  }, []);

  return { pitchedIdeas, loading, error, liveCount: pitchedIdeas.length };
}
