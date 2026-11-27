import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DossierFrame } from "@/components/investor/PitchDossier";
import type { StartupIdea } from "@/data/startupIdeas";
import { uploadPublicAsset } from "@/lib/backendClient";
import { dossierCall, errorMessage, type DossierAsset, type DossierTerms } from "@/lib/pitchDossier";
import { PITCH_CATEGORIES } from "@/lib/investorPitchSchema";
import { formatPkr } from "@/lib/investmentCalculator";
import { evidenceImageTypes } from "./FounderEvidenceFields";

type Terms = Omit<DossierTerms, "revision">;
type Basics = { title: string; category: string; description: string };

const sections = ["Product showcase", "Chunk economics and sample", "Backing assets and agreement"];
const blankWitness = { name: "", relation: "", video: "" };

export function FounderPitchStudio({ user, idea, onClose, onPublished }: {
  user: User; idea?: StartupIdea; onClose: () => void; onPublished: (pitch: Record<string, unknown>) => void;
}) {
  const [pitchId] = useState(() => idea?.id || "pitch-" + crypto.randomUUID());
  const [step, setStep] = useState(0);
  const [basic, setBasic] = useState<Basics>({
    title: idea?.startupTitle ?? "", category: idea?.industry ?? PITCH_CATEGORIES[0], description: idea?.description ?? "",
  });
  const [terms, setTerms] = useState<Terms>({
    tagline: "", goals: "", usp: "", teamSize: 1,
    fundingGoalPkr: idea?.stage2?.totalCapitalRequiredPkr ?? 0,
    tourVideo: "", witnesses: [blankWitness, blankWitness], gallery: [],
    pricePerChunk: 0, profitPerChunk: 0, payoutSchedule: "",
    sampleName: idea?.stage3?.sampleProductName ?? "", sampleAvailable: idea?.stage3?.sampleAssetAvailable ?? false, assets: [],
  });
  const [chunkTarget, setChunkTarget] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [witnessFiles, setWitnessFiles] = useState<(File | undefined)[]>([]);
  const [assetFiles, setAssetFiles] = useState<Record<string, File>>({});
  const [agreement, setAgreement] = useState<File>();
  const [hasAgreement, setHasAgreement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!idea);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!idea) return;
    let active = true;
    void dossierCall<{ terms: DossierTerms | null; document: object | null }>(user, "/api/founder/dossiers/" + encodeURIComponent(pitchId))
      .then((packet) => {
        if (!active) return;
        if (packet.terms) {
          const saved = packet.terms;
          setTerms({
            ...saved,
            sampleAvailable: saved.sampleAvailable ?? !!saved.sampleName,
            witnesses: [saved.witnesses[0] ?? blankWitness, saved.witnesses[1] ?? blankWitness],
          });
          setChunkTarget(saved.assets.reduce((sum, item) => sum + item.chunks, 0));
        }
        setHasAgreement(!!packet.document);
      }).catch((problem) => { if (active) setLoadError(errorMessage(problem)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [idea, pitchId, user]);

  const change = <K extends keyof Terms>(key: K, value: Terms[K]) => setTerms((old) => ({ ...old, [key]: value }));
  const updateWitness = (index: number, key: "name" | "relation" | "video", value: string) => change("witnesses", terms.witnesses.map((item, position) =>
    index === position ? { ...item, [key]: value, hasCnic: false } : item));
  const updateAsset = (id: string, update: Partial<DossierAsset>) => change("assets", terms.assets.map((item) => item.id === id ? { ...item, ...update } : item));
  const allocated = terms.assets.reduce((sum, item) => sum + item.chunks, 0);
  const allocatedCost = terms.assets.reduce((sum, item) => sum + item.costPkr, 0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (step === 1 && chunkTarget * terms.pricePerChunk !== terms.fundingGoalPkr) {
      setError("Total business chunks multiplied by price per chunk must match the funding target.");
      return;
    }
    if (step < 2) { setStep(step + 1); return; }
    if (!terms.assets.length || allocated !== chunkTarget || allocatedCost !== terms.fundingGoalPkr ||
        terms.assets.some((item) => item.costPkr !== item.chunks * terms.pricePerChunk)) {
      setError("Allocate all business chunks and match each item cost to its chunks multiplied by price per chunk.");
      return;
    }
    if (terms.assets.some((item) => !item.image && !assetFiles[item.id])) {
      setError("Add an image for every backing asset.");
      return;
    }
    setBusy(true);
    try {
      const gallery = photos.length ? await Promise.all(photos.map((file) => uploadPublicAsset(user, file, file.name))) : terms.gallery;
      const assets = await Promise.all(terms.assets.map(async (item) => {
        const file = assetFiles[item.id];
        return { ...item, image: file ? await uploadPublicAsset(user, file, file.name) : item.image };
      }));
      const form = new FormData();
      form.append("basics", JSON.stringify(Object.fromEntries(Object.entries(basic).map(([key, value]) => [key, value.trim()]))));
      form.append("terms", JSON.stringify({
        ...terms, gallery, assets, sampleName: terms.sampleAvailable ? terms.sampleName.trim() : "",
        witnesses: terms.witnesses.map(({ name, relation, video }) => ({ name: name.trim(), relation: relation.trim(), video: video.trim() })),
        tagline: terms.tagline.trim(), goals: terms.goals.trim(), usp: terms.usp.trim(),
      }));
      if (agreement) form.append("agreement", agreement);
      witnessFiles.forEach((file, index) => { if (file) form.append("witness" + index, file); });
      const row = await dossierCall<Record<string, unknown>>(user, "/api/founder/pitches/" + encodeURIComponent(pitchId), "PUT", form);
      onPublished(row);
    } catch (problem) { setError(errorMessage(problem)); }
    finally { setBusy(false); }
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[94dvh] max-w-4xl gap-0 overflow-auto border-orange-300/40 bg-[#0B132B] p-0 text-white">
      <DossierFrame>
        <DialogTitle className="text-2xl font-bold">{idea ? "Edit investor pitch" : "Pitch an Idea"}</DialogTitle>
        <DialogDescription className="text-slate-300">Build the dossier investors will see in Ideas Feed.</DialogDescription>
        <ol className="dossier-stages" aria-label="Pitch studio steps">
          {sections.map((section, index) => <li className="text-sm" key={section} aria-current={step === index ? "step" : undefined}>
            <span className={step === index ? "font-bold text-orange-300" : "text-slate-300"}>{index + 1}. {section}</span>
          </li>)}
        </ol>
        {loading && <p role="status">Loading pitch…</p>}
        {loadError && <p className="dossier-error" role="alert">{loadError}</p>}
        {!loading && !loadError && <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <fieldset disabled={busy} className="dossier-card space-y-4">
            <legend className="px-2 text-lg font-semibold">{sections[step]}</legend>
            {step === 0 && <>
              <TextField label="Product name" value={basic.title} min={2} max={160} onChange={(title) => setBasic({ ...basic, title })} />
              <label className="block">Category<select className="dossier-input" value={basic.category} required
                onChange={(event) => setBasic({ ...basic, category: event.target.value })}>
                {!PITCH_CATEGORIES.some((value) => value === basic.category) && <option>{basic.category}</option>}
                {PITCH_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
              </select></label>
              <label className="block">Product and business description<textarea className="dossier-input" required minLength={5} maxLength={3000}
                value={basic.description} onChange={(event) => setBasic({ ...basic, description: event.target.value })} /></label>
              <label className="block">High-resolution product gallery (up to 12 images)
                <input className="dossier-input" type="file" multiple accept={evidenceImageTypes} required={!photos.length && !terms.gallery.length}
                  onChange={(event) => {
                    const next = Array.from(event.target.files ?? []);
                    event.target.setCustomValidity(next.length > 12 ? "Choose up to 12 images." : "");
                    setPhotos(next);
                  }} />
                <span className="text-sm">{photos.length || terms.gallery.length} images selected</span>
              </label>
              <TextField label="Shop or business location video URL" value={terms.tourVideo} type="url" onChange={(value) => change("tourVideo", value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                {terms.witnesses.map((witness, index) => <div className="dossier-item space-y-3 p-3" key={index}>
                  <h3 className="font-semibold">Reference witness {index + 1}</h3>
                  {([["name", "Full name"], ["relation", "Relation to business"], ["video", "Reference video URL"]] as const).map(([key, label]) =>
                    <TextField key={key} label={label} value={witness[key]} type={key === "video" ? "url" : "text"}
                      onChange={(value) => updateWitness(index, key, value)} />)}
                  <label className="block">Redacted CNIC preview {witness.hasCnic && "· saved"}
                    <input className="dossier-input" type="file" accept={evidenceImageTypes} required={!witnessFiles[index] && !witness.hasCnic}
                      onChange={(event) => {
                        const files = [...witnessFiles];
                        files[index] = event.target.files?.[0];
                        setWitnessFiles(files);
                      }} />
                  </label>
                </div>)}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Brand tagline" max={200} value={terms.tagline} onChange={(value) => change("tagline", value)} />
                <TextField label="Future goals" max={1800} value={terms.goals} onChange={(value) => change("goals", value)} />
                <TextField label="Unique selling point" max={1200} value={terms.usp} onChange={(value) => change("usp", value)} />
                <NumberField label="Team size" min={1} value={terms.teamSize} onChange={(value) => change("teamSize", value)} />
                <NumberField label="Funding target (PKR)" min={1} value={terms.fundingGoalPkr} onChange={(value) => change("fundingGoalPkr", value)} />
                <NumberField label="Total business chunks" min={1} value={chunkTarget} onChange={setChunkTarget} />
              </div>
            </>}
            {step === 1 && <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Price per chunk (PKR)" min={1} value={terms.pricePerChunk} onChange={(value) => change("pricePerChunk", value)} />
              <NumberField label="Estimated profit per chunk (PKR)" min={0} value={terms.profitPerChunk} onChange={(value) => change("profitPerChunk", value)} />
              <TextField label="Payout frequency" max={300} value={terms.payoutSchedule} onChange={(value) => change("payoutSchedule", value)} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={terms.sampleAvailable === true}
                onChange={(event) => change("sampleAvailable", event.target.checked)} /> Offer a product sample</label>
              {terms.sampleAvailable && <TextField label="Product sample name" max={160} value={terms.sampleName} onChange={(value) => change("sampleName", value)} />}
            </div>}
            {step === 2 && <>
              <div className="dossier-asset-grid">
                {terms.assets.map((item) => <div className="dossier-item space-y-3 p-3" key={item.id}>
                  <TextField label="Raw material, equipment or asset" max={160} value={item.name} onChange={(name) => updateAsset(item.id, { name })} />
                  <TextField label="Supplier and source location" max={300} value={item.supplier} onChange={(supplier) => updateAsset(item.id, { supplier })} />
                  <label className="block">Item image {item.image && "· saved"}
                    <input className="dossier-input" type="file" accept={evidenceImageTypes} required={!assetFiles[item.id] && !item.image}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setAssetFiles(({ [item.id]: _old, ...other }) => file ? { ...other, [item.id]: file } : other);
                      }} />
                  </label>
                  <NumberField label="Item cost (PKR)" min={1} value={item.costPkr} onChange={(costPkr) => updateAsset(item.id, { costPkr })} />
                  <NumberField label="Chunks allocated" min={1} value={item.chunks} onChange={(chunks) => updateAsset(item.id, { chunks })} />
                  <button className="dossier-secondary" type="button" onClick={() => change("assets", terms.assets.filter((row) => row.id !== item.id))}>Remove item</button>
                </div>)}
              </div>
              <button className="dossier-secondary" type="button" disabled={terms.assets.length >= 60}
                onClick={() => change("assets", [...terms.assets, { id: crypto.randomUUID(), name: "", supplier: "", image: "", costPkr: terms.pricePerChunk, chunks: 1 }])}>Add backing asset</button>
              <p>{allocated} / {chunkTarget} chunks allocated · {formatPkr(allocatedCost)} / {formatPkr(terms.fundingGoalPkr)}</p>
              <label className="block">Investment agreement (.docx or PDF) {hasAgreement && "· saved"}
                <input className="dossier-input" type="file" accept=".docx,.pdf" required={!agreement && !hasAgreement}
                  onChange={(event) => setAgreement(event.target.files?.[0])} />
              </label>
            </>}
          </fieldset>
          {error && <p className="dossier-error" role="alert">{error}</p>}
          <div className="flex justify-between gap-3">
            <button className="dossier-secondary" disabled={busy} type="button"
              onClick={() => { setError(""); if (step === 0) onClose(); else setStep(step - 1); }}>{step === 0 ? "Cancel" : "Back"}</button>
            <button className="dossier-primary" disabled={busy} type="submit">{busy ? "Uploading and publishing…" : step === 2 ? "Publish to Ideas Feed" : "Continue"}</button>
          </div>
        </form>}
      </DossierFrame>
    </DialogContent>
  </Dialog>;
}

function TextField({ label, value, onChange, type = "text", min = 1, max = 2048 }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; min?: number; max?: number;
}) {
  return <label className="block">{label}
    <input className="dossier-input" type={type} required minLength={min} maxLength={max}
      value={value} onChange={(event) => onChange(event.target.value)} />
  </label>;
}

function NumberField({ label, value, min, onChange }: { label: ReactNode; value: number; min: number; onChange: (value: number) => void }) {
  return <label className="block">{label}
    <input className="dossier-input" type="number" required min={min} step={1} value={value || (min === 0 ? 0 : "")}
      onChange={(event) => onChange(event.target.valueAsNumber || 0)} />
  </label>;
}