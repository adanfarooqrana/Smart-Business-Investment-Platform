import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminKycDashboard } from "@/components/admin/AdminKycDashboard";
import { isAdminSessionValid } from "@/services/adminKycService";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const navigate = useNavigate();

  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    void isAdminSessionValid().then((valid) => {
      if (!active) return;
      if (valid) setAllowed(true);
      else navigate({ to: "/admin/login" });
    });
    return () => { active = false; };
  }, [navigate]);

  return allowed ? <AdminKycDashboard /> : null;
}
