import { FounderBankReview } from "./FounderBankReview";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Lightbulb,
  Wallet,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Mail,
  Phone,
  IdCard,
  Landmark,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  streamAllKycReviews,
  approveKycReview,
  rejectKycReview,
  clearAdminSession,
  type KycReviewRecord,
  type KycReviewRole,
} from "@/services/adminKycService";

type TabId = KycReviewRole;

const TABS: { id: TabId; label: string; icon: typeof Building2 }[] = [
  { id: "business_owner", label: "Business Owner", icon: Building2 },
  { id: "founder", label: "Entrepreneur", icon: Lightbulb },
  { id: "investor", label: "Investor", icon: Wallet },
  { id: "wholesaler", label: "Wholesaler", icon: Building2 },
];

function MediaPreview({ label, src }: { label: string; src?: string }) {
  const url = String(src || "").trim();
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt={label}
            className="h-36 w-full rounded-xl border border-slate-200 object-cover bg-slate-50"
          />
        </a>
      ) : (
        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
          No image
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  record,
  busyId,
  onApprove,
  onReject,
}: {
  record: KycReviewRecord;
  busyId: string | null;
  onApprove: (uid: string) => void;
  onReject: (uid: string) => void;
}) {
  const { currentUser } = useAuth();
  const [bankReviewReady, setBankReviewReady] = useState(false);
  const busy = busyId === record.uid;
  const pending = record.kycStatus === "pending";
  const isBusinessOwner = record.role === "business_owner";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">
            {record.fullName || "Unnamed applicant"}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{record.uid}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
            record.kycStatus === "approved"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : record.kycStatus === "rejected"
                ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
          }`}
        >
          {record.kycStatus}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Basic Profile
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-800">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold">{record.fullName || "—"}</span>
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-800">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            {record.email || "—"}
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-800">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            {record.phoneNumber || "—"}
          </p>
        </section>

        <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Identity</p>
          <p className="flex items-center gap-2 text-xs text-slate-800">
            <IdCard className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono font-bold">{record.cnic || "—"}</span>
          </p>
        </section>

        {isBusinessOwner ? (
          <section className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-800/80 flex items-center gap-1">
              <Store className="h-3.5 w-3.5" /> Business Meta
            </p>
            <p className="text-xs">
              <span className="text-slate-500">Storefront:</span>{" "}
              <span className="font-semibold text-slate-900">
                {record.businessName?.trim() || "—"}
              </span>
            </p>
            <p className="text-xs">
              <span className="text-slate-500">Trademark:</span>{" "}
              <span className="font-semibold text-slate-900">
                {record.trademark?.trim() || "—"}
              </span>
            </p>
            <p className="text-xs">
              <span className="text-slate-500">Location:</span>{" "}
              <span className="font-semibold text-slate-900">
                {record.location?.trim() || "—"}
              </span>
            </p>
            {record.category?.trim() ? (
              <p className="text-xs">
                <span className="text-slate-500">Category:</span>{" "}
                <span className="font-semibold text-slate-900">{record.category}</span>
              </p>
            ) : null}
            {record.registerNumber?.trim() ? (
              <p className="text-xs">
                <span className="text-slate-500">Register #:</span>{" "}
                <span className="font-mono font-bold text-slate-900">
                  {record.registerNumber}
                </span>
              </p>
            ) : null}
          </section>
        ) : (
          <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80 flex items-center gap-1">
              <Landmark className="h-3.5 w-3.5" /> Bank Details
            </p>
            <p className="text-xs">
              <span className="text-slate-500">Bank Name:</span>{" "}
              <span className="font-semibold text-slate-900">{record.bankName?.trim() || "—"}</span>
            </p>
            <p className="text-xs">
              <span className="text-slate-500">Account Title:</span>{" "}
              <span className="font-semibold text-slate-900">
                {record.accountTitle?.trim() || "—"}
              </span>
            </p>
            <p className="text-xs">
              <span className="text-slate-500">Account / IBAN:</span>{" "}
              <span className="font-mono font-bold text-slate-900">
                {record.accountNumber?.trim() || "—"}
              </span>
            </p>
          </section>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MediaPreview label="ID Card Front" src={record.cnicFrontUrl} />
        <MediaPreview label="ID Card Back" src={record.cnicBackUrl} />
        <MediaPreview label="Live Selfie" src={record.liveSelfieUrl} />
      </div>

      {record.role === "founder" && currentUser && <FounderBankReview user={currentUser} uid={record.uid} onReady={setBankReviewReady} />}

      {pending ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            disabled={busy || (record.role === "founder" && !bankReviewReady)}
            onClick={() => onApprove(record.uid)}
            className="rounded-xl bg-emerald-600 py-5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </>
            )}
          </Button>
          <Button
            disabled={busy}
            variant="destructive"
            onClick={() => onReject(record.uid)}
            className="rounded-xl py-5 text-sm font-bold"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rejecting…
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs font-semibold text-slate-500">
          Decision already recorded — {record.kycStatus}.
        </p>
      )}
    </article>
  );
}

export function AdminKycDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("business_owner");
  const [reviews, setReviews] = useState<KycReviewRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      return streamAllKycReviews(setReviews);
    } catch (err) {
      console.error(err);
      setError("Failed to load KYC queue.");
      return () => undefined;
    }
  }, []);

  const filtered = useMemo(
    () => reviews.filter((r) => r.role === tab && r.kycStatus === "pending"),
    [reviews, tab],
  );

  const decided = useMemo(
    () => reviews.filter((r) => r.role === tab && r.kycStatus !== "pending"),
    [reviews, tab],
  );

  const handleApprove = async (uid: string) => {
    setBusyId(uid);
    setError(null);
    try {
      await approveKycReview(uid);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (uid: string) => {
    setBusyId(uid);
    setError(null);
    try {
      await rejectKycReview(uid);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Reject failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/40">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                Admin Control Panel
              </p>
              <h1 className="font-display text-lg font-bold text-slate-900">KYC Review Console</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-full">
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = reviews.filter((r) => r.role === t.id && r.kycStatus === "pending").length;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-slate-900 text-white shadow"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Pending reviews ({filtered.length})
          </h2>
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
              No pending {TABS.find((t) => t.id === tab)?.label} applications.
            </p>
          ) : (
            filtered.map((r) => (
              <ReviewCard
                key={r.uid}
                record={r}
                busyId={busyId}
                onApprove={(uid) => void handleApprove(uid)}
                onReject={(uid) => void handleReject(uid)}
              />
            ))
          )}
        </section>

        {decided.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Recently decided ({decided.length})
            </h2>
            {decided.slice(0, 8).map((r) => (
              <ReviewCard
                key={`decided-${r.uid}`}
                record={r}
                busyId={null}
                onApprove={() => undefined}
                onReject={() => undefined}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
