/**
 * Consultas del Panel Principal. Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";
import { contarPildorasAplicables } from "@/lib/data/formacion";
import type { PuntoActividad } from "@/components/dashboard/ActivityChart";

/**
 * Porcentaje del catálogo de formación completado de media por la plantilla.
 *
 * Es la métrica que el panel llamaba "plantilla formada" con un 78% escrito a
 * mano. Se define como finalizaciones registradas entre el total posible
 * (empleados × píldoras **aplicables a la empresa**, no el catálogo entero:
 * las píldoras de sistemas operativos que no usan nunca se van a completar y
 * hundirían el porcentaje para siempre).
 */
export async function porcentajePlantillaFormada(empresaId: string): Promise<number> {
  const [empleados, pildoras, completadas] = await Promise.all([
    prisma.user.count({ where: { companyId: empresaId } }),
    contarPildorasAplicables(empresaId),
    prisma.trainingProgress.count({
      where: { user: { companyId: empresaId }, completedAt: { not: null } },
    }),
  ]);

  const posibles = empleados * pildoras;
  return posibles === 0 ? 0 : Math.round((completadas / posibles) * 100);
}

/** Módulos que la empresa tiene contratados y activos. */
export async function contarModulosActivos(empresaId: string): Promise<number> {
  return prisma.moduleToggle.count({
    where: { companyId: empresaId, enabled: true },
  });
}

/**
 * Evolución del progreso de formación de la plantilla en las últimas 8
 * semanas, acumulado. Sustituye a la serie S1..S8 que estaba escrita a mano
 * dentro del componente de la gráfica.
 */
export async function actividadUltimasSemanas(
  empresaId: string,
  semanas = 8
): Promise<PuntoActividad[]> {
  const [empleados, pildoras] = await Promise.all([
    prisma.user.count({ where: { companyId: empresaId } }),
    contarPildorasAplicables(empresaId),
  ]);
  const posibles = empleados * pildoras;

  const finalizaciones = await prisma.trainingProgress.findMany({
    where: { user: { companyId: empresaId }, completedAt: { not: null } },
    select: { completedAt: true },
  });

  const ahora = Date.now();
  const UNA_SEMANA = 7 * 24 * 60 * 60 * 1000;

  return Array.from({ length: semanas }, (_, i) => {
    // i = 0 es la semana más antigua del rango.
    const corte = ahora - (semanas - 1 - i) * UNA_SEMANA;
    const acumuladas = finalizaciones.filter(
      (f) => f.completedAt !== null && f.completedAt.getTime() <= corte
    ).length;

    return {
      semana: `S${i + 1}`,
      progreso: posibles === 0 ? 0 : Math.round((acumuladas / posibles) * 100),
    };
  });
}

/** Simulaciones de phishing recibidas por el usuario indicado. */
export async function simulacionesRecibidas(usuarioId: string) {
  const [total, clics] = await Promise.all([
    prisma.phishingResult.count({ where: { userId: usuarioId } }),
    prisma.phishingResult.count({ where: { userId: usuarioId, clicked: true } }),
  ]);

  return { total, clics };
}

/** Nivel medio alcanzado por el usuario en sus evaluaciones adaptativas. */
export async function nivelEvaluacion(usuarioId: string): Promise<number | null> {
  const agregado = await prisma.quizAttempt.aggregate({
    where: { userId: usuarioId },
    _avg: { finalLevel: true },
    _count: { _all: true },
  });

  if (agregado._count._all === 0 || agregado._avg.finalLevel === null) return null;
  return Math.round(agregado._avg.finalLevel);
}
