import type { Prisma } from "@prisma/client";

export type TripIndexRow = {
  id: string;
  departureDate: string | null;
  returnDate: string | null;
  createdAt: Date;
};

export type CompletedTripMonthGroup = {
  key: string;
  year: number;
  month: number;
  label: string;
  count: number;
};

const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
});

export function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTripYear(trip: {
  departureDate: string | null;
  returnDate: string | null;
  createdAt: Date | string;
}) {
  const base = trip.departureDate || trip.returnDate || trip.createdAt;
  if (!base) return null;
  const date = new Date(base);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

export function getTripMonthKey(trip: {
  departureDate: string | null;
  returnDate: string | null;
  createdAt: Date | string;
}) {
  const base = trip.departureDate || trip.returnDate || trip.createdAt;
  if (!base) return null;
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    year,
    month,
    label: monthFormatter.format(date),
  };
}

export function getTripYearWhere(year: number): Prisma.TripWhereInput {
  const selectedYear = String(year);
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return {
    OR: [
      { departureDate: { startsWith: selectedYear } },
      { returnDate: { startsWith: selectedYear } },
      { createdAt: { gte: start, lt: end } },
    ],
  };
}

export function getUpcomingTripWhere(today = toDateOnly(new Date())): Prisma.TripWhereInput {
  return {
    OR: [{ returnDate: null }, { returnDate: { gte: today } }],
  };
}

export function getCompletedTripWhere(today = toDateOnly(new Date())): Prisma.TripWhereInput {
  return { returnDate: { lt: today } };
}

export function buildCompletedTripMonthGroups(rows: TripIndexRow[]) {
  const groups = new Map<string, CompletedTripMonthGroup>();

  for (const row of rows) {
    const month = getTripMonthKey(row);
    if (!month) continue;
    const current = groups.get(month.key);
    groups.set(month.key, {
      ...month,
      count: (current?.count ?? 0) + 1,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}
