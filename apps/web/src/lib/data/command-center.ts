/**
 * Consultas del Command Center del DPO. Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";
import { riskLevelFromScore, type RiskLevel } from "@/lib/risk";
import { DEPARTAMENTOS } from "@/lib/constants";

export interface EmpleadoRiesgo {
  id: string;
  nombre: string;
  departamento: string;
  /** Etiqueta legible del departamento, no la clave del enum. */
  departamentoEtiqueta: string;
  score: number;
  nivel: RiskLevel;
}

function etiquetaDepartamento(clave: string): string {
  return DEPARTAMENTOS.find((d) => d.key === clave)?.label ?? clave;
}

/** Plantilla completa ordenada de mayor a menor riesgo. */
export async function listarPlantilla(empresaId: string): Promise<EmpleadoRiesgo[]> {
  const usuarios = await prisma.user.findMany({
    where: { companyId: empresaId },
    orderBy: [{ riskScore: "desc" }, { name: "asc" }],
    select: { id: true, name: true, department: true, riskScore: true },
  });

  return usuarios.map((usuario) => ({
    id: usuario.id,
    nombre: usuario.name,
    departamento: usuario.department as string,
    departamentoEtiqueta: etiquetaDepartamento(usuario.department as string),
    score: usuario.riskScore,
    nivel: riskLevelFromScore(usuario.riskScore),
  }));
}

export interface RiesgoDepartamento {
  departamento: string;
  score: number;
  empleados: number;
}

/** Riesgo medio por departamento, para la gráfica de barras. */
export async function riesgoPorDepartamento(
  empresaId: string
): Promise<RiesgoDepartamento[]> {
  const grupos = await prisma.user.groupBy({
    by: ["department"],
    where: { companyId: empresaId },
    _avg: { riskScore: true },
    _count: { _all: true },
  });

  return grupos
    .map((grupo) => ({
      departamento: etiquetaDepartamento(grupo.department as string),
      score: Math.round(grupo._avg.riskScore ?? 0),
      empleados: grupo._count._all,
    }))
    .sort((a, b) => b.score - a.score);
}

export interface ResumenRiesgo {
  /** Media de riesgo de toda la plantilla. */
  riesgoGlobal: number;
  totalEmpleados: number;
  /** Empleados con riesgo alto o crítico (>= 50). */
  enRiesgo: number;
  /** Diferencia en puntos frente a la foto de hace un mes; negativo es mejora. */
  variacionMensual: number | null;
}

const UMBRAL_RIESGO = 50;

export async function resumenRiesgo(empresaId: string): Promise<ResumenRiesgo> {
  const [agregado, enRiesgo] = await Promise.all([
    prisma.user.aggregate({
      where: { companyId: empresaId },
      _avg: { riskScore: true },
      _count: { _all: true },
    }),
    prisma.user.count({
      where: { companyId: empresaId, riskScore: { gte: UMBRAL_RIESGO } },
    }),
  ]);

  const riesgoGlobal = Math.round(agregado._avg.riskScore ?? 0);

  return {
    riesgoGlobal,
    totalEmpleados: agregado._count._all,
    enRiesgo,
    variacionMensual: await calcularVariacionMensual(empresaId, riesgoGlobal),
  };
}

/**
 * Compara el riesgo actual con la media de los snapshots de hace un mes. Antes
 * el panel mostraba un "-8 pts vs. mes anterior" escrito a mano.
 */
async function calcularVariacionMensual(
  empresaId: string,
  riesgoActual: number
): Promise<number | null> {
  const hace45Dias = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  const hace15Dias = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  const anterior = await prisma.riskScoreSnapshot.aggregate({
    where: {
      user: { companyId: empresaId },
      computedAt: { gte: hace45Dias, lt: hace15Dias },
    },
    _avg: { score: true },
    _count: { _all: true },
  });

  // Sin histórico suficiente no se inventa una tendencia.
  if (anterior._count._all === 0 || anterior._avg.score === null) return null;

  return riesgoActual - Math.round(anterior._avg.score);
}
