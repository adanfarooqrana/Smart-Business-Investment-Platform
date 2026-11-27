import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FounderWorkspaceProfile } from "@/components/founder/FounderWorkspaceProfile";
import { useAuth } from "@/contexts/AuthContext";
import { blockCommunityMemberFromWorkspace } from "@/lib/routeGuards";

export const Route = createFileRoute("/founder/profile")({
  beforeLoad: () => blockCommunityMemberFromWorkspace(),
  component: FounderProfilePage,
});

function FounderProfilePage() {
  const { currentUser, loading } = useAuth();
  return <main className="min-h-screen bg-[#0B132B] px-4 py-8">
    <div className="mx-auto max-w-4xl space-y-4">
      <Link className="inline-flex items-center gap-2 font-semibold text-orange-200" to="/founder/dashboard">
        <ArrowLeft size={18} /> Founder dashboard
      </Link>
      <h1 className="text-2xl font-bold text-white">Founder profile</h1>
      <div className="rounded-2xl bg-white p-3 sm:p-5">
        {loading ? <p role="status">Loading your profile…</p> : currentUser ?
          <FounderWorkspaceProfile key={currentUser.uid} user={currentUser} /> :
          <Link className="dossier-primary" to="/app/login">Sign in to your founder account</Link>}
      </div>
    </div>
  </main>;
}