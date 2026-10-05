-- CreateTable
CREATE TABLE "EntropyCharge" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'charged',
    "egressRequestId" TEXT,
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "EntropyCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntropyCharge_status_createdAt_idx" ON "EntropyCharge"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EntropyCharge_customerId_createdAt_idx" ON "EntropyCharge"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "EntropyCharge" ADD CONSTRAINT "EntropyCharge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

