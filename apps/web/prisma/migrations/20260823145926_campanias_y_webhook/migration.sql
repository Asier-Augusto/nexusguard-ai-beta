-- CreateEnum
CREATE TYPE "CanalCampania" AS ENUM ('EMAIL', 'SMS', 'LLAMADA');

-- CreateEnum
CREATE TYPE "DificultadSenuelo" AS ENUM ('FACIL', 'MEDIA', 'DIFICIL');

-- AlterTable
ALTER TABLE "PhishingCampaign" ADD COLUMN     "canal" "CanalCampania" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "dificultad" "DificultadSenuelo" NOT NULL DEFAULT 'MEDIA',
ADD COLUMN     "launchedAt" TIMESTAMP(3),
ADD COLUMN     "modelo" TEXT,
ADD COLUMN     "origen" TEXT,
ADD COLUMN     "perfilHuella" TEXT,
ADD COLUMN     "redFlags" TEXT[],
ADD COLUMN     "senderEmail" TEXT,
ADD COLUMN     "senderName" TEXT;

-- AlterTable
ALTER TABLE "PhishingResult" ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "reportedAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "token" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PhishingResult_token_key" ON "PhishingResult"("token");
