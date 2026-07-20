import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminKycDashboard } from "@/components/admin/AdminKycDashboard";
import { isAdminSessionValid } from "@/services/adminKycService";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminSessionValid()) {
      navigate({ to: "/admin/login" });
    }
  }, [navigate]);

  if (!isAdminSessionValid()) {
    return null;
  }

  return <AdminKycDashboard />;
}
