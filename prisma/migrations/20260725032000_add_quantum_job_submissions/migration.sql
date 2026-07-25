-- CreateTable
CREATE TABLE "QuantumJobSubmission" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "backend" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuantumJobSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuantumJobSubmission_jobId_key" ON "QuantumJobSubmission"("jobId");

-- AddForeignKey
ALTER TABLE "QuantumJobSubmission" ADD CONSTRAINT "QuantumJobSubmission_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
