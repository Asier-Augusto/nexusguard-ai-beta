/**
 * Reglas de desbloqueo de módulos.
 *
 * Módulo puro (sin React ni Prisma) para poder usarse igual desde el servidor
 * y desde el cliente. Antes estas reglas vivían dentro del store de zustand y
 * se apoyaban en `localStorage`; ahora reciben el estado real del usuario, que
 * sale de la base de datos.
 *
 * Es la ÚNICA fuente de verdad del desbloqueo. Los roles permitidos se leen del
 * campo `roles` de `MODULES`, que hasta ahora no consumía nadie mientras estas
 * mismas reglas estaban duplicadas a mano.
 */
import { MODULES, type ModuloKey } from "@/lib/modules";

export type RolUsuario = "EMPLEADO" | "DPO" | "ADMIN";

export interface EstadoAcceso {
  rol: RolUsuario;
  /** Píldoras de formación que el usuario ha terminado (TrainingProgress). */
  pildorasCompletadas: number;
}

/**
 * Un módulo se desbloquea progresivamente: Formación está siempre disponible,
 * la Evaluación Adaptativa exige haber completado al menos una píldora, y los
 * módulos de gestión están reservados a DPO y ADMIN.
 */
export function moduloDesbloqueado(clave: ModuloKey, estado: EstadoAcceso): boolean {
  const modulo = MODULES.find((m) => m.key === clave);
  if (!modulo) return false;

  // Puerta por rol, declarada en el propio catálogo de módulos.
  if (!modulo.roles.includes(estado.rol)) return false;

  // Puerta por progreso: solo la afecta a la evaluación adaptativa.
  if (clave === "EVALUACION_ADAPTATIVA") {
    return estado.pildorasCompletadas >= 1;
  }

  return true;
}

/** Módulos visibles para un usuario, ya ordenados para el menú. */
export function modulosDesbloqueados(estado: EstadoAcceso): ModuloKey[] {
  return [...MODULES]
    .sort((a, b) => a.order - b.order)
    .filter((m) => moduloDesbloqueado(m.key, estado))
    .map((m) => m.key);
}
