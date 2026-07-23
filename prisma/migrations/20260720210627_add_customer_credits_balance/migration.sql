-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "creditsBalanceCents" INTEGER NOT NULL DEFAULT 0;

-- Backfill: customers with ledger history predating this cached column
-- would otherwise be stuck at the DEFAULT 0 above, disagreeing with their
-- actual ledger sum. Bring them into sync once, here.
UPDATE "Customer" c
SET "creditsBalanceCents" = sub.total
FROM (
  SELECT "customerId", SUM("amountCents") AS total
  FROM "CreditLedgerEntry"
  GROUP BY "customerId"
) AS sub
WHERE c.id = sub."customerId";
