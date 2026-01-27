-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "tripId" TEXT,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "Contract_tripId_idx" ON "Contract"("tripId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
