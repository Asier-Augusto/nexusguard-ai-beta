/**
 * El perfil de una empresa, traducido a lo que necesita el generador de IA.
 *
 * Aquí se decide QUÉ sabe la IA de la empresa. El servicio de Python recibe
 * etiquetas ya legibles ("Microsoft 365", no `MICROSOFT_365`) porque el
 * catálogo de la interfaz vive en `src/lib/constants.ts` y no tiene sentido
 * duplicarlo al otro lado.
 *
 * Solo para código de servidor: usa `node:crypto`.
 */
import { createHash } from "node:crypto";
import type { BriefingEmpresa } from "@/lib/ai-client";
import { SECTORES, type SectorKey } from "@/lib/constants";
import {
  etiquetasHerramientas,
  etiquetasNormativas,
  etiquetasProcesos,
  etiquetasSistemasOperativos,
  type PerfilEmpresa,
} from "@/lib/data/perfil";

// El briefing se declara una sola vez, junto al resto del contrato con el
// servicio de inferencia; aqui solo se compone y se firma.
export type { BriefingEmpresa };

export interface EmpresaMinima {
  nombre: string;
  sector: SectorKey;
}

/** El encuadre de la empresa que se manda al servicio de inferencia. */
export function construirBriefing(
  empresa: EmpresaMinima,
  perfil: PerfilEmpresa
): BriefingEmpresa {
  return {
    nombre: empresa.nombre,
    sector: SECTORES.find((s) => s.key === empresa.sector)?.label ?? empresa.sector,
    sistemas: etiquetasSistemasOperativos(perfil),
    procesos: etiquetasProcesos(perfil),
    herramientas: etiquetasHerramientas(perfil),
    normativas: etiquetasNormativas(perfil),
  };
}

/**
 * Huella del encuadre con el que se generó un contenido.
 *
 * Es lo que caduca la caché. Si el DPO cambia el perfil —añade una
 * herramienta, cambia de sector, le entra una normativa nueva— la huella deja
 * de coincidir y ese contenido pasa a estar obsoleto: se vuelve a servir el
 * genérico hasta que alguien lo regenere.
 *
 * Las listas se ordenan antes de firmar porque el orden en el que el DPO marcó
 * las casillas no cambia nada del contenido: si no, reordenar el formulario
 * invalidaría toda la formación de la empresa sin motivo.
 */
export function huellaDelPerfil(briefing: BriefingEmpresa): string {
  const canonico = JSON.stringify({
    nombre: briefing.nombre.trim(),
    sector: briefing.sector,
    sistemas: [...briefing.sistemas].sort(),
    procesos: [...briefing.procesos].sort(),
    herramientas: [...briefing.herramientas].sort(),
    normativas: [...briefing.normativas].sort(),
  });

  return createHash("sha1").update(canonico).digest("hex").slice(0, 16);
}
