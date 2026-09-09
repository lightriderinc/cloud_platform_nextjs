-- CreateTable
CREATE TABLE "RevokedLogtoSession" (
    "sid" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RevokedLogtoSession_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "RevokedLogtoSession_expiresAt_idx" ON "RevokedLogtoSession"("expiresAt");
