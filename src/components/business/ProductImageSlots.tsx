import { CloudinaryImageField } from "@/components/ui/CloudinaryImageField";
import { CheckCircle2 } from "lucide-react";

type Props = {
  images: string[];
  onSlotUploaded: (slotIndex: number, secureUrl: string) => void;
  disabled?: boolean;
};

/**
 * Three Cloudinary upload slots per product card.
 * Stacked full-width so Upload/Replace buttons stay readable inside narrow catalog cards.
 */
export function ProductImageSlots({ images, onSlotUploaded, disabled }: Props) {
  const slots = [0, 1, 2].map((i) => String(images[i] || "").trim());

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
        Product Images (up to 3)
      </label>
      <div className="flex flex-col gap-3">
        {slots.map((url, index) => (
          <div
            key={index}
            className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-3"
          >
            <CloudinaryImageField
              compact
              folder="products"
              value={url}
              onUploaded={(secureUrl) => onSlotUploaded(index, secureUrl)}
              previewClassName="h-28 w-full object-cover rounded-lg border border-slate-200 bg-white"
              disabled={disabled}
            />
            {url ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate text-[10px] font-bold text-emerald-700">
                  ✓ Image URL linked
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
