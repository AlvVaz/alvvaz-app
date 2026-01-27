import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

import type {
  Client,
  ClientStatus,
  Contract,
  ContractStatus,
  MagazineIssue,
  MagazineItem,
  MagazineItemKind,
  MagazinePage,
  Trip,
  TripTraveler,
} from "./types";
import { slugify } from "./utils";

function normalizeStatus(status?: string): ClientStatus {
  const value = (status ?? "new").toLowerCase();
  if (value === "active" || value === "vip" || value === "archived") {
    return value;
  }
  return "new";
}

function normalizeTravelers(travelers?: TripTraveler[]) {
  if (!travelers) return [];
  return travelers
    .map((traveler) => ({
      name: traveler.name?.trim() ?? "",
      phone: traveler.phone?.trim() ?? "",
      contract: traveler.contract?.trim() ?? "",
    }))
    .filter((traveler) => traveler.name || traveler.phone || traveler.contract);
}

function mapClient(client: {
  id: string;
  name: string;
  contact: string;
  tags: string[];
  notes: string;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}): Client {
  return {
    ...client,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

function mapIssue(issue: {
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MagazineIssue {
  return {
    ...issue,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

function mapItem(item: {
  id: string;
  issueId: string;
  title: string;
  kind: MagazineItemKind;
  fileUrl: string;
  sortOrder: number;
  createdAt: Date;
  metadata: unknown;
}): MagazineItem {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    metadata: (item.metadata ?? {}) as Record<string, unknown>,
  };
}

function mapTrip(trip: {
  id: string;
  clientName: string;
  destination: string;
  hotel: string;
  supplier: string;
  organizer: string;
  passengerCount: number;
  departureDate: string | null;
  returnDate: string | null;
  travelers: unknown;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}): Trip {
  return {
    ...trip,
    travelers: Array.isArray(trip.travelers) ? (trip.travelers as TripTraveler[]) : [],
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

function mapContract(contract: {
  id: string;
  clientId: string | null;
  tripId: string | null;
  contractNumber: string | null;
  reservationDate: string | null;
  seller: string | null;
  agency: string | null;
  clientName: string;
  destination: string;
  hotel: string | null;
  supplier: string | null;
  organizer: string | null;
  passengerCount: number | null;
  departureDate: string | null;
  returnDate: string | null;
  travelers: unknown;
  description: string | null;
  totalPrice: string | null;
  firstPayment: string | null;
  balanceDue: string | null;
  liquidationDate: string | null;
  status: ContractStatus;
  isSigned: boolean;
  isPaid: boolean;
  title: string;
  fileUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: unknown;
}): Contract {
  return {
    ...contract,
    travelers: Array.isArray(contract.travelers)
      ? (contract.travelers as TripTraveler[])
      : [],
    metadata: (contract.metadata ?? {}) as Record<string, unknown>,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
  };
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.magazineIssue.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
}

export async function getClients() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } });
  return clients.map(mapClient);
}

export async function createClient(input: {
  name: string;
  contact: string;
  tags?: string[];
  notes?: string;
  status?: string;
}) {
  const client = await prisma.client.create({
    data: {
      name: input.name,
      contact: input.contact,
      tags: input.tags ?? [],
      notes: input.notes ?? "",
      status: normalizeStatus(input.status),
    },
  });
  return mapClient(client);
}

export async function updateClient(
  id: string,
  updates: Partial<{
    name: string;
    contact: string;
    tags: string[];
    notes: string;
    status: string;
  }>
) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return null;

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.contact !== undefined ? { contact: updates.contact } : {}),
      ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
      ...(updates.status !== undefined ? { status: normalizeStatus(updates.status) } : {}),
    },
  });

  return mapClient(client);
}

export async function deleteClient(id: string) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.client.delete({ where: { id } });
  return true;
}

function sortByDateDesc(a: string | null, b: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(b).getTime() - new Date(a).getTime();
}

export async function getMagazineIssues() {
  const issues = await prisma.magazineIssue.findMany();
  return issues.map(mapIssue).sort((a, b) => sortByDateDesc(a.publishedAt, b.publishedAt));
}

export async function getMagazineIssueBySlug(slug: string) {
  const issue = await prisma.magazineIssue.findUnique({ where: { slug } });
  return issue ? mapIssue(issue) : null;
}

export async function getMagazineIssueById(id: string) {
  const issue = await prisma.magazineIssue.findUnique({ where: { id } });
  return issue ? mapIssue(issue) : null;
}

export async function createMagazineIssue(input: {
  title: string;
  description?: string;
  publishedAt?: string | null;
}) {
  const baseSlug = slugify(input.title) || `issue-${Date.now()}`;
  const slug = await uniqueSlug(baseSlug);
  const issue = await prisma.magazineIssue.create({
    data: {
      slug,
      title: input.title,
      description: input.description ?? "",
      publishedAt: input.publishedAt ?? null,
    },
  });
  return mapIssue(issue);
}

export async function updateMagazineIssue(
  id: string,
  updates: Partial<{
    title: string;
    description: string;
    publishedAt: string | null;
  }>
) {
  const existing = await prisma.magazineIssue.findUnique({ where: { id } });
  if (!existing) return null;

  let slug = existing.slug;
  if (updates.title !== undefined && updates.title !== existing.title) {
    const baseSlug = slugify(updates.title) || existing.slug;
    slug = await uniqueSlug(baseSlug, id);
  }

  const issue = await prisma.magazineIssue.update({
    where: { id },
    data: {
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.publishedAt !== undefined ? { publishedAt: updates.publishedAt } : {}),
      ...(slug !== existing.slug ? { slug } : {}),
    },
  });
  return mapIssue(issue);
}

export async function deleteMagazineIssue(id: string) {
  const existing = await prisma.magazineIssue.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.magazineIssue.delete({ where: { id } });
  return true;
}

export async function getMagazineItems(issueId?: string) {
  const items = await prisma.magazineItem.findMany({
    where: issueId ? { issueId } : undefined,
    orderBy: { sortOrder: "asc" },
  });
  return items.map(mapItem);
}

export async function getMagazinePages(issueId: string): Promise<MagazinePage[]> {
  const items = await getMagazineItems(issueId);
  return items
    .filter((item) => item.kind === "IMAGE")
    .map((item) => ({
      id: item.id,
      issueId: item.issueId,
      pageNumber: item.sortOrder + 1,
      imageUrl: item.fileUrl,
      title: item.title,
    }));
}

export async function createMagazineItem(input: {
  issueId: string;
  title?: string;
  kind: MagazineItemKind;
  fileUrl: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}) {
  const issueExists = await prisma.magazineIssue.findUnique({
    where: { id: input.issueId },
    select: { id: true },
  });
  if (!issueExists) {
    throw new Error("Issue not found");
  }

  const sortOrder =
    input.sortOrder ??
    (await prisma.magazineItem.count({ where: { issueId: input.issueId } }));

  const item = await prisma.magazineItem.create({
    data: {
      issueId: input.issueId,
      title: input.title ?? "",
      kind: input.kind,
      fileUrl: input.fileUrl,
      sortOrder,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return mapItem(item);
}

export async function deleteMagazineItem(id: string) {
  const existing = await prisma.magazineItem.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.magazineItem.delete({ where: { id } });
  return true;
}

function sortTripsByDeparture(a: Trip, b: Trip) {
  if (!a.departureDate && !b.departureDate) return 0;
  if (!a.departureDate) return 1;
  if (!b.departureDate) return -1;
  return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
}

export async function getTrips() {
  const trips = await prisma.trip.findMany();
  return trips.map(mapTrip).sort(sortTripsByDeparture);
}

export async function createTrip(input: {
  clientName?: string;
  destination: string;
  hotel?: string;
  supplier?: string;
  organizer?: string;
  passengerCount?: number;
  departureDate?: string | null;
  returnDate?: string | null;
  travelers?: TripTraveler[];
  notes?: string;
}) {
  const normalizedTravelers = normalizeTravelers(input.travelers);
  const trip = await prisma.trip.create({
    data: {
      clientName: input.clientName ?? "",
      destination: input.destination,
      hotel: input.hotel ?? "",
      supplier: input.supplier ?? "",
      organizer: input.organizer ?? "",
      passengerCount: input.passengerCount ?? normalizedTravelers.length,
      departureDate: input.departureDate ?? null,
      returnDate: input.returnDate ?? null,
      travelers: normalizedTravelers,
      notes: input.notes ?? "",
    },
  });

  return mapTrip(trip);
}

export async function updateTrip(
  id: string,
  updates: Partial<{
    clientName: string;
    destination: string;
    hotel: string;
    supplier: string;
    organizer: string;
    passengerCount: number;
    departureDate: string | null;
    returnDate: string | null;
    travelers: TripTraveler[];
    notes: string;
  }>
) {
  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) return null;

  const trip = await prisma.trip.update({
    where: { id },
    data: {
      ...(updates.clientName !== undefined ? { clientName: updates.clientName } : {}),
      ...(updates.destination !== undefined ? { destination: updates.destination } : {}),
      ...(updates.hotel !== undefined ? { hotel: updates.hotel } : {}),
      ...(updates.supplier !== undefined ? { supplier: updates.supplier } : {}),
      ...(updates.organizer !== undefined ? { organizer: updates.organizer } : {}),
      ...(updates.passengerCount !== undefined
        ? { passengerCount: updates.passengerCount }
        : {}),
      ...(updates.departureDate !== undefined
        ? { departureDate: updates.departureDate }
        : {}),
      ...(updates.returnDate !== undefined ? { returnDate: updates.returnDate } : {}),
      ...(updates.travelers !== undefined
        ? { travelers: normalizeTravelers(updates.travelers) }
        : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    },
  });

  return mapTrip(trip);
}

export async function deleteTrip(id: string) {
  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.trip.delete({ where: { id } });
  return true;
}

export async function getContracts() {
  const contracts = await prisma.contract.findMany({ orderBy: { createdAt: "desc" } });
  return contracts.map(mapContract);
}

export async function getContractById(id: string) {
  const contract = await prisma.contract.findUnique({ where: { id } });
  return contract ? mapContract(contract) : null;
}

export async function createContract(input: {
  clientId?: string | null;
  tripId?: string | null;
  contractNumber?: string | null;
  reservationDate?: string | null;
  seller?: string | null;
  agency?: string | null;
  clientName: string;
  destination: string;
  hotel?: string | null;
  supplier?: string | null;
  organizer?: string | null;
  passengerCount?: number | null;
  departureDate?: string | null;
  returnDate?: string | null;
  travelers?: TripTraveler[];
  description?: string | null;
  totalPrice?: string | null;
  firstPayment?: string | null;
  balanceDue?: string | null;
  liquidationDate?: string | null;
  status?: ContractStatus;
  isSigned?: boolean;
  isPaid?: boolean;
  title: string;
  fileUrl?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  size?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const normalizedTravelers = normalizeTravelers(input.travelers);
  const contract = await prisma.contract.create({
    data: {
      clientId: input.clientId ?? null,
      tripId: input.tripId ?? null,
      contractNumber: input.contractNumber ?? null,
      reservationDate: input.reservationDate ?? null,
      seller: input.seller ?? null,
      agency: input.agency ?? null,
      clientName: input.clientName,
      destination: input.destination,
      hotel: input.hotel ?? null,
      supplier: input.supplier ?? null,
      organizer: input.organizer ?? null,
      passengerCount: input.passengerCount ?? normalizedTravelers.length ?? null,
      departureDate: input.departureDate ?? null,
      returnDate: input.returnDate ?? null,
      travelers: normalizedTravelers,
      description: input.description ?? null,
      totalPrice: input.totalPrice ?? null,
      firstPayment: input.firstPayment ?? null,
      balanceDue: input.balanceDue ?? null,
      liquidationDate: input.liquidationDate ?? null,
      status: input.status ?? "pending",
      isSigned: input.isSigned ?? false,
      isPaid: input.isPaid ?? false,
      title: input.title,
      fileUrl: input.fileUrl ?? null,
      storageBucket: input.storageBucket ?? null,
      storagePath: input.storagePath ?? null,
      mimeType: input.mimeType ?? null,
      size: input.size ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return mapContract(contract);
}

export async function updateContract(
  id: string,
  updates: Partial<{
    clientId: string | null;
    tripId: string | null;
    contractNumber: string | null;
    reservationDate: string | null;
    seller: string | null;
    agency: string | null;
    clientName: string;
    destination: string;
    hotel: string | null;
    supplier: string | null;
    organizer: string | null;
    passengerCount: number | null;
    departureDate: string | null;
    returnDate: string | null;
    travelers: TripTraveler[];
    description: string | null;
    totalPrice: string | null;
    firstPayment: string | null;
    balanceDue: string | null;
    liquidationDate: string | null;
    isSigned: boolean;
    isPaid: boolean;
    status: ContractStatus;
    title: string;
    fileUrl: string | null;
    storageBucket: string | null;
    storagePath: string | null;
    mimeType: string | null;
    size: number | null;
    metadata: Record<string, unknown>;
  }>
) {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) return null;

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...(updates.clientId !== undefined ? { clientId: updates.clientId } : {}),
      ...(updates.tripId !== undefined ? { tripId: updates.tripId } : {}),
      ...(updates.contractNumber !== undefined ? { contractNumber: updates.contractNumber } : {}),
      ...(updates.reservationDate !== undefined
        ? { reservationDate: updates.reservationDate }
        : {}),
      ...(updates.seller !== undefined ? { seller: updates.seller } : {}),
      ...(updates.agency !== undefined ? { agency: updates.agency } : {}),
      ...(updates.clientName !== undefined ? { clientName: updates.clientName } : {}),
      ...(updates.destination !== undefined ? { destination: updates.destination } : {}),
      ...(updates.hotel !== undefined ? { hotel: updates.hotel } : {}),
      ...(updates.organizer !== undefined ? { organizer: updates.organizer } : {}),
      ...(updates.passengerCount !== undefined
        ? { passengerCount: updates.passengerCount }
        : {}),
      ...(updates.departureDate !== undefined
        ? { departureDate: updates.departureDate }
        : {}),
      ...(updates.returnDate !== undefined ? { returnDate: updates.returnDate } : {}),
      ...(updates.travelers !== undefined
        ? { travelers: normalizeTravelers(updates.travelers) }
        : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.totalPrice !== undefined ? { totalPrice: updates.totalPrice } : {}),
      ...(updates.firstPayment !== undefined ? { firstPayment: updates.firstPayment } : {}),
      ...(updates.balanceDue !== undefined ? { balanceDue: updates.balanceDue } : {}),
      ...(updates.liquidationDate !== undefined
        ? { liquidationDate: updates.liquidationDate }
        : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.isSigned !== undefined ? { isSigned: updates.isSigned } : {}),
      ...(updates.isPaid !== undefined ? { isPaid: updates.isPaid } : {}),
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.fileUrl !== undefined ? { fileUrl: updates.fileUrl } : {}),
      ...(updates.storageBucket !== undefined ? { storageBucket: updates.storageBucket } : {}),
      ...(updates.storagePath !== undefined ? { storagePath: updates.storagePath } : {}),
      ...(updates.mimeType !== undefined ? { mimeType: updates.mimeType } : {}),
      ...(updates.size !== undefined ? { size: updates.size } : {}),
      ...(updates.metadata !== undefined ? { metadata: updates.metadata } : {}),
    },
  });

  return mapContract(contract);
}

export async function deleteContract(id: string) {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.contract.delete({ where: { id } });
  return true;
}
