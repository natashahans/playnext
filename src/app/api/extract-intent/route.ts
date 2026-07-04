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

Return ONLY valid JSON. No markdown. No explanation.

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

Rules for availableTime:
- Always return time in minutes.
- "20 minutes" = 20
- "half an hour" = 30
- "an hour" = 60
- "couple of hours" = 120
- "few hours" = 180
- "all evening" = 240
- "all day" = 480
- If no clear time is mentioned, return null.
- Do NOT return 3 for "few hours". Return 180.

Rules for desiredExperience:
- Keep useful phrases like "quick", "short session", "deep and immersive", "relaxing", "cozy", "story", "challenging".

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