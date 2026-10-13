-- AlterTable
ALTER TABLE "CreditLedgerEntry" ADD COLUMN     "transferId" TEXT,
ADD COLUMN     "counterpartyCustomerId" TEXT;

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_transferId_idx" ON "CreditLedgerEntry"("transferId");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_counterpartyCustomerId_idx" ON "CreditLedgerEntry"("counterpartyCustomerId");

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_counterpartyCustomerId_fkey" FOREIGN KEY ("counterpartyCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
