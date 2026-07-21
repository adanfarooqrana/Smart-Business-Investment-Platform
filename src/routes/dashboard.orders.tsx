import { createFileRoute } from "@tanstack/react-router";
import OrdersAnalytics from "@/pages/OrdersAnalytics";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAppState } from "@/hooks/useAppState";
import { blockCommunityMemberFromWorkspace } from "@/lib/routeGuards";

export const Route = createFileRoute("/dashboard/orders")({
  beforeLoad: () => {
    blockCommunityMemberFromWorkspace();
  },
  component: DashboardOrdersLayout,
});

function DashboardOrdersLayout() {
  const { role } = useAppState();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 font-display">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="text-sm text-slate-400">
                Workspace &middot; <span className="font-bold text-slate-900 capitalize">{role} Mode</span>
              </div>
            </div>
          </header>
          <main className="flex-1">
            <OrdersAnalytics />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
