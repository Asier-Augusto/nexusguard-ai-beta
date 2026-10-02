/**
 * Consultas del Simulador de Phishing. Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";
import { DEPARTAMENTOS, type DepartamentoKey } from "@/lib/constants";
import { cuerpoParaEmpleado, enlaceInstrumentado, type CanalKey } from "@/lib/phishing/senuelo";

export interface CampaniaResumen {
  id: string;
  nombre: string;
  departamento: string;
  canal: CanalKey;
  estado: string;
  asunto: string;
  creadaEn: Date;
  lanzadaEn: Date | null;
  /** Empleados a los que se envió el señuelo. */
  enviados: number;
  clics: number;
  reportes: number;
}

/**
 * Campañas de la empresa con el recuento de resultados de cada una.
 *
 * Hasta ahora `PhishingCampaign` y `PhishingResult` existían en el esquema y
 * estaban sembrados, pero no tenían ninguna pantalla que los mostrara.
 */
export async function listarCampanias(empresaId: string): Promise<CampaniaResumen[]> {
  const campanias = await prisma.phishingCampaign.findMany({
    where: { companyId: empresaId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      department: true,
      canal: true,
      status: true,
      emailSubject: true,
      createdAt: true,
      launchedAt: true,
      results: { select: { clicked: true, reported: true } },
    },
  });

  return campanias.map((campania) => ({
    id: campania.id,
    nombre: campania.name,
    departamento: campania.department as string,
    canal: campania.canal as CanalKey,
    estado: campania.status as string,
    asunto: campania.emailSubject,
    creadaEn: campania.createdAt,
    lanzadaEn: campania.launchedAt,
    enviados: campania.results.length,
    clics: campania.results.filter((r) => r.clicked).length,
    reportes: campania.results.filter((r) => r.reported).length,
  }));
}

/** Cómo reaccionó una persona: solo hay estas tres posibilidades. */
export type ReaccionEmpleado = "CLIC" | "REPORTE" | "SIN_REACCION";

export interface ResultadoEmpleado {
  usuarioId: string;
  nombre: string;
  departamento: string;
  departamentoClave: DepartamentoKey;
  reaccion: ReaccionEmpleado;
  cuando: Date | null;
  /** Solo para el DPO: permite disparar el evento de prueba de esa persona. */
  token: string | null;
}

export interface DetalleCampania {
  id: string;
  nombre: string;
  departamento: string;
  canal: CanalKey;
  dificultad: string;
  estado: string;
  asunto: string;
  /** Con el marcador sustituido por un texto legible, no por un enlace real. */
  cuerpo: string;
  remitenteNombre: string | null;
  remitenteEmail: string | null;
  senales: string[];
  origen: string | null;
  modelo: string | null;
  creadaEn: Date;
  lanzadaEn: Date | null;
  resultados: ResultadoEmpleado[];
}

function reaccionDe(fila: { clicked: boolean; reported: boolean }): ReaccionEmpleado {
  if (fila.clicked) return "CLIC";
  if (fila.reported) return "REPORTE";
  return "SIN_REACCION";
}

function etiquetaDepartamento(clave: string): string {
  return DEPARTAMENTOS.find((d) => d.key === clave)?.label ?? clave;
}

/**
 * Una campaña con el detalle de quién hizo qué.
 *
 * Se filtra también por empresa y no solo por id: con la sesión de demo, un
 * id de campaña ajeno no puede acabar enseñando la plantilla de otra empresa.
 */
export async function detalleCampania(
  empresaId: string,
  campaniaId: string
): Promise<DetalleCampania | null> {
  const campania = await prisma.phishingCampaign.findFirst({
    where: { id: campaniaId, companyId: empresaId },
    select: {
      id: true,
      name: true,
      department: true,
      canal: true,
      dificultad: true,
      status: true,
      emailSubject: true,
      emailBody: true,
      senderName: true,
      senderEmail: true,
      redFlags: true,
      origen: true,
      modelo: true,
      createdAt: true,
      launchedAt: true,
      results: {
        orderBy: { user: { name: "asc" } },
        select: {
          userId: true,
          token: true,
          clicked: true,
          reported: true,
          clickedAt: true,
          reportedAt: true,
          respondedAt: true,
          user: { select: { name: true, department: true } },
        },
      },
    },
  });

  if (!campania) return null;

  return {
    id: campania.id,
    nombre: campania.name,
    departamento: etiquetaDepartamento(campania.department as string),
    canal: campania.canal as CanalKey,
    dificultad: campania.dificultad as string,
    estado: campania.status as string,
    asunto: campania.emailSubject,
    cuerpo: campania.emailBody,
    remitenteNombre: campania.senderName,
    remitenteEmail: campania.senderEmail,
    senales: campania.redFlags,
    origen: campania.origen,
    modelo: campania.modelo,
    creadaEn: campania.createdAt,
    lanzadaEn: campania.launchedAt,
    resultados: campania.results.map((r) => ({
      usuarioId: r.userId,
      nombre: r.user.name,
      departamento: etiquetaDepartamento(r.user.department as string),
      departamentoClave: r.user.department as DepartamentoKey,
      reaccion: reaccionDe(r),
      cuando: r.clickedAt ?? r.reportedAt ?? r.respondedAt,
      token: r.token,
    })),
  };
}

export interface SenueloRecibido {
  token: string;
  campaniaId: string;
  canal: CanalKey;
  asunto: string;
  /** Ya con el enlace instrumentado de esta persona dentro. */
  cuerpo: string;
  enlace: string;
  remitenteNombre: string | null;
  remitenteEmail: string | null;
  recibidoEn: Date | null;
  yaPico: boolean;
  yaReporto: boolean;
}

/**
 * Los señuelos que le han llegado a una persona, con SU enlace ya resuelto.
 *
 * Esta es la "bandeja de entrada" de la simulación. No hay servidor de correo:
 * el señuelo se entrega dentro de la propia plataforma, y el enlace que lleva
 * es el instrumentado, así que el clic que se registra es un clic de verdad.
 *
 * Solo se entregan los de campañas ACTIVAS: un borrador todavía no se ha
 * mandado y una campaña cerrada ya no admite reacciones.
 */
export async function senuelosDeUsuario(usuarioId: string): Promise<SenueloRecibido[]> {
  const filas = await prisma.phishingResult.findMany({
    where: {
      userId: usuarioId,
      token: { not: null },
      campaign: { status: "ACTIVA" },
    },
    orderBy: { sentAt: "desc" },
    select: {
      token: true,
      sentAt: true,
      clicked: true,
      reported: true,
      campaign: {
        select: {
          id: true,
          canal: true,
          emailSubject: true,
          emailBody: true,
          senderName: true,
          senderEmail: true,
        },
      },
    },
  });

  return filas.map((fila) => {
    const enlace = enlaceInstrumentado(fila.token!);
    return {
      token: fila.token!,
      campaniaId: fila.campaign.id,
      canal: fila.campaign.canal as CanalKey,
      asunto: fila.campaign.emailSubject,
      cuerpo: cuerpoParaEmpleado(fila.campaign.emailBody, enlace),
      enlace,
      remitenteNombre: fila.campaign.senderName,
      remitenteEmail: fila.campaign.senderEmail,
      recibidoEn: fila.sentAt,
      yaPico: fila.clicked,
      yaReporto: fila.reported,
    };
  });
}

/** Cuántos señuelos sin reaccionar tiene una persona (para el aviso del menú). */
export async function senuelosPendientes(usuarioId: string): Promise<number> {
  return prisma.phishingResult.count({
    where: {
      userId: usuarioId,
      token: { not: null },
      campaign: { status: "ACTIVA" },
      clicked: false,
      reported: false,
    },
  });
}

/** Simulaciones recibidas por la plantilla en los últimos N días. */
export async function contarSimulacionesRecientes(
  empresaId: string,
  dias = 30
): Promise<number> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  return prisma.phishingResult.count({
    where: {
      campaign: { companyId: empresaId },
      respondedAt: { gte: desde },
    },
  });
}
