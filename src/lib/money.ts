/**
 * Amounts are stored as integer thousandths of the currency unit, whatever the
 * currency. Integers keep sums exact (no 0.1 + 0.2 drift), and thousandths
 * cover every currency in use, including the 3-decimal ones like KWD.
 */
export const SCALE = 1000;

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(undefined, { style: "currency", currency });
    formatters.set(currency, f);
  }
  return f;
}

/** How many decimals the currency uses: 2 for EUR, 0 for JPY, 3 for KWD. */
export function currencyDigits(currency: string): number {
  return formatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(amount: number, currency: string): string {
  return formatter(currency).format(amount / SCALE);
}

export function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

/**
 * Parses what the user typed into stored units. Accepts "12", "12.5" or
 * "12,50" (comma or dot as the decimal mark), with no more decimals than the
 * currency allows. Returns null for anything else, including zero.
 */
export function parseAmount(input: string, digits: number): number | null {
  const m = /^(\d{1,9})(?:[.,](\d*))?$/.exec(input.trim());
  if (!m) return null;
  const fraction = m[2] ?? "";
  if (fraction.length > digits) return null;
  const amount = Number(m[1]) * SCALE + Number((fraction + "000").slice(0, 3));
  return amount > 0 ? amount : null;
}

/** The reverse of parseAmount, for pre-filling the edit form. */
export function amountToInput(amount: number, digits: number): string {
  const whole = Math.floor(amount / SCALE);
  if (digits === 0) return String(whole);
  const fraction = String(amount % SCALE).padStart(3, "0").slice(0, digits);
  return `${whole}.${fraction}`;
}
