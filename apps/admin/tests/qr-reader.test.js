import { buildQrPayload } from '@icg/shared';
import jsQR from 'jsqr';
import qrcode from 'qrcode-generator';
import { describe, expect, it } from 'vitest';
import { decodeQr, frameSize } from '../src/lib/qrReader.js';

/** Draw a QR code as black-on-white RGBA pixels, like one frame from the camera. */
function qrPixels(text, cell = 6, margin = 4) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const modules = qr.getModuleCount();
  const size = (modules + margin * 2) * cell;
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < modules; r += 1) {
    for (let c = 0; c < modules; c += 1) {
      if (!qr.isDark(r, c)) continue;
      for (let y = 0; y < cell; y += 1) {
        for (let x = 0; x < cell; x += 1) {
          const i = (((margin + r) * cell + y) * size + (margin + c) * cell + x) * 4;
          rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
        }
      }
    }
  }
  return { rgba, size };
}

describe('decodeQr (camera QR reading on Windows)', () => {
  it('reads a member QR code', () => {
    const payload = buildQrPayload('Zq3mX9pL2vR7tK1wB4nC8dF6');
    const { rgba, size } = qrPixels(payload);
    expect(decodeQr(jsQR, rgba, size, size)).toBe(payload);
  });

  it('returns null for a frame with no QR code', () => {
    const size = 120;
    const blank = new Uint8ClampedArray(size * size * 4).fill(255);
    expect(decodeQr(jsQR, blank, size, size)).toBeNull();
  });
});

describe('frameSize', () => {
  it('shrinks a 1280×720 frame to 720 on the long side, same shape', () => {
    expect(frameSize(1280, 720)).toEqual({ width: 720, height: 405 });
  });
  it('leaves small frames alone', () => {
    expect(frameSize(640, 480)).toEqual({ width: 640, height: 480 });
  });
});
