-- AlterTable
ALTER TABLE "CreditLedgerEntry" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "counterpartyEmailSnapshot" TEXT;

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_batchId_idx" ON "CreditLedgerEntry"("batchId");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_customerId_createdAt_idx" ON "CreditLedgerEntry"("customerId", "createdAt");

-- CreateTable
CREATE TABLE "ProcessedTransferBatch" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedTransferBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedTransferBatch_batchId_key" ON "ProcessedTransferBatch"("batchId");

-- CreateIndex
CREATE INDEX "ProcessedTransferBatch_customerId_idx" ON "ProcessedTransferBatch"("customerId");

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerCustomerId" TEXT NOT NULL,
    "refereeCustomerId" TEXT,
    "inviteToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "qualifyingEventReason" TEXT,
    "rewardCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_inviteToken_key" ON "Referral"("inviteToken");

-- CreateIndex
CREATE INDEX "Referral_referrerCustomerId_idx" ON "Referral"("referrerCustomerId");

-- CreateIndex
CREATE INDEX "Referral_refereeCustomerId_idx" ON "Referral"("refereeCustomerId");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeCustomerId_fkey" FOREIGN KEY ("refereeCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
