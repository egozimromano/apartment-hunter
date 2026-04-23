import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/queryParser";
import { searchAndExtract } from "@/lib/searchExtract";
import { scoreApartments } from "@/lib/scorer";
import { StructuredFilters } from "@/lib/types";

export const maxDuration = 60;

function mergeFilters(parsed: any, structured: StructuredFilters) {
  return {
    ...parsed,
    city: structured.city || parsed.city,
    neighborhoods: structured.neighborhoods?.length ? structured.neighborhoods : parsed.neighborhoods,
    rooms_min: structured.rooms_min ?? parsed.rooms_min,
    rooms_max: structured.rooms_max ?? parsed.rooms_max,
    price_min: structured.price_min ?? parsed.price_min,
    price_max: structured.price_max ?? parsed.price_max,
    size_min: structured.size_min ?? parsed.size_min,
    must_have: structured.must_have?.length ? structured.must_have : parsed.must_have,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userQuery: string = body.userQuery || "";
    const structured: StructuredFilters = body.filters || {};
    const feedbackSummary: string = body.feedbackSummary || "";
    const previousInsights: string = body.previousInsights || "";
    const globalHiddenIds: string[] = body.globalHiddenIds || [];
    const globalInstructions: string = body.globalInstructions || "";
    const globalLearnedInsights: string = body.globalLearnedInsights || "";

    if (!userQuery && !structured.city) {
      return NextResponse.json({ error: "userQuery or filters.city required" }, { status: 400 });
    }

    const parsed = userQuery
      ? await parseQuery(userQuery)
      : { city: "", rooms_min: null, rooms_max: null, price_min: null, price_max: null, must_have: [], neighborhoods: [], raw_text: "", deal_breakers: [] };

    const merged = mergeFilters(parsed, structured);

    const { apartments, sources, errors } = await searchAndExtract(merged);

    // Filter out globally hidden apartments
    const hiddenSet = new Set(globalHiddenIds);
    const filteredApts = apartments.filter((a) => !hiddenSet.has(a.id));

    const { scored, insights } = await scoreApartments(
      filteredApts,
      merged,
      feedbackSummary,
      previousInsights,
      globalInstructions,
      globalLearnedInsights
    );

    return NextResponse.json({
      apartments: scored,
      sources,
      errors,
      learned_insights: insights,
      effective_filters: merged,
      search_summary: `נמצאו ${scored.length} דירות (${Object.entries(sources).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(", ")})`,
    });
  } catch (err: any) {
    console.error("Search error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
