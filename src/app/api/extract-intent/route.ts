import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(`
You extract structured intent for a game recommendation system.

Return ONLY valid JSON. No markdown.

Use this schema:
{
  "mood": "string",
  "availableTime": number or null,
  "energyLevel": "low" | "medium" | "high" | "unknown",
  "desiredExperience": "string",
  "difficultyPreference": "easy" | "normal" | "hard" | "unknown",
  "preferredGenres": [],
  "referenceGames": []
}

User input:
${prompt}
`);

    const text = result.response.text();
    const cleanedText = text.replace(/```json|```/g, "").trim();

    return NextResponse.json(JSON.parse(cleanedText));
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Intent extraction failed" },
      { status: 500 }
    );
  }
}