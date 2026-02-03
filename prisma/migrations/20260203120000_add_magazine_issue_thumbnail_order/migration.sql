ALTER TABLE "MagazineIssue"
ADD COLUMN "thumbnailUrl" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) - 1 AS idx
  FROM "MagazineIssue"
)
UPDATE "MagazineIssue"
SET "sortOrder" = ranked.idx
FROM ranked
WHERE "MagazineIssue".id = ranked.id;

CREATE INDEX "MagazineIssue_sortOrder_idx" ON "MagazineIssue"("sortOrder");
