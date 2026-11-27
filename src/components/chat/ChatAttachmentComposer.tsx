import { useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessageNode } from "@/services/investorCoreService";
import { uploadChatAttachment } from "@/lib/uploadChatAttachment";

export type ChatPendingAttachment = {
  file: File;
  kind: "image" | "document";
  previewUrl?: string;
};

type ChatComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  placeholder: string;
  sending: boolean;
  error?: string | null;
  sendLabel?: string;
  accentClassName?: string;
  onSend: (payload: {
    text: string;
    attachment?: {
      url: string;
      type: "image" | "document";
      name: string;
    };
  }) => Promise<void>;
};

export function ChatAttachmentComposer({
  draft,
  onDraftChange,
  placeholder,
  sending,
  error,
  sendLabel = "Send Reply",
  accentClassName = "rounded-full bg-violet-600 hover:bg-violet-700",
  onSend,
}: ChatComposerProps) {
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<ChatPendingAttachment | null>(null);
  const [pending, setPending] = useState<ChatPendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = sending || uploading;
  const canSend = Boolean(draft.trim() || pending) && !busy;

  const setPendingSafe = (next: ChatPendingAttachment | null) => {
    if (pendingRef.current?.previewUrl) {
      URL.revokeObjectURL(pendingRef.current.previewUrl);
    }
    pendingRef.current = next;
    setPending(next);
  };

  const pickPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose an image file (JPG, PNG, WEBP).");
      return;
    }
    setLocalError(null);
    setPendingSafe({
      file,
      kind: "image",
      previewUrl: URL.createObjectURL(file),
    });
  };

  const pickDocument = (file?: File) => {
    if (!file) return;
    setLocalError(null);
    setPendingSafe({ file, kind: "document" });
  };

  const handleSend = async () => {
    if (!canSend) return;
    setLocalError(null);
    setUploading(true);
    const selected = pendingRef.current;
    try {
      let attachment:
        | { url: string; type: "image" | "document"; name: string }
        | undefined;

      if (selected) {
        const uploaded = await uploadChatAttachment(selected.file, selected.kind);
        if (!uploaded?.url) {
          throw new Error("Upload failed — no file URL returned.");
        }
        attachment = {
          url: uploaded.url,
          type: uploaded.type,
          name: uploaded.name,
        };
      }

      if (!draft.trim() && !attachment) {
        throw new Error("Write a message or attach a photo/document.");
      }

      await onSend({ text: draft.trim(), attachment });
      onDraftChange("");
      setPendingSafe(null);
    } catch (err) {
      console.error("Chat attachment send failed:", err);
      setLocalError(
        err instanceof Error ? err.message : "Failed to upload/send. Try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-t border-slate-100 p-3">
      <Textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="mb-2 text-xs"
        disabled={busy}
      />

      {pending && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          {pending.kind === "image" && pending.previewUrl ? (
            <img
              src={pending.previewUrl}
              alt="preview"
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
              <FileText className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-slate-800">
              {pending.file.name}
            </p>
            <p className="text-[10px] text-slate-500">
              {pending.kind === "image" ? "Photo ready to send" : "Document ready to send"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPendingSafe(null)}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            aria-label="Remove attachment"
            disabled={busy}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {(error || localError) && (
        <p className="mb-2 text-xs font-semibold text-red-500">{error || localError}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={docRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,application/pdf"
          className="hidden"
          onChange={(e) => {
            pickDocument(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => photoRef.current?.click()}
          className="rounded-full text-xs"
        >
          <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Photo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => docRef.current?.click()}
          className="rounded-full text-xs"
        >
          <Paperclip className="mr-1.5 h-3.5 w-3.5" /> Document
        </Button>

        <Button
          size="sm"
          disabled={!canSend}
          onClick={() => void handleSend()}
          className={accentClassName}
        >
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{" "}
              {uploading ? "Uploading…" : "Sending…"}
            </>
          ) : (
            <>
              <Send className="mr-1.5 h-3.5 w-3.5" /> {sendLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function formatChatMessageTime(timestamp?: number): string {
  const ts = Number(timestamp) || 0;
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function isChatPlaceholderText(text?: string): boolean {
  const t = String(text || "").trim();
  return t === "📷 Photo" || t === "📸 Photo" || /^📄\s/.test(t);
}

function isImageAttachment(message: ChatMessageNode): boolean {
  if (message.attachmentType === "image") return true;
  if (message.attachmentType === "document") return false;
  const url = String(message.attachmentUrl || "");
  if (!url) return false;
  if (/\/image\/upload\//i.test(url)) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(decodeURIComponent(url));
}

export function ChatMessageAttachments({
  message,
  mine,
}: {
  message: ChatMessageNode;
  mine?: boolean;
}) {
  if (!message.attachmentUrl) return null;

  if (isImageAttachment(message)) {
    return (
      <a
        href={message.attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 block overflow-hidden rounded-xl"
      >
        <img
          src={message.attachmentUrl}
          alt={message.attachmentName || "Photo"}
          className="max-h-52 w-full min-w-[140px] rounded-xl object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={message.attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${
        mine ? "bg-white/20 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      <FileText className="h-3.5 w-3.5" />
      {message.attachmentName || "Open document"}
    </a>
  );
}
