export type ExtractedIntent = {
  mood: string;
  availableTime: number | null;
  energyLevel: string;
  desiredExperience: string;
  difficultyPreference: string;
  preferredGenres: string[];
  referenceGames: string[];
};

export function mockExtractIntent(input: string): ExtractedIntent {
  const lowerInput = input.toLowerCase();

  const availableTimeMatch = lowerInput.match(/(\d+)\s*(minutes|min|mins|hour|hours)/);

  let availableTime: number | null = null;

  if (availableTimeMatch) {
    const number = Number(availableTimeMatch[1]);
    const unit = availableTimeMatch[2];

    availableTime = unit.includes("hour") ? number * 60 : number;
  }

  return {
    mood: lowerInput.includes("tired") ? "tired" : "unknown",
    availableTime,
    energyLevel: lowerInput.includes("tired") ? "low" : "unknown",
    desiredExperience:
      lowerInput.includes("relaxing") || lowerInput.includes("chill")
        ? "relaxing"
        : "unknown",
    difficultyPreference:
      lowerInput.includes("easy") || lowerInput.includes("not too difficult")
        ? "easy"
        : "unknown",
    preferredGenres: [],
    referenceGames: [],
  };
}