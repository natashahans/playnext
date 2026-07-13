import { NextRequest, NextResponse } from "next/server";
import { getGameDetails } from "@/lib/rawg-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const details = await getGameDetails(slug);

    return NextResponse.json(details, {
      headers: { "Cache-Control": "public, s-maxage=1800" },
    });
  } catch (error) {
    console.error("RAWG game details request failed:", error);
    return NextResponse.json(
      { error: "We could not load this game." },
      { status: 502 }
    );
  }
}
