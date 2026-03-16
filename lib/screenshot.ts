/**
 * Screenshot capture utilities using Screen Capture API
 */

export interface CaptureOptions {
  preferCurrentTab?: boolean;
}

/**
 * Capture a screenshot using the Screen Capture API
 * @returns Promise with base64 encoded image data and media type
 */
export async function captureScreenshot(
  _options: CaptureOptions = {}
): Promise<{ data: string; mediaType: 'image/png' }> {
  try {
    // Request screen capture permission
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser', // Prefer browser tab
      } as MediaTrackConstraints,
      audio: false,
    });

    // Create video element to capture the stream
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;

    // Wait for video to be ready
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    // Wait a bit for the video to start playing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create canvas and capture the current frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Draw the video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop the stream
    stream.getTracks().forEach((track) => track.stop());

    // Convert canvas to base64
    const base64Data = canvas.toDataURL('image/png').split(',')[1];

    return {
      data: base64Data,
      mediaType: 'image/png',
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen capture permission denied');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No capturable screen found');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Browser does not support screen capture');
      }
    }
    throw new Error('Error during screenshot capture');
  }
}

/**
 * Check if screen capture is supported in the current browser
 */
export function isScreenCaptureSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia
  );
}

/**
 * Convert a blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

