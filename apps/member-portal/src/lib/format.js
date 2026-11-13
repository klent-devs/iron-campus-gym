/** Small wording helpers for the member app. */

const HOUR = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Manila',
});

/** "Morning visit" / "Afternoon visit" / "Evening visit" from the time in (gym time). */
export function visitPart(timeIn) {
  const h = Number(HOUR.format(new Date(timeIn)));
  if (h < 12) return 'Morning visit';
  if (h < 17) return 'Afternoon visit';
  return 'Evening visit';
}

/** 'YYYY-MM-DD' → "Mon, 09 Nov". */
export function shortDay(d) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(`${d}T00:00:00Z`))
    .replace(/^(\w+) /, '$1, ');
}
