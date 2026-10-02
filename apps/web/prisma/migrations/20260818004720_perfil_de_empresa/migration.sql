-- CreateEnum
CREATE TYPE "SistemaOperativo" AS ENUM ('WINDOWS', 'MACOS', 'LINUX', 'ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "ProcesoCritico" AS ENUM ('FACTURACION', 'NOMINAS', 'COMPRAS_PROVEEDORES', 'ATENCION_CLIENTE', 'GESTION_ENVIOS', 'DESARROLLO_SOFTWARE', 'ADMINISTRACION_SISTEMAS', 'GESTION_DOCUMENTAL', 'CONTRATACION', 'TRATAMIENTO_DATOS_PERSONALES');

-- CreateEnum
CREATE TYPE "HerramientaCorporativa" AS ENUM ('MICROSOFT_365', 'GOOGLE_WORKSPACE', 'SLACK', 'TEAMS', 'ZOOM', 'SAP', 'SALESFORCE', 'JIRA', 'DROPBOX', 'VPN_CORPORATIVA', 'ERP_PROPIO', 'CRM_PROPIO');

-- CreateEnum
CREATE TYPE "Normativa" AS ENUM ('RGPD', 'LOPDGDD', 'ENS', 'ISO_27001', 'ISO_42001', 'NIS2', 'PCI_DSS', 'DORA');

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sistemasOperativos" "SistemaOperativo"[],
    "procesos" "ProcesoCritico"[],
    "herramientas" "HerramientaCorporativa"[],
    "otrasHerramientas" TEXT[],
    "normativas" "Normativa"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_companyId_key" ON "CompanyProfile"("companyId");

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
