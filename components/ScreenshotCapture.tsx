'use client';

import { useState } from 'react';
import { captureScreenshot, isScreenCaptureSupported } from '@/lib/screenshot';

interface ScreenshotCaptureProps {
  onCapture: (imageData: string, mediaType: 'image/png') => void;
  onError?: (error: string) => void;
}

export default function ScreenshotCapture({
  onCapture,
  onError,
}: ScreenshotCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [supported, setSupported] = useState(true);

  const handleCapture = async () => {
    if (!isScreenCaptureSupported()) {
      setSupported(false);
      onError?.('Browser does not support screen capture');
      return;
    }

    setIsCapturing(true);

    try {
      const { data, mediaType } = await captureScreenshot();
      onCapture(data, mediaType);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error occurred during screenshot capture';
      onError?.(message);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!supported) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
        <svg
          className="w-12 h-12 text-red-400 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-red-700 font-medium">
          Browser does not support screen capture
        </p>
        <p className="text-red-600 text-sm mt-2">
          Use a modern browser (Chrome, Edge, Firefox)
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <button
        onClick={handleCapture}
        disabled={isCapturing}
        className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
      >
        {isCapturing ? (
          <>
            <svg
              className="animate-spin h-6 w-6"
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
            <span>Capturing screen...</span>
          </>
        ) : (
          <>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Capture Screenshot</span>
          </>
        )}
      </button>
      <p className="text-sm text-gray-500 mt-4">
        Click the button, then select the challenge window
      </p>
    </div>
  );
}
