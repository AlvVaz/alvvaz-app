// Date helpers for the quote calendars. Dates are "YYYY-MM-DD" strings in local time.

export const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const MONTHS_SHORT = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = parseIsoDate(value);
  return toIsoDate(date) === value;
}

export function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseIsoDate(value: string) {
  const [, year, month, day] = ISO_DATE.exec(value) ?? [];
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// "7 al 10 de enero 2027", "28 de febrero al 3 de marzo 2027",
// "28 de diciembre 2026 al 3 de enero 2027", or "7 de enero 2027" for one day.
export function formatTravelRange(start: string, end: string) {
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  const toText = `${to.getDate()} de ${MONTHS_LONG[to.getMonth()]} ${to.getFullYear()}`;
  if (start === end) return toText;
  if (from.getFullYear() !== to.getFullYear()) {
    return `${from.getDate()} de ${MONTHS_LONG[from.getMonth()]} ${from.getFullYear()} al ${toText}`;
  }
  if (from.getMonth() !== to.getMonth()) {
    return `${from.getDate()} de ${MONTHS_LONG[from.getMonth()]} al ${toText}`;
  }
  return `${from.getDate()} al ${toText}`;
}

// Liquidation is stored as the three values the calendar block shows (17 / DIC / 2026).
export function toLiquidationParts(iso: string) {
  const date = parseIsoDate(iso);
  return {
    liquidationDay: String(date.getDate()),
    liquidationMonth: MONTHS_SHORT[date.getMonth()],
    liquidationYear: String(date.getFullYear()),
  };
}

export function fromLiquidationParts(day: string, month: string, year: string) {
  const monthIndex = MONTHS_SHORT.indexOf(month.trim().toUpperCase());
  const date = new Date(Number(year), monthIndex, Number(day));
  if (monthIndex < 0 || Number.isNaN(date.getTime())) return null;
  const iso = toIsoDate(date);
  return isIsoDate(iso) && date.getDate() === Number(day) ? iso : null;
}

// Flight dates use the short template format: "7 ene".
export function toShortDate(iso: string) {
  const date = parseIsoDate(iso);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()].toLowerCase()}`;
}

// The short format has no year; `year` comes from the travel dates when known.
export function fromShortDate(text: string, year: number) {
  const [day, month] = text.trim().split(/\s+/);
  return fromLiquidationParts(day ?? "", month ?? "", String(year));
}

export type QuoteTime = { hour: number; minute: number; period: "AM" | "PM" };

// Flight times use "7:09 AM".
export function formatQuoteTime({ hour, minute, period }: QuoteTime) {
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

export function parseQuoteTime(text: string): QuoteTime | null {
  const match = /^\s*(\d{1,2}):(\d{2})\s*([ap])\.?\s*m?\.?\s*$/i.exec(text);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  return { hour, minute, period: match[3].toUpperCase() === "A" ? "AM" : "PM" };
}
