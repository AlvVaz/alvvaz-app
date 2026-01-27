-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('pending', 'signed', 'paid');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "status" "ContractStatus" NOT NULL DEFAULT 'pending';
