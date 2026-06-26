import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; onReset?: () => void };

type State = { hasError: boolean };

export class CommunityErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Community lounge error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-[#FFD700]/20 p-8 text-center"
          style={{ background: "#1a1a2e" }}
        >
          <AlertCircle className="mb-4 h-12 w-12 text-[#FFA500]" />
          <h2 className="text-lg font-bold text-white">Community could not load</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Something went wrong. Please try again — your dashboard data is safe.
          </p>
          <Button
            className="mt-6 bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-bold text-[#1a1a2e]"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset?.();
            }}
          >
            Reload Community
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
