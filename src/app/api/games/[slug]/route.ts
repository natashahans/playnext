import { NextRequest, NextResponse } from "next/server";
import { getGameDetails } from "@/lib/rawg-server";
import { protectApi } from "@/lib/api-security";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function sanitizePlatforms(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const security = await protectApi(request, {
    bucket: "game-details",
    limit: 60,
    windowMs: 60_000,
  });
  if (!security.ok) return security.response;

  try {
    const { slug } = await params;
    if (!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(slug)) {
      return NextResponse.json({ error: "Invalid game identifier." }, { status: 400, headers: security.headers });
    }

    const admin = createSupabaseAdmin();
    const { data: preferencesData, error: preferencesError } = await admin
      .from("user_preferences")
      .select("preferred_platforms")
      .eq("user_id", security.userId)
      .maybeSingle();

    if (preferencesError) {
      console.warn("Could not load preferred platforms for game details:", preferencesError.message);
    }

    const preferredPlatformNames = sanitizePlatforms(preferencesData?.preferred_platforms);
    const details = await getGameDetails(slug, { preferredPlatformNames });

    return NextResponse.json(details, {
      headers: security.headers,
    });
  } catch (error) {
    console.error("RAWG game details request failed:", error);
    return NextResponse.json(
      { error: "We could not load this game." },
      { status: 502, headers: security.headers }
    );
  }
}
