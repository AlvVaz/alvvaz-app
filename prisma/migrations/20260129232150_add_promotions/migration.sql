-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('live', 'draft', 'paused');

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "destinationState" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "durationNights" INTEGER,
    "priceFrom" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "includes" TEXT[],
    "excludes" TEXT[],
    "itinerary" TEXT[],
    "activities" TEXT[],
    "availableFrom" TEXT,
    "availableTo" TEXT,
    "hotelName" TEXT,
    "hotelCategory" TEXT,
    "ctaLabel" TEXT,
    "ctaLink" TEXT,
    "tags" TEXT[],
    "status" "PromotionStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionImage" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageBucket" TEXT,
    "storagePath" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_slug_key" ON "Promotion"("slug");

-- CreateIndex
CREATE INDEX "Promotion_status_sortOrder_idx" ON "Promotion"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "PromotionImage_promotionId_sortOrder_idx" ON "PromotionImage"("promotionId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PromotionImage" ADD CONSTRAINT "PromotionImage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
