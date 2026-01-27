/*
  Warnings:

  - Added the required column `clientName` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destination` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `travelers` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "agency" TEXT,
ADD COLUMN     "balanceDue" TEXT,
ADD COLUMN     "clientName" TEXT NOT NULL,
ADD COLUMN     "contractNumber" TEXT,
ADD COLUMN     "departureDate" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "destination" TEXT NOT NULL,
ADD COLUMN     "firstPayment" TEXT,
ADD COLUMN     "hotel" TEXT,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liquidationDate" TEXT,
ADD COLUMN     "organizer" TEXT,
ADD COLUMN     "passengerCount" INTEGER,
ADD COLUMN     "reservationDate" TEXT,
ADD COLUMN     "returnDate" TEXT,
ADD COLUMN     "seller" TEXT,
ADD COLUMN     "totalPrice" TEXT,
ADD COLUMN     "travelers" JSONB NOT NULL,
ALTER COLUMN "fileUrl" DROP NOT NULL,
ALTER COLUMN "storageBucket" DROP NOT NULL,
ALTER COLUMN "storagePath" DROP NOT NULL,
ALTER COLUMN "mimeType" DROP NOT NULL;
