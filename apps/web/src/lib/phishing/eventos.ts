/**
 * Registro de lo que hace un empleado con el señuelo de una campaña.
 *
 * POR QUÉ ESTÁ AQUÍ Y NO EN CADA RUTA
 * -----------------------------------
 * Los eventos entran por tres puertas: el enlace instrumentado que pulsa el
 * empleado (`/api/phishing/clic/[token]`), el webhook que llamaría una pasarela
 * de correo externa (`/api/phishing/webhook`) y el botón de reportar del buzón.
 * Las tres tienen que escribir EXACTAMENTE lo mismo, o las cifras de la campaña
 * dejarían de cuadrar según por dónde hubiera entrado cada persona.
 *
 * Todo es idempotente: gana la primera reacción. Un empleado que pulsa el
 * enlace tres veces ha picado una vez, y quien ya reportó no "despica" por
 * abrir el correo después.
 *
 * Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";

export type TipoEvento = "CLIC" | "REPORTE";

export type ResultadoEvento =
  | { estado: "REGISTRADO"; campaniaId: string; usuarioId: string; tipo: TipoEvento }
  | { estado: "YA_REGISTRADO"; campaniaId: string; usuarioId: string; tipo: TipoEvento }
  | { estado: "TOKEN_DESCONOCIDO" };

/**
 * Anota un clic o un reporte a partir del token del enlace instrumentado.
 *
 * `userAgent` se guarda solo en el clic y solo si no había ninguno: es lo
 * único que permite distinguir después una persona de la pre-carga automática
 * de un antivirus de correo. La IP no se guarda a propósito (ver el comentario
 * de `PhishingResult` en el esquema).
 */
export async function registrarEvento(
  token: string,
  tipo: TipoEvento,
  userAgent?: string | null,
  momento: Date = new Date()
): Promise<ResultadoEvento> {
  const resultado = await prisma.phishingResult.findUnique({
    where: { token },
    select: {
      id: true,
      campaignId: true,
      userId: true,
      clicked: true,
      reported: true,
      respondedAt: true,
      userAgent: true,
    },
  });

  if (!resultado) return { estado: "TOKEN_DESCONOCIDO" };

  const yaEstaba = tipo === "CLIC" ? resultado.clicked : resultado.reported;
  const comun = {
    campaniaId: resultado.campaignId,
    usuarioId: resultado.userId,
    tipo,
  };

  if (yaEstaba) return { estado: "YA_REGISTRADO", ...comun };

  await prisma.phishingResult.update({
    where: { id: resultado.id },
    data:
      tipo === "CLIC"
        ? {
            clicked: true,
            clickedAt: momento,
            // La primera reacción es la que fecha el resultado; si ya había
            // una (un reporte anterior), no se pisa.
            respondedAt: resultado.respondedAt ?? momento,
            userAgent: resultado.userAgent ?? userAgent ?? null,
          }
        : {
            reported: true,
            reportedAt: momento,
            respondedAt: resultado.respondedAt ?? momento,
          },
  });

  return { estado: "REGISTRADO", ...comun };
}

/** El señuelo que le tocó a un empleado, para la página de concienciación. */
export async function senueloDeToken(token: string) {
  const resultado = await prisma.phishingResult.findUnique({
    where: { token },
    select: {
      clicked: true,
      reported: true,
      clickedAt: true,
      user: { select: { name: true } },
      campaign: {
        select: {
          id: true,
          name: true,
          canal: true,
          emailSubject: true,
          emailBody: true,
          senderName: true,
          senderEmail: true,
          redFlags: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  return resultado;
}
