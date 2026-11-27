import { useEffect, useState } from "react";
import { BadgeCheck, Building2, GraduationCap, MapPin, Package } from "lucide-react";
import type { User } from "firebase/auth";
import { backendRequest } from "@/lib/backendClient";
import { useAuth } from "@/contexts/AuthContext";
import { dossierCall, errorMessage } from "@/lib/pitchDossier";
import { formatPkr } from "@/lib/investmentCalculator";
import type { Founder, MarketProduct } from "@/components/investor/InvestorMarketplace";
import { emptyFounderEvidence, evidenceImageTypes, founderEvidenceReady, FounderEvidenceFields, submitFounderEvidence } from "./FounderEvidenceFields";

export type FounderCertificate = { id: string; caption: string; url: string };
type ProfilePacket = { founder: Founder; products: MarketProduct[]; bankStatus?: string };
type EvidenceStatus = {
  submitted: boolean;
  bankStatus?: string;
  references?: Record<string, { fullName: string; occupation: string; incomeSource: string }>;
};

export function FounderShowcase({ founder, products, showProducts = true }: {
  founder: Founder; products: MarketProduct[]; showProducts?: boolean;
}) {
  const funded = products.filter((item) => (item.totalProductChunks ?? 0) > 0 && (item.soldChunks ?? 0) >= item.totalProductChunks!);
  const listed = products.filter((item) => !funded.includes(item));
  return <div className="overflow-hidden rounded-2xl bg-[#0B132B] text-white">
    <div className="bg-[radial-gradient(ellipse_at_50%_0%,#844627,transparent_75%)] px-5 pb-5 pt-8 text-center">
      {founder.image ?
        <img className="mx-auto size-24 rounded-full border-4 border-orange-300 object-cover shadow-lg shadow-orange-400/40" src={founder.image} alt={founder.founderName} /> :
        <div className="mx-auto grid size-24 place-items-center rounded-full border-4 border-orange-300 bg-orange-950" aria-hidden="true"><Building2 size={35} /></div>}
      <div className="mt-3 flex items-center justify-center gap-2">
        <p className="text-xl font-bold">{founder.founderName}</p>
        {founder.verified && <BadgeCheck size={22} className="text-orange-300" aria-label={founder.demo ? "Demo verified founder" : "Verified founder"} />}
      </div>
      <p className="text-orange-100">{founder.businessName}</p>
      {!!founder.location && <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-300"><MapPin size={14} />{founder.location}</p>}
      {founder.about && <p className="mx-auto mt-3 max-w-xl whitespace-pre-wrap text-sm text-slate-200">{founder.about}</p>}
      {founder.education && <p className="mt-2 flex items-center justify-center gap-1 text-sm text-slate-200"><GraduationCap size={17} />{founder.education}</p>}
    </div>
    <div className="space-y-5 px-5 pb-5">
      {(founder.certificates?.length ?? 0) > 0 && <section>
        <h3 className="mb-2 font-semibold">Degrees and achievements</h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {founder.certificates?.map((item) => <CertificateImage key={item.id} certificate={item} />)}
        </ul>
      </section>}
      {showProducts && <>
        <ProfileProducts label="Listed products" items={listed} />
        <ProfileProducts label="Fully funded products" items={funded} />
      </>}
    </div>
  </div>;
}

function CertificateImage({ certificate }: { certificate: FounderCertificate }) {
  const { currentUser } = useAuth();
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!currentUser) return;
    const controller = new AbortController();
    let objectUrl = "";
    void backendRequest(currentUser, certificate.url, { signal: controller.signal })
      .then((response) => response.blob()).then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [currentUser, certificate.url]);
  return <li className="rounded-xl bg-slate-800 p-2 text-sm">
    {url ? <a className="block" href={url} target="_blank" rel="noreferrer">
      <img className="aspect-[4/3] w-full rounded-lg bg-slate-900 object-contain" src={url} alt={certificate.caption} />
      <span className="mt-1 block">{certificate.caption}</span>
    </a> : <p className="grid aspect-[4/3] place-items-center rounded-lg bg-slate-900 p-2 text-center">
      {error ? "Certificate preview unavailable" : certificate.caption}
    </p>}
  </li>;
}

function ProfileProducts({ label, items }: { label: string; items: MarketProduct[] }) {
  return <section>
    <h3 className="mb-2 font-semibold">{label}</h3>
    {items.length ? <ul className="grid max-h-72 grid-cols-2 gap-3 overflow-auto pr-1 sm:grid-cols-3">
      {items.map((item) => <li key={item.id} className="dossier-item">
        {item.image ? <img className="aspect-[4/3] w-full object-cover" src={item.image} alt={item.title} loading="lazy" />
          : <div className="grid h-24 place-items-center text-orange-200"><Package /></div>}
        <div className="space-y-1 p-2 text-sm">
          <p className="font-semibold">{item.title}</p>
          {!!item.totalProductChunks && <p>{item.soldChunks ?? 0} / {item.totalProductChunks} chunks funded</p>}
          {!!item.pricePerChunk && <p>{formatPkr(item.pricePerChunk)} per chunk</p>}
        </div>
      </li>)}
    </ul> : <p className="text-sm text-slate-300">No products to show.</p>}
  </section>;
}

export function FounderWorkspaceProfile({ user }: { user: User }) {
  const [packet, setPacket] = useState<ProfilePacket>();
  const [details, setDetails] = useState({ businessName: "", location: "", education: "", about: "" });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState(false);
  const [evidence, setEvidence] = useState(() => emptyFounderEvidence());
  const [refresh, setRefresh] = useState(0);
  const [newCertificates, setNewCertificates] = useState<File[]>([]);
  const [publishCertificates, setPublishCertificates] = useState(false);

  useEffect(() => {
    let active = true;
    void dossierCall<ProfilePacket>(user, "/api/founder-workspace/profile").then((next) => {
      if (!active) return;
      setPacket(next);
      const { businessName, location, education, about } = next.founder;
      setDetails({ businessName, location, education: education ?? "", about: about ?? "" });
    }).catch((problem) => { if (active) setError(errorMessage(problem)); });
    void dossierCall<EvidenceStatus>(user, "/api/founder-workspace/setup").then((next) => {
      if (active) setEvidence(emptyFounderEvidence(next.references));
    }).catch((problem) => { if (active) setError(errorMessage(problem)); });
    return () => { active = false; };
  }, [user, refresh]);

  return <div className="space-y-4 bg-white text-slate-900">
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}</p>}
    {!packet && !error && <p role="status">Loading founder profile…</p>}
    {packet && <>
      <FounderShowcase founder={packet.founder} products={packet.products} />
      <form className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault(); setSaving(true); setError(""); setStatus("");
          try {
            setPacket(await dossierCall<ProfilePacket>(user, "/api/founder-workspace/profile", "PUT", details));
            setStatus("Business profile saved.");
          } catch (problem) { setError(errorMessage(problem)); }
          finally { setSaving(false); }
        }}>
        <h3 className="font-semibold sm:col-span-2">Edit business details</h3>
        {([["businessName", "Business name", 160], ["location", "Location", 160], ["education", "Education", 200], ["about", "About the business", 1500]] as const)
          .map(([field, label, max]) => <label key={field} className="text-sm">{label}
            <input className="mt-1 block w-full rounded-lg border border-slate-300 p-2" maxLength={max}
              required={field === "businessName" || field === "location"} value={details[field]}
              onChange={(event) => setDetails({ ...details, [field]: event.target.value })} />
          </label>)}
        <button className="dossier-primary justify-self-start" disabled={saving} type="submit">Save profile</button>
      </form>
      <form className="space-y-3 rounded-xl border border-slate-200 p-4" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setError(""); setStatus("");
        const form = new FormData();
        newCertificates.forEach((file) => form.append("certificates", file));
        form.append("publish", String(publishCertificates));
        try {
          setPacket(await dossierCall<ProfilePacket>(user, "/api/founder-workspace/certificates", "POST", form));
          setNewCertificates([]);
          setPublishCertificates(false);
          setStatus("Certificates added to your founder profile.");
        } catch (problem) { setError(errorMessage(problem)); }
        finally { setSaving(false); }
      }}>
        <label className="block font-semibold">Add degrees and achievement certificates
          <input className="mt-2 block w-full text-sm" type="file" multiple accept={evidenceImageTypes}
            onChange={(event) => setNewCertificates(Array.from(event.target.files ?? []))} />
        </label>
        {!!newCertificates.length && <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={publishCertificates} onChange={(event) => setPublishCertificates(event.target.checked)} />
          <span>Show these images to investors. Use copies with private details redacted.</span>
        </label>}
        <button className="dossier-primary" disabled={saving || !newCertificates.length || !publishCertificates} type="submit">Add certificates</button>
      </form>
      <section className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Founder verification and certificates</h3>
          <button className="dossier-primary" type="button" onClick={() => setEditingEvidence(!editingEvidence)}>{editingEvidence ? "Close form" : "Update evidence"}</button>
        </div>
        <p className="text-sm">Bank evidence · {packet.bankStatus === "VERIFIED" ? "Verified" :
          packet.bankStatus === "NEEDS_NEW_EVIDENCE" ? "New evidence requested" : packet.bankStatus ? "Pending admin review" : "Awaiting submission"}</p>
        {editingEvidence && <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault(); setSaving(true); setError(""); setStatus("");
          try {
            await submitFounderEvidence(user, evidence);
            setEditingEvidence(false);
            setRefresh((revision) => revision + 1);
            setStatus("Evidence sent for review.");
          } catch (problem) { setError(errorMessage(problem)); }
          finally { setSaving(false); }
        }}>
          <FounderEvidenceFields value={evidence} onChange={setEvidence} />
          <button className="dossier-primary" disabled={saving || !founderEvidenceReady(evidence)} type="submit">Submit evidence</button>
        </form>}
      </section>
    </>}
    {status && <p role="status" className="rounded-lg bg-orange-50 p-3 text-orange-900">{status}</p>}
  </div>;
}