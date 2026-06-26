import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };

type State = { hasError: boolean; message?: string };

export class InvestorDashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("Investor dashboard error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-orange-500" />
          <h2 className="font-display text-xl font-bold text-foreground">Investor module paused</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Something went wrong loading this section. Your profile data is safe — try again or return to Ideas Feed.
          </p>
          <Button
            className="mt-6"
            onClick={() => this.setState({ hasError: false, message: undefined })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
