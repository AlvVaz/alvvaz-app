-- Add username column for admin logins
ALTER TABLE "AdminUser" ADD COLUMN "username" TEXT;

-- Unique index (allows multiple NULLs in Postgres)
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
