import { NextResponse } from "next/server";
import { getRecommendationCandidates } from "@/lib/rawg-server";
import { normalizeIntent } from "@/lib/intent";
import type { UserPreferences } from "@/lib/recommendation/types";

type RequestBody = {
  intent?: unknown;
  preferences?: unknown;
  excludedRawgIds?: unknown;
};

function cleanStrings(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 60))
    .filter(Boolean)))
    .slice(0, limit);
}

function cleanPreferenceValue(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 60) : null;
}

function normalizePreferences(value: unknown): UserPreferences | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  return {
    favorite_genres: cleanStrings(input.favorite_genres, 12),
    preferred_platforms: cleanStrings(input.preferred_platforms, 12),
    play_style: cleanPreferenceValue(input.play_style),
    difficulty_preference: cleanPreferenceValue(input.difficulty_preference),
    session_length_preference: cleanPreferenceValue(input.session_length_preference),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.intent) {
      return NextResponse.json({ error: "Structured intent is required." }, { status: 400 });
    }

    const excludedRawgIds = (Array.isArray(body.excludedRawgIds) ? body.excludedRawgIds : [])
      .filter((id): id is number => Number.isInteger(id) && id > 0)
      .slice(0, 1000);

    const intent = normalizeIntent(body.intent);
    const preferences = normalizePreferences(body.preferences);

    const games = await getRecommendationCandidates({
      intent,
      preferences,
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
