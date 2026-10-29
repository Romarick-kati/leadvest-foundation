-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'ACCESS';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accessUntil" TIMESTAMP(3),
ADD COLUMN "accessLifetime" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "userId" TEXT,
ADD COLUMN "checkoutUrl" TEXT;

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
