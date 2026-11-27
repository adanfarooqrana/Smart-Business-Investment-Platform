import type { User } from "firebase/auth";
import { dossierCall } from "@/lib/pitchDossier";

type ReferenceInput = {
  fullName: string;
  occupation: string;
  incomeSource: string;
  front?: File;
  back?: File;
};

export type FounderEvidenceInput = {
  statement?: File;
  transactions: File[];
  references: [ReferenceInput, ReferenceInput];
  certificates: File[];
  publishCertificates: boolean;
};

type ReferenceText = Pick<ReferenceInput, "fullName" | "occupation" | "incomeSource">;

export function emptyFounderEvidence(references?: Record<string, ReferenceText>): FounderEvidenceInput {
  const blank = { fullName: "", occupation: "", incomeSource: "" };
  return {
    transactions: [],
    references: [references?.["1"] ?? blank, references?.["2"] ?? blank],
    certificates: [],
    publishCertificates: false,
  };
}

export function founderEvidenceReady(value: FounderEvidenceInput) {
  return !!value.statement && value.transactions.length >= 1 && value.transactions.length <= 6 &&
    value.references.every((item) => item.front && item.back &&
      [item.fullName, item.occupation, item.incomeSource].every((text) => text.trim().length >= 2)) &&
    value.references[0].fullName.trim().toLowerCase() !== value.references[1].fullName.trim().toLowerCase() &&
    (!value.certificates.length || value.publishCertificates);
}

export function submitFounderEvidence(user: User, value: FounderEvidenceInput) {
  if (!founderEvidenceReady(value)) throw new Error("Complete your bank evidence and both references before submitting.");
  const form = new FormData();
  form.append("details", JSON.stringify({
    references: value.references.map(({ fullName, occupation, incomeSource }) => ({ fullName, occupation, incomeSource })),
    publishCertificates: value.publishCertificates,
  }));
  form.append("bank_statement", value.statement!);
  value.transactions.forEach((file) => form.append("bank_transactions", file));
  value.references.forEach(({ front, back }) => {
    form.append("reference_front", front!);
    form.append("reference_back", back!);
  });
  value.certificates.forEach((file) => form.append("certificates", file));
  return dossierCall(user, "/api/founder-workspace/setup", "POST", form);
}

export const evidenceImageTypes = "image/jpeg,image/png,image/webp";

export function FounderEvidenceFields({ value, onChange }: {
  value: FounderEvidenceInput;
  onChange: (value: FounderEvidenceInput) => void;
}) {
  const changeReference = (index: number, update: Partial<ReferenceInput>) => {
    const references = [...value.references] as FounderEvidenceInput["references"];
    references[index] = { ...references[index], ...update };
    onChange({ ...value, references });
  };
  const style = "mt-1 block w-full rounded-lg border border-current/20 bg-transparent p-2 text-sm";
  return <div className="space-y-4">
    <fieldset className="space-y-3">
      <legend className="font-semibold">Active bank account evidence</legend>
      <label className="block text-sm">Bank statement (PDF or image)
        <input className={style} type="file" accept={evidenceImageTypes + ",application/pdf"}
          onChange={(event) => onChange({ ...value, statement: event.target.files?.[0] })} />
      </label>
      <label className="block text-sm">Recent transaction screenshots (1 to 6)
        <input className={style} type="file" multiple accept={evidenceImageTypes}
          onChange={(event) => onChange({ ...value, transactions: Array.from(event.target.files ?? []) })} />
      </label>
    </fieldset>
    {value.references.map((item, index) => <fieldset key={index} className="grid gap-3 rounded-xl border border-current/15 p-3 sm:grid-cols-2">
      <legend className="px-2 font-semibold">Personal or business reference {index + 1}</legend>
      {([["fullName", "Full name", 160], ["occupation", "Occupation", 160], ["incomeSource", "Source of income", 200]] as const)
        .map(([key, label, max]) => <label key={key} className="text-sm">{label}
          <input className={style} value={item[key]} maxLength={max} onChange={(event) => changeReference(index, { [key]: event.target.value })} />
        </label>)}
      {(["front", "back"] as const).map((part) => <label key={part} className="text-sm">Reference CNIC {part}
        <input className={style} type="file" accept={evidenceImageTypes}
          onChange={(event) => changeReference(index, { [part]: event.target.files?.[0] })} />
      </label>)}
    </fieldset>)}
    <label className="block text-sm font-semibold">Degrees and achievement certificates
      <input className={style} type="file" multiple accept={evidenceImageTypes}
        onChange={(event) => onChange({ ...value, certificates: Array.from(event.target.files ?? []) })} />
    </label>
    {!!value.certificates.length && <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={value.publishCertificates} onChange={(event) => onChange({ ...value, publishCertificates: event.target.checked })} />
      <span>Publish these certificate images on my founder profile so investors can see them. Use copies with private details redacted.</span>
    </label>}
    <p className="text-sm">Bank evidence and reference CNICs go to your verification record for admin review.</p>
  </div>;
}