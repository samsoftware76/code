import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { ChatMessage, ChatMode, ChatImage } from '@/lib/chatTypes';
import { getApiKey } from '@/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM: Record<ChatMode, string> = {
  // ... (previous system prompts)
  code: `You are an expert programming tutor. When the user sends screenshots or text of coding challenges:
- Treat ALL screenshots/inputs in a single turn as ONE unified problem.
- Give ONE complete, working code solution — do not split into separate answers.
- For multi-part questions (Part 1, Part 2…), answer every part in sequence in a single response.
- Format code in markdown fenced code blocks with the language label.
- Keep explanations clear and educational.`,
  essay: `You are an expert academic writing assistant. When the user sends screenshots or text of essay prompts:
- Treat ALL inputs as ONE unified assignment.
- Write ONE complete, cohesive response addressing every part.
- Use natural, varied sentence lengths. Avoid AI clichés like "delve", "tapestry", "multifaceted".
- Maintain an academic but human tone.`,
};

interface ChatRequest {
  history: ChatMessage[];
  newImages: ChatImage[];
  newText: string;
  mode: ChatMode;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const body: ChatRequest = await request.json();
    const { history, newImages, newText, mode } = body;

    if (!newImages?.length && !newText?.trim()) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    // Build multi-turn contents from history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contents: any[] = [];

    for (const msg of history) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];
      if (msg.images?.length) {
        for (const img of msg.images) {
          parts.push({ inlineData: { data: img.data, mimeType: img.mediaType } });
        }
      }
      if (msg.text) parts.push({ text: msg.text });
      if (parts.length) {
        contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts });
      }
    }

    // Build new user turn
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newParts: any[] = [];
    for (const img of newImages ?? []) {
      newParts.push({ inlineData: { data: img.data, mimeType: img.mediaType } });
    }

    // Compose prompt text
    let prompt = SYSTEM[mode] + '\n\n';
    if ((newImages?.length ?? 0) > 1) {
      prompt += `I have attached ${newImages.length} screenshots. Treat them as one combined problem and give a single complete answer.\n\n`;
    }
    if (newText?.trim()) {
      prompt += newText.trim();
    } else {
      prompt += 'Please analyze the screenshot(s) and provide a complete solution.';
    }
    newParts.push({ text: prompt });
    contents.push({ role: 'user', parts: newParts });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    return NextResponse.json({ success: true, content: response.text ?? '' });
  } catch (err) {
    console.error('Chat error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
