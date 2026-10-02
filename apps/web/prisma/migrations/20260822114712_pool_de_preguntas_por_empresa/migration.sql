-- CreateTable
CREATE TABLE "AdaptedQuestionPool" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "topic" "TemaFormacion" NOT NULL,
    "questions" JSONB NOT NULL,
    "perfilHuella" TEXT NOT NULL,
    "modelo" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdaptedQuestionPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdaptedQuestionPool_companyId_topic_key" ON "AdaptedQuestionPool"("companyId", "topic");

-- AddForeignKey
ALTER TABLE "AdaptedQuestionPool" ADD CONSTRAINT "AdaptedQuestionPool_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
