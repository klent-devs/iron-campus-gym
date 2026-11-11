import { describe, expect, it } from 'vitest';
import {
  SCROLL_EASE,
  clampScroll,
  nextScrollPosition,
  wheelDeltaPixels,
} from '../src/lib/smoothScroll.js';

describe('wheelDeltaPixels', () => {
  it('passes pixel deltas through (most mice and touchpads)', () => {
    expect(wheelDeltaPixels({ deltaMode: 0, deltaY: 100 }, 900)).toBe(100);
  });
  it('turns line deltas into pixels (some mouse drivers, Firefox)', () => {
    expect(wheelDeltaPixels({ deltaMode: 1, deltaY: 3 }, 900)).toBe(48);
  });
  it('turns page deltas into the window height', () => {
    expect(wheelDeltaPixels({ deltaMode: 2, deltaY: -1 }, 900)).toBe(-900);
  });
});

describe('clampScroll', () => {
  it('never scrolls above the top or below the bottom', () => {
    expect(clampScroll(-50, 1000)).toBe(0);
    expect(clampScroll(1200, 1000)).toBe(1000);
    expect(clampScroll(400, 1000)).toBe(400);
  });
  it('stays at 0 when the page is shorter than the window', () => {
    expect(clampScroll(300, -100)).toBe(0);
  });
});

describe('nextScrollPosition', () => {
  it('covers part of the remaining distance each frame', () => {
    const next = nextScrollPosition(0, 100, 1000 / 60);
    expect(next).toBeCloseTo(100 * SCROLL_EASE);
  });

  it('glides: each frame moves less than the one before', () => {
    let pos = 0;
    const steps = [];
    for (let i = 0; i < 5; i += 1) {
      const next = nextScrollPosition(pos, 300, 1000 / 60);
      steps.push(next - pos);
      pos = next;
    }
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]).toBeLessThan(steps[i - 1]);
  });

  it('feels the same on a 120 Hz screen as on 60 Hz', () => {
    const at60 = nextScrollPosition(0, 100, 1000 / 60);
    const half = nextScrollPosition(0, 100, 1000 / 120);
    const at120 = nextScrollPosition(half, 100, 1000 / 120);
    expect(at120).toBeCloseTo(at60, 5);
  });

  it('snaps to the target when less than half a pixel is left', () => {
    expect(nextScrollPosition(99.7, 100, 16)).toBe(100);
  });

  it('works when scrolling up', () => {
    const next = nextScrollPosition(500, 200, 1000 / 60);
    expect(next).toBeLessThan(500);
    expect(next).toBeGreaterThan(200);
  });

  it('finishes the glide in under a second', () => {
    let pos = 0;
    let frames = 0;
    while (pos !== 600 && frames < 200) {
      pos = nextScrollPosition(pos, 600, 1000 / 60);
      frames += 1;
    }
    expect(frames).toBeLessThan(60); // under 1 s at 60 fps
  });
});
