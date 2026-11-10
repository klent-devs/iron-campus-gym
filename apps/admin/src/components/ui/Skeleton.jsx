/** Grey placeholder block shown while data loads. Size it with classes (h-3 w-32…). */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-card-2 ${className}`} aria-hidden="true" />;
}
