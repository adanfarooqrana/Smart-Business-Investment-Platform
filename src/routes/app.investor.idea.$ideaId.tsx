import { ShowcaseIdeaJourney } from "@/components/investor/ShowcaseIdeaJourney";
import { useMarketCatalog } from "@/components/investor/InvestorMarketplace";
import { useAuth } from "@/contexts/AuthContext";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useInvestorSession } from "@/hooks/useInvestorSession";
import { subscribeToFounderPitchById } from "@/services/founderFirebaseService";
import { PitchDossier, type DossierStage } from "@/components/investor/PitchDossier";
import type { StartupIdea } from "@/data/startupIdeas";

type IdeaSearch = {
  founderId?: string;
  stage?: DossierStage;
  showcase?: boolean;
};

export const Route = createFileRoute("/app/investor/idea/$ideaId")({
  validateSearch: (search: Record<string, unknown>): IdeaSearch => {
    const founderId =
      typeof search.founderId === "string" && search.founderId.trim()
        ? search.founderId.trim()
        : undefined;
    const stageRaw = Number(search.stage);
    const stage =
      stageRaw === 1 || stageRaw === 2 || stageRaw === 3 || stageRaw === 4 ? stageRaw : undefined;
    return { founderId, stage, showcase: search.showcase === true || search.showcase === "true" ? true : undefined };
  },
  component: InvestorIdeaDetailPage,
});

function InvestorIdeaDetailPage() {
  const { ideaId } = Route.useParams();
  const { founderId, stage, showcase } = Route.useSearch();
  const key = (founderId ?? "") + "/" + ideaId + "/" + (stage ?? 1);
  return showcase
    ? <ShowcaseDetailPage key={key} ideaId={ideaId} founderId={founderId} initialStage={stage ?? 1} />
    : <LiveIdeaDetailPage key={key} />;
}

function ShowcaseDetailPage({ ideaId, founderId, initialStage }: {
  ideaId: string; founderId?: string; initialStage: DossierStage;
}) {
  const { currentUser } = useAuth();
  const { catalog, error, refresh } = useMarketCatalog(currentUser?.uid ?? "");
  const product = catalog.products.find((item) => item.demo && item.id === ideaId && (!founderId || item.founderId === founderId));
  const founder = catalog.founders.find((item) => item.id === product?.founderId);
  if (product) return <ShowcaseIdeaJourney product={product} founder={founder} initialStage={initialStage} refresh={refresh} />;
  if (error || catalog.founders.length) return <div className="mx-auto max-w-lg px-6 py-20 text-center">
    <p role="alert">{error || "Showcase idea not found."}</p>
    {error && <button className="mt-3 font-semibold text-orange-800" type="button" onClick={() => void refresh()}>Retry</button>}
  </div>;
  return <div className="flex h-[80vh] items-center justify-center" role="status" aria-label="Loading showcase idea">
    <Loader2 className="h-8 w-8 animate-spin text-accent" />
  </div>;
}

function LiveIdeaDetailPage() {
  const { ideaId } = Route.useParams();
  const { founderId, stage: initialStage } = Route.useSearch();
  const { sessionReady, isInvestorRegistered } = useInvestorSession();
  const { currentUser, loading: authLoading } = useAuth();
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

  if (!sessionReady || authLoading || !isInvestorRegistered) {
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
    currentUser ? <PitchDossier key={currentUser.uid} idea={idea} user={currentUser} initialStage={initialStage ?? 1} />
      : <Link to="/app/login" className="block p-8 text-orange-700">Sign in to open this pitch dossier</Link>
  );
}
