-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('new', 'active', 'vip', 'archived');

-- CreateEnum
CREATE TYPE "MagazineItemKind" AS ENUM ('PDF', 'IMAGE');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "tags" TEXT[],
    "notes" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagazineIssue" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publishedAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MagazineIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagazineItem" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "MagazineItemKind" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "MagazineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "hotel" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "departureDate" TEXT,
    "returnDate" TEXT,
    "travelers" JSONB NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MagazineIssue_slug_key" ON "MagazineIssue"("slug");

-- CreateIndex
CREATE INDEX "MagazineItem_issueId_sortOrder_idx" ON "MagazineItem"("issueId", "sortOrder");

-- AddForeignKey
ALTER TABLE "MagazineItem" ADD CONSTRAINT "MagazineItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "MagazineIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
