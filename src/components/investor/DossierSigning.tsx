import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Camera, Fingerprint, PenLine } from "lucide-react";
import type { User } from "firebase/auth";
import { backendRequest } from "@/lib/backendClient";
import {
  dossierCall, downloadDossierFile, errorMessage, verifyDossierDevice, type AgreementDocument,
  type DossierAgreement, type Selection,
} from "@/lib/pitchDossier";

export function SignaturePad({ onChange }: { onChange: (signature: Blob | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<number | null>(null);
  const point = useRef({ x: 0, y: 0 });
  const drew = useRef(false);

  const coordinates = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * event.currentTarget.width / bounds.width,
      y: (event.clientY - bounds.top) * event.currentTarget.height / bounds.height,
    };
  };

  const stop = (event: PointerEvent<HTMLCanvasElement>) => {
    if (active.current !== event.pointerId) return;
    active.current = null;
    if (drew.current) event.currentTarget.toBlob(onChange, "image/png");
  };

  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <label htmlFor="dossier-signature" className="inline-flex items-center gap-2 font-medium"><PenLine size={17} /> Sign with Finger/Mouse</label>
      <button type="button" className="dossier-secondary" onClick={() => {
        const target = canvas.current;
        target?.getContext("2d")?.clearRect(0, 0, target.width, target.height);
        drew.current = false;
        onChange(null);
      }}>Clear</button>
    </div>
    <canvas id="dossier-signature" aria-label="Draw your signature" ref={canvas} width={900} height={240}
      className="h-36 w-full touch-none rounded-xl border border-orange-200/50 bg-white"
      onPointerDown={(event) => {
        if (active.current !== null || event.button !== 0) return;
        active.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        point.current = coordinates(event);
      }}
      onPointerMove={(event) => {
        if (active.current !== event.pointerId) return;
        const ctx = event.currentTarget.getContext("2d");
        if (!ctx) return;
        const next = coordinates(event);
        ctx.beginPath();
        ctx.lineCap = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#0B132B";
        ctx.moveTo(point.current.x, point.current.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
        point.current = next;
        drew.current = true;
      }}
      onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
    />
  </div>;
}

export function AgreementPreview({ user, endpoint, document }: {
  user: User; endpoint: string; document: AgreementDocument;
}) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (document.extension !== "pdf") return;
    const controller = new AbortController();
    let url = "";
    setPreview("");
    setError("");
    void backendRequest(user, endpoint, { signal: controller.signal })
      .then((response) => response.blob())
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      }).catch((problem) => {
        if (!controller.signal.aborted) setError(errorMessage(problem));
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [user, endpoint, document.extension]);

  return <section className="dossier-card space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Investment agreement</h2>
      <button type="button" className="dossier-secondary" disabled={downloading} onClick={() => {
        setDownloading(true);
        setError("");
        void downloadDossierFile(user, endpoint, "agreement." + document.extension)
          .catch((problem) => setError(errorMessage(problem))).finally(() => setDownloading(false));
      }}>Download Agreement</button>
    </div>
    {document.extension === "docx" ? <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-5 text-sm text-[#0B132B]">{document.preview || "Download the Word agreement to view its formatting."}</div>
      : preview ? <object aria-label="Agreement PDF" className="h-96 w-full rounded-xl bg-white" data={preview} type="application/pdf"><p className="p-4 text-slate-900">Use Download Agreement to open the PDF on this device.</p></object>
        : !error && <p role="status">Loading PDF preview…</p>}
    {error && <p className="dossier-error" role="alert">{error}</p>}
  </section>;
}

export function ContractSignatureForm({ user, selection, videoToken, contractId, onSigned }: {
  user: User; selection?: Selection; videoToken?: string; contractId?: string; onSigned: (agreement: DossierAgreement) => void;
}) {
  const [front, setFront] = useState<File>();
  const [back, setBack] = useState<File>();
  const [signature, setSignature] = useState<Blob | null>(null);
  const [video, setVideo] = useState<Blob | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try { await action(); } catch (problem) { setError(errorMessage(problem)); } finally { setBusy(false); }
  };

  const sign = async () => {
    if (!front || !back || !signature || !consent || (videoToken && !video) || (!selection && !contractId)) return;
    const form = new FormData();
    form.append("cnic_front", front);
    form.append("cnic_back", back);
    form.append("signature", signature, "signature.png");
    if (selection) {
      form.append("share_founder_review", "true");
      const verification = await verifyDossierDevice(user, selection);
      form.append("selection_json", JSON.stringify(selection));
      form.append("challenge_id", verification.id);
      form.append("credential", JSON.stringify(verification.credential));
    }
    if (videoToken && video) {
      form.append("video_token", videoToken);
      form.append("video", video, video.type.includes("mp4") ? "signing.mp4" : "signing.webm");
    }
    const endpoint = contractId ? "/api/agreements/" + contractId + "/countersign" : "/api/agreements/sign";
    onSigned(await dossierCall<DossierAgreement>(user, endpoint, "POST", form));
  };

  return <div className="space-y-4">
    <form className="dossier-card space-y-4" onSubmit={(event) => { event.preventDefault(); void run(sign); }}>
      <h2 className="text-lg font-semibold">{contractId ? "Founder countersignature" : "Identity and signature"}</h2>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <label>CNIC front<input className="dossier-input" type="file" required accept="image/jpeg,image/png,image/webp" onChange={(event) => setFront(event.target.files?.[0])} /></label>
        <label>CNIC back<input className="dossier-input" type="file" required accept="image/jpeg,image/png,image/webp" onChange={(event) => setBack(event.target.files?.[0])} /></label>
      </fieldset>
      {videoToken && <WebcamRecorder onChange={setVideo} />}
      <SignaturePad onChange={setSignature} />
      {selection && <div className="dossier-device">
        <Fingerprint size={44} aria-hidden="true" className={busy ? "animate-pulse" : ""} />
        <div><strong>Device verification</strong><p>Use your device’s fingerprint, face verification, or PIN to lock access to the signed agreement.</p></div>
      </div>}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I have reviewed this agreement and consent to sign it and attach these identity records.
          {selection && " The founder may view my CNIC and signature while reviewing the agreement for countersignature."}</span>
      </label>
      <button className="dossier-primary" disabled={busy || !front || !back || !signature || !consent || (!!videoToken && !video) || (!contractId && !selection)}>
        {busy ? "Verifying and saving…" : contractId ? "Approve & Countersign Agreement" : "Verify device and submit signature"}
      </button>
    </form>
    {!contractId && !videoToken && <section className="dossier-card space-y-2">
      <h3 className="text-lg font-semibold">Sign by video</h3>
      <p className="text-sm">Send a 30-minute signing link to your verified account email.</p>
      <button type="button" className="dossier-secondary" disabled={busy || !selection} onClick={() => {
        if (selection) void run(async () => {
          await dossierCall(user, "/api/agreements/send-sign-link", "POST", selection);
          setMessage("Signing link sent. Open it from your verified email.");
        });
      }}>Send Video-Sign Link to Email</button>
    </section>}
    {error && <p className="dossier-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </div>;
}

function WebcamRecorder({ onChange }: { onChange: (video: Blob | null) => void }) {
  const preview = useRef<HTMLVideoElement>(null);
  const media = useRef<MediaStream>(undefined);
  const recorder = useRef<MediaRecorder>(undefined);
  const timer = useRef<number>(undefined);
  const mounted = useRef(true);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [clip, setClip] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      media.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip); }, [clip]);

  const start = async () => {
    setError("");
    setStarting(true);
    setClip("");
    onChange(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Use a current browser with camera and microphone access.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 } },
        audio: true,
      });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      media.current = stream;
      if (preview.current) {
        preview.current.srcObject = stream;
        void preview.current.play().catch(() => {});
      }
      const types = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
      const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_400_000 });
      const chunks: Blob[] = [];
      recorder.current = capture;
      capture.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      capture.onerror = () => { if (mounted.current) setError("Recording failed. Try again."); };
      capture.onstop = () => {
        window.clearTimeout(timer.current);
        stream.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        if (preview.current) preview.current.srcObject = null;
        setRecording(false);
        const blob = new Blob(chunks, { type: capture.mimeType.split(";")[0] });
        if (!blob.size || blob.size > 35_000_000) {
          setError("Record a shorter video before submitting.");
          return;
        }
        onChange(blob);
        setClip(URL.createObjectURL(blob));
      };
      capture.start(250);
      setRecording(true);
      timer.current = window.setTimeout(() => { if (capture.state === "recording") capture.stop(); }, 90_000);
    } catch (problem) {
      media.current?.getTracks().forEach((track) => track.stop());
      if (mounted.current) setError(errorMessage(problem));
    } finally {
      if (mounted.current) setStarting(false);
    }
  };
  return <div className="space-y-2">
    <p className="font-semibold">Record your video signature</p>
    <p className="text-sm">State your name and confirm you agree to the displayed terms. Recording stops after 90 seconds.</p>
    <video ref={preview} muted playsInline className={recording ? "w-full rounded-xl bg-black" : "hidden"} />
    {clip && <video controls playsInline src={clip} className="w-full rounded-xl bg-black" />}
    {recording ? <button type="button" className="dossier-secondary" onClick={() => recorder.current?.stop()}>Stop recording</button>
      : <button type="button" disabled={starting} className="dossier-secondary" onClick={() => void start()}><Camera size={16} /> {starting ? "Opening camera…" : clip ? "Record again" : "Start recording"}</button>}
    {error && <p role="alert" className="dossier-error">{error}</p>}
  </div>;
}
