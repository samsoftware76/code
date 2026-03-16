import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeChallenge,
  analyzeEssayChallenge,
  analyzeTextChallenge,
  analyzeTextEssay,
  type AnalysisMode,
} from '@/lib/gemini';
import { getApiKey } from '@/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalyzeRequest {
  // Image-based
  image?: string;
  mediaType?: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  // Text-based (paste mode)
  text?: string;
  // Shared
  mode?: AnalysisMode;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API /analyze called');
    try {
      getApiKey();
    } catch (err) {
      return NextResponse.json(
        {
          error: 'API key not configured',
          message: err instanceof Error ? err.message : 'GEMINI_API_KEY environment variable is missing',
        },
        { status: 500 }
      );
    }

    const body: AnalyzeRequest = await request.json();
    const mode = body.mode ?? 'code';

    // ── TEXT / PASTE PATH ────────────────────────────────────────────────────
    if (body.text !== undefined) {
      if (!body.text.trim()) {
        return NextResponse.json(
          { error: 'Missing content', message: 'Pasted text is empty' },
          { status: 400 }
        );
      }

      console.log(`📝 Analyzing pasted text in ${mode} mode...`);
      const analysis =
        mode === 'essay'
          ? await analyzeTextEssay(body.text)
          : await analyzeTextChallenge(body.text);

      console.log('✅ Text analysis completed');
      return NextResponse.json({ success: true, data: analysis });
    }

    // ── IMAGE PATH ───────────────────────────────────────────────────────────
    if (!body.image) {
      return NextResponse.json(
        { error: 'Missing required field: provide either image or text' },
        { status: 400 }
      );
    }
    if (!body.mediaType) {
      return NextResponse.json(
        { error: 'Missing required field: mediaType' },
        { status: 400 }
      );
    }

    const validMediaTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validMediaTypes.includes(body.mediaType)) {
      return NextResponse.json(
        {
          error: 'Invalid media type',
          message: `Media type must be one of: ${validMediaTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    try {
      const decoded = Buffer.from(body.image, 'base64');
      if (decoded.length === 0) throw new Error('Empty image data');
      const maxSize = 5 * 1024 * 1024;
      if (decoded.length > maxSize) {
        return NextResponse.json(
          {
            error: 'Image too large',
            message: `Image size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
          },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid base64 image data' },
        { status: 400 }
      );
    }

    console.log(`📸 Starting image analysis in ${mode} mode...`);
    const analysis =
      mode === 'essay'
        ? await analyzeEssayChallenge(body.image, body.mediaType)
        : await analyzeChallenge(body.image, body.mediaType);

    console.log('✅ Analysis completed successfully');
    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Error in /api/analyze:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'API configuration error', message: 'Invalid or missing API key' },
          { status: 500 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', message: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Analysis failed', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  let configured = false;
  try {
    getApiKey();
    configured = true;
  } catch { /* ignore */ }

  return NextResponse.json({
    status: 'ok',
    message: 'Challenge analyzer API is running',
    configured,
  });
}
