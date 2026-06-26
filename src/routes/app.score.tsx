import { createFileRoute } from "@tanstack/react-router";
import { BusinessScorePage } from "@/components/business/BusinessScorePage";

export const Route = createFileRoute("/app/score")({
  component: BusinessScorePage,
});
