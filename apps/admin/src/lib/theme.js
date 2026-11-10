import icgPreset from '@icg/tailwind-preset';

const c = icgPreset.theme.extend.colors;

/** Brand colours as hex values, for places that can't use Tailwind classes (charts, SVG). */
export const colors = {
  brand: c.brand.DEFAULT,
  brandText: c.brand.text,
  line: c.line,
  card: c.card,
  card2: c['card-2'],
  ink: c.ink.DEFAULT,
  inkMuted: c.ink.muted,
  inkSoft: c.ink.soft,
  inkFaint: c.ink.faint,
};
