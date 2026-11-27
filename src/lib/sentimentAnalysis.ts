/**
 * Lightweight NLP sentiment pipeline for customer product reviews.
 * Lexicon + negation + intensifier scoring → POSITIVE | NEUTRAL | NEGATIVE
 * with a polarity / confidence score in [-1, 1] (stored as 0–1 confidence too).
 */

export type SentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  polarityScore: number; // Range from -1.0 to 1.0
  confidence: number;
  label?: SentimentLabel;
  polarity?: number;
}

export const analyzeSentimentWithGroq = async (reviewText: string): Promise<SentimentResult> => {
  const apiKey =
    import.meta.env.VITE_GROQ_API_KEY_FOR_SENTIMENT_ANALYSIS ||
    import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    console.warn("Groq API key missing in environment variables. Returning neutral fallback.");
    return { sentiment: 'NEUTRAL', polarityScore: 0.0, confidence: 0.5 };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert NLP Sentiment Analysis engine for E-Commerce reviews supporting English, Urdu, and Roman Urdu (e.g. "bohot achi quality hai", "bekaar product hai", "delivery late thi"). 
            Analyze the review text and respond STRICTLY with a raw JSON object matching this schema without any markdown wrapping:
            {
              "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
              "polarityScore": number (float between -1.0 and 1.0),
              "confidence": number (float between 0.0 and 1.0)
            }`
          },
          {
            role: "user",
            content: reviewText
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    const sentimentRaw = String(parsed.sentiment || 'NEUTRAL').toUpperCase();
    const sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' =
      sentimentRaw === 'POSITIVE' || sentimentRaw === 'NEGATIVE' || sentimentRaw === 'NEUTRAL'
        ? sentimentRaw
        : 'NEUTRAL';

    const polarityScore = typeof parsed.polarityScore === 'number' ? parsed.polarityScore : 0.0;
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8;

    return {
      sentiment,
      polarityScore,
      confidence,
      label: sentiment,
      polarity: polarityScore,
    };
  } catch (error) {
    console.error("Groq Sentiment Analysis Failed:", error);
    return { sentiment: 'NEUTRAL', polarityScore: 0.0, confidence: 0.0, label: 'NEUTRAL', polarity: 0.0 };
  }
};


const POSITIVE_WORDS: Record<string, number> = {
  good: 1,
  great: 1.4,
  excellent: 1.8,
  amazing: 1.8,
  awesome: 1.6,
  love: 1.5,
  loved: 1.5,
  lovely: 1.3,
  nice: 1,
  best: 1.5,
  perfect: 1.7,
  fantastic: 1.7,
  wonderful: 1.6,
  delicious: 1.6,
  tasty: 1.3,
  fresh: 1.1,
  quality: 1.1,
  recommend: 1.3,
  recommended: 1.3,
  happy: 1.2,
  satisfied: 1.3,
  impressive: 1.3,
  outstanding: 1.7,
  beautiful: 1.3,
  fast: 0.9,
  quick: 0.9,
  friendly: 1.1,
  helpful: 1.1,
  worth: 1,
  value: 0.8,
  comfortable: 1.1,
  stylish: 1.1,
  durable: 1.1,
  superb: 1.6,
  brilliant: 1.5,
  delightful: 1.4,
  pleasant: 1.1,
  smooth: 0.9,
  reliable: 1.1,
  authentic: 1,
  premium: 1,
  affordable: 0.9,
};

const NEGATIVE_WORDS: Record<string, number> = {
  bad: 1.2,
  poor: 1.3,
  terrible: 1.8,
  awful: 1.7,
  horrible: 1.8,
  hate: 1.6,
  hated: 1.6,
  worst: 1.8,
  disappointing: 1.5,
  disappointed: 1.5,
  slow: 1,
  late: 1.1,
  broken: 1.5,
  defective: 1.6,
  fake: 1.5,
  cheap: 1.1,
  expensive: 0.8,
  overpriced: 1.3,
  rude: 1.4,
  dirty: 1.3,
  stale: 1.3,
  bland: 1.1,
  cold: 0.7,
  wrong: 1.1,
  refund: 1.2,
  return: 0.9,
  never: 0.8,
  waste: 1.4,
  useless: 1.5,
  problem: 1.1,
  issue: 0.9,
  complaint: 1.2,
  damage: 1.3,
  damaged: 1.4,
  delayed: 1.2,
  unfinished: 1.2,
  uncomfortable: 1.2,
  mediocre: 1.1,
  average: 0.6,
};

const INTENSIFIERS: Record<string, number> = {
  very: 1.35,
  really: 1.3,
  extremely: 1.5,
  absolutely: 1.45,
  totally: 1.35,
  super: 1.3,
  so: 1.2,
  highly: 1.3,
  quite: 1.15,
  too: 1.2,
};

const NEGATIONS = new Set([
  "not",
  "no",
  "never",
  "dont",
  "don't",
  "didnt",
  "didn't",
  "wasnt",
  "wasn't",
  "isnt",
  "isn't",
  "arent",
  "aren't",
  "wont",
  "won't",
  "cant",
  "can't",
  "cannot",
  "hardly",
  "barely",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Analyze free-text review content. Optional star rating lightly blends in
 * when text is too short for a confident lexicon signal.
 */
export function analyzeReviewSentiment(
  text: string,
  rating?: number,
): SentimentResult {
  const tokens = tokenize(text || "");
  let score = 0;
  let hits = 0;
  let negate = false;
  let intensifier = 1;

  for (const token of tokens) {
    if (NEGATIONS.has(token)) {
      negate = true;
      continue;
    }
    if (INTENSIFIERS[token]) {
      intensifier *= INTENSIFIERS[token];
      continue;
    }

    let delta = 0;
    if (POSITIVE_WORDS[token]) {
      delta = POSITIVE_WORDS[token] * intensifier;
    } else if (NEGATIVE_WORDS[token]) {
      delta = -NEGATIVE_WORDS[token] * intensifier;
    }

    if (delta !== 0) {
      if (negate) delta = -delta;
      score += delta;
      hits += 1;
      negate = false;
      intensifier = 1;
    } else {
      // Reset soft modifiers after a non-sentiment token
      if (token.length > 2) {
        negate = false;
        intensifier = 1;
      }
    }
  }

  // Blend star rating when text is sparse
  const r = Number(rating);
  if ((!Number.isFinite(r) ? 0 : r) >= 1 && hits < 2) {
    const ratingPolarity = (Math.min(5, Math.max(1, r)) - 3) / 2; // -1..1
    const weight = hits === 0 ? 0.85 : 0.35;
    score = score * (1 - weight) + ratingPolarity * 3 * weight;
    hits = Math.max(hits, 1);
  }

  const polarity = Math.max(-1, Math.min(1, score / Math.max(2.5, hits * 1.2)));
  const confidence = Math.max(
    0.35,
    Math.min(0.99, Math.abs(polarity) * 0.75 + (hits > 0 ? 0.25 : 0.1)),
  );

  let label: SentimentLabel = "NEUTRAL";
  if (polarity >= 0.18) label = "POSITIVE";
  else if (polarity <= -0.18) label = "NEGATIVE";

  const roundPolarity = Math.round(polarity * 1000) / 1000;
  const roundConfidence = Math.round(confidence * 1000) / 1000;

  return {
    sentiment: label,
    polarityScore: roundPolarity,
    confidence: roundConfidence,
    label,
    polarity: roundPolarity,
  };
}

/** Aggregate distribution percentages for a list of sentiment labels. */
export function sentimentDistribution(
  items: Array<{ sentiment?: string; label?: string }>,
): { positive: number; neutral: number; negative: number; total: number; pct: { positive: number; neutral: number; negative: number } } {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const item of items) {
    const raw = String(item.sentiment || item.label || "neutral").toLowerCase();
    if (raw === "positive" || raw === "POSITIVE".toLowerCase()) counts.positive += 1;
    else if (raw === "negative") counts.negative += 1;
    else counts.neutral += 1;
  }
  const total = counts.positive + counts.neutral + counts.negative;
  const pct = {
    positive: total ? Math.round((counts.positive / total) * 100) : 0,
    neutral: total ? Math.round((counts.neutral / total) * 100) : 0,
    negative: total ? Math.round((counts.negative / total) * 100) : 0,
  };
  return { ...counts, total, pct };
}
