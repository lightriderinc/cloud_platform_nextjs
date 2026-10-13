-- Entropy developer API: the customer's existing Light Rider API key (ApiKey)
-- also authorises entropy API draws. Adds a per-key one-minute request window
-- to ApiKey, and records on each entropy charge whether it came from the
-- website or the API (and which key, by prefix).

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "rateWindowCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rateWindowStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EntropyCharge" ADD COLUMN     "apiKeyPrefix" TEXT,
ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'web';
