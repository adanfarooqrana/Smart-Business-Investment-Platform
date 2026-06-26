import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Business AI Ecosystem — Grow, Score, Scale" },
      {
        name: "description",
        content:
          "Register your business, auto-generate a landing page, score your reputation, get AI consultancy, and unlock AI-driven investment — all in one ecosystem.",
      },
      { property: "og:title", content: "Smart Business AI Ecosystem" },
      { property: "og:description", content: "Your full AI-powered business operating system." },
    ],
  }),
  component: LandingPage,
});
