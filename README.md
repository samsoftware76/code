# Connie AI - Code & Essay Solver

Welcome to Connie AI, your advanced assistant for solving coding challenges and drafting academic essays with high burstiness and human-like perplexity.

## Features
- **Code Solver**: Get complete, working solutions for programming problems.
- **Essay Assistant**: Humanized, undetectable AI writing for prompts.
- **Mobile Camera Support**: Snap photos of questions directly from your phone.
- **API Key Rotation**: Robust handling of multiple Gemini API keys to avoid rate limits.

## Deployment on Vercel

### Environment Variables
You must configure the following environment variables in the Vercel dashboard:

- `GEMINI_API_KEY`: Primary Google GenAI API key.
- `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, `GEMINI_API_KEY_4`: (Optional) Additional keys for rotation.
- `NEXT_PUBLIC_MAX_IMAGE_SIZE`: `5242880` (5MB).
- `NEXT_PUBLIC_ACCEPTED_IMAGE_TYPES`: `image/png,image/jpeg,image/jpg,image/webp`.

### Build Settings
- **Framework**: Next.js
- **Root Directory**: `./` (Root)
- **Node.js Version**: 20.x or higher

## Local Development
Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the app.
