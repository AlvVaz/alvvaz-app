import type { Prisma, Quote } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  formatQuoteHotels,
  parseQuoteData,
  type QuoteData,
  type QuoteListItem,
  type QuoteRecord,
} from "@/lib/quotes/types";

const QUOTE_LIST_LIMIT = 100;

export type QuoteViewer = { sub: string; role: string };

// Same rule as contracts: owner and tech see every quote, admins only the ones they created.
export function canAccessQuote(viewer: QuoteViewer, quote: Pick<QuoteRecord, "createdById">) {
  return viewer.role !== "admin" || quote.createdById === viewer.sub;
}

// Owner and tech can pick another admin as Vendedor; everyone else always gets their own name.
export function canChooseQuoteVendor(viewer: QuoteViewer) {
  return viewer.role === "owner" || viewer.role === "tech";
}

// Every admin's display name: the choices for Vendedor (same values contracts use for Organizador).
export async function listQuoteVendorNames() {
  const users = await prisma.adminUser.findMany({
    select: { username: true, email: true },
    orderBy: { username: "asc" },
  });
  return users.map((user) => user.username || user.email);
}

// Admins left out of the Vendedor picker. They can still be the Vendedor of quotes they
// already have (saving those keeps the name: resolveQuoteVendor checks the full list).
const HIDDEN_QUOTE_VENDORS = ["annelise neufeld"];

// Choices shown in the Vendedor picker.
export async function listQuoteVendorChoices() {
  const hidden = new Set(HIDDEN_QUOTE_VENDORS.map((name) => name.toLowerCase()));
  return (await listQuoteVendorNames()).filter((name) => !hidden.has(name.toLowerCase()));
}

// Vendedor comes from the session. A name sent by the client is only accepted
// from owner/tech, and only if it belongs to an existing admin.
export async function resolveQuoteVendor(
  viewer: QuoteViewer,
  requested: string,
  fallback: () => Promise<string>
) {
  const name = requested.trim();
  if (name && canChooseQuoteVendor(viewer) && (await listQuoteVendorNames()).includes(name)) {
    return name;
  }
  return fallback();
}

// Name shown as "Vendedor": the admin's username, or email when no username is set.
export async function getAdminDisplayName(adminId: string) {
  const user = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { username: true, email: true },
  });
  return user ? user.username || user.email : null;
}

// Folio the next saved quote will most likely get (read-only peek at the sequence).
// Shown on an unsaved quote; the real folio is assigned by the DB on save.
export async function getNextQuoteFolio() {
  const rows = await prisma.$queryRaw<{ last_value: bigint; is_called: boolean }[]>`
    SELECT last_value, is_called FROM "Quote_folio_seq"
  `;
  const row = rows[0];
  if (!row) return null;
  return row.is_called ? Number(row.last_value) + 1 : Number(row.last_value);
}

function toQuoteRecord(quote: Quote): QuoteRecord {
  return {
    id: quote.id,
    folio: quote.folio,
    clientName: quote.clientName,
    hotelName: quote.hotelName,
    data: parseQuoteData(quote.data),
    storageBucket: quote.storageBucket,
    storagePath: quote.storagePath,
    createdById: quote.createdById,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
  };
}

export async function listQuotes(viewer: QuoteViewer, search?: string): Promise<QuoteListItem[]> {
  const term = search?.trim() ?? "";
  const folio = Number.parseInt(term.replace(/^#/, ""), 10);
  const where: Prisma.QuoteWhereInput = {
    AND: [
      viewer.role === "admin" ? { createdById: viewer.sub } : {},
      term
        ? {
            OR: [
              { clientName: { contains: term, mode: "insensitive" } },
              { hotelName: { contains: term, mode: "insensitive" } },
              ...(Number.isInteger(folio) ? [{ folio }] : []),
            ],
          }
        : {},
    ],
  };

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { folio: "desc" },
    take: QUOTE_LIST_LIMIT,
  });

  const creatorIds = Array.from(
    new Set(quotes.map((quote) => quote.createdById).filter((id): id is string => Boolean(id)))
  );
  const creators = creatorIds.length
    ? await prisma.adminUser.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, username: true, email: true },
      })
    : [];
  const creatorNames = new Map(creators.map((user) => [user.id, user.username || user.email]));

  return quotes.map((quote) => ({
    ...toQuoteRecord(quote),
    createdByName: quote.createdById ? creatorNames.get(quote.createdById) ?? null : null,
  }));
}

export async function getQuote(id: string) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  return quote ? toQuoteRecord(quote) : null;
}

export async function createQuote(data: QuoteData, createdById: string | null) {
  const quote = await prisma.quote.create({
    data: {
      clientName: data.clientName,
      hotelName: formatQuoteHotels(data),
      data,
      createdById,
    },
  });
  return toQuoteRecord(quote);
}

export async function updateQuote(id: string, data: QuoteData) {
  const quote = await prisma.quote.update({
    where: { id },
    data: {
      clientName: data.clientName,
      hotelName: formatQuoteHotels(data),
      data,
    },
  });
  return toQuoteRecord(quote);
}

export async function setQuotePdf(id: string, storageBucket: string, storagePath: string) {
  const quote = await prisma.quote.update({
    where: { id },
    data: { storageBucket, storagePath },
  });
  return toQuoteRecord(quote);
}

export async function deleteQuote(id: string) {
  await prisma.quote.delete({ where: { id } });
}
