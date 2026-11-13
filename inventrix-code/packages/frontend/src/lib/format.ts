const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number): string {
  return `$${priceFormatter.format(Number.isFinite(value) ? value : 0)}`;
}

/**
 * SQLite CURRENT_TIMESTAMP is `YYYY-MM-DD HH:MM:SS` in UTC with no zone
 * marker; normalise it to ISO so every browser parses it the same way.
 */
export function parseServerDate(value: string): Date {
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date(value) : date;
}

export function formatDate(value: string): string {
  const date = parseServerDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string): string {
  const date = parseServerDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
