import { braveSearchMulti } from "./search";
import { geminiJSON } from "./gemini";
import { RawApartment } from "./types";
import { ParsedQuery } from "./queryParser";

const EXTRACTOR_SYSTEM = `אתה מחלץ מידע על דירות להשכרה מתוצאות חיפוש של גוגל/ברייב.
קיבלת רשימה של תוצאות חיפוש (כותרות + תיאורים + קישורים).

משימה: חלץ את הנתונים הרלוונטיים על כל דירה ספציפית והחזר JSON.

**כללי סינון חובה — דלג על:**
- דפי חיפוש / רשימות (לדוגמה: "100 דירות להשכרה בתל אביב", "כל הדירות ב...")
- עמודי קטגוריה באתר (yad2.co.il/realestate, homeless.co.il/apartments וכו׳)
- מאמרים, בלוגים, מדריכים
- תוצאות ריקות או ללא מחיר וכתובת
- פרסומות שאינן מודעה ספציפית
- דפי agent/משרד תיווך

**כלל זהב:** רק אם התוצאה מייצגת דירה **אחת ספציפית** עם כתובת/שכונה — כלול אותה.

עבור כל דירה ספציפית, חלץ:
- price: מחיר חודשי בש"ח (מספר בלבד)
- rooms: מספר חדרים
- size: גודל במ"ר
- city: עיר
- neighborhood: שכונה
- address: כתובת אם מופיעה
- features: ["מעלית","חניה","מרפסת","מיזוג"] וכו'
- floor: קומה

החזר ONLY JSON:
{
  "apartments": [
    {
      "url": "... (תמיד העתק בדיוק מהקלט)",
      "title": "...",
      "price": 7500,
      "rooms": 3,
      "size": 75,
      "city": "תל אביב",
      "neighborhood": "פלורנטין",
      "address": null,
      "source": "yad2" | "homeless" | "madlan" | "komo" | "facebook" | "other",
      "features": ["מעלית"],
      "description": "סיכום קצר מהתיאור",
      "floor": null
    }
  ]
}`;

function buildSearchQueries(q: ParsedQuery): string[] {
  const queries: string[] = [];
  const city = q.city || "";
  const rooms = q.rooms_max || q.rooms_min || "";
  const priceHint = q.price_max ? `עד ${q.price_max}` : "";

  // Search on yad2
  queries.push(`דירה להשכרה ${city} ${rooms} חדרים ${priceHint} site:yad2.co.il`);
  // Homeless
  queries.push(`דירה להשכרה ${city} ${rooms} חדרים site:homeless.co.il`);
  // Madlan
  queries.push(`דירה להשכרה ${city} ${rooms} חדרים site:madlan.co.il`);
  // Komo
  queries.push(`דירה להשכרה ${city} ${rooms} חדרים site:komo.co.il`);
  // Facebook groups
  if (city) queries.push(`דירה להשכרה ${city} facebook.com/groups`);

  return queries.filter((q) => q.trim().length > 10);
}

function detectSource(url: string): RawApartment["source"] {
  if (url.includes("yad2.co.il")) return "yad2";
  if (url.includes("homeless.co.il")) return "homeless";
  if (url.includes("madlan.co.il")) return "madlan";
  if (url.includes("komo.co.il")) return "komo";
  if (url.includes("facebook.com")) return "facebook";
  return "other";
}

export async function searchAndExtract(q: ParsedQuery): Promise<{
  apartments: RawApartment[];
  sources: { [key: string]: number };
  errors: string[];
}> {
  const errors: string[] = [];
  const sources: { [key: string]: number } = { yad2: 0, homeless: 0, madlan: 0, komo: 0, facebook: 0, other: 0 };

  try {
    // 1. Search web via Brave
    const queries = buildSearchQueries(q);
    const searchResults = await braveSearchMulti(queries);

    if (searchResults.length === 0) {
      return { apartments: [], sources, errors: ["No search results"] };
    }

    // 2. Extract structured data with Gemini
    const prompt = `תוצאות חיפוש:\n${JSON.stringify(
      searchResults.map((r) => ({ title: r.title, url: r.url, description: r.description })),
      null,
      2
    )}`;

    const result = await geminiJSON<{ apartments: any[] }>(prompt, EXTRACTOR_SYSTEM);
    const extracted = result.apartments || [];

    // 3. Map to RawApartment with stable IDs
    const apartments: RawApartment[] = extracted.map((a: any, i: number) => {
      const source = a.source || detectSource(a.url || "");
      const id = a.url
        ? `${source}_${Buffer.from(a.url).toString("base64").slice(0, 20)}`
        : `${source}_${Date.now()}_${i}`;
      sources[source] = (sources[source] || 0) + 1;
      return {
        id,
        title: a.title || "דירה",
        price: a.price || null,
        rooms: a.rooms || null,
        size: a.size || null,
        floor: a.floor || null,
        address: a.address || null,
        neighborhood: a.neighborhood || null,
        city: a.city || null,
        source,
        url: a.url || null,
        image: null,
        features: a.features || [],
        description: a.description || null,
        posted_at: null,
      };
    });

    return { apartments, sources, errors };
  } catch (err: any) {
    console.error("Search+extract error:", err);
    errors.push(err.message);
    return { apartments: [], sources, errors };
  }
}
