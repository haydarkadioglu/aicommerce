/**
 * Format a date as a relative time string ("just now", "5m ago", "2h ago",
 * "3d ago", "2026-09-23" for older).
 *
 * Designed for use in activity feeds, conversation lists, notifications.
 */

export function relativeTime(date: Date | string | number): string {
  const d =
    typeof date === "string"
      ? new Date(date)
      : typeof date === "number"
      ? new Date(date)
      : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  // Older than a week — show date
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/**
 * Compact relative time (no "ago" suffix). Good for tight UIs like
 * notification badges and stat subheaders.
 */
export function relativeTimeShort(date: Date | string | number): string {
  const d =
    typeof date === "string"
      ? new Date(date)
      : typeof date === "number"
      ? new Date(date)
      : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 5) return "now";
  if (sec < 60) return `${sec}s`;
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
