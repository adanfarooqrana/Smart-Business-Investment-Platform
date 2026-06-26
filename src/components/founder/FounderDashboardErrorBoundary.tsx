import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

type Props = { children: ReactNode };

type State = { hasError: boolean; message: string };

export class FounderDashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error) {
    console.error("Founder dashboard error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
          style={{ background: "#1a1a2e" }}
        >
          <AlertCircle className="mb-4 h-12 w-12 text-[#FFA500]" />
          <h2 className="font-display text-xl font-bold text-white">Dashboard could not load</h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Something went wrong while loading your founder workspace. Your account data is safe — try reloading.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-bold text-[#1a1a2e]"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
            <Link
              to="/app/login"
              className="inline-flex items-center justify-center rounded-md border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
            >
              Back to login
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
