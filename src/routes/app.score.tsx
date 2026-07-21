import { createFileRoute } from "@tanstack/react-router";
import { BusinessScorePage } from "@/components/business/BusinessScorePage";
import { blockCommunityMemberFromWorkspace } from "@/lib/routeGuards";

export const Route = createFileRoute("/app/score")({
  beforeLoad: () => {
    blockCommunityMemberFromWorkspace();
  },
  component: BusinessScorePage,
});
