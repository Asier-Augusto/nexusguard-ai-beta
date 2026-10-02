"use server";

/**
 * Ciclo de vida de una campaña de concienciación: escribirla, lanzarla y
 * cerrarla.
 *
 * Todo lo que se genera aquí es material de SIMULACIÓN para una campaña
 * interna autorizada por la propia empresa. Nada sale a una dirección real:
 * los señuelos se entregan en el buzón simulado de la aplicación
 * (`/dashboard/buzon`), y el único enlace que llevan es el instrumentado, que
 * apunta a esta misma plataforma.
 */
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  RUTA_PHISHING_GENERAR,
  type CanalCampania,
  type PhishingGenerateResponse,
} from "@/lib/ai-client";
import { postJsonLargo } from "@/lib/adaptacion/peticion-larga";
import { encuadreDeEmpresa } from "@/lib/data/adaptacion";
import {
  componerPretexto,
  etiquetasHerramientas,
  etiquetasProcesos,
  obtenerPerfil,
} from "@/lib/data/perfil";
import { obtenerUsuarioActivo } from "@/lib/session";
import { registrarEvento } from "@/lib/phishing/eventos";
import { firmar } from "@/lib/phishing/firma";
import { baseDeLaAplicacion } from "@/lib/phishing/senuelo";
import type { DepartamentoKey } from "@/lib/constants";

export interface DatosCampania {
  nombre: string;
  departamento: DepartamentoKey;
  canal: CanalCampania;
  dificultad: "facil" | "media" | "dificil";
}

export interface CampaniaGenerada {
  campaniaId: string;
  canal: CanalCampania;
  asunto: string;
  /** Con el marcador del enlace ya sustituido por un texto legible. */
  cuerpo: string;
  remitenteNombre: string;
  remitenteEmail: string | null;
  senalesAlerta: string[];
  /** "ollama" si la ha redactado el modelo, "fallback" si son plantillas. */
  origen: "ollama" | "fallback";
  /** Por qué se descartó lo que escribió la IA, cuando se descarta. */
  detalle: string;
  /** Herramientas y procesos del perfil que han contextualizado el señuelo. */
  contextoPerfil: string[];
}

const DIFICULTAD_PRISMA = {
  facil: "FACIL",
  media: "MEDIA",
  dificil: "DIFICIL",
} as const;

/** Solo el responsable decide a quién se le manda un señuelo. */
async function exigirResponsable() {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) throw new Error("No hay ninguna sesión activa.");
  if (usuario.rol !== "DPO" && usuario.rol !== "ADMIN") {
    throw new Error("Solo el DPO o un administrador pueden gestionar campañas.");
  }
  return usuario;
}

/**
 * Escribe el señuelo con el servicio de inferencia y guarda la campaña como
 * borrador.
 *
 * La campaña nace en BORRADOR y no llega a nadie hasta que se lanza: escribir
 * y lanzar son dos decisiones distintas, y el DPO tiene que poder leer lo que
 * va a mandar antes de mandarlo.
 */
export async function generarCampania(datos: DatosCampania): Promise<CampaniaGenerada> {
  const usuario = await exigirResponsable();

  // El perfil que declaró el DPO es lo que hace que el señuelo hable de las
  // herramientas y los procesos reales de esta empresa, en vez de inventarse
  // un pretexto genérico.
  const [perfil, encuadre] = await Promise.all([
    obtenerPerfil(usuario.empresa.id),
    encuadreDeEmpresa(usuario.empresa.id),
  ]);

  const correo = await postJsonLargo<PhishingGenerateResponse>(RUTA_PHISHING_GENERAR, {
    sector: usuario.empresa.sector,
    department: datos.departamento,
    difficulty: datos.dificultad,
    canal: datos.canal,
    perfil: encuadre?.briefing ?? {
      nombre: usuario.empresa.nombre,
      sector: usuario.empresa.sector,
      sistemas: [],
      procesos: [],
      herramientas: [],
      normativas: [],
    },
    pretext_hint: componerPretexto(perfil),
  });

  const campania = await prisma.phishingCampaign.create({
    data: {
      companyId: usuario.empresa.id,
      name: datos.nombre.trim() || "Campaña sin nombre",
      department: datos.departamento,
      canal: datos.canal,
      dificultad: DIFICULTAD_PRISMA[datos.dificultad],
      emailSubject: correo.subject,
      // Se guarda CON el marcador: el enlace de cada empleado se resuelve al
      // entregar el señuelo, no al escribirlo.
      emailBody: correo.body,
      senderName: correo.sender_name,
      senderEmail: correo.sender_email,
      redFlags: correo.red_flags,
      origen: correo.source,
      modelo: correo.modelo,
      perfilHuella: encuadre?.huella ?? null,
      status: "BORRADOR",
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/phishing");

  return {
    campaniaId: campania.id,
    canal: correo.canal,
    asunto: correo.subject,
    cuerpo: correo.body,
    remitenteNombre: correo.sender_name,
    remitenteEmail: correo.sender_email,
    senalesAlerta: correo.red_flags,
    origen: correo.source,
    detalle: correo.detalle,
    contextoPerfil: perfil
      ? [...etiquetasHerramientas(perfil), ...etiquetasProcesos(perfil)]
      : [],
  };
}

export interface ResultadoLanzamiento {
  lanzada: boolean;
  destinatarios: number;
  detalle: string;
}

/**
 * Lanza la campaña: reparte un enlace instrumentado por empleado.
 *
 * Aquí es donde nacen los tokens, y no al crear la campaña, porque una
 * campaña en borrador todavía no tiene destinatarios: la plantilla puede
 * cambiar entre que se escribe el señuelo y que se decide mandarlo.
 *
 * Es idempotente: relanzar una campaña ya lanzada solo añade a quien haya
 * entrado nuevo en la empresa, y no toca los resultados de los que ya
 * reaccionaron.
 */
export async function lanzarCampania(campaniaId: string): Promise<ResultadoLanzamiento> {
  const usuario = await exigirResponsable();

  const campania = await prisma.phishingCampaign.findFirst({
    where: { id: campaniaId, companyId: usuario.empresa.id },
    select: { id: true, status: true, results: { select: { userId: true } } },
  });

  if (!campania) {
    return { lanzada: false, destinatarios: 0, detalle: "Esa campaña no existe." };
  }
  if (campania.status === "FINALIZADA") {
    return {
      lanzada: false,
      destinatarios: 0,
      detalle: "La campaña ya está cerrada; no se puede volver a lanzar.",
    };
  }

  const plantilla = await prisma.user.findMany({
    where: { companyId: usuario.empresa.id },
    select: { id: true },
  });

  const yaTienen = new Set(campania.results.map((r) => r.userId));
  const nuevos = plantilla.filter((u) => !yaTienen.has(u.id));
  const ahora = new Date();

  if (nuevos.length > 0) {
    await prisma.phishingResult.createMany({
      data: nuevos.map((u) => ({
        campaignId: campania.id,
        userId: u.id,
        // 24 caracteres hexadecimales: suficiente para que no se pueda
        // adivinar el enlace de un compañero, que es lo único que hay que
        // impedir aquí.
        token: randomBytes(12).toString("hex"),
        sentAt: ahora,
      })),
    });
  }

  await prisma.phishingCampaign.update({
    where: { id: campania.id },
    data: {
      status: "ACTIVA",
      launchedAt: campania.status === "ACTIVA" ? undefined : ahora,
    },
  });

  revalidatePath("/dashboard/phishing", "layout");
  revalidatePath("/dashboard/buzon");

  return {
    lanzada: true,
    destinatarios: nuevos.length,
    detalle:
      nuevos.length > 0
        ? `Señuelo repartido a ${nuevos.length} ${nuevos.length === 1 ? "persona" : "personas"}.`
        : "Toda la plantilla tenía ya su enlace; la campaña sigue activa.",
  };
}

/** Cierra la campaña: deja de aceptar reacciones nuevas en el panel. */
export async function finalizarCampania(campaniaId: string): Promise<ResultadoLanzamiento> {
  const usuario = await exigirResponsable();

  const { count } = await prisma.phishingCampaign.updateMany({
    where: { id: campaniaId, companyId: usuario.empresa.id, status: "ACTIVA" },
    data: { status: "FINALIZADA" },
  });

  revalidatePath("/dashboard/phishing", "layout");
  revalidatePath("/dashboard/buzon");

  return {
    lanzada: count > 0,
    destinatarios: 0,
    detalle: count > 0 ? "Campaña cerrada." : "La campaña no estaba activa.",
  };
}

/**
 * El empleado marca su señuelo como sospechoso desde el buzón.
 *
 * Entra por la misma puerta que el webhook (`registrarEvento`) para que un
 * reporte cuente igual venga de donde venga.
 */
export async function reportarSenuelo(token: string): Promise<{ ok: boolean; detalle: string }> {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) return { ok: false, detalle: "No hay ninguna sesión activa." };

  // Se comprueba que el token es SUYO: si no, cualquiera podría reportar por
  // otro y limpiarle el expediente.
  const suyo = await prisma.phishingResult.findFirst({
    where: { token, userId: usuario.id },
    select: { id: true },
  });
  if (!suyo) return { ok: false, detalle: "Ese mensaje no es tuyo." };

  const resultado = await registrarEvento(token, "REPORTE");
  revalidatePath("/dashboard/buzon");
  revalidatePath("/dashboard/phishing", "layout");

  return {
    ok: resultado.estado !== "TOKEN_DESCONOCIDO",
    detalle:
      resultado.estado === "REGISTRADO"
        ? "Reportado. Es exactamente lo que había que hacer."
        : "Ya lo habías reportado.",
  };
}

/**
 * Dispara un evento contra el webhook REAL, firmado, desde el panel del DPO.
 *
 * Existe para poder enseñar el circuito completo en una demo sin depender de
 * una pasarela de correo externa. No es un atajo: la petición sale de aquí,
 * entra por `/api/phishing/webhook` y pasa por la misma comprobación de firma
 * que pasaría la de un tercero. Si la firma no estuviera bien configurada,
 * este botón fallaría igual que fallaría la integración de verdad.
 */
export async function simularEventoDePasarela(
  token: string,
  tipo: "CLIC" | "REPORTE"
): Promise<{ ok: boolean; detalle: string }> {
  await exigirResponsable();

  const cuerpo = JSON.stringify({
    token,
    evento: tipo,
    userAgent: "NexusGuard-Pasarela-Simulada/1.0",
  });

  const respuesta = await fetch(`${baseDeLaAplicacion()}/api/phishing/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-NexusGuard-Firma": firmar(cuerpo),
    },
    body: cuerpo,
  });

  const datos = (await respuesta.json()) as { detalle?: string };
  revalidatePath("/dashboard/phishing", "layout");

  return {
    ok: respuesta.ok,
    detalle: datos.detalle ?? `El webhook respondió ${respuesta.status}.`,
  };
}
