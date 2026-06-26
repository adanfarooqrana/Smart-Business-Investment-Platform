import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useInvestorSession } from "@/hooks/useInvestorSession";
import { getStartupIdeaById } from "@/data/startupIdeas";
import { subscribeToPitchedIdeaById } from "@/services/pitchIdeaService";
import { IdeaDetailView } from "@/components/investor/IdeaStage1Detail";
import type { StartupIdea } from "@/data/startupIdeas";

export const Route = createFileRoute("/app/investor/idea/$ideaId")({
  component: InvestorIdeaDetailPage,
});

function isFirebasePitchedIdeaId(ideaId: string): boolean {
  return ideaId.startsWith("pitch-");
}

function InvestorIdeaDetailPage() {
  const { ideaId } = Route.useParams();
  const { sessionReady, isInvestorRegistered } = useInvestorSession();
  const navigate = useNavigate();
  const staticIdea = getStartupIdeaById(ideaId);
  const [idea, setIdea] = useState<StartupIdea | undefined>(staticIdea);
  const [loading, setLoading] = useState(!staticIdea || isFirebasePitchedIdeaId(ideaId));

  useEffect(() => {
    if (sessionReady && !isInvestorRegistered) {
      navigate({ to: "/app/login" });
    }
  }, [sessionReady, isInvestorRegistered, navigate]);

  useEffect(() => {
    if (staticIdea && !isFirebasePitchedIdeaId(ideaId)) {
      setIdea(staticIdea);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToPitchedIdeaById(ideaId, (pitched) => {
      setIdea(pitched ?? staticIdea);
      setLoading(false);
    });

    return unsubscribe;
  }, [ideaId, staticIdea]);

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

  return <IdeaDetailView idea={idea} />;
}
