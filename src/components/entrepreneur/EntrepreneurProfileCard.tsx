import { Lightbulb, BadgeCheck, Mail, Phone, CreditCard, Target } from "lucide-react";
import type { EntrepreneurProfile } from "@/services/entrepreneurService";

type Props = {
  fullName: string;
  profileId: string;
  email?: string;
  phone?: string;
  paymentType?: string;
  isVerified?: boolean;
  ideaVision?: string;
  ideaInterest?: string;
  founderGoals?: string;
  firestoreProfile?: EntrepreneurProfile | null;
};

export function EntrepreneurProfileCard({
  fullName,
  profileId,
  email,
  phone,
  paymentType,
  isVerified,
  ideaVision,
  ideaInterest,
  founderGoals,
}: Props) {
  const paymentLabel =
    paymentType === "bank"
      ? "Bank Account"
      : paymentType === "jazzcash"
        ? "JazzCash"
        : paymentType === "easypaisa"
          ? "EasyPaisa"
          : "Payment linked";

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-[#FFA500]/30 bg-white shadow-lg">
      <div
        className="h-2 w-full"
        style={{ background: "linear-gradient(90deg, #FFA500, #FFD700, #FFA500)" }}
      />
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:p-8">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
        >
          <Lightbulb className="h-10 w-10" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#FFA500]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFA500]">
              Entrepreneur / Founder
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                <BadgeCheck className="h-3 w-3" /> Verified Profile
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl font-extrabold text-slate-900">{fullName}</h2>
          <p className="mt-1 font-mono text-sm font-semibold text-[#FFA500]">{profileId}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            {email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#FFA500]" />
                {email}
              </span>
            )}
            {phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#FFA500]" />
                {phone}
              </span>
            )}
            {paymentType && (
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[#FFA500]" />
                {paymentLabel}
              </span>
            )}
          </div>
          {(ideaVision || ideaInterest || founderGoals) && (
            <div className="mt-4 rounded-2xl border border-[#FFD700]/40 bg-[#FFF8E1]/80 p-4 text-sm">
              {ideaInterest && (
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#FFA500]">
                  {ideaInterest}
                </p>
              )}
              {ideaVision && (
                <p className="font-medium text-slate-800 line-clamp-2">{ideaVision}</p>
              )}
              {founderGoals && (
                <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                  <Target className="mr-1 inline h-3 w-3 text-[#FFA500]" />
                  {founderGoals}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
