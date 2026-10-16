-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "clientName" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "storageBucket" TEXT,
    "storagePath" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_folio_key" ON "Quote"("folio");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");


-- Folios start at 1000
ALTER SEQUENCE "Quote_folio_seq" RESTART WITH 1000;
