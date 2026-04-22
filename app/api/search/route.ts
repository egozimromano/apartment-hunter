import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/queryParser";
import { searchAndExtract } from "@/lib/searchExtract";
import { scoreApartments } from "@/lib/scorer";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userQuery, feedbackSummary, previousInsights } = await req.json();
    if (!userQuery) {
      return NextResponse.json({ error: "userQuery is required" }, { status: 400 });
    }

    const parsed = await parseQuery(userQuery);
    const { apartments, sources, errors } = await searchAndExtract(parsed);

    const { scored, insights } = await scoreApartments(
      apartments,
      parsed,
      feedbackSummary || "",
      previousInsights || ""
    );

    return NextResponse.json({
      apartments: scored,
      sources,
      errors,
      learned_insights: insights,
      search_summary: `נמצאו ${scored.length} דירות (${Object.entries(sources).filter(([,v]) => v > 0).map(([k,v]) => `${k}: ${v}`).join(", ")})`,
    });
  } catch (err: any) {
    console.error("Search error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
