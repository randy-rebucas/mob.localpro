/** Format a PHP amount for display (whole pesos). */
export function formatPeso(amount: number, options?: { signed?: boolean }): string {
  const n = Math.round(amount);
  const abs = `₱${Math.abs(n).toLocaleString('en-PH')}`;
  if (options?.signed) {
    if (n > 0) return `+${abs}`;
    if (n < 0) return `−₱${Math.abs(n).toLocaleString('en-PH')}`;
    return abs;
  }
  return n < 0 ? `−₱${Math.abs(n).toLocaleString('en-PH')}` : abs;
}
