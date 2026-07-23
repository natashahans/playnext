import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryGames, searchGames } from "@/lib/rawg-server";
import { protectApi } from "@/lib/api-security";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function sanitizePlatforms(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

function sanitizeLimit(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(24, Math.max(1, parsed));
}

export async function GET(request: NextRequest) {
  const security = await protectApi(request, {
    bucket: "catalogue",
    limit: 60,
    windowMs: 60_000,
  });
  if (!security.ok) return security.response;

  try {
    const admin = createSupabaseAdmin();
    const { data: preferencesData, error: preferencesError } = await admin
      .from("user_preferences")
      .select("preferred_platforms")
      .eq("user_id", security.userId)
      .maybeSingle();

    if (preferencesError) {
      console.warn("Could not load preferred platforms for discovery:", preferencesError.message);
    }

    const preferredPlatformNames = sanitizePlatforms(preferencesData?.preferred_platforms);
    const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 100);
    const limit = sanitizeLimit(request.nextUrl.searchParams.get("limit"));

    if (search) {
      const results = await searchGames(search, { preferredPlatformNames, limit });
      return NextResponse.json(
        { results },
        { headers: security.headers }
      );
    }

    const discovery = await getDiscoveryGames({ preferredPlatformNames });
    return NextResponse.json(discovery, {
      headers: security.headers,
    });
  } catch (error) {
    console.error("RAWG discovery request failed:", error);
    return NextResponse.json(
      { error: "The game catalogue is temporarily unavailable." },
      { status: 502, headers: security.headers }
    );
  }
}
