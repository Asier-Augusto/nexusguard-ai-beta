/**
 * Webhook de eventos de campaña.
 *
 * Es el punto por el que una pasarela externa —un gateway de correo, una
 * plataforma de envío de SMS, el botón "reportar phishing" del cliente de
 * correo— le cuenta a NexusGuard lo que ha hecho un empleado con un señuelo.
 * Es también el requisito de "API / webhook" del proyecto, y el único punto
 * de la plataforma que escribe en base de datos sin sesión al otro lado.
 *
 * CONTRATO
 * --------
 *   POST /api/phishing/webhook
 *   X-NexusGuard-Firma: sha256=<hmac del cuerpo crudo>
 *   { "token": "...", "evento": "CLIC" | "REPORTE",
 *     "ocurridoEn": "2026-08-23T10:04:00Z", "userAgent": "..." }
 *
 *   200  registrado (o ya estaba registrado: es idempotente)
 *   400  el cuerpo no es el que se espera
 *   401  firma ausente o incorrecta
 *   404  token desconocido
 *
 * Por qué idempotente y no un 409: una pasarela que no recibe respuesta
 * reintenta. Si el reintento diera error, cualquier corte de red dejaría la
 * integración escupiendo fallos por eventos que sí se habían guardado.
 *
 */
import { NextResponse, type NextRequest } from "next/server";
import { registrarEvento, type TipoEvento } from "@/lib/phishing/eventos";
import { CABECERA_FIRMA, firmaValida } from "@/lib/phishing/firma";

export const dynamic = "force-dynamic";

interface CuerpoWebhook {
  token?: unknown;
  evento?: unknown;
  ocurridoEn?: unknown;
  userAgent?: unknown;
}

const EVENTOS: TipoEvento[] = ["CLIC", "REPORTE"];

export async function POST(req: NextRequest): Promise<NextResponse> {
  // El cuerpo se lee CRUDO y se firma tal cual: si se firmara el objeto ya
  // interpretado, dos serializaciones distintas del mismo JSON darían firmas
  // distintas y la integración fallaría de forma intermitente.
  const crudo = await req.text();

  if (!firmaValida(crudo, req.headers.get(CABECERA_FIRMA))) {
    return NextResponse.json(
      { ok: false, detalle: "Firma ausente o incorrecta." },
      { status: 401 }
    );
  }

  let cuerpo: CuerpoWebhook;
  try {
    cuerpo = JSON.parse(crudo) as CuerpoWebhook;
  } catch {
    return NextResponse.json(
      { ok: false, detalle: "El cuerpo no es JSON válido." },
      { status: 400 }
    );
  }

  const token = typeof cuerpo.token === "string" ? cuerpo.token : "";
  const evento = cuerpo.evento as TipoEvento;

  if (!token || !EVENTOS.includes(evento)) {
    return NextResponse.json(
      { ok: false, detalle: "Hacen falta 'token' y 'evento' (CLIC o REPORTE)." },
      { status: 400 }
    );
  }

  const momento =
    typeof cuerpo.ocurridoEn === "string" && !Number.isNaN(Date.parse(cuerpo.ocurridoEn))
      ? new Date(cuerpo.ocurridoEn)
      : new Date();

  const userAgent = typeof cuerpo.userAgent === "string" ? cuerpo.userAgent : null;

  const resultado = await registrarEvento(token, evento, userAgent, momento);

  if (resultado.estado === "TOKEN_DESCONOCIDO") {
    return NextResponse.json(
      { ok: false, detalle: "Ese token no corresponde a ninguna campaña." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    registrado: resultado.estado === "REGISTRADO",
    campaniaId: resultado.campaniaId,
    detalle:
      resultado.estado === "REGISTRADO"
        ? `Evento ${evento} registrado.`
        : `El evento ${evento} ya estaba registrado.`,
  });
}
