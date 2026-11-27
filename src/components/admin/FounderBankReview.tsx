import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { backendRequest } from "@/lib/backendClient";
import { dossierCall, errorMessage } from "@/lib/pitchDossier";

type Review = {
  id?: string;
  bankStatus?: "PENDING_REVIEW" | "VERIFIED" | "NEEDS_NEW_EVIDENCE";
  references?: Record<string, { fullName: string; occupation: string; incomeSource: string }>;
  files?: Record<string, { contentType: string }>;
};

export function FounderBankReview({ user, uid, onReady }: { user: User; uid: string; onReady: (ready: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<Review>();
  const [preview, setPreview] = useState<{ url: string; mime: string; part: string }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const path = "/api/admin/founders/" + encodeURIComponent(uid) + "/evidence";

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => {
    let active = true;
    void dossierCall<Review>(user, path).then((value) => {
      if (!active) return;
      setReview(value);
      onReady(!value.id || value.bankStatus === "VERIFIED");
    })
      .catch((problem) => { if (active) setError(errorMessage(problem)); });
    return () => { active = false; };
  }, [user, path, open, onReady]);

  return <details className="mt-4 space-y-3 rounded-xl border border-orange-200 p-3" onToggle={(event) => {
    setOpen(event.currentTarget.open);
    if (!event.currentTarget.open) setPreview(undefined);
  }}>
    <summary className="cursor-pointer font-semibold">Bank evidence and personal references</summary>
    {open && !review && !error && <p role="status">Loading evidence…</p>}
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {review && !review.id && <p>No additional evidence is on file for this founder.</p>}
    {open && review?.id && <>
      <p>Bank evidence · {review.bankStatus === "VERIFIED" ? "Verified" : review.bankStatus === "NEEDS_NEW_EVIDENCE" ? "New evidence requested" : "Pending review"}</p>
      <ul className="space-y-1 text-sm">
        {Object.values(review.references ?? {}).map((row) => <li key={row.fullName}>{row.fullName} · {row.occupation} · Income source {row.incomeSource}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        {Object.entries(review.files ?? {}).filter(([part]) => !part.startsWith("certificate-")).map(([part, metadata]) =>
          <button type="button" className="rounded-lg border p-2 text-sm capitalize" disabled={busy} key={part} onClick={async () => {
            setBusy(true); setError(""); setPreview(undefined);
            try {
              const response = await backendRequest(user, path + "/" + encodeURIComponent(part));
              setPreview({ url: URL.createObjectURL(await response.blob()), mime: metadata.contentType, part });
            } catch (problem) { setError(errorMessage(problem)); }
            finally { setBusy(false); }
          }}>{part.replaceAll("-", " ")}</button>)}
      </div>
      {preview && (preview.mime === "application/pdf" ?
        <object data={preview.url} type="application/pdf" aria-label="Bank statement PDF" className="h-80 w-full">
          <a href={preview.url} download="bank-statement.pdf">Download statement</a>
        </object> : <img className="max-h-72 rounded-lg object-contain" src={preview.url} alt={preview.part.replaceAll("-", " ")} />)}
      <div className="flex flex-wrap gap-2">
        {([["VERIFIED", "Mark bank active and verified"], ["NEEDS_NEW_EVIDENCE", "Request new bank evidence"]] as const).map(([bankStatus, label]) =>
          <button className="rounded-lg bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-950" type="button"
            key={bankStatus} disabled={busy || review.bankStatus === bankStatus} onClick={async () => {
              setBusy(true); setError("");
              try {
                const result = await dossierCall<{ bankStatus: Review["bankStatus"] }>(user, path, "PUT", { submissionId: review.id, bankStatus });
                setReview({ ...review, bankStatus: result.bankStatus });
                onReady(result.bankStatus === "VERIFIED");
              } catch (problem) { setError(errorMessage(problem)); }
              finally { setBusy(false); }
            }}>{label}</button>)}
      </div>
    </>}
  </details>;
}