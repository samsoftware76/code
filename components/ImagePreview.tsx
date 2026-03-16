'use client';

import Image from 'next/image';

interface ImagePreviewProps {
  imageData: string;
  onAnalyze: () => void;
  onReset: () => void;
  isAnalyzing: boolean;
}

export default function ImagePreview({
  imageData,
  onAnalyze,
  onReset,
  isAnalyzing,
}: ImagePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
        <Image
          src={`data:image/png;base64,${imageData}`}
          alt="Screenshot preview"
          width={800}
          height={600}
          className="w-full h-auto"
          priority
        />
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span>Analyze</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          disabled={isAnalyzing}
          className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>New Image</span>
        </button>
      </div>
    </div>
  );
}
