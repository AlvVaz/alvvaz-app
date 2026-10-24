import type { Prisma, Quote } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  formatQuoteHotels,
  parseQuoteData,
  QUOTE_KIND_LABELS,
  QUOTE_PAGE_SIZE,
  type QuoteData,
  type QuoteKind,
  type QuoteListItem,
  type QuoteListPage,
  type QuoteRecord,
} from "@/lib/quotes/types";

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

// Borradores live in the `data` JSON next to the quote's fields (no migration):
// `status: "draft"` on a quote never saved for real, and `pendingDraft` with a saved quote's
// autosaved edits. parseQuoteData leaves both out of `data`.
function toQuoteRecord(quote: Quote): QuoteRecord {
  const stored = (quote.data && typeof quote.data === "object" ? quote.data : {}) as Record<string, unknown>;
  return {
    id: quote.id,
    folio: quote.folio,
    clientName: quote.clientName,
    hotelName: quote.hotelName,
    data: parseQuoteData(quote.data),
    status: stored.status === "draft" ? "draft" : null,
    draftData: stored.pendingDraft ? parseQuoteData(stored.pendingDraft) : null,
    storageBucket: quote.storageBucket,
    storagePath: quote.storagePath,
    createdById: quote.createdById,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
  };
}

// Quotes this viewer may see (see canAccessQuote).
const visibleTo = (viewer: QuoteViewer): Prisma.QuoteWhereInput =>
  viewer.role === "admin" ? { createdById: viewer.sub } : {};

// One page of the list, newest folio first. A page past the end gives the last page.
export async function listQuotes(viewer: QuoteViewer, search = "", page = 1): Promise<QuoteListPage> {
  const term = search.trim();
  const folio = Number.parseInt(term.replace(/^#/, ""), 10);
  const where: Prisma.QuoteWhereInput = {
    AND: [
      visibleTo(viewer),
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

  const total = await prisma.quote.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / QUOTE_PAGE_SIZE));
  const current = Math.min(Math.max(Math.trunc(page) || 1, 1), pageCount);
  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { folio: "desc" },
    skip: (current - 1) * QUOTE_PAGE_SIZE,
    take: QUOTE_PAGE_SIZE,
  });

  return { quotes: await withCreatorNames(quotes), total, page: current };
}

// The newest quote of each type this viewer can see: a new quote of that type starts from it.
// Borradores that were never saved are skipped (a few are read per type to get past them).
// Quotes saved before types existed (no `kind`) aren't picked; any aéreo saved since is newer.
export async function latestQuotesByKind(viewer: QuoteViewer) {
  const kinds = Object.keys(QUOTE_KIND_LABELS) as QuoteKind[];
  const latest = await Promise.all(
    kinds.map((kind) =>
      prisma.quote.findMany({
        where: { AND: [visibleTo(viewer), { data: { path: ["kind"], equals: kind } }] },
        orderBy: { folio: "desc" },
        take: 10,
      })
    )
  );
  const result: Partial<Record<QuoteKind, QuoteRecord>> = {};
  kinds.forEach((kind, index) => {
    const saved = latest[index].map(toQuoteRecord).find((quote) => quote.status !== "draft");
    if (saved) result[kind] = saved;
  });
  return result;
}

async function withCreatorNames(quotes: Quote[]): Promise<QuoteListItem[]> {
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

// A new quote's first autosave: it gets its folio now, and no PDF until it's saved for real.
export async function createDraftQuote(data: QuoteData, createdById: string | null) {
  const quote = await prisma.quote.create({
    data: {
      clientName: data.clientName,
      hotelName: formatQuoteHotels(data),
      data: { ...data, status: "draft" },
      createdById,
    },
  });
  return toQuoteRecord(quote);
}

// Autosave. A quote never saved for real is all borrador, so it's replaced; a saved quote
// keeps its data and PDF and gets the edits on the side (pendingDraft).
export async function saveQuoteDraft(existing: QuoteRecord, data: QuoteData) {
  const quote = await prisma.quote.update({
    where: { id: existing.id },
    data:
      existing.status === "draft"
        ? { clientName: data.clientName, hotelName: formatQuoteHotels(data), data: { ...data, status: "draft" } }
        : { data: { ...existing.data, pendingDraft: data } },
  });
  return toQuoteRecord(quote);
}

// Drops a saved quote's borrador: back to its last saved version.
export async function discardQuoteDraft(existing: QuoteRecord) {
  const quote = await prisma.quote.update({ where: { id: existing.id }, data: { data: existing.data } });
  return toQuoteRecord(quote);
}

// Saving for real writes only the quote's fields, which also clears any borrador.
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
