import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const applyChanges = args.includes("--apply");
const deleteOrphans = args.includes("--delete-orphans");
const limitIndex = args.indexOf("--limit");
const limit =
  limitIndex !== -1 && args[limitIndex + 1] ? Number(args[limitIndex + 1]) : null;

const prisma = new PrismaClient();

function normalizeTravelers(travelers) {
  if (!Array.isArray(travelers)) return [];
  return travelers
    .map((traveler) => ({
      name: String(traveler?.name ?? "").trim(),
      phone: String(traveler?.phone ?? "").trim(),
      contract: String(traveler?.contract ?? "").trim(),
    }))
    .filter((traveler) => traveler.name || traveler.phone || traveler.contract);
}

function buildTripPayload(contract) {
  const travelers = normalizeTravelers(contract.travelers);
  const passengerCount =
    typeof contract.passengerCount === "number" && Number.isFinite(contract.passengerCount)
      ? contract.passengerCount
      : travelers.length;

  return {
    clientName: contract.clientName || "",
    destination: contract.destination || "",
    hotel: contract.hotel ?? "",
    supplier: contract.supplier ?? "",
    organizer: contract.organizer ?? "",
    passengerCount,
    departureDate: contract.departureDate ? contract.departureDate : null,
    returnDate: contract.returnDate ? contract.returnDate : null,
    travelers,
    notes: contract.notes ?? "",
    status: contract.status ?? "pending",
  };
}

function normalizeTripPayload(payload) {
  return {
    clientName: String(payload.clientName ?? "").trim(),
    destination: String(payload.destination ?? "").trim(),
    hotel: String(payload.hotel ?? "").trim(),
    supplier: String(payload.supplier ?? "").trim(),
    organizer: String(payload.organizer ?? "").trim(),
    passengerCount:
      typeof payload.passengerCount === "number" && Number.isFinite(payload.passengerCount)
        ? payload.passengerCount
        : 0,
    departureDate: payload.departureDate ?? null,
    returnDate: payload.returnDate ?? null,
    travelers: normalizeTravelers(payload.travelers),
    notes: String(payload.notes ?? "").trim(),
    status: payload.status ?? "pending",
  };
}

function tripMatchesPayload(trip, payload) {
  if (!trip) return false;
  const normalizedTrip = normalizeTripPayload(trip);
  const normalizedPayload = normalizeTripPayload(payload);

  if (normalizedTrip.clientName !== normalizedPayload.clientName) return false;
  if (normalizedTrip.destination !== normalizedPayload.destination) return false;
  if (normalizedTrip.hotel !== normalizedPayload.hotel) return false;
  if (normalizedTrip.supplier !== normalizedPayload.supplier) return false;
  if (normalizedTrip.organizer !== normalizedPayload.organizer) return false;
  if (normalizedTrip.passengerCount !== normalizedPayload.passengerCount) return false;
  if (normalizedTrip.departureDate !== normalizedPayload.departureDate) return false;
  if (normalizedTrip.returnDate !== normalizedPayload.returnDate) return false;
  if (normalizedTrip.notes !== normalizedPayload.notes) return false;
  if (normalizedTrip.status !== normalizedPayload.status) return false;

  return JSON.stringify(normalizedTrip.travelers) === JSON.stringify(normalizedPayload.travelers);
}

async function main() {
  const stats = {
    contractsSeen: 0,
    tripsUpdated: 0,
    tripsUnchanged: 0,
    tripsCreated: 0,
    tripsRelinked: 0,
    tripsOrphaned: 0,
    tripsDeleted: 0,
  };

  const pageSize = 200;
  let lastId = null;
  let remaining = Number.isFinite(limit) && limit ? limit : null;

  while (true) {
    const take = remaining ? Math.min(pageSize, remaining) : pageSize;
    const contracts = await prisma.contract.findMany({
      take,
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
      orderBy: { id: "asc" },
    });

    if (!contracts.length) break;

    for (const contract of contracts) {
      stats.contractsSeen += 1;
      const payload = buildTripPayload(contract);

      if (contract.tripId) {
        const existingTrip = await prisma.trip.findUnique({
          where: { id: contract.tripId },
          select: {
            id: true,
            clientName: true,
            destination: true,
            hotel: true,
            supplier: true,
            organizer: true,
            passengerCount: true,
            departureDate: true,
            returnDate: true,
            travelers: true,
            notes: true,
            status: true,
          },
        });

        if (existingTrip) {
          if (tripMatchesPayload(existingTrip, payload)) {
            stats.tripsUnchanged += 1;
          } else {
            if (applyChanges) {
              await prisma.trip.update({
                where: { id: contract.tripId },
                data: payload,
              });
            }
            stats.tripsUpdated += 1;
          }
        } else {
          if (applyChanges) {
            const created = await prisma.trip.create({ data: payload });
            await prisma.contract.update({
              where: { id: contract.id },
              data: { tripId: created.id },
            });
          }
          stats.tripsCreated += 1;
          stats.tripsRelinked += 1;
        }
      } else {
        if (applyChanges) {
          const created = await prisma.trip.create({ data: payload });
          await prisma.contract.update({
            where: { id: contract.id },
            data: { tripId: created.id },
          });
        }
        stats.tripsCreated += 1;
      }

      if (remaining) {
        remaining -= 1;
        if (remaining <= 0) break;
      }
    }

    lastId = contracts[contracts.length - 1].id;
    if (remaining !== null && remaining <= 0) break;
  }

  const orphanTrips = await prisma.trip.findMany({
    where: { contracts: { none: {} } },
    select: { id: true },
  });
  stats.tripsOrphaned = orphanTrips.length;

  if (deleteOrphans && applyChanges && orphanTrips.length) {
    await prisma.trip.deleteMany({
      where: { id: { in: orphanTrips.map((trip) => trip.id) } },
    });
    stats.tripsDeleted = orphanTrips.length;
  }

  const mode = applyChanges ? "APPLY" : "DRY RUN";
  console.log(
    JSON.stringify(
      {
        mode,
        limit: remaining === null ? null : limit,
        deleteOrphans,
        ...stats,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
