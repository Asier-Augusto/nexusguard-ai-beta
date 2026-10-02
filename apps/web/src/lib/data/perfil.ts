/**
 * Lectura del perfil de empresa. Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";
import {
  HERRAMIENTAS,
  NORMATIVAS,
  PROCESOS,
  SISTEMAS_OPERATIVOS,
  type HerramientaKey,
  type NormativaKey,
  type ProcesoCriticoKey,
  type SistemaOperativoKey,
} from "@/lib/constants";

export interface PerfilEmpresa {
  sistemasOperativos: SistemaOperativoKey[];
  procesos: ProcesoCriticoKey[];
  herramientas: HerramientaKey[];
  otrasHerramientas: string[];
  normativas: NormativaKey[];
  actualizadoEn: Date;
}

export async function obtenerPerfil(empresaId: string): Promise<PerfilEmpresa | null> {
  const perfil = await prisma.companyProfile.findUnique({
    where: { companyId: empresaId },
    select: {
      sistemasOperativos: true,
      procesos: true,
      herramientas: true,
      otrasHerramientas: true,
      normativas: true,
      updatedAt: true,
    },
  });

  if (!perfil) return null;

  return {
    sistemasOperativos: perfil.sistemasOperativos as SistemaOperativoKey[],
    procesos: perfil.procesos as ProcesoCriticoKey[],
    herramientas: perfil.herramientas as HerramientaKey[],
    otrasHerramientas: perfil.otrasHerramientas,
    normativas: perfil.normativas as NormativaKey[],
    actualizadoEn: perfil.updatedAt,
  };
}

// --- Traducción a etiquetas legibles --------------------------------------

export function etiquetasSistemasOperativos(perfil: PerfilEmpresa): string[] {
  return perfil.sistemasOperativos.map(
    (k) => SISTEMAS_OPERATIVOS.find((x) => x.key === k)?.label ?? k
  );
}

export function etiquetasProcesos(perfil: PerfilEmpresa): string[] {
  return perfil.procesos.map((k) => PROCESOS.find((x) => x.key === k)?.label ?? k);
}

/** Herramientas del catálogo más las propias que declaró la empresa. */
export function etiquetasHerramientas(perfil: PerfilEmpresa): string[] {
  return [
    ...perfil.herramientas.map((k) => HERRAMIENTAS.find((x) => x.key === k)?.label ?? k),
    ...perfil.otrasHerramientas,
  ];
}

export function etiquetasNormativas(perfil: PerfilEmpresa): string[] {
  return perfil.normativas.map((k) => NORMATIVAS.find((x) => x.key === k)?.label ?? k);
}

/** Nombres completos de las normativas, para el informe de cumplimiento. */
export function nombresCompletosNormativas(perfil: PerfilEmpresa): string[] {
  return perfil.normativas.map(
    (k) => NORMATIVAS.find((x) => x.key === k)?.nombreCompleto ?? k
  );
}

// --- Pretexto para el simulador de phishing --------------------------------

/**
 * Compone la pista de pretexto que se envía al motor de generación.
 *
 * Es el punto donde el perfil deja de ser un formulario relleno y pasa a
 * cambiar lo que hace el sistema: en vez de pedirle al modelo un señuelo
 * genérico, se le dice con qué herramientas trabaja la plantilla y qué procesos
 * mueven dinero o datos en esa empresa, que es de donde salen los pretextos
 * creíbles.
 *
 * Devuelve `undefined` si no hay perfil, y entonces el servicio se comporta
 * como antes y elige el pretexto por su cuenta.
 */
export function componerPretexto(perfil: PerfilEmpresa | null): string | undefined {
  if (!perfil) return undefined;

  const partes: string[] = [];

  const herramientas = etiquetasHerramientas(perfil);
  if (herramientas.length > 0) {
    partes.push(`suplanta a una de estas herramientas que usa la empresa: ${herramientas.join(", ")}`);
  }

  const procesos = etiquetasProcesos(perfil);
  if (procesos.length > 0) {
    partes.push(`apoyate en uno de sus procesos criticos: ${procesos.join(", ")}`);
  }

  const sistemas = etiquetasSistemasOperativos(perfil);
  if (sistemas.length > 0) {
    partes.push(`sus equipos son ${sistemas.join(" y ")}`);
  }

  return partes.length > 0 ? partes.join("; ") : undefined;
}
