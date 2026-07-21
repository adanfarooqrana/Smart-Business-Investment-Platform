import { useRef, useState } from "react";
import { Loader2, Upload, CheckCircle2, ImageIcon } from "lucide-react";
import {
  uploadToCloudinary,
  type CloudinaryFolder,
  type CloudinaryUploadProgress,
} from "@/lib/cloudinaryUpload";
import { toast } from "sonner";

type Props = {
  label?: string;
  folder: CloudinaryFolder;
  value?: string;
  onUploaded: (secureUrl: string) => void;
  accept?: string;
  hint?: string;
  previewClassName?: string;
  disabled?: boolean;
  /** Minimal slot UI — no helper labels; full-width button that fits the card */
  compact?: boolean;
};

/**
 * File picker → Cloudinary unsigned upload → returns secure HTTPS URL.
 * Shows uploading / complete feedback for forms that must wait on the URL.
 */
export function CloudinaryImageField({
  label,
  folder,
  value,
  onUploaded,
  accept = "image/*",
  hint,
  previewClassName = "h-20 w-full object-cover rounded-lg border border-slate-200",
  disabled,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<CloudinaryUploadProgress>({
    status: "idle",
    message: "",
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setProgress({ status: "uploading", message: "Uploading image...", percent: 10 });
    toast.message("Uploading image...");
    try {
      const url = await uploadToCloudinary(file, folder, setProgress);
      onUploaded(url);
      toast.success("Upload complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setProgress({ status: "error", message: msg });
      toast.error(msg);
    }
  };

  const uploading = progress.status === "uploading";
  const openPicker = () => inputRef.current?.click();

  return (
    <div className={`min-w-0 overflow-hidden space-y-2 ${compact ? "" : "space-y-1.5"}`}>
      {!compact && label ? (
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      ) : null}
      {!compact && hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}

      {value ? (
        <img
          src={value}
          alt=""
          className={`${previewClassName} max-w-full`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={openPicker}
          className={`flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50 ${
            compact ? "h-24" : "h-20"
          }`}
          aria-label={value ? "Replace image" : "Upload image"}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          ) : (
            <ImageIcon className="h-6 w-6" />
          )}
        </button>
      )}

      <div className="w-full">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={openPicker}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : progress.status === "done" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <Upload className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {uploading ? "Uploading..." : value ? "Replace image" : "Upload image"}
          </span>
        </button>
        {progress.status === "done" && (
          <span className="mt-1 block text-[10px] font-semibold text-emerald-600">
            Upload complete
          </span>
        )}
        {progress.status === "error" && (
          <span className="mt-1 block text-[10px] font-semibold text-red-500">
            {progress.message}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
