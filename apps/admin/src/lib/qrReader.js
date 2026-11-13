/**
 * Reads QR codes from the camera picture on the Attendance scanner.
 *
 * Chrome and Edge have a built-in QR reader (BarcodeDetector) on Mac, Android and ChromeOS, but
 * NOT on Windows, which is what the front-desk PC runs. There we read the picture ourselves with
 * jsQR (a small QR library), loaded only when the camera is opened.
 */

/** Frames are shrunk to at most this many pixels on the long side before reading (faster). */
const MAX_SIDE = 720;

let jsQRPromise = null;
const loadJsQR = () => {
  jsQRPromise ??= import('jsqr').then((m) => m.default ?? m);
  return jsQRPromise;
};

/**
 * Read a QR code from raw pixels. Pure, so it can be tested without a camera.
 * @param {Function} jsQR the jsQR function
 * @param {Uint8ClampedArray} rgba pixels, 4 bytes each (like ImageData.data)
 * @returns {string|null} the text inside the code, or null when there is none
 */
export function decodeQr(jsQR, rgba, width, height) {
  const code = jsQR(rgba, width, height, { inversionAttempts: 'dontInvert' });
  return code?.data || null;
}

/** Size to shrink a camera frame to: same shape, long side at most MAX_SIDE. */
export function frameSize(width, height, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function builtInReader() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats?.();
    if (formats && !formats.includes('qr_code')) return null;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    return async (video) => (await detector.detect(video))[0]?.rawValue || null;
  } catch {
    return null;
  }
}

/**
 * Make a reader for the camera's <video>: `const read = await createQrReader(); await read(video)`
 * gives the QR text, or null when there is no readable code in that frame.
 */
export async function createQrReader() {
  const builtIn = await builtInReader();
  if (builtIn) return builtIn;

  const jsQR = await loadJsQR();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    if (!video.videoWidth || !video.videoHeight) return null;
    const { width, height } = frameSize(video.videoWidth, video.videoHeight);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);
    return decodeQr(jsQR, ctx.getImageData(0, 0, width, height).data, width, height);
  };
}
