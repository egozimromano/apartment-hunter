import { geminiJSON } from "./gemini";

export interface ParsedQuery {
  city: string | null;
  neighborhoods: string[];
  rooms_min: number | null;
  rooms_max: number | null;
  price_min: number | null;
  price_max: number | null;
  must_have: string[];
  nice_to_have: string[];
  deal_breakers: string[];
  raw_text: string;
}

const PARSER_SYSTEM = `אתה מנתח שאילתות חיפוש דירות בעברית.
המרה של תיאור חופשי בעברית למבנה JSON מובנה.

החזר ONLY JSON בפורמט:
{
  "city": "תל אביב" | null,
  "neighborhoods": ["שכונה1","שכונה2"],
  "rooms_min": 2.5 | null,
  "rooms_max": 3.5 | null,
  "price_min": 5000 | null,
  "price_max": 8000 | null,
  "must_have": ["חניה","מעלית"],
  "nice_to_have": ["מרפסת"],
  "deal_breakers": ["קומת קרקע"]
}

כללים:
- אם יש "עד X ש״ח" — הכנס ל-price_max
- אם יש "3 חדרים" — rooms_min=3, rooms_max=3
- אם יש "3-4 חדרים" — rooms_min=3, rooms_max=4
- אם אין מידע על שדה — החזר null או []`;

export async function parseQuery(text: string): Promise<ParsedQuery> {
  try {
    const parsed = await geminiJSON<Omit<ParsedQuery, "raw_text">>(text, PARSER_SYSTEM);
    return { ...parsed, raw_text: text };
  } catch (e) {
    // Fallback — basic regex extraction
    return {
      city: null,
      neighborhoods: [],
      rooms_min: null,
      rooms_max: null,
      price_min: null,
      price_max: extractMaxPrice(text),
      must_have: [],
      nice_to_have: [],
      deal_breakers: [],
      raw_text: text,
    };
  }
}

function extractMaxPrice(text: string): number | null {
  const m = text.match(/(\d{1,2}[,.]?\d{3})\s*(₪|ש["״]?ח)/);
  if (m) return parseInt(m[1].replace(/[,.]/g, ""));
  return null;
}
