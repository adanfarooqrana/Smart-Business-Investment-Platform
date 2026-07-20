import { Search, Sparkles, Filter, X } from "lucide-react";
import type { InvestorProfile } from "@/hooks/useAppState";

type InvestorFeedSunHeroProps = {
  investor?: InvestorProfile;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchInteract?: () => void;
  ideaCount?: number;
  liveFounderCount?: number;
};

const CATEGORY_OPTIONS = [
  { label: "SaaS / Tech", value: "SaaS / Tech" },
  { label: "Rice / Agriculture", value: "Agrotech" },
  { label: "Food & Beverages", value: "Food & Beverage" },
  { label: "More Options", value: "" },
] as const;

export function InvestorFeedSunHero({
  searchQuery,
  onSearchChange,
  onSearchInteract,
}: InvestorFeedSunHeroProps) {
  const handleCategoryClick = (val: string) => {
    onSearchInteract?.();
    if (val === "") {
      onSearchChange("");
    } else if (searchQuery.toLowerCase().includes(val.toLowerCase())) {
      onSearchChange("");
    } else {
      onSearchChange(val);
    }
  };

  return (
    <div className="investor-sun-hero relative overflow-hidden rounded-2xl border border-orange-300/40 bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 p-5 shadow-xl shadow-orange-600/20 sm:p-6">
      {/* Background ambient currency graphics */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={`money-${i}`}
            className="investor-paisa-rise absolute font-black text-amber-300/30"
            style={{
              left: `${8 + i * 16}%`,
              bottom: "0%",
              fontSize: i % 2 === 0 ? "11px" : "13px",
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2.5 + (i % 3) * 0.5}s`,
            }}
          >
            {i % 2 === 0 ? "₨" : "PKR"}
          </span>
        ))}
      </div>

      <div className="relative z-20 flex flex-col gap-4">
        {/* Banner Main Title */}
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Search Ideas
          </h2>
        </div>

        {/* Keyword Search Input Bar */}
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-100/70" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              onSearchInteract?.();
              onSearchChange(e.target.value);
            }}
            placeholder="Search industry, founder, or keyword..."
            className="h-11 w-full rounded-xl border border-white/25 bg-white/15 pl-10 pr-10 text-sm text-white placeholder:text-orange-100/60 transition-all duration-300 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/25"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-orange-100/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick-Click Category Filter Utility Boxes */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CATEGORY_OPTIONS.map((cat) => {
            const isMoreOptions = cat.label === "More Options";
            const isActive =
              !isMoreOptions &&
              cat.value !== "" &&
              searchQuery.toLowerCase().includes(cat.value.toLowerCase());

            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => handleCategoryClick(cat.value)}
                className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? "border-white bg-white text-orange-950 shadow-md ring-2 ring-white/50 scale-[1.02]"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40"
                }`}
              >
                <span>{cat.label}</span>
                {isMoreOptions ? (
                  <Filter className="h-3.5 w-3.5 opacity-80" />
                ) : (
                  <Sparkles
                    className={`h-3.5 w-3.5 ${
                      isActive ? "text-amber-500 fill-amber-500" : "opacity-60"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

