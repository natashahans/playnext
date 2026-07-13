import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryGames, searchGames } from "@/lib/rawg-server";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search")?.trim();

    if (search) {
      const results = await searchGames(search);
      return NextResponse.json(
        { results },
        { headers: { "Cache-Control": "public, s-maxage=900" } }
      );
    }

    const discovery = await getDiscoveryGames();
    return NextResponse.json(discovery, {
      headers: { "Cache-Control": "public, s-maxage=1800" },
    });
  } catch (error) {
    console.error("RAWG discovery request failed:", error);
    return NextResponse.json(
      { error: "The game catalogue is temporarily unavailable." },
      { status: 502 }
    );
  }
}
