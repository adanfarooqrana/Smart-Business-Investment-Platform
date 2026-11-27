import { onValue, ref } from "firebase/database";
import type { User } from "firebase/auth";
import { database } from "@/firebase";
import { backendRequest } from "@/lib/backendClient";

export type DossierAsset = {
  id: string;
  name: string;
  image: string;
  supplier: string;
  costPkr: number;
  chunks: number;
  availableChunks?: number;
};

export type DossierTerms = {
  revision: string;
  tagline: string;
  goals: string;
  usp: string;
  teamSize: number;
  fundingGoalPkr: number;
  pricePerChunk: number;
  profitPerChunk: number;
  payoutSchedule: string;
  sampleName: string;
  sampleAvailable?: boolean | null;
  gallery: string[];
  tourVideo: string;
  witnesses: { name: string; relation: string; video: string; hasCnic?: boolean }[];
  assets: DossierAsset[];
};

export type SampleOrder = {
  id: string;
  pitchTitle: string;
  productName: string;
  address: string;
  phone: string;
  status: "REQUESTED" | "SCHEDULED" | "APPROVED";
  estimatedDeliveryAt?: number;
  notifiedAt?: number;
  createdAt: number;
};

export type Selection = {
  founderId: string;
  pitchId: string;
  revision: string;
  quantities: Record<string, number>;
};

export type Allocation = {
  lines: { itemId: string; name: string; chunks: number; amountPkr: number }[];
  chunks: number;
  amountPkr: number;
  estimatedProfitPkr: number;
  payoutSchedule: string;
};

export type DossierAgreement = {
  id: string;
  pitchTitle: string;
  status: "AWAITING_FOUNDER" | "COUNTERSIGNED";
  investorName?: string;
  founderReviewShared?: boolean;
  investorBiometricHash?: string;
  signedAt: number;
  countersignedAt?: number;
  revision: number;
  allocation: Allocation;
};

export type AgreementDocument = { extension: "pdf" | "docx"; preview?: string };
export type DossierPacket = {
  terms: DossierTerms | null;
  document: AgreementDocument | null;
  sample: SampleOrder | null;
  agreement: DossierAgreement | null;
  orderId: string;
  agreementId: string;
};

export type DossierRoom = { id: string; pitchTitle: string; investorName: string };
export type VideoSigningPacket = {
  selection: Selection;
  document: AgreementDocument;
  title: string;
  allocation: Allocation;
};
export type UnlockedAgreement = {
  grant: string;
  expiresAt: number;
  extension: AgreementDocument["extension"];
  agreement: DossierAgreement;
  documentHash: string;
  documentPreview?: string;
  signatureMethod: "VIDEO" | "DRAWN";
  hasFounderSignature: boolean;
};

export function dossierPath(founderId: string, pitchId: string) {
  return "/api/dossiers/" + encodeURIComponent(founderId) + "/" + encodeURIComponent(pitchId);
}

export async function dossierCall<T>(user: User, endpoint: string, method = "GET", data?: object | FormData): Promise<T> {
  const isForm = data instanceof FormData;
  const response = await backendRequest(user, endpoint, {
    method,
    headers: data && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: isForm ? data : data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}

export function watchRecord<T>(path: string, onChange: (value: T) => void, onError: () => void) {
  return onValue(ref(database, path), (snapshot) => {
    const value: unknown = snapshot.val();
    if (value && typeof value === "object") onChange(value as T);
  }, onError);
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export async function downloadDossierFile(user: User, endpoint: string, name: string, form?: FormData) {
  const response = await backendRequest(user, endpoint, form ? { method: "POST", body: form } : {});
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  const disposition = response.headers.get("Content-Disposition") || "";
  link.download = name || disposition.match(/filename="([^"]+)"/)?.[1] || "agreement";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type DeviceOptions = { id: string; options: unknown };
export async function verifyDossierDevice(user: User, selection: Selection | string) {
  const api = window.PublicKeyCredential;
  const registration = typeof selection !== "string";
  const hasParser = registration ? api?.parseCreationOptionsFromJSON : api?.parseRequestOptionsFromJSON;
  if (!window.isSecureContext || !hasParser || !navigator.credentials) {
    throw new Error("Use a current browser with a device passkey on HTTPS or localhost.");
  }
  const endpoint = registration ? "/api/agreements/register-options" : "/api/agreements/" + selection + "/unlock-options";
  const { id, options } = await dossierCall<DeviceOptions>(user, endpoint, "POST", registration ? selection : undefined);
  const credential = registration
    ? await navigator.credentials.create({ publicKey: api.parseCreationOptionsFromJSON(options as PublicKeyCredentialCreationOptionsJSON) })
    : await navigator.credentials.get({ publicKey: api.parseRequestOptionsFromJSON(options as PublicKeyCredentialRequestOptionsJSON) });
  if (!(credential instanceof PublicKeyCredential)) throw new Error("Device verification was cancelled.");
  return { id, credential: credential.toJSON() };
}
