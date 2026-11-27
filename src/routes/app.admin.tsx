import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAppState } from "@/hooks/useAppState";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import {
  addLandingTestimonial,
  removeLandingTestimonial,
} from "@/services/landingContentService";
import { useLandingTestimonials } from "@/hooks/useLandingTestimonials";
import { syncPlatformStatsToRtdb } from "@/services/platformStatsService";
import { toast } from "sonner";
import {
  ShieldCheck,
  Lock,
  LayoutDashboard,
  Quote,
  Bot,
  Users,
  Building2,
  Wallet,
  MessageSquare,
  Package,
  Trash2,
  Upload,
  Send,
  Sparkles,
  Image as ImageIcon,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authenticateAdmin, clearAdminSession, isAdminSessionValid } from "@/services/adminKycService";

export const Route = createFileRoute("/app/admin")({
  component: AdminPanel,
});



type AdminTab = "monitor" | "quotes" | "agent";

function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    void isAdminSessionValid().then(setAuthed);
  }, []);

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }
  return <AdminConsole onLogout={() => setAuthed(false)} />;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      if (await authenticateAdmin(email, pwd)) {
        onSuccess();
        return;
      }
    } catch { /* Use the same error for inaccessible admin accounts. */ }
    setErr("An authorized Firebase administrator account is required.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl animate-pulse-glow" />
        <div className="absolute right-1/4 bottom-1/4 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <form
        onSubmit={handle}
        className="relative w-full max-w-md rounded-3xl border border-amber-400/30 bg-slate-900/80 p-8 shadow-[0_0_50px_rgba(251,191,36,0.15)] backdrop-blur-xl"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_24px_rgba(251,191,36,0.5)]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">Admin Control Panel</h1>
          <p className="mt-1 text-sm text-slate-400">Authorized access only · InvestBiz AI</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-email" className="text-slate-300">Admin Email</Label>
          <Input id="admin-email" type="email" autoComplete="username" required value={email}
            onChange={(e) => setEmail(e.target.value)} className="border-amber-400/30 bg-slate-800/70 text-white" />
          <Label htmlFor="admin-pwd" className="flex items-center gap-1.5 text-slate-300">
            <Lock className="h-3.5 w-3.5" /> Admin Password
          </Label>
          <Input
            id="admin-pwd"
            type="password"
            value={pwd}
            onChange={(e) => {
              setPwd(e.target.value);
              setErr("");
            }}
            placeholder="Enter admin password"
            className="border-amber-400/30 bg-slate-800/70 text-white placeholder:text-slate-500"
          />
          {err && <p className="text-xs font-medium text-red-400">{err}</p>}
        </div>

        <Button type="submit" className="mt-6 w-full bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white hover:from-amber-400 hover:to-orange-500">
          Unlock Panel
        </Button>

        <Link to="/" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to site
        </Link>
      </form>
    </div>
  );
}

function AdminConsole({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>("monitor");

  const handleLogout = () => {
    void clearAdminSession();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Admin</p>
              <h1 className="font-display text-base font-bold leading-none text-slate-900">Control Panel</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-300 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {([
            { id: "monitor", label: "System Monitor", icon: LayoutDashboard },
            { id: "quotes", label: "Quotes & Images", icon: Quote },
            { id: "agent", label: "AI Agent Control", icon: Bot },
          ] as { id: AdminTab; label: string; icon: typeof LayoutDashboard }[]).map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-amber-300"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "monitor" && <MonitorTab />}
        {tab === "quotes" && <QuotesTab />}
        {tab === "agent" && <AgentTab />}
      </div>
    </div>
  );
}

function MonitorTab() {
  const platformStats = usePlatformStats();
  const landingQuotes = useLandingTestimonials();
  const {
    business,
    investor,
    consultant,
    communityPosts,
    investments,
    sampleOrders,
    investorEntrepreneurMessages,
  } = useAppState();

  const stats = [
    { label: "Business Owners", value: platformStats.businessOwners, sub: "Live RTDB", icon: Building2, color: "from-amber-400 to-orange-500" },
    { label: "Investors", value: platformStats.investors, sub: "Verified", icon: Wallet, color: "from-emerald-400 to-teal-500" },
    { label: "Wholesalers", value: platformStats.wholesalers, sub: "Supply network", icon: Users, color: "from-violet-400 to-purple-500" },
    { label: "Community Posts", value: platformStats.communityPosts || communityPosts?.length || 0, sub: "Strategies", icon: MessageSquare, color: "from-blue-400 to-indigo-500" },
    { label: "Pitched Ideas", value: platformStats.pitchedIdeas, sub: "Investor feed", icon: Wallet, color: "from-rose-400 to-pink-500" },
    { label: "Sample Orders", value: platformStats.sampleOrders || sampleOrders?.length || 0, sub: "Pipeline", icon: Package, color: "from-cyan-400 to-sky-500" },
    { label: "Total Members", value: platformStats.totalMembers, sub: "Ecosystem", icon: Users, color: "from-fuchsia-400 to-pink-500" },
    { label: "Published Quotes", value: landingQuotes.length, sub: "Landing reviews", icon: Quote, color: "from-amber-400 to-yellow-500" },
    { label: "Avg Score", value: platformStats.avgBusinessScore, sub: "/100", icon: LayoutDashboard, color: "from-lime-400 to-green-500" },
    { label: "Messages", value: investorEntrepreneurMessages?.length || 0, sub: "Threads", icon: MessageSquare, color: "from-sky-400 to-blue-500" },
    { label: "Investments", value: investments?.length || 0, sub: "Local deals", icon: Wallet, color: "from-orange-400 to-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <p className="text-xs text-emerald-800">
          Live RTDB stats — graphs landing page par <code className="font-mono text-[10px]">platform_stats</code> se sync hote hain
        </p>
        <Button
          type="button"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          onClick={async () => {
            await syncPlatformStatsToRtdb();
            toast.success("Firebase platform_stats sync ho gaya!");
          }}
        >
          Sync graphs now
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-display text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-600">{s.label}</p>
              <p className="text-[11px] text-slate-400">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Registrations table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-bold text-slate-900">Registrations Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { role: "Business Owner", p: business },
                { role: "Investor", p: investor },
                { role: "Wholesaler", p: consultant },
              ].map((row) => (
                <tr key={row.role} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 pr-4 font-semibold text-slate-700">{row.role}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{row.p?.name || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{row.p?.email || "—"}</td>
                  <td className="py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        row.p?.isRegistered
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.p?.isRegistered ? "Registered" : "Not registered"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[11px] text-slate-400">
          Note: Live monitoring is using local demo state. Database connection will sync real users once configured.
        </p>
      </div>
    </div>
  );
}

const COLOR_PRESETS = [
  "#b45309",
  "#0f766e",
  "#9333ea",
  "#c2410c",
  "#1d4ed8",
  "#be123c",
  "#15803d",
  "#0f172a",
];

function QuotesTab() {
  const testimonialQuotes = useLandingTestimonials();
  const { addTestimonialQuote, removeTestimonialQuote } = useAppState();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Business Owner");
  const [quote, setQuote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSubmit = name.trim() && quote.trim() && imageUrl.trim();

  const submit = async () => {
    if (!canSubmit) return;
    const payload = {
      name: name.trim(),
      role,
      quote: quote.trim(),
      imageUrl: imageUrl.trim(),
      color,
    };
    try {
      await addLandingTestimonial(payload);
      addTestimonialQuote(payload);
      toast.success("Quote Firebase par publish ho gaya!");
    } catch {
      addTestimonialQuote(payload);
      toast.message("Local save — Firebase rules publish karein for live sync");
    }
    setName("");
    setQuote("");
    setImageUrl("");
    setColor(COLOR_PRESETS[0]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-display text-lg font-bold text-slate-900">Add a Quote</h3>
        <p className="mb-5 text-xs text-slate-400">Yeh quote landing page ke "Voices of Growth" section mein live show hoga.</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-name">Person Name</Label>
              <Input id="q-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-role">Role</Label>
              <select
                id="q-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Business Owner</option>
                <option>Investor</option>
                <option>Wholesaler</option>
                <option>Consultant</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-quote">Quote Text</Label>
            <Textarea
              id="q-quote"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="InvestBiz ne meri sales double kar di..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Image</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL..."
              />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="flex-shrink-0 gap-1.5">
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Quote Text Color</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full ring-2 transition-all ${color === c ? "ring-slate-900 scale-110" : "ring-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-slate-200" />
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-600">Live Preview</p>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-2 ring-amber-100">
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-relaxed" style={{ color }}>
                  "{quote || "Aapka quote yahan dikhega..."}"
                </p>
                <p className="mt-1 text-xs font-bold text-slate-700">
                  {name || "Name"} <span className="font-normal text-slate-400">· {role}</span>
                </p>
              </div>
            </div>
          </div>

          <Button onClick={submit} disabled={!canSubmit} className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white hover:from-amber-400 hover:to-orange-500 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> Publish Quote
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-bold text-slate-900">
          Published Quotes <span className="text-sm font-normal text-slate-400">({testimonialQuotes.length})</span>
        </h3>
        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {testimonialQuotes.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Abhi koi quote nahi. Pehla add karein!</p>
          )}
          {testimonialQuotes.map((q) => (
            <div key={q.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <img
                src={q.imageUrl}
                alt={q.name}
                className="h-12 w-12 flex-shrink-0 rounded-xl object-cover ring-2 ring-white"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://ui-avatars.com/api/?name=" + encodeURIComponent(q.name) + "&background=f59e0b&color=fff&size=100";
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium leading-relaxed" style={{ color: q.color }}>
                  "{q.quote}"
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-700">
                  {q.name} <span className="font-normal text-slate-400">· {q.role}</span>
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await removeLandingTestimonial(q.id);
                  } catch {
                    /* local fallback */
                  }
                  removeTestimonialQuote(q.id);
                  toast.success("Quote remove ho gaya");
                }}
                className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Delete quote"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentTab() {
  const state = useAppState();
  const [messages, setMessages] = useState<{ sender: "admin" | "agent"; text: string }[]>([
    { sender: "agent", text: "Assalam-o-Alaikum Admin! Main aapka AI Control Agent hoon. Mujhe Roman Urdu ya English mein command dein — e.g. 'kitne investors registered hain?', 'system status batao', 'quotes count'." },
  ]);
  const [input, setInput] = useState("");

  const respond = (cmd: string): string => {
    const c = cmd.toLowerCase();
    if (c.includes("investor")) {
      return `Abhi ${state.investor?.isRegistered ? 1 : 0} investor registered hai. Total investments: ${state.investments?.length || 0}.`;
    }
    if (c.includes("business") || c.includes("owner")) {
      return `Business owner status: ${state.business?.isRegistered ? "Registered" : "Not registered"}, approval: ${state.business?.isApproved ? "Approved" : "Pending"}. Score: ${state.business?.score ?? "—"}.`;
    }
    if (c.includes("quote")) {
      return `Live quotes: ${state.testimonialQuotes?.length || 0}. Naya quote add karne ke liye 'Quotes & Images' tab use karein.`;
    }
    if (c.includes("post") || c.includes("community")) {
      return `Community mein ${state.communityPosts?.length || 0} posts hain.`;
    }
    if (c.includes("order")) {
      return `Sample orders pipeline mein ${state.sampleOrders?.length || 0} orders hain.`;
    }
    if (c.includes("status") || c.includes("system") || c.includes("monitor")) {
      return `System Status ✅\n• Business: ${state.business?.isRegistered ? "active" : "idle"}\n• Investors deals: ${state.investments?.length || 0}\n• Community posts: ${state.communityPosts?.length || 0}\n• Live quotes: ${state.testimonialQuotes?.length || 0}\n• Messages: ${state.investorEntrepreneurMessages?.length || 0}`;
    }
    return "Command samajh gaya. Real-time database actions tab available honge jab DB connect hoga. Filhaal main monitoring aur reporting kar sakta hoon — 'system status', 'investors', 'quotes', 'orders' try karein.";
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const reply = respond(text);
    setMessages((m) => [...m, { sender: "admin", text }, { sender: "agent", text: reply }]);
    setInput("");
  };

  const quickCmds = ["System status batao", "Kitne investors hain?", "Quotes count", "Community posts?"];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
        <div className="flex items-center gap-2 border-b border-amber-400/20 px-5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_12px_rgba(251,191,36,0.5)]">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">AI Control Agent</p>
            <p className="text-[11px] text-emerald-400">● Online · monitoring system</p>
          </div>
        </div>

        <div className="h-[360px] space-y-3 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                  m.sender === "admin"
                    ? "rounded-br-sm bg-gradient-to-br from-amber-500 to-orange-500 text-white"
                    : "rounded-bl-sm border border-amber-400/30 bg-slate-800/90 text-amber-50"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-amber-400/20 p-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quickCmds.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="rounded-full border border-amber-400/30 bg-slate-800/60 px-2.5 py-1 text-[10px] font-medium text-amber-100/90"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Command dein..."
              className="w-full rounded-xl border border-amber-400/25 bg-slate-800/70 px-4 py-2.5 pr-12 text-xs text-amber-100 placeholder:text-amber-100/40 outline-none focus:border-amber-400/50"
            />
            <button
              onClick={send}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_12px_rgba(251,191,36,0.5)]"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
