import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; onReset?: () => void };

type State = { hasError: boolean; message: string };

export class CommunityErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: String(error?.message || "Unknown error") };
  }

  componentDidCatch(error: Error) {
    console.error("Community lounge error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-[#FFD700]/20 p-8 text-center"
          style={{ background: "#1a1a2e" }}
        >
          <AlertCircle className="mb-4 h-12 w-12 text-[#FFA500]" />
          <h2 className="text-lg font-bold text-white">Community could not load</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Something went wrong. Please try again — your dashboard data is safe.
          </p>
          {this.state.message ? (
            <p className="mt-2 max-w-md break-words font-mono text-[10px] text-slate-500">{this.state.message}</p>
          ) : null}
          <Button
            className="mt-6 bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-bold text-[#1a1a2e]"
            onClick={() => {
              this.setState({ hasError: false, message: "" });
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
