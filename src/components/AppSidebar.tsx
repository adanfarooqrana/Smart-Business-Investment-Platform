import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  MessageSquare,
  Gauge,
  Bot,
  TrendingUp,
  Sparkles,
  Home,
  Handshake,
  User,
  ShieldCheck,
  LogOut,
  Boxes,
  Lightbulb,
  BarChart3,
  Globe,
  LineChart,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/useAppState";
import { useAuth } from "@/contexts/AuthContext";
import { clearCommunitySession } from "@/components/community/CommunityGuestAuthPanel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { role, business, investor, consultant, entrepreneur, isLoggedIn, resetState } = useAppState();
  const { logout } = useAuth();

  // Dynamically assemble items based on active role
  const getSidebarItems = (): Array<{
    title: string;
    url: string;
    icon: typeof MessageSquare;
    search?: Record<string, string>;
  }> => {
    const communityItem = {
      title: "Community Lounge",
      url: "/app/community",
      icon: MessageSquare,
      search: { entry: "workspace" },
    };
    const commonItems = [
      communityItem,
      { title: "BizBoard", url: "/app/bizboard", icon: MessageSquare },
    ];

    if (isLoggedIn && role === "business") {
      return [
        { title: "Ai Website Generate And Manage", url: "/app/score", icon: Gauge },
        { title: "Live Visitors & Reviews", url: "/app/analytics", icon: BarChart3 },
        { title: "Orders & Revenue Analytics", url: "/dashboard/orders", icon: LineChart },
        { title: "AI Strategy Consultant", url: "/app/consultant", icon: Bot },
        { title: "Wholesale Sourcing Hub", url: "/app/wholesale", icon: Boxes },
        communityItem,
      ];
    } else if (isLoggedIn && role === "investor") {
      return [
        { title: "AI Investor Desk", url: "/app/investor", icon: TrendingUp },
        { title: "AI Investment Expert", url: "/app/consultant", icon: Bot },
        communityItem,
      ];
    } else if (isLoggedIn && role === "consultant") {
      return [
        { title: "Wholesale & Supply", url: "/app/wholesale", icon: Boxes },
        { title: "AI Consultant Desk", url: "/app/consultant", icon: Bot },
        ...commonItems,
      ];
    } else if (isLoggedIn && role === "entrepreneur") {
      return [
        { title: "Founder Dashboard", url: "/founder/dashboard", icon: Lightbulb },
        communityItem,
      ];
    } else {
      // Guest
      return [
        { title: "Register Workspace", url: "/app/register", icon: MessageSquare },
        { title: "AI Consultant (Guest)", url: "/app/consultant", icon: Bot },
        { title: "Wholesale Sandbox", url: "/app/wholesale", icon: Boxes },
        ...commonItems,
      ];
    }
  };

  const items = getSidebarItems();

  const handleWorkspaceLogout = async () => {
    try {
      clearCommunitySession();
      await logout();
      resetState();
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("session_token");
          localStorage.removeItem("auth_token");
          sessionStorage.clear();
        } catch {
          /* ignore */
        }
      }
      toast.success("Logged out.");
      void navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error("Logout failed.");
    }
  };
  // Retrieve initials for Avatar
  const getAvatarInitials = () => {
    if (isLoggedIn && role === "business") {
      const businessName =
        String(business.name || "").trim() || "My Business Store";
      return businessName.charAt(0).toUpperCase() || "B";
    }
    if (isLoggedIn && role === "investor" && investor.name) {
      return investor.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    }
    if (isLoggedIn && role === "consultant" && consultant.name) {
      return consultant.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    }
    if (isLoggedIn && role === "entrepreneur" && entrepreneur.name) {
      return entrepreneur.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    }
    return "G";
  };

  const getProfileTitle = () => {
    if (isLoggedIn && role === "business") {
      return String(business.name || "").trim() || "My Business Store";
    }
    if (isLoggedIn && role === "investor") return investor.name || "Vanguard Ventures";
    if (isLoggedIn && role === "consultant") return consultant.name || "Sarah Sterling";
    if (isLoggedIn && role === "entrepreneur") return entrepreneur.name || "Founder";
    return "Guest Advisor";
  };

  const getProfileSubtitle = () => {
    if (isLoggedIn && role === "business") return business.email || "owner@brand.com";
    if (isLoggedIn && role === "investor") return investor.email || "investor@firm.com";
    if (isLoggedIn && role === "consultant") return consultant.email || "sarah@consultant.com";
    if (isLoggedIn && role === "entrepreneur") return entrepreneur.email || "founder@startup.pk";
    return "Public Guest";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-3 px-3 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 shadow-md">
            <Sparkles className="h-5.5 w-5.5 text-white" />
          </div>
          <span className="font-display text-base font-extrabold tracking-tight">Smart Business AI</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11.5px] font-bold uppercase tracking-widest text-sidebar-foreground/80">Workspace Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link
                      to={item.url}
                      search={item.search}
                      className="flex items-center gap-3"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/" className="flex items-center gap-3 text-muted-foreground">
                    <Home className="h-5 w-5" />
                    <span>Back to site</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4.5">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3.5 px-1">
            <Avatar className="h-10 w-10 rounded-2xl bg-amber-500/20 text-xs font-bold text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <AvatarFallback className="rounded-xl bg-transparent">{getAvatarInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col text-left text-[13.5px] truncate">
              <span className="font-bold truncate text-ellipsis overflow-hidden">{getProfileTitle()}</span>
              <span className="text-[11px] text-sidebar-foreground/60 truncate text-ellipsis overflow-hidden">{getProfileSubtitle()}</span>
            </div>
          </div>
          {isLoggedIn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleWorkspaceLogout()}
              className="w-full justify-start gap-3 h-10 px-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-[13.5px]"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
