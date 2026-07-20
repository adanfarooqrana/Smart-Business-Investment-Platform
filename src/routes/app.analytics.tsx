import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useAppState } from "@/hooks/useAppState";
import { db, auth } from "../firebase";
import { ref, onValue } from "firebase/database";
import {
  Globe, TrendingUp, Minus, Users, Eye,
  CheckCircle2, AlertCircle, BarChart3, MessageSquare,
  Package, Bot, Send, Loader2,
  Link2, RefreshCw, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/analytics")({
  component: AnalyticsPage,
});

function dayIdFromDate(d: Date): string {
  return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, "0")}_${String(d.getDate()).padStart(2, "0")}`;
}

const DATE_PRESETS = [
  { label: "Today", days: 1 },
  { label: "2 Days", days: 2 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
];

// ── Component ────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const { isLoggedIn, role, business } = useAppState();
  const navigate = useNavigate();

  // ── Website link state ──
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLinked, setIsLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Live Firebase reviews & visitors
  const [reviews, setReviews] = useState<any[]>([]);
  const [visitorDaily, setVisitorDaily] = useState<Record<string, number>>({});

  // ── Visitor state ──
  const [visitorPreset, setVisitorPreset] = useState(7);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustomRange, setIsCustomRange] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || role !== "business" || !business.isRegistered) {
      navigate({ to: "/app/login" });
      return;
    }

    const uid = auth.currentUser?.uid || business.uid;
    if (!uid) return;

    // 1. Subscribe to profile/subdomain to auto-populate websiteUrl input
    const profileRef = ref(db, `business_owners/${uid}/profile`);
    const unsubProfile = onValue(profileRef, (snap) => {
      if (snap.exists()) {
        const profile = snap.val();
        if (profile.subdomain) {
          const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
          const domain = isLocalhost
            ? `http://localhost:5173/site/${profile.subdomain}`
            : `https://${profile.subdomain}.smartbiz.com`;
          setWebsiteUrl(domain);
          setIsLinked(true);
        }
      }
    });

    // 2. Subscribe to product-specific reviews and flatten them for NLP analytics
    const reviewsRef = ref(db, `business_owners/${uid}/products`);
    const unsubReviews = onValue(reviewsRef, (snap) => {
      if (snap.exists()) {
        const products = snap.val();
        const list = Object.keys(products).flatMap((productId) => {
          const product = products[productId];
          const productReviews = product?.reviews || {};
          return Object.keys(productReviews).map((reviewId) => {
            const review = productReviews[reviewId];
            const rating = Number(review.rating) || 0;
            return {
              id: `${productId}:${reviewId}`,
              name: review.customer_name || "Customer",
              product: product.name || productId,
              productId,
              rating,
              sentiment: rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral",
              text: review.review_text || "",
              date: review.timestamp ? new Date(review.timestamp).toLocaleDateString() : "",
              createdAt: review.timestamp || 0,
            };
          });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setReviews(list);
      } else {
        setReviews([]);
      }
    });

    // 3. Real daily visitor counts
    const visitorsRef = ref(db, `business_owners/${uid}/visitor_daily`);
    const unsubVisitors = onValue(visitorsRef, (snap) => {
      setVisitorDaily(snap.exists() ? snap.val() : {});
    });

    return () => {
      unsubProfile();
      unsubReviews();
      unsubVisitors();
    };
  }, [isLoggedIn, role, business.isRegistered, navigate, business.uid]);

  const visitorChartData = useMemo(() => {
    const days = isCustomRange ? 7 : visitorPreset;
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const id = dayIdFromDate(d);
      data.push({ date: label, visitors: Number(visitorDaily[id] || 0) });
    }
    return data;
  }, [visitorDaily, visitorPreset, isCustomRange]);

  const totalVisitors = useMemo(
    () => visitorChartData.reduce((s, d) => s + d.visitors, 0),
    [visitorChartData]
  );
  const avgDaily = Math.round(totalVisitors / (visitorChartData.length || 1));
  const todayVisitors = Number(visitorDaily[dayIdFromDate(new Date())] || 0);
  const peakVisitors = visitorChartData.length
    ? Math.max(...visitorChartData.map((d) => d.visitors), 0)
    : 0;

  // ── Reviews state ──
  const [selectedProduct, setSelectedProduct] = useState("All Products");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);

  const filteredReviews = useMemo(() => {
    if (selectedProduct === "All Products") return reviews;
    return reviews.filter((r) => r.product === selectedProduct);
  }, [reviews, selectedProduct]);

  const sentimentCounts = useMemo(() => {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    filteredReviews.forEach((r) => {
      const sentiment = r.sentiment || (r.rating >= 4 ? "positive" : r.rating <= 2 ? "negative" : "neutral");
      counts[sentiment as keyof typeof counts]++;
    });
    return counts;
  }, [filteredReviews]);

  const total = filteredReviews.length;
  const sentimentPie = [
    { name: "Positive", value: sentimentCounts.positive, color: "#10b981" },
    { name: "Negative", value: sentimentCounts.negative, color: "#f43f5e" },
    { name: "Neutral", value: sentimentCounts.neutral, color: "#94a3b8" },
  ];

  const productsList = useMemo(() => {
    return ["All Products", ...new Set(reviews.map((r) => r.product).filter(Boolean))];
  }, [reviews]);

  const productStats = useMemo(() => {
    return productsList.slice(1).map((prod) => {
      const revs = reviews.filter((r) => r.product === prod);
      const pos = revs.filter((r) => r.sentiment === "positive" || r.rating >= 4).length;
      const neg = revs.filter((r) => r.sentiment === "negative" || r.rating <= 2).length;
      const neu = revs.filter((r) => r.sentiment === "neutral" || (!r.sentiment && r.rating === 3)).length;
      const avgRating = revs.reduce((s, r) => s + (Number(r.rating) || 0), 0) / (revs.length || 1);
      return { name: prod, positive: pos, negative: neg, neutral: neu, total: revs.length, avgRating: isNaN(avgRating) ? 0 : Math.round(avgRating * 10) / 10 };
    });
  }, [reviews, productsList]);

  const handleLinkWebsite = () => {
    if (!websiteUrl.trim()) { alert("Please enter your website URL."); return; }
    setIsLinking(true);
    setTimeout(() => { setIsLinking(false); setIsLinked(true); }, 800);
  };

  const handleAskAI = () => {
    if (!aiQuestion.trim()) return;
    setIsAiThinking(true);
    setAiAnswer("");
    const q = aiQuestion.toLowerCase();
    setTimeout(() => {
      let answer = "";
      if (q.includes("worst") || q.includes("remove") || q.includes("bad")) {
        const worst = [...productStats].sort((a, b) => b.negative - a.negative)[0];
        if (!worst || worst.total === 0) {
          answer = "You don't have enough review data yet to pinpoint negative outliers. Keep gathering reviews!";
        } else {
          answer = `Based on sentiment data, "${worst.name}" has the most negative reviews (${worst.negative} out of ${worst.total}). Consider reviewing your recipe or packaging. ${worst.negative > 1 ? "I'd recommend gathering more feedback before removing it from the menu." : "Monitor closely over the next 30 days."}`;
        }
      } else if (q.includes("best") || q.includes("popular") || q.includes("positive")) {
        const best = [...productStats].sort((a, b) => b.positive - a.positive)[0];
        if (!best || best.total === 0) {
          answer = "No highly rated products found in your database reviews yet. Share your store link with customers to get feedback!";
        } else {
          answer = `"${best.name}" is your star product with ${best.positive} positive reviews and an average rating of ${best.avgRating}/5. Consider promoting it more prominently on your landing page.`;
        }
      } else if (q.includes("visitor") || q.includes("traffic")) {
        answer = `In the last ${visitorPreset} days, you had ${totalVisitors.toLocaleString()} total visitors with a daily average of ${avgDaily}. Today alone you received ${todayVisitors} visitors. Your traffic is growing — consider adding a promotional offer to convert more visitors to customers.`;
      } else if (q.includes("neutral")) {
        answer = `You have ${sentimentCounts.neutral} neutral reviews overall. Neutral reviews often mean customers are satisfied but not wowed. Try adding a loyalty discount or personalised follow-up message to turn them into promoters.`;
      } else {
        const topProd = [...productStats].sort((a, b) => b.avgRating - a.avgRating)[0];
        answer = `Based on your analytics: You have ${sentimentCounts.positive} positive, ${sentimentCounts.negative} negative, and ${sentimentCounts.neutral} neutral reviews. ${topProd ? `Your top performer is "${topProd.name}".` : ""} Daily visitors average ${avgDaily}. Would you like a deeper breakdown of any specific product or time range?`;
      }
      setAiAnswer(answer);
      setIsAiThinking(false);
    }, 1200);
  };

  if (!isLoggedIn || role !== "business" || !business.isRegistered) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#D97706]" /></div>;
  }

  const positivePct = total ? Math.round((sentimentCounts.positive / total) * 100) : 0;
  const negativePct = total ? Math.round((sentimentCounts.negative / total) * 100) : 0;
  const neutralPct = total ? Math.round((sentimentCounts.neutral / total) * 100) : 0;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-display pb-20 selection:bg-[#D97706]/20">

      {/* ── Page Header ── */}
      <div className="w-full max-w-[1440px] mx-auto px-6 md:px-8 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 font-display flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#D97706]/10 text-[#D97706]">
                <BarChart3 className="h-5 w-5" />
              </span>
              Live Visitors & Reviews
            </h1>
            <p className="text-xs text-slate-500 mt-1 ml-11">Real-time traffic analytics and sentiment intelligence for your micro-landing page.</p>
          </div>
          <Badge className={`text-xs font-bold px-4 py-2 rounded-full border-none ${isLinked ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200/60 text-slate-500"}`}>
            {isLinked ? <><CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5" />Page Synced</> : <><Globe className="h-3.5 w-3.5 inline mr-1.5" />Not Connected</>}
          </Badge>
        </div>
      </div>

      <div className="w-full max-w-[1440px] mx-auto px-6 md:px-8 pb-8 space-y-8">

        {/* ── 1. Website Link Input ── */}
        <Card className="rounded-3xl border-slate-200 bg-white shadow-md overflow-hidden">
          <CardHeader className="bg-[#0B0F19] text-white p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center text-[#D97706]">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-white">Connect Your Live Website</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">Paste your deployed landing page URL to start syncing visitor data and reviews.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex gap-3 max-w-2xl">
              <div className="relative flex-1">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="https://cakeshub.smartbiz.ai"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isLinked}
                  className="pl-9 h-11 text-sm rounded-2xl border-slate-200 bg-[#F8FAFC]"
                />
              </div>
              <button
                onClick={handleLinkWebsite}
                disabled={isLinked || isLinking}
                className={`h-11 px-6 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isLinked
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600"
                    : "bg-[#D97706] hover:bg-[#D97706]/90 text-white shadow-md"
                }`}
              >
                {isLinking && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLinked ? <><CheckCircle2 className="h-4 w-4" /> Connected</> : "Connect & Sync"}
              </button>
              {isLinked && (
                <button
                  onClick={() => { setIsLinked(false); setWebsiteUrl(""); }}
                  className="h-11 px-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
            {isLinked && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Live data sync active — scraping visitor logs and review feeds every 60 seconds.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 2. Visitor Statistics ── */}
        <div>
          <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#D97706]" /> Visitor Intelligence
          </h2>

          {/* Stat Cards Row */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            {/* Today */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Today</p>
                    <p className="text-4xl font-black text-slate-900 mt-1">{todayVisitors.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Live Visitors</p>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-[#D97706]/10 flex items-center justify-center text-[#D97706]">
                    <Eye className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-slate-500 font-bold flex items-center gap-1">
                  <Minus className="h-3 w-3" /> From live storefront visits
                </div>
              </CardContent>
            </Card>
            {/* Period Total */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Period Total</p>
                    <p className="text-4xl font-black text-slate-900 mt-1">{totalVisitors.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{visitorChartData.length}-day window</p>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-slate-500 font-bold flex items-center gap-1">
                  <Minus className="h-3 w-3" /> Avg {avgDaily}/day
                </div>
              </CardContent>
            </Card>
            {/* Peak Day */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Peak Day</p>
                    <p className="text-4xl font-black text-slate-900 mt-1">{peakVisitors.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Most visits in a day</p>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-slate-500 font-bold flex items-center gap-1">
                  <Minus className="h-3 w-3" /> Based on visitor_daily
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Date Range Selector + Chart */}
          <Card className="rounded-3xl border-slate-200 bg-white shadow-md overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-display text-base font-extrabold text-slate-900">Visitor Traffic Curve</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Daily unique visitors aggregated from your live landing page.</CardDescription>
                </div>
                {/* Preset Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { setVisitorPreset(p.days); setIsCustomRange(false); }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        !isCustomRange && visitorPreset === p.days
                          ? "bg-[#D97706] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Range:</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => { setCustomFrom(e.target.value); setIsCustomRange(true); }}
                    className="h-9 text-xs rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 outline-none focus:border-[#D97706] transition"
                  />
                  <span className="text-xs text-slate-400 font-bold">→</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => { setCustomTo(e.target.value); setIsCustomRange(true); }}
                    className="h-9 text-xs rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 outline-none focus:border-[#D97706] transition"
                  />
                </div>
                {isCustomRange && (
                  <button
                    onClick={() => { setIsCustomRange(false); setCustomFrom(""); setCustomTo(""); setVisitorPreset(7); }}
                    className="text-xs text-[#D97706] font-bold hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visitorChartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tick={{ fill: "#94a3b8" }} />
                    <YAxis stroke="#94a3b8" fontSize={9} tick={{ fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "none", borderRadius: "12px", fontSize: "11px", color: "#fff" }}
                      labelStyle={{ color: "#D97706", fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="visitors" stroke="#D97706" strokeWidth={2.5} fill="url(#visitorGrad)" name="Visitors" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 3. Sentiment Analysis & Reviews ── */}
        <div>
          <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#D97706]" /> Sentiment Intelligence
          </h2>

          {/* Product Filter */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {productsList.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedProduct(p)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedProduct === p
                    ? "bg-[#D97706] text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {p === "All Products" ? <><Package className="h-3 w-3 inline mr-1.5" />{p}</> : p}
              </button>
            ))}
          </div>

          {/* Overall Sentiment Stats + Pie */}
          <div className="grid gap-6 lg:grid-cols-[1fr_280px] mb-6">
            {/* Stats cards */}
            <div className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Positive", count: sentimentCounts.positive, pct: positivePct, icon: CheckCircle2, color: "emerald", bg: "bg-emerald-500/5", border: "border-emerald-200", text: "text-emerald-600", iconColor: "text-emerald-500" },
                  { label: "Negative", count: sentimentCounts.negative, pct: negativePct, icon: AlertCircle, color: "rose", bg: "bg-rose-500/5", border: "border-rose-200", text: "text-rose-600", iconColor: "text-rose-500" },
                  { label: "Neutral", count: sentimentCounts.neutral, pct: neutralPct, icon: Minus, color: "slate", bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", iconColor: "text-slate-400" },
                ].map((s) => (
                  <Card key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} shadow-none`}>
                    <CardContent className="p-4 text-center space-y-1">
                      <s.icon className={`h-5 w-5 mx-auto ${s.iconColor}`} />
                      <p className={`text-3xl font-black ${s.text}`}>{s.count}</p>
                      <p className={`text-[10px] font-bold uppercase ${s.text}`}>{s.label}</p>
                      <div className={`text-lg font-extrabold ${s.text}`}>{s.pct}%</div>
                      {/* Mini bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${s.label === "Positive" ? "bg-emerald-500" : s.label === "Negative" ? "bg-rose-500" : "bg-slate-400"}`}
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Review Feed */}
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="p-5 border-b border-slate-100 pb-4">
                  <CardTitle className="text-sm font-extrabold text-slate-900">Review Feed</CardTitle>
                  <CardDescription className="text-xs text-slate-500">{filteredReviews.length} reviews for {selectedProduct}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3 max-h-[320px] overflow-y-auto">
                  {filteredReviews.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-semibold text-xs">
                      No reviews received yet. Share your store link with customers to get feedback!
                    </div>
                  ) : (
                    filteredReviews.map((rev) => (
                      <div key={rev.id} className={`rounded-xl p-3.5 border flex flex-col gap-1.5 ${
                        rev.sentiment === "positive" ? "bg-emerald-500/4 border-emerald-100" :
                        rev.sentiment === "negative" ? "bg-rose-500/4 border-rose-100" :
                        "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-extrabold text-slate-800">{rev.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2">{rev.date || new Date(rev.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-full border-none ${
                              rev.sentiment === "positive" ? "bg-emerald-100 text-emerald-700" :
                              rev.sentiment === "negative" ? "bg-rose-100 text-rose-700" :
                              "bg-slate-200 text-slate-600"
                            }`}>
                              {rev.sentiment || (rev.rating >= 4 ? "positive" : rev.rating <= 2 ? "negative" : "neutral")}
                            </Badge>
                            <span className="text-[10px] text-[#D97706] font-bold">{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 font-semibold">{rev.product}</p>
                        <p className="text-xs text-slate-700 leading-relaxed italic">"{rev.text}"</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pie Chart */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm flex flex-col">
              <CardHeader className="p-5 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-extrabold text-slate-900">Sentiment Breakdown</CardTitle>
                <CardDescription className="text-xs text-slate-500">Out of {total} total reviews</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
                <PieChart width={220} height={180}>
                  <Pie data={sentimentPie} cx={110} cy={85} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {sentimentPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", fontSize: "11px", color: "#fff" }} />
                </PieChart>
                <div className="w-full mt-2 space-y-2">
                  {sentimentPie.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-slate-600 font-semibold">{s.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-800">{s.value} ({total ? Math.round(s.value / total * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── 4. Product-wise Statistics ── */}
        <div>
          <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-[#D97706]" /> Product-Wise Performance
          </h2>
          <div className="grid gap-5 sm:grid-cols-3 mb-6">
            {productStats.map((p) => {
              const posP = p.total ? Math.round((p.positive / p.total) * 100) : 0;
              const negP = p.total ? Math.round((p.negative / p.total) * 100) : 0;
              const neuP = p.total ? Math.round((p.neutral / p.total) * 100) : 0;
              const isAtRisk = negP > 30;
              return (
                <Card key={p.name} className={`rounded-2xl border shadow-sm ${isAtRisk ? "border-rose-200 bg-rose-500/3" : "border-slate-200 bg-white"}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900 leading-tight">{p.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.total} reviews · avg {p.avgRating}★</p>
                      </div>
                      {isAtRisk ? (
                        <Badge className="bg-rose-100 text-rose-700 border-none text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">⚠ At Risk</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">✓ Healthy</Badge>
                      )}
                    </div>

                    {/* Stacked bar */}
                    <div className="space-y-1.5">
                      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 transition-all" style={{ width: `${posP}%` }} />
                        <div className="bg-rose-500 transition-all" style={{ width: `${negP}%` }} />
                        <div className="bg-slate-300 transition-all" style={{ width: `${neuP}%` }} />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-500">
                        <span className="text-emerald-600">{posP}% pos</span>
                        <span className="text-rose-600">{negP}% neg</span>
                        <span>{neuP}% neu</span>
                      </div>
                    </div>

                    {/* Per-sentiment counts */}
                    <div className="grid grid-cols-3 gap-1">
                      {[{ label: "Good", count: p.positive, cls: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                        { label: "Bad", count: p.negative, cls: "text-rose-600 bg-rose-50 border-rose-100" },
                        { label: "Neutral", count: p.neutral, cls: "text-slate-600 bg-slate-50 border-slate-100" }
                      ].map((s) => (
                        <div key={s.label} className={`rounded-lg border p-2 text-center ${s.cls}`}>
                          <p className="text-base font-black">{s.count}</p>
                          <p className="text-[9px] font-bold uppercase">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {isAtRisk && (
                      <p className="text-[10px] text-rose-600 font-semibold leading-relaxed rounded-lg bg-rose-50 border border-rose-100 p-2">
                        ⚠ High negative rate. Consider reviewing quality control or gathering more customer feedback.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Product comparison bar chart */}
          <Card className="rounded-3xl border-slate-200 bg-white shadow-md overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="font-display text-base font-extrabold text-slate-900">Comparative Sentiment Chart</CardTitle>
              <CardDescription className="text-xs text-slate-500">Side-by-side positive vs negative review count per product.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productStats} margin={{ top: 4, right: 8, bottom: 0, left: -20 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tick={{ fill: "#94a3b8" }} tickFormatter={(v: string) => v.split(" ").slice(0, 2).join(" ")} />
                    <YAxis stroke="#94a3b8" fontSize={9} tick={{ fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "none", borderRadius: "12px", fontSize: "11px", color: "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "12px" }} />
                    <Bar dataKey="positive" name="Positive" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="negative" name="Negative" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="neutral" name="Neutral" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 5. AI Ask Box ── */}
        <Card className="rounded-3xl border-slate-200 bg-[#0B0F19] shadow-xl overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/20 flex items-center justify-center text-[#D97706]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-white">AI Analytics Advisor</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">Ask anything about your visitors, reviews, or product performance.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Suggested questions */}
            <div className="flex flex-wrap gap-2">
              {[
                "Which product has worst reviews?",
                "What's my best performing product?",
                "How are my visitor numbers?",
                "How to improve neutral reviews?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setAiQuestion(q); }}
                  className="px-3.5 py-2 rounded-full text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer border border-slate-700 hover:border-[#D97706]/40"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* AI Response */}
            {(aiAnswer || isAiThinking) && (
              <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
                {isAiThinking ? (
                  <div className="flex items-center gap-2 text-[#D97706]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-semibold">Analyzing your data...</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed">{aiAnswer}</p>
                )}
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Which product should I remove from the menu?"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
                className="h-11 text-xs rounded-2xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-[#D97706]"
              />
              <button
                onClick={handleAskAI}
                disabled={isAiThinking || !aiQuestion.trim()}
                className="h-11 px-5 rounded-2xl bg-[#D97706] hover:bg-[#D97706]/90 text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isAiThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Ask AI
              </button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
