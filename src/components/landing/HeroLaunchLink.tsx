import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Rocket } from "lucide-react";
import { OrbitLaunchTransition } from "@/components/ui/OrbitLaunchTransition";

type HeroLaunchLinkProps = {
  to: string;
  children: React.ReactNode;
  className?: string;
  accent?: string;
  launchLabel?: string;
};

export function HeroLaunchLink({
  to,
  children,
  className = "",
  accent = "#f59e0b",
  launchLabel = "Starting your journey",
}: HeroLaunchLinkProps) {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (launching) return;
    setLaunching(true);
    window.setTimeout(() => navigate({ to }), 1700);
  };

  return (
    <>
      {launching && (
        <OrbitLaunchTransition accent={accent} label={launchLabel} icon={Rocket} />
      )}
      <Link
        to={to}
        onClick={handleClick}
        className={`${className} ${launching ? "pointer-events-none opacity-80" : ""}`}
      >
        {launching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Launching...
          </>
        ) : (
          children
        )}
      </Link>
    </>
  );
}
