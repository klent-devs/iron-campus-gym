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

/** "₱1,200.50" / "1200.5" → 1200.5. Returns NaN for text that is not a number. */
export function parsePeso(text) {
  if (typeof text === 'number') return text;
  const cleaned = String(text ?? '').replace(/[₱,\s]/g, '').replace('−', '-');
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
