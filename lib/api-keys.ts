
export function getApiKey(): string {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
  ].filter(Boolean) as string[];

  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  // Simple random rotation to distribute load
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}
