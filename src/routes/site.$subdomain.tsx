import { createFileRoute } from "@tanstack/react-router";
import CustomerSite from "@/pages/CustomerSite";

export const Route = createFileRoute("/site/$subdomain")({
  component: CustomerSiteRoute,
});

function CustomerSiteRoute() {
  const { subdomain } = Route.useParams();
  return <CustomerSite subdomain={subdomain} />;
}
