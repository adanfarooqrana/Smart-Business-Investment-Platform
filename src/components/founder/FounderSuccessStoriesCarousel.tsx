import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react";

type Story = {
  founderName: string;
  idea: string;
  amountFunded: string;
  investorCount: number;
};

const DEFAULT_STORIES: Story[] = [
  { founderName: "Aisha Khan", idea: "EcoPack Solutions", amountFunded: "Rs. 2,500,000", investorCount: 4 },
  { founderName: "Bilal Ahmed", idea: "Smart Rice Trading", amountFunded: "Rs. 1,200,000", investorCount: 2 },
  { founderName: "Sara Malik", idea: "Cafe Loyalty App", amountFunded: "Rs. 800,000", investorCount: 3 },
  { founderName: "Omar Farooq", idea: "Mobile Accessories Hub", amountFunded: "Rs. 3,100,000", investorCount: 5 },
  { founderName: "Fatima Noor", idea: "Organic Dairy Farm", amountFunded: "Rs. 950,000", investorCount: 2 },
];

export function FounderSuccessStoriesCarousel({ stories = DEFAULT_STORIES }: { stories?: Story[] }) {
  const [index, setIndex] = useState(0);
  const visible = 3;

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % stories.length), 4000);
    return () => clearInterval(id);
  }, [stories.length]);

  const displayed = Array.from({ length: visible }, (_, i) => {
    return stories[(index + i) % stories.length];
  });

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <Sparkles className="h-5 w-5 text-[#FFD700]" /> Success Stories
        </h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => setIndex((i) => (i - 1 + stories.length) % stories.length)}
            className="rounded-full p-1.5 text-[#FFD700] hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setIndex((i) => (i + 1) % stories.length)}
            className="rounded-full p-1.5 text-[#FFD700] hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {displayed.map((story, i) => (
          <div
            key={`${story.founderName}-${i}`}
            className="founder-success-glow cursor-pointer rounded-2xl border border-[#FFD700]/30 p-5 transition hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,165,0,0.05))" }}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)" }}
            >
              {story.founderName.charAt(0)}
            </div>
            <p className="font-bold text-white">{story.founderName}</p>
            <p className="text-xs text-[#FFD700]">{story.idea}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-display text-lg font-black text-emerald-400">{story.amountFunded}</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <TrendingUp className="h-3 w-3" /> {story.investorCount} investors
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
