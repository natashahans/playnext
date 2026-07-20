import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryGames, searchGames } from "@/lib/rawg-server";
import { protectApi } from "@/lib/api-security";

export async function GET(request: NextRequest) {
  const security = await protectApi(request, {
    bucket: "catalogue",
    limit: 60,
    windowMs: 60_000,
  });
  if (!security.ok) return security.response;

  try {
    const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 100);

    if (search) {
      const results = await searchGames(search);
      return NextResponse.json(
        { results },
        { headers: security.headers }
      );
    }

    const discovery = await getDiscoveryGames();
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
