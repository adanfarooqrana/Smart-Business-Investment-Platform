import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "../contexts/AuthContext";
import { OrbitLaunchTransition } from "@/components/ui/OrbitLaunchTransition";
import { Sparkles, Briefcase, TrendingUp, Boxes, ShieldAlert, KeyRound } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function getLoaderConfig(pathname: string) {
  if (pathname === "/") return { label: "Loading SmartBiz...", accent: "#f59e0b", icon: Sparkles };
  if (pathname.includes("/register")) return { label: "Opening Registration...", accent: "#f59e0b", icon: KeyRound };
  if (pathname.includes("/login")) return { label: "Opening Sign In...", accent: "#f59e0b", icon: KeyRound };
  if (pathname.includes("/admin")) return { label: "Opening Admin Panel...", accent: "#ef4444", icon: ShieldAlert };
  if (pathname.includes("/investor")) return { label: "Opening Investor Desk...", accent: "#10b981", icon: TrendingUp };
  if (pathname.includes("/wholesale")) return { label: "Opening Wholesale Hub...", accent: "#f97316", icon: Boxes };
  return { label: "Opening Workspace...", accent: "#f59e0b", icon: Briefcase };
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentPath]);

  const loader = getLoaderConfig(currentPath);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {loading && (
          <OrbitLaunchTransition
            accent={loader.accent}
            label={loader.label}
            icon={loader.icon}
          />
        )}
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
