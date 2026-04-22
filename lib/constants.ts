import { FeedbackTag, FeedbackMap } from "./types";

export const FEEDBACK_TAGS: {
  id: FeedbackTag;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: "loved_it",    label: "אהבתי!",          emoji: "❤️",  color: "#16a34a" },
  { id: "interested",  label: "מעניין",           emoji: "👀",  color: "#2563eb" },
  { id: "contacted",   label: "פניתי",            emoji: "📞",  color: "#059669" },
  { id: "too_expensive",label: "יקר מדי",         emoji: "💸",  color: "#dc2626" },
  { id: "too_far",     label: "רחוק מדי",         emoji: "📍",  color: "#ea580c" },
  { id: "too_small",   label: "קטן מדי",          emoji: "📐",  color: "#d97706" },
  { id: "bad_area",    label: "שכונה לא טובה",    emoji: "🏚️", color: "#7c3aed" },
  { id: "no_parking",  label: "אין חניה",         emoji: "🚗",  color: "#0369a1" },
  { id: "no_elevator", label: "אין מעלית",        emoji: "🛗",  color: "#0891b2" },
];

export const SOURCE_META: Record<string, { label: string; bg: string; color: string }> = {
  yad2:     { label: "יד2",      bg: "#fff7ed", color: "#ea580c" },
  homeless: { label: "הומלס",    bg: "#f0fdf4", color: "#16a34a" },
  madlan:   { label: "מדלן",     bg: "#eff6ff", color: "#2563eb" },
  facebook: { label: "פייסבוק",  bg: "#eef2ff", color: "#4338ca" },
  other:    { label: "אחר",      bg: "#f8fafc", color: "#64748b" },
};

export const SEARCH_INTERVAL_MS = 5 * 60 * 1000;

export function formatPrice(price: number | null): string | null {
  if (!price) return null;
  return price.toLocaleString("he-IL") + " ₪";
}

export function buildFeedbackSummary(feedback: FeedbackMap): string {
  const counts: Partial<Record<FeedbackTag, number>> = {};
  Object.values(feedback).flat().forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
  if (!Object.keys(counts).length) return "";
  return Object.entries(counts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([tag, n]) => {
      const t = FEEDBACK_TAGS.find((f) => f.id === tag);
      return `${t?.label || tag} (${n}×)`;
    })
    .join(", ");
}
