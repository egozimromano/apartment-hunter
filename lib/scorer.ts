import { geminiJSON } from "./gemini";
import { RawApartment, ScoredApartment } from "./types";
import { ParsedQuery } from "./queryParser";

const SCORER_SYSTEM = `אתה סוכן AI שמדרג דירות להשכרה בישראל לפי העדפות של המשתמש.

קלט: רשימת דירות + תיאור חופשי של מה המשתמש מחפש + פידבק שהוא נתן על דירות קודמות (אם יש).

המשימה שלך:
1. לתת לכל דירה ציון 0-100 לפי התאמה
2. להסביר ב-2-3 סיבות קצרות למה היא מתאימה (או לא)
3. ללמוד מהפידבק — אם המשתמש סימן "יקר מדי" בדירות ב-8000, הורד ציון של דירות דומות
4. להוסיף תובנות כלליות למשתמש

החזר ONLY JSON:
{
  "scored": [
    { "id": "...", "match_score": 85, "match_reasons": ["קרוב למחיר המבוקש", "שכונה מעולה"] }
  ],
  "insights": "טקסט קצר בעברית עם תובנות — מה למדת על ההעדפות"
}`;

export async function scoreApartments(
  apartments: RawApartment[],
  parsedQuery: ParsedQuery,
  feedbackSummary: string,
  previousInsights: string
): Promise<{ scored: ScoredApartment[]; insights: string }> {
  if (apartments.length === 0) return { scored: [], insights: "" };

  // Batch score — include minimal data per apt to save tokens
  const compactApts = apartments.map((a) => ({
    id: a.id,
    price: a.price,
    rooms: a.rooms,
    size: a.size,
    city: a.city,
    neighborhood: a.neighborhood,
    features: a.features,
    title: a.title,
  }));

  const prompt = `תיאור חופשי של המשתמש:
"${parsedQuery.raw_text}"

פילטרים מובנים שחולצו:
${JSON.stringify({
  city: parsedQuery.city,
  neighborhoods: parsedQuery.neighborhoods,
  rooms: `${parsedQuery.rooms_min || "?"} - ${parsedQuery.rooms_max || "?"}`,
  price: `${parsedQuery.price_min || 0} - ${parsedQuery.price_max || "?"}`,
  must_have: parsedQuery.must_have,
  deal_breakers: parsedQuery.deal_breakers,
})}

${feedbackSummary ? `פידבק על דירות קודמות: ${feedbackSummary}` : ""}
${previousInsights ? `תובנות קודמות: ${previousInsights}` : ""}

דירות לדירוג:
${JSON.stringify(compactApts, null, 2)}

דרג כל דירה והחזר JSON בלבד.`;

  try {
    const result = await geminiJSON<{ scored: { id: string; match_score: number; match_reasons: string[] }[]; insights: string }>(prompt, SCORER_SYSTEM);

    // Merge scores back into apartments
    const scoreMap = new Map(result.scored.map((s) => [s.id, s]));
    const scored: ScoredApartment[] = apartments.map((a) => {
      const s = scoreMap.get(a.id);
      return {
        ...a,
        match_score: s?.match_score ?? 50,
        match_reasons: s?.match_reasons ?? [],
      };
    });

    // Sort by score desc
    scored.sort((a, b) => b.match_score - a.match_score);

    return { scored, insights: result.insights || "" };
  } catch (err) {
    console.error("Scoring error:", err);
    // Fallback — return with default score
    const scored: ScoredApartment[] = apartments.map((a) => ({
      ...a,
      match_score: 50,
      match_reasons: [],
    }));
    return { scored, insights: "" };
  }
}
