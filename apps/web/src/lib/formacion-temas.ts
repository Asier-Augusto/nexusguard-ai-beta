/**
 * Clasificación de los temas de formación.
 *
 * Módulo puro (sin React ni Prisma) para poder usarse igual desde el servidor,
 * desde el cliente y desde el servidor.
 *
 * El catálogo se divide en dos familias:
 *
 *  - Temas **de sistema operativo**: solo tienen sentido si la empresa usa ese
 *    sistema. Enseñar el endurecimiento de macOS a una plantilla que trabaja
 *    solo con Windows es ruido que baja la finalización del catálogo.
 *  - Temas **transversales**: aplican a cualquier organización con
 *    independencia de sus equipos (correo, doble factor, datos, IA…).
 *
 * Los valores del enum `SistemaOperativo` coinciden a propósito con los de
 * `TemaFormacion` para estos cinco temas, así que el mapeo es la identidad y no
 * hace falta ninguna tabla de traducción.
 */
import type { SistemaOperativoKey } from "@/lib/constants";

export const TEMAS_SISTEMA_OPERATIVO = [
  "WINDOWS",
  "MACOS",
  "LINUX",
  "ANDROID",
  "IOS",
] as const;

export type TemaSistemaOperativo = (typeof TEMAS_SISTEMA_OPERATIVO)[number];

/** ¿Este tema depende de que la empresa use un sistema operativo concreto? */
export function esTemaDeSistemaOperativo(tema: string): tema is TemaSistemaOperativo {
  return (TEMAS_SISTEMA_OPERATIVO as readonly string[]).includes(tema);
}

/**
 * ¿Le corresponde este tema a una empresa con estos sistemas operativos?
 *
 * Los temas transversales siempre aplican. Si la empresa no ha declarado
 * ningún sistema operativo (perfil sin rellenar), se muestra el catálogo
 * completo: es preferible enseñar de más que dejar la formación vacía.
 */
export function temaAplicaAEmpresa(
  tema: string,
  sistemasOperativos: SistemaOperativoKey[]
): boolean {
  if (!esTemaDeSistemaOperativo(tema)) return true;
  if (sistemasOperativos.length === 0) return true;
  return (sistemasOperativos as readonly string[]).includes(tema);
}
