import {
  addDays,
  daysBetween,
  formatTravelRange,
  fromShortDate,
  parseIsoDate,
  toIsoDate,
  toLiquidationParts,
  toShortDate,
} from "@/lib/quotes/dates";
import type { QuoteData, QuoteIncludeItem } from "@/lib/quotes/types";

// Money is typed without "$" ("1,500"); returns null when it isn't a number.
function parseAmount(value: string) {
  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : null;
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(amount);

const MONEY_FIELDS = ["depositTotal", "depositPerPerson"] as const;

// Adds thousands commas while typing ("24908" -> "24,908"). Decimals are kept
// as typed so "24908." doesn't lose its dot; anything else is left alone.
function formatMoneyInput(value: string) {
  const match = /^(\d+)(\.\d*)?$/.exec(value.replace(/,/g, "").trim());
  if (!match) return value;
  return `${match[1].replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${match[2] ?? ""}`;
}

// The Salida flight date is stored without a year ("7 ene"). Use the year that
// puts it closest to the trip start, or the next upcoming one without trip dates.
function departureToIso(data: QuoteData) {
  const start = data.travelRange?.start;
  const reference = start ?? toIsoDate(new Date());
  const year = parseIsoDate(reference).getFullYear();
  const candidates = [year - 1, year, year + 1]
    .map((candidate) => fromShortDate(data.departureDate, candidate))
    .filter((iso): iso is string => Boolean(iso));
  if (start) {
    return candidates.sort(
      (a, b) => Math.abs(daysBetween(start, a)) - Math.abs(daysBetween(start, b))
    )[0] ?? null;
  }
  return candidates.find((iso) => iso >= reference) ?? null;
}

// Regreso has no year either: the first matching date on or after the departure.
function shortDateOnOrAfter(text: string, fromIso: string) {
  const year = parseIsoDate(fromIso).getFullYear();
  return [year, year + 1]
    .map((candidate) => fromShortDate(text, candidate))
    .find((iso): iso is string => iso !== null && iso >= fromIso) ?? null;
}

// "Incluye" text for the default items marked `auto`. Empty sources leave the
// text short instead of showing a wrong route or night count.
function fillAutoInclude(item: QuoteIncludeItem, data: QuoteData): QuoteIncludeItem {
  if (item.auto === "route") {
    const origin = data.originCode.trim();
    const destination = data.destinationCode.trim();
    return { ...item, detail: origin && destination ? `${origin} / ${destination} / ${origin}` : "" };
  }
  if (item.auto === "stay") {
    const nights = data.nights.trim();
    const room = data.roomType.trim().toLowerCase();
    return {
      ...item,
      title: nights ? `${nights} ${nights === "1" ? "noche" : "noches"}` : "",
      detail: room ? `de hospedaje en habitación ${room}` : "de hospedaje",
    };
  }
  return item;
}

// Fills the values that repeat info already in the quote, but only when their
// source changed in this edit, so a value typed by hand stays until the source
// changes again.
export function applyDerivedFields(previous: QuoteData, next: QuoteData): QuoteData {
  const result = { ...next };

  for (const field of MONEY_FIELDS) {
    if (next[field] !== previous[field]) {
      result[field] = formatMoneyInput(next[field]);
    }
  }
  result.options = next.options.map((option, index) =>
    option.totalPrice !== previous.options[index]?.totalPrice
      ? { ...option, totalPrice: formatMoneyInput(option.totalPrice) }
      : option
  );

  const range = next.travelRange;
  const rangeChanged =
    range &&
    (range.start !== previous.travelRange?.start || range.end !== previous.travelRange?.end);
  if (range && rangeChanged) {
    result.departureDate = toShortDate(range.start);
    result.returnDate = toShortDate(range.end);
    result.nights = String(daysBetween(range.start, range.end));
  } else if (next.departureDate !== previous.departureDate || next.returnDate !== previous.returnDate) {
    // The other way around: Salida + Regreso fill Fechas de viaje and Noches.
    const start = departureToIso(result);
    const end = start ? shortDateOnOrAfter(result.returnDate, start) : null;
    if (start && end) {
      result.travelRange = { start, end };
      result.travelDates = formatTravelRange(start, end);
      result.nights = String(daysBetween(start, end));
    }
  }

  // Liquidación = Salida − "N días antes de la salida" (21 by default). Follows the Salida
  // date (also when the trip dates fill it above) and the day count; a blank count leaves it.
  if (
    result.departureDate !== previous.departureDate ||
    result.travelRange?.start !== previous.travelRange?.start ||
    result.liquidationDays !== previous.liquidationDays
  ) {
    const departure = departureToIso(result);
    const daysBefore = Number.parseInt(result.liquidationDays, 10);
    if (departure && Number.isInteger(daysBefore) && daysBefore >= 0) {
      Object.assign(result, toLiquidationParts(addDays(departure, -daysBefore)));
    }
  }

  // Reserva con = Mínimo por persona × everyone going (adultos + menores; ages don't
  // matter). It can't be typed, so it's cleared until the amount and head count are both there.
  if (
    next.adults !== previous.adults ||
    next.minors !== previous.minors ||
    next.depositPerPerson !== previous.depositPerPerson
  ) {
    const people = (parseAmount(next.adults) ?? 0) + (parseAmount(next.minors) ?? 0);
    const perPerson = parseAmount(result.depositPerPerson);
    result.depositTotal = perPerson !== null && people > 0 ? formatAmount(people * perPerson) : "";
  }

  // Uses `result` so nights filled from the travel dates above count as a change too.
  const routeChanged =
    result.originCode !== previous.originCode || result.destinationCode !== previous.destinationCode;
  const stayChanged = result.nights !== previous.nights || result.roomType !== previous.roomType;
  if (routeChanged || stayChanged) {
    result.includes = result.includes.map((item) =>
      (item.auto === "route" && routeChanged) || (item.auto === "stay" && stayChanged)
        ? fillAutoInclude(item, result)
        : item
    );
  }

  return result;
}
