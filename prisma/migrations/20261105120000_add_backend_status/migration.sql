-- Backend status light: the server-side verdict per backend plus a raw log of
-- every reading, both written by the /api/cron/backend-status poller (see
-- src/lib/backends/status). Nothing else writes these tables.

-- CreateTable
CREATE TABLE "BackendStatusState" (
    "backendId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "reason" TEXT,
    "since" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL,
    "lastReadingKind" TEXT NOT NULL,
    "lastHealthyAt" TIMESTAMP(3),
    "consecutiveHealthy" INTEGER NOT NULL DEFAULT 0,
    "consecutiveUnhealthy" INTEGER NOT NULL DEFAULT 0,
    "firstUnhealthyAt" TIMESTAMP(3),
    "lastUnhealthyAt" TIMESTAMP(3),
    "unhealthyReason" TEXT,
    "unreachableSince" TIMESTAMP(3),
    "healthStamp" TEXT,
    "healthStampChangedAt" TIMESTAMP(3),
    "acceptingJobs" BOOLEAN,
    "calibrationOk" BOOLEAN,
    "calibrationCheckedAt" TIMESTAMP(3),
    "calibrationSetId" TEXT,
    "lastExecutionAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackendStatusState_pkey" PRIMARY KEY ("backendId")
);

-- CreateTable
CREATE TABLE "BackendStatusObservation" (
    "id" TEXT NOT NULL,
    "backendId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "latencyMs" INTEGER,
    "detail" TEXT,
    "raw" JSONB,

    CONSTRAINT "BackendStatusObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackendStatusObservation_backendId_observedAt_idx" ON "BackendStatusObservation"("backendId", "observedAt");

-- CreateIndex
CREATE INDEX "BackendStatusObservation_observedAt_idx" ON "BackendStatusObservation"("observedAt");
