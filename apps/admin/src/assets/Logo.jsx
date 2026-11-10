import { colors } from '../lib/theme.js';

/**
 * IRON CAMPUS GYM logo (docs/design/Brand.dc.html): an orange weight-plate "C" with a
 * barbell "I" through it. `bar` is the barbell colour (white on dark, black on light).
 */
export function LogoMark({ size = 40, bar = colors.ink, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M36.7 11.3A18 18 0 1 0 36.7 36.7"
        fill="none"
        stroke={colors.brand}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M18 13h12M18 35h12M24 13v22" stroke={bar} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Logo mark + "IRON CAMPUS / GYM" wordmark, as in the sidebar. */
export function LogoFull() {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={40} />
      <span className="leading-[1.05]">
        <span className="block font-heading text-[17px] font-extrabold tracking-[0.04em] text-ink">
          IRON CAMPUS
        </span>
        <span className="block font-heading text-xs font-bold tracking-[0.34em] text-brand-text">
          GYM
        </span>
      </span>
    </span>
  );
}
