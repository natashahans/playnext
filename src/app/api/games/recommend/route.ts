import { NextResponse } from "next/server";
import { getRecommendationCandidates } from "@/lib/rawg-server";
import type { ExtractedIntent, UserPreferences } from "@/lib/recommendation/types";

type RequestBody = {
  intent?: ExtractedIntent;
  preferences?: UserPreferences | null;
  excludedRawgIds?: number[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.intent) {
      return NextResponse.json({ error: "Structured intent is required." }, { status: 400 });
    }

    const excludedRawgIds = (body.excludedRawgIds ?? [])
      .filter((id): id is number => Number.isInteger(id) && id > 0)
      .slice(0, 1000);

    const games = await getRecommendationCandidates({
      intent: body.intent,
      preferences: body.preferences ?? null,
      excludedRawgIds,
    });

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Discovery recommendation candidate error:", error);
    return NextResponse.json(
      { error: "PlayNext could not load discovery candidates right now." },
      { status: 500 }
    );
  }
}
