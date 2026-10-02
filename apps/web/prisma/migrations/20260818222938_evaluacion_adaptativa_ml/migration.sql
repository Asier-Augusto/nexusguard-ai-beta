-- CreateEnum
CREATE TYPE "ModoEvaluacion" AS ENUM ('TEMA_UNICO', 'MIXTO');

-- CreateEnum
CREATE TYPE "MotorEvaluacion" AS ENUM ('RED_IRT', 'IRT', 'HEURISTICA');

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "abilityStdErr" DOUBLE PRECISION,
ADD COLUMN     "abilityTheta" DOUBLE PRECISION,
ADD COLUMN     "engine" "MotorEvaluacion" NOT NULL DEFAULT 'HEURISTICA',
ADD COLUMN     "mode" "ModoEvaluacion" NOT NULL DEFAULT 'TEMA_UNICO',
ADD COLUMN     "topics" "TemaFormacion"[];

-- CreateTable
CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "topic" "TemaFormacion" NOT NULL,
    "level" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "difficultyB" DOUBLE PRECISION,
    "discriminationA" DOUBLE PRECISION,
    "predictedProb" DOUBLE PRECISION,
    "thetaAfter" DOUBLE PRECISION,
    "stdErrAfter" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'banco',
    "elapsedMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizResponse_attemptId_order_idx" ON "QuizResponse"("attemptId", "order");

-- CreateIndex
CREATE INDEX "QuizResponse_itemId_idx" ON "QuizResponse"("itemId");

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
