-- CreateTable
CREATE TABLE "AdaptedPillContent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pillId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "perfilHuella" TEXT NOT NULL,
    "modelo" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdaptedPillContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdaptedPillContent_companyId_pillId_key" ON "AdaptedPillContent"("companyId", "pillId");

-- AddForeignKey
ALTER TABLE "AdaptedPillContent" ADD CONSTRAINT "AdaptedPillContent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptedPillContent" ADD CONSTRAINT "AdaptedPillContent_pillId_fkey" FOREIGN KEY ("pillId") REFERENCES "TrainingPill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
