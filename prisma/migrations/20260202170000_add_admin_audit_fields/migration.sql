ALTER TABLE "AdminUser"
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "lastPasswordResetAt" TIMESTAMP(3);
