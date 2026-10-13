-- AlterTable
ALTER TABLE "CreditLedgerEntry" ADD COLUMN     "entropyChargeId" TEXT;

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_entropyChargeId_idx" ON "CreditLedgerEntry"("entropyChargeId");

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_entropyChargeId_fkey" FOREIGN KEY ("entropyChargeId") REFERENCES "EntropyCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: link entropy draw/refund rows written before this column existed
-- to their EntropyCharge, only where the match is unambiguous in both
-- directions (one row <-> one charge). Sets the link column only; amounts and
-- balances are untouched. Unmatched rows keep a null link and are still shown,
-- just without the byte count.
WITH cand AS (
  SELECT l.id AS ledger_id, ec.id AS charge_id, 'draw' AS kind
  FROM "CreditLedgerEntry" l
  JOIN "EntropyCharge" ec
    ON ec."customerId" = l."customerId"
   AND l."reason" = 'entropy:draw:' || ec."mode"
   AND l."amountCents" = -ec."amountCents"
   AND abs(extract(epoch FROM (l."createdAt" - ec."createdAt"))) < 5
  WHERE l."entropyChargeId" IS NULL
  UNION ALL
  SELECT l.id, ec.id, 'refund'
  FROM "CreditLedgerEntry" l
  JOIN "EntropyCharge" ec
    ON ec."customerId" = l."customerId"
   AND l."reason" = 'entropy:refund:' || ec."mode"
   AND l."amountCents" = ec."amountCents"
   AND ec."refundedAt" IS NOT NULL
   AND abs(extract(epoch FROM (l."createdAt" - ec."refundedAt"))) < 5
  WHERE l."entropyChargeId" IS NULL
), counted AS (
  SELECT ledger_id, charge_id,
         count(*) OVER (PARTITION BY ledger_id) AS per_row,
         count(*) OVER (PARTITION BY charge_id, kind) AS per_charge
  FROM cand
)
UPDATE "CreditLedgerEntry" l
SET "entropyChargeId" = c.charge_id
FROM counted c
WHERE l.id = c.ledger_id AND c.per_row = 1 AND c.per_charge = 1;
