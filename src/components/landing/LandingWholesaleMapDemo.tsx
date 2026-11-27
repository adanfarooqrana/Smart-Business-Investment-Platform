import { useEffect, useState } from "react";
import { Check, MapPin, MessageCircle, Search, Store } from "lucide-react";

const DEALERS = [
  { name: "Sterling Mobile Hub", area: "Satellite Town", rating: "4.8" },
  { name: "Gujranwala Accessories Co", area: "GT Road", rating: "4.6" },
  { name: "PakScreen Wholesale", area: "Wapda Town", rating: "4.9" },
  { name: "City Bulk Gadgets", area: "Model Town", rating: "4.5" },
  { name: "Northern Parts Depot", area: "Nowshera Road", rating: "4.7" },
  { name: "Smart Case Traders", area: "Khiali", rating: "4.4" },
] as const;

const FLOW_STEPS = [
  {
    id: "open",
    label: "Open dashboard",
    detail: "Wholesale map opens on your dashboard",
  },
  {
    id: "pin",
    label: "Select Gujranwala",
    detail: "Tap Gujranwala on the map as your supply city",
  },
  {
    id: "search",
    label: "Search category",
    detail: "Search “Mobile Accessories” above the map",
  },
  {
    id: "dealers",
    label: "Dealers appear",
    detail: "5–6 verified wholesalers show near Gujranwala",
  },
  {
    id: "deal",
    label: "Deal done",
    detail: "Message a dealer and close the bulk order",
  },
] as const;

/** Compact map demo: Gujranwala → search → dealers → deal. */
export function LandingWholesaleMapDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % FLOW_STEPS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  const active = FLOW_STEPS[step];
  const showPin = step >= 1;
  const showSearch = step >= 2;
  const showDealers = step >= 3;
  const showDeal = step >= 4;
  const visibleDealers = showDealers ? DEALERS : [];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-amber-50/50 shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.22) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
              Wholesale on the map
            </p>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Find · Message · Deal
            </h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live demo
          </div>
        </div>

        {/* Search bar (appears after Gujranwala is selected) */}
        <div
          className={`mb-2 overflow-hidden transition-all duration-500 ${
            showSearch ? "max-h-14 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                Mobile Accessories
              </p>
              <p className="text-[9px] text-slate-500">Gujranwala · verified wholesalers</p>
            </div>
            {showSearch && step === 2 && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            )}
          </div>
        </div>

        {/* Shorter map stage */}
        <div className="relative h-[150px] w-full overflow-hidden rounded-xl border border-slate-200 bg-[#e8eef5] shadow-inner sm:h-[168px]">
          <div className="absolute left-[10%] top-[20%] h-[50%] w-[40%] rounded-[40%] bg-emerald-200/35 blur-[2px]" />
          <div className="absolute bottom-[10%] right-[12%] h-[45%] w-[36%] rounded-[45%] bg-sky-200/30 blur-[2px]" />

          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 160" aria-hidden>
            <path
              d="M30 40 C100 50, 150 70, 220 55 S320 40, 380 60"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeOpacity="0.4"
            />
            <path
              d="M50 130 C140 100, 200 90, 280 110 S360 120, 390 95"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeOpacity="0.35"
            />
            <path
              d="M160 10 L175 150"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
          </svg>

          <span className="absolute left-[12%] top-[14%] text-[8px] font-semibold uppercase tracking-wide text-slate-400">
            Islamabad
          </span>
          <span className="absolute left-[42%] top-[36%] text-[8px] font-semibold uppercase tracking-wide text-slate-400">
            Lahore
          </span>
          <span className="absolute bottom-[16%] right-[18%] text-[8px] font-semibold uppercase tracking-wide text-slate-400">
            Karachi
          </span>

          {/* Gujranwala pin — between Islamabad & Lahore */}
          <div
            className={`absolute left-[34%] top-[48%] -translate-x-1/2 -translate-y-full transition-all duration-500 ${
              showPin ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            <div className="relative flex flex-col items-center">
              {showPin && (
                <span className="absolute -bottom-0.5 h-7 w-7 animate-ping rounded-full bg-amber-400/45" />
              )}
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/35">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="mt-0.5 rounded-full bg-slate-900 px-2 py-0.5 text-[8px] font-bold text-white shadow">
                Gujranwala
              </span>
            </div>
          </div>

          {/* Small dealer dots around Gujranwala when results load */}
          {showDealers &&
            [
              { left: "28%", top: "42%" },
              { left: "40%", top: "40%" },
              { left: "30%", top: "58%" },
              { left: "42%", top: "55%" },
              { left: "36%", top: "34%" },
              { left: "24%", top: "52%" },
            ].map((pos, i) => (
              <div
                key={i}
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 shadow ring-2 ring-white transition-all duration-500"
                style={{
                  left: pos.left,
                  top: pos.top,
                  transitionDelay: `${i * 80}ms`,
                  opacity: showDealers ? 1 : 0,
                }}
              />
            ))}

          {step === 0 && (
            <div className="absolute inset-x-3 top-2">
              <div className="mx-auto flex max-w-[200px] items-center gap-2 rounded-lg border border-slate-300/80 bg-white/95 px-2.5 py-1.5 shadow-md">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
                  <Store className="h-3 w-3" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-900">Wholesale map</p>
                  <p className="text-[8px] text-slate-500">Dashboard unlocked</p>
                </div>
              </div>
            </div>
          )}

          {showDeal && (
            <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-400">
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg shadow-emerald-500/30">
                <Check className="h-3.5 w-3.5" /> Deal done with Sterling Mobile Hub
              </div>
            </div>
          )}
        </div>

        {/* Dealer list (5–6) */}
        <div
          className={`mt-2 overflow-hidden transition-all duration-500 ${
            showDealers ? "max-h-44 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {visibleDealers.map((d, i) => {
              const isWinner = showDeal && i === 0;
              return (
                <div
                  key={d.name}
                  className={`rounded-lg border px-2 py-1.5 transition-all duration-400 ${
                    isWinner
                      ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300"
                      : "border-slate-200 bg-white"
                  }`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <p className="truncate text-[10px] font-bold text-slate-900">{d.name}</p>
                  <p className="truncate text-[8px] text-slate-500">
                    {d.area} · ★ {d.rating}
                  </p>
                  {isWinner && (
                    <p className="mt-0.5 flex items-center gap-0.5 text-[8px] font-semibold text-emerald-700">
                      <MessageCircle className="h-2.5 w-2.5" /> Messaged · Deal
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <p className="text-sm font-semibold text-slate-900">{active.label}</p>
          <p className="text-xs text-slate-600">{active.detail}</p>
          <div className="flex gap-1.5 pt-1">
            {FLOW_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(i)}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i === step ? "bg-amber-500" : i < step ? "bg-amber-300" : "bg-slate-200"
                }`}
                aria-label={s.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
