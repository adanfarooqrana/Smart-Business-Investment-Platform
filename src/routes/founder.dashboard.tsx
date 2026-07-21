import { createFileRoute } from "@tanstack/react-router";
import { EntrepreneurDashboardPage } from "@/components/entrepreneur/EntrepreneurDashboardPage";
import { blockCommunityMemberFromWorkspace } from "@/lib/routeGuards";

export const Route = createFileRoute("/founder/dashboard")({
  beforeLoad: () => {
    blockCommunityMemberFromWorkspace();
  },
  component: EntrepreneurDashboardPage,
});
