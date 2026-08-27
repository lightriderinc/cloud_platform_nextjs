-- CreateEnum
CREATE TYPE "LegalDocType" AS ENUM ('PRIVACY', 'TERMS');
CREATE TYPE "LegalAcceptanceContext" AS ENUM ('REGISTRATION', 'REPROMPT', 'BACKFILL');
CREATE TYPE "LegalNotificationChannel" AS ENUM ('EMAIL', 'IN_APP');

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "docType" "LegalDocType" NOT NULL,
    "version" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "contentUrl" TEXT,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "logtoUserId" TEXT NOT NULL,
    "docType" "LegalDocType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "context" "LegalAcceptanceContext" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalNotification" (
    "id" TEXT NOT NULL,
    "logtoUserId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "channel" "LegalNotificationChannel" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_docType_version_key" ON "LegalDocument"("docType", "version");
CREATE INDEX "LegalDocument_docType_effectiveAt_idx" ON "LegalDocument"("docType", "effectiveAt");
CREATE UNIQUE INDEX "LegalAcceptance_logtoUserId_documentId_context_key" ON "LegalAcceptance"("logtoUserId", "documentId", "context");
CREATE INDEX "LegalAcceptance_logtoUserId_docType_idx" ON "LegalAcceptance"("logtoUserId", "docType");
CREATE INDEX "LegalAcceptance_documentId_idx" ON "LegalAcceptance"("documentId");
CREATE UNIQUE INDEX "LegalNotification_logtoUserId_documentId_channel_key" ON "LegalNotification"("logtoUserId", "documentId", "channel");
CREATE INDEX "LegalNotification_documentId_idx" ON "LegalNotification"("documentId");

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalNotification" ADD CONSTRAINT "LegalNotification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;