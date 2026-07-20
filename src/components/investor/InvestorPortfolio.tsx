import { useEffect, useMemo, useState } from "react";
import {
  Building,
  DollarSign,
  PieChart,
  TrendingUp,
  Award,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import {
  streamInvestorPortfolio,
  requireActiveInvestorUid,
  peekActiveInvestorUid,
  type PortfolioInvestmentNode,
} from "@/services/investorCoreService";

type PortfolioRow = {
  id: string;
  pitchId: string;
  title: string;
  category: string;
  amountText: string;
  amountPkr: number;
  expectedRoi: string;
  equityPercent: string;
  date: string;
  status: "approved";
  timestamp: number;
};

/**
 * Build one portfolio row from a unique my_portfolio/{pitchId} route key.
 * Route key is always authoritative — never inherit a stale nested pitchId.
 */
function rowFromPitchRoute(
  routePitchId: string,
  item: PortfolioInvestmentNode,
): PortfolioRow {
  const pitchId = String(routePitchId || "").trim();
  const title = String(item?.businessName || item?.startupTitle || "").trim() || pitchId;
  const amountPkr = Number(item?.amountPkr) || 0;
  const equity = Number(item?.equityPercent) || 0;

  return {
    id: pitchId,
    pitchId,
    title,
    category: String(item?.industry || item?.category || "General").trim(),
    amountText: String(item?.amount || `PKR ${amountPkr.toLocaleString()}`).trim(),
    amountPkr,
    expectedRoi: String(item?.expectedRoi || "").trim(),
    equityPercent:
      equity > 0
        ? `${equity}%`
        : String(item?.terms || "").trim() || "—",
    date: String(item?.date || "Recent").trim(),
    status: "approved",
    timestamp: Number(item?.timestamp) || 0,
  };
}

/**
 * Convert stream payload → unique Map by pitchId (RTDB object keys).
 * Prevents Tim Hortans / Calculator Pro index-collision bleed.
 */
function toUniquePitchRows(items: PortfolioInvestmentNode[]): PortfolioRow[] {
  const byPitchId = new Map<string, PortfolioRow>();
  for (const item of items || []) {
    const routePitchId = String(item?.pitchId || item?.id || "").trim();
    if (!routePitchId) continue;
    byPitchId.set(routePitchId, rowFromPitchRoute(routePitchId, item));
  }
  return Array.from(byPitchId.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * My Portfolio — live-only from investors/{uid}/my_portfolio/{pitchId}.
 * Does not merge legacy useAppState investments.
 */
export function InvestorPortfolio() {
  const { currentUser } = useAuth();
  const investorId = String(
    peekActiveInvestorUid() || auth.currentUser?.uid || currentUser?.uid || "",
  ).trim();
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let uid = "";
    try {
      uid = requireActiveInvestorUid(investorId || undefined);
    } catch {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setRows([]);

    // Live root: investors/{auth.uid}/my_portfolio — each child key = unique pitchId
    const unsub = streamInvestorPortfolio(uid, (items) => {
      try {
        if (!active) return;
        setRows(toUniquePitchRows(items));
        setLoading(false);
      } catch (error) {
        console.error("InvestorPortfolio parse error:", error);
        if (active) {
          setRows([]);
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      try {
        unsub();
      } catch (error) {
        console.error("InvestorPortfolio unsub error:", error);
      }
    };
  }, [investorId, currentUser?.uid]);

  const approvedCount = useMemo(() => rows.length, [rows]);
  const totalAmountInvestedPkr = useMemo(
    () => rows.reduce((sum, item) => sum + (item.amountPkr || 0), 0),
    [rows],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading live portfolio…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-5 shadow-sm">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Total Amount Invested
              </p>
              <p className="font-display mt-2 text-2xl sm:text-3xl font-black text-emerald-950">
                {totalAmountInvestedPkr > 0
                  ? `PKR ${totalAmountInvestedPkr.toLocaleString()}`
                  : "PKR 0"}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700/80">Cumulative funds deployed</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-5 shadow-sm">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Total Ideas Invested
              </p>
              <p className="font-display mt-2 text-2xl sm:text-3xl font-black text-amber-950">
                {approvedCount}
              </p>
              <p className="mt-1 text-[11px] text-amber-700/80">Unique active portfolio ventures</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <PieChart className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl border border-slate-200">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Building className="h-6 w-6" />
          </div>
          <p className="font-display text-sm font-bold text-slate-800">
            No active investments in portfolio
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Investments approved via founder Mark as Paid will populate here live.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((inv) => (
            <Card
              key={inv.pitchId}
              className="rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-bold">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-base font-bold text-slate-900">{inv.title}</h4>
                    <p className="text-xs text-slate-500">
                      {inv.category} &bull; Executed {inv.date}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-right">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount Invested
                    </p>
                    <p className="font-display text-base font-black text-slate-900">
                      {inv.amountText}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Expected ROI
                    </p>
                    <p className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      {inv.expectedRoi || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Equity Acquired
                    </p>
                    <p className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                      <Award className="h-3 w-3" />
                      {inv.equityPercent}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
