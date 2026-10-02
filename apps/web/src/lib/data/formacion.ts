/**
 * Consultas del módulo de Formación. Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";
import { TemaFormacion } from "@/generated/prisma/enums";
import { PILL_CATALOG } from "@/lib/content/pill-catalog";
import { esTemaDeSistemaOperativo, temaAplicaAEmpresa } from "@/lib/formacion-temas";
import { obtenerPerfil } from "@/lib/data/perfil";
import {
  contenidoAdaptadoDe,
  encuadreDeEmpresa,
  estadoAdaptacionPorPildora,
  type EstadoAdaptacion,
} from "@/lib/data/adaptacion";
import type { ContenidoPildora } from "@/lib/training-types";
import type { SistemaOperativoKey } from "@/lib/constants";

export interface PildoraConProgreso {
  id: string;
  tema: string;
  titulo: string;
  resumen: string;
  duracionMinutos: number;
  /** Metadatos de presentación (icono, categoría) del catálogo estático. */
  icono: string;
  categoria: string;
  estado: "COMPLETADA" | "EN_CURSO" | "PENDIENTE";
  puntuacion: number | null;
  /** Verdadero si el tema corresponde a un sistema operativo de la empresa. */
  especificaDelSistema: boolean;
  /** Si esta píldora tiene contenido escrito para esta empresa, y si sigue vigente. */
  adaptacion: EstadoAdaptacion;
}

/** Sistemas operativos declarados por la empresa, o lista vacía si no hay perfil. */
async function sistemasDeLaEmpresa(empresaId: string): Promise<SistemaOperativoKey[]> {
  const perfil = await obtenerPerfil(empresaId);
  return perfil?.sistemasOperativos ?? [];
}

/** Usado si algún día hay una píldora en base de datos sin entrada en el catálogo. */
const PRESENTACION_POR_DEFECTO = { icon: "BookOpenCheck", category: "General" };

/**
 * Catálogo de píldoras aplicables a la empresa, con el progreso del usuario.
 *
 * El catálogo se **segmenta por sistema operativo**: las píldoras de un sistema
 * que la empresa no usa no se listan. El contenido y la duración salen de la
 * base de datos; el icono y la categoría siguen viniendo de `pill-catalog.ts`
 * porque son decisiones de presentación que no tiene sentido almacenar.
 */
export async function listarPildoras(
  usuarioId: string,
  empresaId: string
): Promise<PildoraConProgreso[]> {
  const [pildoras, sistemas, encuadre] = await Promise.all([
    prisma.trainingPill.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        topic: true,
        title: true,
        summary: true,
        durationMinutes: true,
        progress: {
          where: { userId: usuarioId },
          select: { completedAt: true, score: true },
        },
      },
    }),
    sistemasDeLaEmpresa(empresaId),
    encuadreDeEmpresa(empresaId),
  ]);

  const adaptaciones = await estadoAdaptacionPorPildora(empresaId, encuadre?.huella ?? null);

  return pildoras
    .filter((pildora) => temaAplicaAEmpresa(pildora.topic, sistemas))
    .map((pildora) => {
    const progreso = pildora.progress[0];
    const presentacion =
      PILL_CATALOG.find((entrada) => entrada.topicKey === pildora.topic) ??
      PRESENTACION_POR_DEFECTO;

    let estado: PildoraConProgreso["estado"] = "PENDIENTE";
    if (progreso?.completedAt) estado = "COMPLETADA";
    else if (progreso) estado = "EN_CURSO";

    return {
      id: pildora.id,
      tema: pildora.topic,
      titulo: pildora.title,
      resumen: pildora.summary,
      duracionMinutos: pildora.durationMinutes,
      icono: presentacion.icon,
      categoria: presentacion.category,
      estado,
      puntuacion: progreso?.score ?? null,
      especificaDelSistema: esTemaDeSistemaOperativo(pildora.topic),
      adaptacion: adaptaciones.get(pildora.id) ?? "SIN_ADAPTAR",
    };
  });
}

/**
 * Cuántas píldoras del catálogo le corresponden a esta empresa. Es el
 * denominador correcto para cualquier porcentaje de finalización.
 */
export async function contarPildorasAplicables(empresaId: string): Promise<number> {
  const [temas, sistemas] = await Promise.all([
    prisma.trainingPill.findMany({ select: { topic: true } }),
    sistemasDeLaEmpresa(empresaId),
  ]);

  return temas.filter((t) => temaAplicaAEmpresa(t.topic, sistemas)).length;
}

export interface PildoraDetalle {
  id: string;
  contenido: ContenidoPildora;
  yaCompletada: boolean;
  /** Falso si el tema es de un sistema operativo que la empresa no usa. */
  aplicaALaEmpresa: boolean;
  /** Estado de la versión escrita por la IA para esta empresa. */
  adaptacion: EstadoAdaptacion;
  /** Cuándo se generó, si lo que se está sirviendo es la versión adaptada. */
  adaptadoEn: Date | null;
}

/**
 * Una píldora concreta por su tema, con su contenido interactivo.
 *
 * Aquí es donde el perfil de la empresa cambia lo que ve el empleado: si hay
 * una versión escrita por la IA para esta empresa **y se generó con el perfil
 * que está vigente ahora**, se sirve esa; si no, la genérica de siempre. El
 * componente que la pinta no se entera: recibe el mismo formato en los dos
 * casos.
 */
export async function obtenerPildoraPorTema(
  tema: string,
  usuarioId: string,
  empresaId: string
): Promise<PildoraDetalle | null> {
  // El tema llega del segmento de la URL, así que lo elige quien navega. Si no
  // es un valor del enum se responde "no existe" en vez de dejar que Prisma
  // reviente con un error de validación: `/dashboard/formacion/loquesea`
  // devolvía un 500 desde que existe la ruta.
  if (!(tema in TemaFormacion)) return null;

  const [pildora, sistemas, encuadre] = await Promise.all([
    prisma.trainingPill.findFirst({
      where: { topic: tema as never },
      select: {
        id: true,
        content: true,
        progress: {
          where: { userId: usuarioId },
          select: { completedAt: true },
        },
      },
    }),
    sistemasDeLaEmpresa(empresaId),
    encuadreDeEmpresa(empresaId),
  ]);

  if (!pildora) return null;

  const adaptado = encuadre
    ? await contenidoAdaptadoDe(empresaId, pildora.id, encuadre.huella)
    : null;

  let adaptacion: EstadoAdaptacion = "SIN_ADAPTAR";
  if (adaptado) {
    adaptacion = "AL_DIA";
  } else if (encuadre) {
    const estados = await estadoAdaptacionPorPildora(empresaId, encuadre.huella);
    adaptacion = estados.get(pildora.id) ?? "SIN_ADAPTAR";
  }

  return {
    id: pildora.id,
    contenido: (adaptado?.contenido ??
      (pildora.content as unknown as ContenidoPildora)),
    yaCompletada: Boolean(pildora.progress[0]?.completedAt),
    // No se bloquea el acceso directo por URL: si alguien llega a una píldora
    // que no le corresponde puede leerla, pero se le avisa de que no forma
    // parte del itinerario de su empresa.
    aplicaALaEmpresa: temaAplicaAEmpresa(tema, sistemas),
    adaptacion,
    adaptadoEn: adaptado?.generadoEn ?? null,
  };
}

/**
 * El contenido genérico de una píldora, sin pasar por la caché adaptada.
 *
 * Lo usa el generador: la IA reescribe siempre sobre el contenido de
 * referencia, no sobre una adaptación anterior. Si no, regenerar dos veces
 * seguidas iría alejando el contenido del original sin control.
 */
export async function contenidoGenericoDe(
  pildoraId: string
): Promise<ContenidoPildora | null> {
  const pildora = await prisma.trainingPill.findUnique({
    where: { id: pildoraId },
    select: { content: true },
  });

  return (pildora?.content as unknown as ContenidoPildora) ?? null;
}

/**
 * Reparto de píldoras del usuario para el donut del panel.
 *
 * El total es el de píldoras **aplicables a la empresa**, no el catálogo
 * entero: si no, una empresa que solo usa Windows arrastraría para siempre
 * cuatro píldoras pendientes que nunca va a hacer.
 */
export async function resumenProgreso(usuarioId: string, empresaId: string) {
  const aplicables = await listarPildoras(usuarioId, empresaId);

  const completadas = aplicables.filter((p) => p.estado === "COMPLETADA").length;
  const enCurso = aplicables.filter((p) => p.estado === "EN_CURSO").length;

  return {
    total: aplicables.length,
    completadas,
    enCurso,
    pendientes: aplicables.length - completadas - enCurso,
  };
}
