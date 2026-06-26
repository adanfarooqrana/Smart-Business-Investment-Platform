import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/entrepreneur")({
  beforeLoad: () => {
    throw redirect({ to: "/founder/dashboard" });
  },
});
