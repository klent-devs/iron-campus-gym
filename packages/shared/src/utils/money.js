const pesoFormatter = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1200 → "₱1,200.00"; -80 → "−₱80.00" */
export function formatPeso(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '₱0.00';
  const text = `₱${pesoFormatter.format(Math.abs(value))}`;
  return value < 0 ? `−${text}` : text;
}

/** Short peso amounts for chart axes: 600000 → "₱600k", 1250000 → "₱1.25M", 950 → "₱950". */
export function formatPesoCompact(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value === 0) return '₱0';
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  const trim = (n) => String(Math.round(n * 100) / 100);
  if (abs >= 1_000_000) return `${sign}₱${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}₱${trim(abs / 1_000)}k`;
  return `${sign}₱${trim(abs)}`;
}

/** "₱1,200.50" / "1200.5" → 1200.5. Returns NaN for text that is not a number. */
export function parsePeso(text) {
  if (typeof text === 'number') return text;
  const cleaned = String(text ?? '')
    .replace(/[₱,\s]/g, '')
    .replace('−', '-');
  return cleaned === '' ? NaN : Number(cleaned);
}

/** Rounds to centavos to avoid floating-point drift (0.1 + 0.2). */
export function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

/** Change to give back; never negative. */
export function computeChange(amountDue, amountReceived) {
  return Math.max(0, roundMoney(Number(amountReceived) - Number(amountDue)));
}
