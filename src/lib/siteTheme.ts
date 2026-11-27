/** Storefront theme resolved from AI prompt + website_settings */

export type SiteFontKey = "modern" | "elegant" | "bold" | "classic" | "tech" | "friendly";

export type SiteTheme = {
  theme_color: string;
  background_color: string;
  text_color: string;
  heading_color: string;
  hero_background: string;
  font_family: SiteFontKey;
  card_background: string;
  nav_background: string;
};

export const SITE_FONT_CSS: Record<SiteFontKey, string> = {
  modern: '"DM Sans", system-ui, sans-serif',
  elegant: '"Playfair Display", Georgia, serif',
  bold: '"Oswald", Impact, sans-serif',
  classic: '"Libre Baskerville", Georgia, serif',
  tech: '"Space Grotesk", system-ui, sans-serif',
  friendly: '"Nunito", system-ui, sans-serif',
};

export const SITE_FONT_GOOGLE: Record<SiteFontKey, string> = {
  modern: "DM+Sans:wght@400;600;700;900",
  elegant: "Playfair+Display:wght@500;700;900",
  bold: "Oswald:wght@400;600;700",
  classic: "Libre+Baskerville:wght@400;700",
  tech: "Space+Grotesk:wght@400;600;700",
  friendly: "Nunito:wght@400;600;700;800",
};

const NAMED_COLORS: Record<string, string> = {
  black: "#0a0a0a",
  white: "#ffffff",
  cream: "#faf7f2",
  beige: "#f5f0e8",
  navy: "#0f172a",
  blue: "#2563eb",
  sky: "#0ea5e9",
  green: "#16a34a",
  emerald: "#059669",
  red: "#dc2626",
  orange: "#ea580c",
  amber: "#d97706",
  gold: "#ca8a04",
  purple: "#7c3aed",
  violet: "#8b5cf6",
  pink: "#db2777",
  gray: "#64748b",
  grey: "#64748b",
  slate: "#334155",
  teal: "#0d9488",
};

function normalizeHex(raw: string | undefined | null, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  let h = raw.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return fallback;
  return h.toLowerCase();
}

export function isDarkHex(hex: string): boolean {
  const h = normalizeHex(hex, "#ffffff").slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 145;
}

function resolveNamedOrHex(token: string, fallback: string): string {
  const t = token.trim().toLowerCase();
  if (NAMED_COLORS[t]) return NAMED_COLORS[t];
  return normalizeHex(token, fallback);
}

function detectFont(prompt: string): SiteFontKey | null {
  const p = prompt.toLowerCase();
  if (/\b(elegant|serif|luxury|premium font|playfair)\b/.test(p)) return "elegant";
  if (/\b(bold|impact|strong|oswald|display font)\b/.test(p)) return "bold";
  if (/\b(classic|traditional|baskerville|newspaper)\b/.test(p)) return "classic";
  if (/\b(tech|futuristic|startup|grotesk|mono)\b/.test(p)) return "tech";
  if (/\b(friendly|rounded|soft|nunito|playful)\b/.test(p)) return "friendly";
  if (/\b(modern|sans[- ]?serif|clean|minimal)\b/.test(p)) return "modern";
  if (/\bfont\s*[:=]?\s*(modern|elegant|bold|classic|tech|friendly)\b/.test(p)) {
    const m = p.match(/font\s*[:=]?\s*(modern|elegant|bold|classic|tech|friendly)/);
    if (m) return m[1] as SiteFontKey;
  }
  return null;
}

/** Pull explicit theme hints from the user's free-text prompt. */
export function extractThemeFromPrompt(prompt: string): Partial<SiteTheme> {
  const out: Partial<SiteTheme> = {};
  const p = prompt || "";
  const lower = p.toLowerCase();

  const hexes = [...p.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)].map((m) => `#${m[1]}`);

  // background
  const bgMatch =
    lower.match(/\b(black|white|navy|cream|beige|slate|blue|green)\s+(?:background|bg|theme)\b/i) ||
    lower.match(/\b(?:background|bg)\s+(?:color|colour)?\s*(?:is|:|=)?\s*(#[0-9a-fA-F]{3,6}|black|white|navy|cream|beige|slate)\b/i) ||
    lower.match(/(?:background|bg)\s*(?:color|colour)?\s*(?:is|:|=)\s*(#[0-9a-fA-F]{3,6}|\w+)/i);
  if (bgMatch) {
    out.background_color = resolveNamedOrHex(bgMatch[1], "#f8fafc");
  } else if (/\bdark\s+(theme|mode|site|website)\b/.test(lower) || /\bblack\s+theme\b/.test(lower)) {
    out.background_color = "#0a0a0a";
    out.hero_background = "#000000";
    out.text_color = out.text_color || "#f1f5f9";
    out.heading_color = out.heading_color || "#ffffff";
  }

  // text color
  const textMatch =
    lower.match(/\b(white|black|cream|gold|amber|orange)\s+text\b/i) ||
    lower.match(/(?:text|font)\s*(?:color|colour)\s*(?:is|:|=)\s*(#[0-9a-fA-F]{3,6}|\w+)/i) ||
    lower.match(/(?:text|font)\s*(?:color|colour)\s*(#[0-9a-fA-F]{3,6})\b/i);
  if (textMatch) {
    out.text_color = resolveNamedOrHex(textMatch[1], "#1e293b");
    out.heading_color = out.heading_color || out.text_color;
  }

  // theme / accent color — named color BEFORE "theme" wins (e.g. "orange theme color")
  const themeMatch =
    lower.match(
      /\b(orange|amber|blue|green|emerald|red|purple|gold|teal|pink|navy|violet)\s+(?:theme|accent|brand|buttons?)(?:\s*(?:color|colour))?\b/i,
    ) ||
    lower.match(/(?:theme|accent|brand|primary)\s*(?:color|colour)?\s*(?:is|:|=)\s*(#[0-9a-fA-F]{3,6}|\w+)/i) ||
    lower.match(/(?:theme|accent|brand|primary)\s*(?:color|colour)\s*(#[0-9a-fA-F]{3,6})\b/i);
  if (themeMatch) {
    out.theme_color = resolveNamedOrHex(themeMatch[1], "#d97706");
  } else if (hexes.length >= 1 && !out.theme_color) {
    if (out.background_color && hexes[0]) out.theme_color = normalizeHex(hexes[0], "#d97706");
  }

  // heading color
  const headMatch = lower.match(/(?:heading|title|headline)\s*(?:color|colour)?\s*(?:is|:|=)?\s*(#[0-9a-fA-F]{3,6}|\w+)/i);
  if (headMatch) {
    out.heading_color = resolveNamedOrHex(headMatch[1], "#0f172a");
  }

  // hero
  const heroMatch = lower.match(/(?:hero|banner)\s*(?:background|bg|color|colour)?\s*(?:is|:|=)?\s*(#[0-9a-fA-F]{3,6}|\w+)/i);
  if (heroMatch) {
    out.hero_background = resolveNamedOrHex(heroMatch[1], "#0f172a");
  }

  const font = detectFont(p);
  if (font) out.font_family = font;

  // Auto text contrast if bg set but text not
  if (out.background_color && !out.text_color) {
    out.text_color = isDarkHex(out.background_color) ? "#e2e8f0" : "#1e293b";
    out.heading_color = out.heading_color || (isDarkHex(out.background_color) ? "#ffffff" : "#0f172a");
  }

  return out;
}

function normalizeFontKey(raw: unknown): SiteFontKey {
  const s = String(raw || "modern").toLowerCase().trim();
  if (s in SITE_FONT_CSS) return s as SiteFontKey;
  if (s.includes("serif") || s.includes("elegant") || s.includes("playfair")) return "elegant";
  if (s.includes("oswald") || s.includes("bold")) return "bold";
  if (s.includes("baskerville") || s.includes("classic")) return "classic";
  if (s.includes("space") || s.includes("tech") || s.includes("grotesk")) return "tech";
  if (s.includes("nunito") || s.includes("friendly")) return "friendly";
  return "modern";
}

export function resolveSiteTheme(
  settings: Partial<SiteTheme> & Record<string, unknown> = {},
  promptHint?: string,
): SiteTheme {
  const fromPrompt = promptHint ? extractThemeFromPrompt(promptHint) : {};
  const theme_color = normalizeHex(
    String(fromPrompt.theme_color || settings.theme_color || "#d97706"),
    "#d97706",
  );
  const background_color = normalizeHex(
    String(fromPrompt.background_color || settings.background_color || "#f8fafc"),
    "#f8fafc",
  );
  const text_color = normalizeHex(
    String(fromPrompt.text_color || settings.text_color || (isDarkHex(background_color) ? "#e2e8f0" : "#1e293b")),
    "#1e293b",
  );
  const heading_color = normalizeHex(
    String(fromPrompt.heading_color || settings.heading_color || (isDarkHex(background_color) ? "#ffffff" : "#0f172a")),
    "#0f172a",
  );
  const hero_background = normalizeHex(
    String(fromPrompt.hero_background || settings.hero_background || (isDarkHex(background_color) ? "#000000" : "#0f172a")),
    "#0f172a",
  );
  const font_family = normalizeFontKey(fromPrompt.font_family || settings.font_family || "modern");

  const dark = isDarkHex(background_color);
  const card_background = normalizeHex(
    String(settings.card_background || (dark ? "#141414" : "#ffffff")),
    dark ? "#141414" : "#ffffff",
  );
  const nav_background = normalizeHex(
    String(settings.nav_background || (dark ? "#0a0a0a" : "#ffffff")),
    dark ? "#0a0a0a" : "#ffffff",
  );

  return {
    theme_color,
    background_color,
    text_color,
    heading_color,
    hero_background,
    font_family,
    card_background,
    nav_background,
  };
}
