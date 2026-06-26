import { createFileRoute } from "@tanstack/react-router";
import { EntrepreneurDashboardPage } from "@/components/entrepreneur/EntrepreneurDashboardPage";

export const Route = createFileRoute("/founder/dashboard")({
  component: EntrepreneurDashboardPage,
});
