import { useEffect, useState, useRef } from "react";

type DataPoint = {
  month: string;
  revenue: string;
  funding: string;
  x: number;
  yRev: number;  // Y coordinate for revenue line
  yFund: number; // Y coordinate for funding line
  detail: string;
};

const POINTS: DataPoint[] = [
  { month: "Month 1", revenue: "PKR 50K", funding: "PKR 0", x: 20, yRev: 130, yFund: 130, detail: "Bootstrapped MVP Launch" },
  { month: "Month 2", revenue: "PKR 120K", funding: "PKR 0", x: 70, yRev: 115, yFund: 130, detail: "Initial Customers Verified" },
  { month: "Month 3", revenue: "PKR 280K", funding: "PKR 0", x: 120, yRev: 98, yFund: 130, detail: "Product-Market Fit Traction" },
  { month: "Month 4", revenue: "PKR 480K", funding: "PKR 0", x: 170, yRev: 82, yFund: 130, detail: "Escrow Pipeline Active" },
  { month: "Month 5", revenue: "PKR 850K", funding: "PKR 5.0M", x: 220, yRev: 58, yFund: 48, detail: "Seed Capital Secured" },
  { month: "Month 6", revenue: "PKR 1.4M", funding: "PKR 5.0M", x: 270, yRev: 38, yFund: 48, detail: "Post-Funding Scaling" },
  { month: "Month 7", revenue: "PKR 2.2M", funding: "PKR 5.0M", x: 320, yRev: 15, yFund: 48, detail: "Operations & Wholesaling" },
];

export function HeroGrowthDashboard() {
  const [hoveredIdx, setHoveredIdx] = useState<number>(4); // Default highlighting Month 5
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * 340;

    let closestIdx = 0;
    let minDiff = Math.abs(POINTS[0].x - svgX);
    for (let i = 1; i < POINTS.length; i++) {
      const diff = Math.abs(POINTS[i].x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoveredIdx(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(4);
  };

  const revPathD = POINTS.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yRev}`).join(" ");
  const fundPathD = POINTS.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yFund}`).join(" ");

  const activePoint = POINTS[hoveredIdx];

  return (
    <div className="relative w-full max-w-[440px] mx-auto flex items-center justify-center">
      {/* Self-contained premium animations */}
      <style>{`
        @keyframes lineDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ambientFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
          50% { transform: translate(25px, -18px) scale(1.15); opacity: 0.65; }
        }
        @keyframes bounceTooltip {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .anim-line-rev {
          stroke-dasharray: 450;
          stroke-dashoffset: 450;
          animation: lineDraw 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-line-fund {
          stroke-dasharray: 450;
          stroke-dashoffset: 450;
          animation: lineDraw 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.25s;
        }
        .anim-node {
          transform-origin: center;
          animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .float-blob-1 {
          animation: ambientFloat 9s ease-in-out infinite alternate;
        }
        .float-blob-2 {
          animation: ambientFloat 12s ease-in-out infinite alternate-reverse;
        }
        .bounce-tip {
          animation: bounceTooltip 2s ease-in-out infinite;
        }
      `}</style>

      {/* Modern, soft ambient gradient meshes in background */}
      <div className="absolute top-1/10 left-1/10 w-48 h-48 rounded-full bg-gradient-to-tr from-amber-400/20 to-transparent blur-3xl float-blob-1 pointer-events-none" />
      <div className="absolute bottom-1/10 right-1/10 w-44 h-44 rounded-full bg-gradient-to-br from-emerald-400/15 to-transparent blur-3xl float-blob-2 pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full overflow-hidden rounded-[24px] border border-slate-150 bg-white/95 p-5 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.06)] backdrop-blur-md">
        {/* Fine background grid */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:16px_16px] opacity-80" />

        {/* Legend / Metrics Header */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Gross Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Investment Raised</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs font-black text-slate-900">{activePoint.month}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{activePoint.detail}</div>
          </div>
        </div>

        {/* Dynamic SVG Graph */}
        <div className="relative z-10 p-1">
          <svg
            ref={svgRef}
            viewBox="0 0 340 150"
            className="w-full h-auto overflow-visible cursor-crosshair select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Grid horizontal lines */}
            <line x1="10" y1="25" x2="330" y2="25" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
            <line x1="10" y1="75" x2="330" y2="75" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
            <line x1="10" y1="125" x2="330" y2="125" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />

            <defs>
              <linearGradient id="rev-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="fund-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Vertical crosshair tracker */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1="15"
                x2={activePoint.x}
                y2="135"
                stroke="rgba(100,116,139,0.25)"
                strokeDasharray="2 2"
                strokeWidth="1.5"
              />
            )}

            {/* Revenue Line */}
            <path
              d={revPathD}
              fill="none"
              stroke="url(#rev-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="anim-line-rev"
            />

            {/* Investment Line */}
            <path
              d={fundPathD}
              fill="none"
              stroke="url(#fund-grad)"
              strokeWidth="3"
              strokeLinecap="round"
              className="anim-line-fund"
            />

            {/* Sequential popping nodes */}
            {POINTS.map((pt, idx) => (
              <g key={idx} className="anim-node" style={{ animationDelay: `${idx * 0.12}s` }}>
                {/* Revenue Node dot */}
                <circle
                  cx={pt.x}
                  cy={pt.yRev}
                  r={hoveredIdx === idx ? 5.5 : 2.5}
                  fill="#d97706"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all duration-200"
                />
                {/* Funding Node dot */}
                <circle
                  cx={pt.x}
                  cy={pt.yFund}
                  r={hoveredIdx === idx ? 5.5 : 2.5}
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all duration-200"
                />
              </g>
            ))}

            {/* Interactive tooltip values */}
            {activePoint && (
              <g
                transform={`translate(${activePoint.x > 240 ? activePoint.x - 110 : activePoint.x + 10}, 30)`}
                className="pointer-events-none bounce-tip"
              >
                <rect x="0" y="0" width="100" height="42" rx="8" fill="#0f172a" opacity="0.95" />
                <text x="10" y="18" fill="#f59e0b" fontSize="9.5" fontWeight="800" fontFamily="sans-serif">
                  Rev: {activePoint.revenue}
                </text>
                <text x="10" y="32" fill="#10b981" fontSize="9.5" fontWeight="800" fontFamily="sans-serif">
                  Fund: {activePoint.funding}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Minimal metrics footer */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider">
          <span>START</span>
          <span>VALUATION: PKR 5.0M</span>
          <span className="text-emerald-500 font-extrabold">ACCELERATING</span>
        </div>
      </div>
    </div>
  );
}
