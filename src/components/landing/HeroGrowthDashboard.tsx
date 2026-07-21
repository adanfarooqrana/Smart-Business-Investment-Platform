import { useState, useRef } from "react";

type DataPoint = {
  month: string;
  revenue: string;
  funding: string;
  x: number;
  yRev: number;
  yFund: number;
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
  const [hoveredIdx, setHoveredIdx] = useState<number>(4);
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
    <div className="relative mx-auto flex w-full max-w-[440px] items-center justify-center">
      <style>{`
        @keyframes lineDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .anim-line-rev {
          stroke-dasharray: 450;
          stroke-dashoffset: 450;
          animation: lineDraw 2s ease-out forwards;
        }
        .anim-line-fund {
          stroke-dasharray: 450;
          stroke-dashoffset: 450;
          animation: lineDraw 2s ease-out forwards;
          animation-delay: 0.2s;
        }
        .anim-node {
          transform-origin: center;
          animation: popIn 0.4s ease-out both;
        }
      `}</style>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm md:p-4">
        <div className="relative z-10 mb-3 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Gross Revenue
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Investment Raised
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold text-slate-800">{activePoint.month}</div>
            <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
              {activePoint.detail}
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <svg
            ref={svgRef}
            viewBox="0 0 340 150"
            className="h-auto w-full cursor-crosshair select-none overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <line x1="10" y1="25" x2="330" y2="25" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="10" y1="75" x2="330" y2="75" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="10" y1="125" x2="330" y2="125" stroke="#e2e8f0" strokeDasharray="3 3" />

            {activePoint && (
              <line
                x1={activePoint.x}
                y1="15"
                x2={activePoint.x}
                y2="135"
                stroke="#cbd5e1"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            )}

            <path
              d={revPathD}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="anim-line-rev"
            />

            <path
              d={fundPathD}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="anim-line-fund"
            />

            {POINTS.map((pt, idx) => (
              <g key={idx} className="anim-node" style={{ animationDelay: `${idx * 0.1}s` }}>
                <circle
                  cx={pt.x}
                  cy={pt.yRev}
                  r={hoveredIdx === idx ? 5 : 2.5}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all duration-200"
                />
                <circle
                  cx={pt.x}
                  cy={pt.yFund}
                  r={hoveredIdx === idx ? 5 : 2.5}
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all duration-200"
                />
              </g>
            ))}

            {activePoint && (
              <g
                transform={`translate(${activePoint.x > 240 ? activePoint.x - 110 : activePoint.x + 10}, 28)`}
                className="pointer-events-none"
              >
                <rect x="0" y="0" width="100" height="40" rx="8" fill="#ffffff" stroke="#e2e8f0" />
                <text x="10" y="17" fill="#475569" fontSize="9.5" fontWeight="600" fontFamily="sans-serif">
                  Rev: {activePoint.revenue}
                </text>
                <text x="10" y="31" fill="#1e293b" fontSize="9.5" fontWeight="600" fontFamily="sans-serif">
                  Fund: {activePoint.funding}
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-medium tracking-wider text-slate-500">
          <span>START</span>
          <span className="text-slate-800">VALUATION: PKR 5.0M</span>
          <span>ACCELERATING</span>
        </div>
      </div>
    </div>
  );
}
