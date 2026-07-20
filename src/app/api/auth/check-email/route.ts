import { NextResponse } from "next/server";

// Deliberately does not disclose whether an email address belongs to an account.
// Signup now proceeds through Supabase's non-enumerating confirmation flow.
export async function POST() {
  return NextResponse.json(
    { error: "Email availability checks are not exposed." },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
