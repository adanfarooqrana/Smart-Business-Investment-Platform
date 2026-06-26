import { createFileRoute, Outlet, useRouterState, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAppState } from "@/hooks/useAppState";
import { useState } from "react";
import { Sparkles, Terminal, ChevronDown, ChevronUp, RefreshCw, Briefcase, Eye, Bot, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { role, setRole, registerBusiness, registerInvestor, registerConsultant, resetState, business, investor, isLoggedIn } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const simulateBusiness = () => {
    registerBusiness({
      name: "Luna Bistro",
      category: "Food & Beverage",
      location: "San Francisco, USA",
      size: "12 team members",
      website: "https://lunabistro.smartbiz.ai",
      about: "A organic farm-to-table bistro focusing on high quality lunch items.",
      score: 87
    });
  };

  const simulateInvestor = () => {
    registerInvestor({
      name: "Vanguard Ventures",
      categories: ["Food & Beverage", "SaaS / Tech"],
      budgetRange: "500k-5M PKR",
      ticketSize: "500k-5M PKR",
      location: "Karachi, Pakistan",
      strategy: "Early stage growth with strong reputation scores and positive reviewer sentiment."
    });
  };

  const simulateConsultant = () => {
    registerConsultant({
      name: "Sarah Sterling",
      email: "sarah@consultant.com",
      phone: "+92 300 1234567",
      specialty: "Mobile Accessories",
      experience: "National Shipping",
      location: "Lahore, Pakistan",
      bio: "Verified wholesaler supplying high-quality products to local retail businesses.",
      isRegistered: true,
      isApproved: true,
    });
  };

  const isAuthPage = pathname === "/app/register" || pathname === "/app/login";
  const isCommunityPage = pathname === "/app/community";
  const isEntrepreneurPage =
    pathname === "/app/entrepreneur" || pathname === "/founder/dashboard";

  if (isCommunityPage || isEntrepreneurPage) {
    return (
      <div
        className="min-h-screen w-full flex flex-col animate-in fade-in duration-300"
        style={isEntrepreneurPage ? { backgroundColor: "#FFF8E1" } : undefined}
      >
        <div className="flex-grow w-full">
          <Outlet />
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-white flex flex-col animate-in fade-in duration-300">
        {/* Auth Page Navbar */}
        <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/75 backdrop-blur-xl transition-all duration-300">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 shadow-sm shadow-amber-500/10">
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                Smart Business <span className="text-slate-400">AI</span>
              </span>
            </Link>

            {/* Right Side items */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* Join Community Button styled as white background, black text */}
              <Link
                to="/app/community"
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-4.5 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 transition duration-200 shadow-sm cursor-pointer animate-pulse-glow"
              >
                <svg className="h-4.5 w-4.5 fill-orange-500" viewBox="0 0 20 20">
                  <path d="M17.17 9.83a2.22 2.22 0 0 0-2.22-2.22c-.32 0-.62.07-.9.19-1.12-.82-2.64-1.34-4.33-1.4l.92-2.88 3 .65c0 .77.62 1.4 1.39 1.4a1.4 1.4 0 1 0-1.4-1.4c0 .07 0 .14.02.2l-3.23-.7a.44.44 0 0 0-.53.31l-.98 3.06c-1.74.04-3.3.56-4.44 1.4a2.22 2.22 0 0 0-3.12 3.12c0 .24.04.47.12.69-1.03.88-1.63 2.1-1.63 3.42 0 2.73 3.65 4.95 8.13 4.95s8.13-2.22 8.13-4.95c0-1.33-.6-2.54-1.63-3.42a2.16 2.16 0 0 0 .11-.69zM6.88 11.23a1.22 1.22 0 1 1 0-2.44 1.22 1.22 0 0 1 0 2.44zm6.24 3.7c-1 .99-2.88.99-3.87 0a.38.38 0 0 1 .53-.53c.69.7 2.12.7 2.8 0a.38.38 0 0 1 .54.53zm-.33-3.7a1.22 1.22 0 1 1 0-2.44 1.22 1.22 0 0 1 0 2.44z"/>
                </svg>
                <span>Join Community</span>
              </Link>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              {pathname === "/app/login" ? (
                <Link
                  to="/app/register"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 duration-200 shadow-md"
                >
                  Sign Up
                </Link>
              ) : (
                <Link
                  to="/app/login"
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                >
                  Login
                </Link>
              )}
            </div>

          </div>
        </header>

        {/* Content Body — flush, no gap */}
        <div className="flex-1 w-full">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 font-display">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
          {pathname !== "/app/score" && (
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="text-sm text-slate-400">
                  Workspace &middot; <span className="font-bold text-slate-900 capitalize">{role === "consultant" ? "Wholesaler" : role} Mode</span>
                </div>
              </div>
              {/* Minimal Header Dev Indicator */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Terminal className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span>Dev Controls</span>
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </header>
          )}

          {/* Dev Controller Drawer/Panel */}
          {isOpen && (
            <div className="border-b border-slate-200 bg-white p-4 animate-in slide-in-from-top duration-200 shadow-sm">
              <div className="mx-auto max-w-5xl">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-900">Ecosystem Sandbox Simulator</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="text-slate-500 mr-2 text-xs font-medium">Active Simulator:</span>
                  <Button
                    size="sm"
                    variant={role === "guest" ? "default" : "outline"}
                    onClick={() => {
                      resetState();
                      setRole("guest");
                    }}
                    className={role === "guest" ? "bg-slate-900 text-white rounded-full" : "rounded-full border-slate-200"}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Guest / Public
                  </Button>
                  <Button
                    size="sm"
                    variant={role === "business" ? "default" : "outline"}
                    onClick={simulateBusiness}
                    className={role === "business" ? "bg-slate-900 text-white rounded-full" : "rounded-full border-slate-200"}
                  >
                    <Briefcase className="h-3.5 w-3.5 mr-1" /> Business Owner (Luna Bistro)
                  </Button>
                  <Button
                    size="sm"
                    variant={role === "investor" ? "default" : "outline"}
                    onClick={simulateInvestor}
                    className={role === "investor" ? "bg-slate-900 text-white rounded-full" : "rounded-full border-slate-200"}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Investor (Vanguard Ventures)
                  </Button>
                  <Button
                    size="sm"
                    variant={role === "consultant" ? "default" : "outline"}
                    onClick={simulateConsultant}
                    className={role === "consultant" ? "bg-amber-500 text-white hover:bg-amber-600 rounded-full" : "rounded-full border-slate-200"}
                  >
                    <Boxes className="h-3.5 w-3.5 mr-1" /> Wholesaler (Sarah Sterling)
                  </Button>
                  <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      resetState();
                      setIsOpen(false);
                    }}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 ml-auto rounded-full"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Wipe Data
                  </Button>
                </div>
                <p className="mt-2.5 text-[11px] text-slate-400">
                  *Quick-switches let you immediately view dashboards, score pages, or simulated investor offers without filling forms.
                </p>
              </div>
            </div>
          )}

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

