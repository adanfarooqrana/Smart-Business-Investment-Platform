import { useEffect, useState } from "react";
import type { StartupIdea } from "@/data/startupIdeas";
import { subscribeToAllPitchedIdeas } from "@/services/pitchIdeaService";

export function usePitchedIdeas() {
  const [pitchedIdeas, setPitchedIdeas] = useState<StartupIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToAllPitchedIdeas((ideas) => {
      setPitchedIdeas(ideas);
      setLoading(false);
      setError(null);
    });

    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, 12_000);

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  return { pitchedIdeas, loading, error, liveCount: pitchedIdeas.length };
}
