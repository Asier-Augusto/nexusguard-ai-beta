-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('LOGISTICA', 'SANIDAD', 'FINANZAS', 'RETAIL', 'INDUSTRIA', 'TECNOLOGIA', 'EDUCACION', 'ADMINISTRACION_PUBLICA', 'OTRO');

-- CreateEnum
CREATE TYPE "Departamento" AS ENUM ('DIRECCION', 'RRHH', 'FINANZAS', 'IT', 'LOGISTICA', 'VENTAS', 'MARKETING', 'ATENCION_CLIENTE', 'LEGAL', 'OPERACIONES', 'OTRO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('EMPLEADO', 'DPO', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModuloClave" AS ENUM ('FORMACION', 'EVALUACION_ADAPTATIVA', 'SIMULADOR_PHISHING', 'COMMAND_CENTER_DPO');

-- CreateEnum
CREATE TYPE "TemaFormacion" AS ENUM ('WINDOWS', 'LINUX', 'MACOS', 'IOS', 'ANDROID', 'EMAIL', 'DOBLE_FACTOR', 'IOT', 'SEGURIDAD_DATO', 'USO_IA');

-- CreateEnum
CREATE TYPE "EstadoCampania" AS ENUM ('BORRADOR', 'PROGRAMADA', 'ACTIVA', 'FINALIZADA');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" "Sector" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleToggle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "moduleKey" "ModuloClave" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),

    CONSTRAINT "ModuleToggle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "RolUsuario" NOT NULL DEFAULT 'EMPLEADO',
    "department" "Departamento" NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPill" (
    "id" TEXT NOT NULL,
    "topic" "TemaFormacion" NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pillId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,

    CONSTRAINT "TrainingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" "TemaFormacion" NOT NULL,
    "difficultyPath" JSONB NOT NULL,
    "finalLevel" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhishingCampaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" "Departamento" NOT NULL,
    "emailSubject" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL,
    "status" "EstadoCampania" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhishingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhishingResult" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "PhishingResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskScoreSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleToggle_companyId_moduleKey_key" ON "ModuleToggle"("companyId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProgress_userId_pillId_key" ON "TrainingProgress"("userId", "pillId");

-- CreateIndex
CREATE UNIQUE INDEX "PhishingResult_campaignId_userId_key" ON "PhishingResult"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "ModuleToggle" ADD CONSTRAINT "ModuleToggle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_pillId_fkey" FOREIGN KEY ("pillId") REFERENCES "TrainingPill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhishingCampaign" ADD CONSTRAINT "PhishingCampaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhishingResult" ADD CONSTRAINT "PhishingResult_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PhishingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhishingResult" ADD CONSTRAINT "PhishingResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScoreSnapshot" ADD CONSTRAINT "RiskScoreSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
