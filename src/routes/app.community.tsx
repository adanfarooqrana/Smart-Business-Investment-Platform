import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleCommunityHub } from "@/components/community/ModuleCommunityHub";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { hasWorkspaceAppSession } from "@/lib/routeGuards";
import {
  parseCommunityEntry,
  persistCommunityEntry,
  type CommunityEntry,
} from "@/lib/communityEntry";
import { resolveCommunityIdentity } from "@/lib/resolveCommunityIdentity";
import { CommunityErrorBoundary } from "@/components/founder/CommunityErrorBoundary";
import { Button } from "@/components/ui/button";

type CommunitySearch = {
  entry?: CommunityEntry;
};

export const Route = createFileRoute("/app/community")({
  validateSearch: (search: Record<string, unknown>): CommunitySearch => {
    if (search.entry == null || search.entry === "") return {};
    return { entry: parseCommunityEntry(search.entry) };
  },
  component: CommunityPage,
  errorComponent: function CommunityRouteError({ error, reset }) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f1a] p-6 text-center">
        <p className="text-lg font-bold text-white">Community could not load</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          {String((error as Error)?.message || "Something went wrong. Please try again.")}
        </p>
        <Button
          className="mt-6 bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-bold text-[#1a1a2e]"
          onClick={() => reset()}
        >
          Try again
        </Button>
      </div>
    );
  },
});

function CommunityPage() {
  const navigate = useNavigate();
  const { entry: entryParam } = Route.useSearch();
  const { role, isLoggedIn } = useAppState();
  const { currentUser, userData } = useAuth();

  // Landing always sends entry=public. Dashboard sends entry=workspace.
  // If missing: workspace only when an active Dashboard session exists.
  const entry: CommunityEntry =
    entryParam ?? (hasWorkspaceAppSession() ? "workspace" : "public");

  useEffect(() => {
    persistCommunityEntry(entry);
  }, [entry]);

  const [isWorkspaceIdentity, setIsWorkspaceIdentity] = useState(false);

  useEffect(() => {
    if (entry !== "workspace") {
      setIsWorkspaceIdentity(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const resolved = await resolveCommunityIdentity({
        uid: currentUser?.uid,
        authRole: userData?.role,
        appRole: role,
        fallbackName: userData?.name,
      });
      if (!cancelled) setIsWorkspaceIdentity(resolved.isWorkspaceAccount);
    })();
    return () => {
      cancelled = true;
    };
  }, [entry, currentUser?.uid, userData?.role, userData?.name, role, isLoggedIn]);

  /** Public entry never uses Dashboard navigation — always home. */
  const isWorkspaceView = entry === "workspace" && isWorkspaceIdentity;

  const handleClose = () => {
    try {
      if (!isWorkspaceView) {
        void navigate({ to: "/" });
        return;
      }
      if (role === "investor" || userData?.role === "investor") {
        void navigate({ to: "/app/investor" });
        return;
      }
      if (role === "entrepreneur" || userData?.role === "founder" || userData?.role === "entrepreneur") {
        void navigate({ to: "/founder/dashboard" });
        return;
      }
      if (role === "business" || userData?.role === "business_owner") {
        void navigate({ to: "/app/score" });
        return;
      }
      if (role === "consultant" || userData?.role === "wholesaler") {
        void navigate({ to: "/app/wholesale" });
        return;
      }
      void navigate({ to: "/" });
    } catch {
      window.location.assign("/");
    }
  };

  const backLabel = isWorkspaceView ? "← Back to Dashboard" : "← Back to Home";

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-4 md:p-6">
      <div className="mx-auto max-w-[1400px]">
        <CommunityErrorBoundary onReset={() => window.location.reload()}>
          <ModuleCommunityHub
            onClose={handleClose}
            embedded
            backLabel={backLabel}
            entry={entry}
          />
        </CommunityErrorBoundary>
      </div>
    </div>
  );
}
