import { useState } from "react";
import { MapPin, LocateFixed, Loader2, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type PickedLocation = { lat: number; lng: number; address: string };

type LocationMapPickerProps = {
  value?: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
  accent?: "amber" | "emerald" | "violet";
  height?: number;
  className?: string;
};

const ACCENTS = {
  amber: { text: "text-amber-600", bg: "from-amber-500 to-orange-500" },
  emerald: { text: "text-emerald-600", bg: "from-emerald-500 to-teal-500" },
  violet: { text: "text-violet-600", bg: "from-violet-500 to-purple-500" },
};

function embedUrl(lat: number, lng: number) {
  const d = 0.01;
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function LocationMapPicker({ value, onChange, accent = "amber", height = 220, className = "" }: LocationMapPickerProps) {
  const a = ACCENTS[accent];
  const [loc, setLoc] = useState<PickedLocation | null>(value || null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const apply = (next: PickedLocation) => {
    setLoc(next);
    onChange(next);
  };

  const detect = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation supported nahi hai is browser mein.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          const data = await res.json();
          if (data?.display_name) address = data.display_name;
        } catch {
          /* keep coords fallback */
        }
        apply({ lat: latitude, lng: longitude, address });
        setLoading(false);
      },
      () => {
        setError("Location nahi mili. Permission allow karein ya address search karein.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const search = async () => {
    if (!query.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      );
      const data = await res.json();
      if (data && data[0]) {
        apply({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), address: data[0].display_name });
      } else {
        setError("Koi result nahi mila. Dobara try karein.");
      }
    } catch {
      setError("Search fail hui. Internet check karein.");
    }
    setLoading(false);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
            placeholder="Apna city / area search karein (e.g. Gujranwala)"
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={search} disabled={loading} className="gap-1.5">
          <Search className="h-4 w-4" /> Search
        </Button>
        <Button type="button" onClick={detect} disabled={loading} className={`gap-1.5 bg-gradient-to-r ${a.bg} text-white`}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Auto-detect
        </Button>
      </div>

      {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" style={{ height }}>
        {loc ? (
          <iframe
            key={`${loc.lat}-${loc.lng}`}
            title="location-map"
            src={embedUrl(loc.lat, loc.lng)}
            className="h-full w-full"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
            <MapPin className="h-8 w-8" />
            <p className="text-xs">Location set nahi hai. Auto-detect ya search karein.</p>
          </div>
        )}
      </div>

      {loc && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-700">Location locked</p>
            <p className="truncate text-[11px] text-slate-500">{loc.address}</p>
          </div>
        </div>
      )}
    </div>
  );
}
