import { useEffect, useState } from "react";
import { DEFAULT_TESTIMONIALS, type TestimonialQuote } from "@/hooks/useAppState";
import { subscribeLandingTestimonials } from "@/services/landingContentService";

export function useLandingTestimonials(): TestimonialQuote[] {
  const [quotes, setQuotes] = useState<TestimonialQuote[]>(DEFAULT_TESTIMONIALS);

  useEffect(() => subscribeLandingTestimonials(setQuotes), []);

  return quotes.length > 0 ? quotes : DEFAULT_TESTIMONIALS;
}
