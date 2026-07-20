import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useInvestorSession } from "@/hooks/useInvestorSession";
import { subscribeToFounderPitchById } from "@/services/founderFirebaseService";
import { IdeaDetailView } from "@/components/investor/IdeaStage1Detail";
import type { StartupIdea } from "@/data/startupIdeas";

type IdeaSearch = {
  founderId?: string;
  stage?: number;
};

export const Route = createFileRoute("/app/investor/idea/$ideaId")({
  validateSearch: (search: Record<string, unknown>): IdeaSearch => {
    const founderId =
      typeof search.founderId === "string" && search.founderId.trim()
        ? search.founderId.trim()
        : undefined;
    const stageRaw = Number(search.stage);
    const stage =
      stageRaw === 1 || stageRaw === 2 || stageRaw === 3 ? stageRaw : undefined;
    return { founderId, stage };
  },
  component: InvestorIdeaDetailPage,
});

function InvestorIdeaDetailPage() {
  const { ideaId } = Route.useParams();
  const { founderId, stage: initialStage } = Route.useSearch();
  const { sessionReady, isInvestorRegistered } = useInvestorSession();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<StartupIdea | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionReady && !isInvestorRegistered) {
      navigate({ to: "/app/login" });
    }
  }, [sessionReady, isInvestorRegistered, navigate]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setIdea(null);

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToFounderPitchById(ideaId, founderId, (pitched) => {
        if (!active) return;
        setIdea(pitched);
        setLoading(false);
      });
    } catch (error) {
      console.error("Investor idea detail subscribe error:", error);
      if (active) {
        setIdea(null);
        setLoading(false);
      }
    }

    return () => {
      active = false;
      try {
        unsubscribe?.();
      } catch (error) {
        console.error("Investor idea detail cleanup error:", error);
      }
      setIdea(null);
    };
  }, [ideaId, founderId]);

  if (!sessionReady || !isInvestorRegistered) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-display text-xl font-bold text-slate-900">Startup idea not found</h1>
        <p className="mt-2 text-sm text-slate-500">This idea may have been removed or the link is invalid.</p>
        <button
          type="button"
          onClick={() => navigate({ to: "/app/investor" })}
          className="mt-6 text-sm font-semibold text-amber-600 hover:underline"
        >
          Return to Ideas Feed
        </button>
      </div>
    );
  }

  return (
    <IdeaDetailView
      idea={idea}
      initialStage={initialStage === 1 || initialStage === 2 || initialStage === 3 ? initialStage : 1}
    />
  );
}
