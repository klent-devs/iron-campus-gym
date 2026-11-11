import { useEffect } from 'react';

/**
 * Smooth, slightly slower mouse-wheel / touchpad scrolling for the whole page.
 *
 * Browsers jump the page by a fixed amount per wheel "click", which staff found too fast and
 * jerky. Here each wheel event only moves a target position (by SPEED × the wheel amount), and the
 * page glides towards it a little every frame. No library needed.
 *
 * Left to the browser (normal scrolling):
 * - Ctrl + wheel (zoom), sideways scrolling, and Shift + wheel
 * - anything inside a box that scrolls on its own (sidebar, tables, pop-ups) while it can still scroll
 * - people who turned on "reduce motion" / "show animations: off" in Windows
 * - keyboard, scrollbar dragging and touch screens (already smooth in the browser)
 */

/** Fraction of the browser's normal wheel distance. Lower = slower. */
export const SCROLL_SPEED = 0.6;
/** How much of the remaining distance is covered per 60 fps frame. Lower = smoother, longer glide. */
export const SCROLL_EASE = 0.14;

const LINE_HEIGHT_PX = 16;

/** Wheel distance in pixels, whatever unit the mouse driver reports (pixels, lines or pages). */
export function wheelDeltaPixels(event, viewportHeight) {
  if (event.deltaMode === 1) return event.deltaY * LINE_HEIGHT_PX;
  if (event.deltaMode === 2) return event.deltaY * viewportHeight;
  return event.deltaY;
}

/** Keeps a scroll position inside the page. */
export function clampScroll(value, maxScroll) {
  return Math.min(Math.max(value, 0), Math.max(maxScroll, 0));
}

/**
 * One animation frame: move from `current` towards `target`. Frame-rate independent, so it feels
 * the same on 60 Hz and 144 Hz screens. Snaps to the target when less than half a pixel is left.
 */
export function nextScrollPosition(current, target, frameMs, ease = SCROLL_EASE) {
  const remaining = target - current;
  if (Math.abs(remaining) < 0.5) return target;
  const factor = 1 - Math.pow(1 - ease, frameMs / (1000 / 60));
  return current + remaining * factor;
}

/** True if `el` (or a parent below the page) can still scroll itself in this direction. */
function insideOwnScroller(el, deltaY) {
  for (let node = el; node && node !== document.body && node !== document.documentElement;) {
    if (node.nodeType === 1) {
      const { overflowY } = getComputedStyle(node);
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight + 1
      ) {
        const atTop = node.scrollTop <= 0;
        const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
        if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
      }
    }
    node = node.parentNode;
  }
  return false;
}

/** Turns on smooth wheel scrolling for the page while the component using it is on screen. */
export function useSmoothWheelScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = window.scrollY;
    let current = window.scrollY;
    let frame = 0;
    let lastTime = 0;

    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const step = (time) => {
      // Someone else moved the page (keyboard, scrollbar, a link, a page change): let them win.
      if (Math.abs(window.scrollY - Math.round(current)) > 2) {
        stop();
        return;
      }
      const frameMs = lastTime ? Math.min(time - lastTime, 64) : 1000 / 60;
      lastTime = time;
      target = clampScroll(target, maxScroll());
      current = nextScrollPosition(current, target, frameMs);
      window.scrollTo(0, current);
      if (current === target) stop();
      else frame = requestAnimationFrame(step);
    };

    const onWheel = (event) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.shiftKey ||
        reduceMotion.matches ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        event.deltaY === 0 ||
        insideOwnScroller(event.target, event.deltaY)
      ) {
        return;
      }
      event.preventDefault();
      if (!frame) {
        // Start from where the page really is (it may have been moved by other means).
        target = window.scrollY;
        current = window.scrollY;
        lastTime = 0;
      }
      target = clampScroll(
        target + wheelDeltaPixels(event, window.innerHeight) * SCROLL_SPEED,
        maxScroll(),
      );
      if (!frame) frame = requestAnimationFrame(step);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      stop();
    };
  }, []);
}
