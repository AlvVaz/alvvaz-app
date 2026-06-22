import { NextResponse } from "next/server";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { getTrips } from "@/lib/db";
import {
  getCompletedTripWhere,
  getTripMonthKey,
  getTripYearWhere,
} from "@/lib/trips/admin-list";
import { prisma } from "@/lib/prisma";

function parseYear(value: string | null) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMonth(value: string | null) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) return null;
  return parsed;
}

export async function GET(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
  }

  const url = new URL(request.url);
  const year = parseYear(url.searchParams.get("year"));
  const month = parseMonth(url.searchParams.get("month"));

  if (!year || !month) {
    return NextResponse.json({ error: "Falta año o mes." }, { status: 400 });
  }

  const rows = await prisma.trip.findMany({
    where: {
      AND: [getTripYearWhere(year), getCompletedTripWhere()],
    },
    select: {
      id: true,
      departureDate: true,
      returnDate: true,
      createdAt: true,
    },
  });
  const tripIds = rows
    .filter((row) => {
      const monthKey = getTripMonthKey(row);
      return monthKey?.year === year && monthKey.month === month;
    })
    .map((row) => row.id);

  const trips = tripIds.length
    ? await getTrips({ where: { id: { in: tripIds } } })
    : [];

  return NextResponse.json({ trips, totalCount: trips.length });
}
