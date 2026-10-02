/**
 * El señuelo de una campaña: canales, enlace instrumentado y sugerencia.
 *
 * Módulo puro (sin Prisma ni React) porque lo necesitan las dos orillas: el
 * formulario del DPO en el navegador y las acciones de servidor que componen
 * lo que ve el empleado en el buzón.
 */
import type { PerfilEmpresa } from "@/lib/data/perfil";

export type CanalKey = "EMAIL" | "SMS" | "LLAMADA";

export const CANALES: {
  key: CanalKey;
  label: string;
  /** El nombre del oficio, que es el que usa la empresa cliente. */
  tecnico: string;
  descripcion: string;
  icon: string;
}[] = [
  {
    key: "EMAIL",
    label: "Correo",
    tecnico: "Phishing",
    descripcion: "Un correo que suplanta a una herramienta o a un compañero.",
    icon: "Mail",
  },
  {
    key: "SMS",
    label: "SMS",
    tecnico: "Smishing",
    descripcion: "Un mensaje corto al móvil, con remitente alfanumérico.",
    icon: "MessageSquare",
  },
  {
    key: "LLAMADA",
    label: "Llamada",
    tecnico: "Vishing",
    descripcion: "El guion de una llamada que acaba pidiendo entrar en un enlace.",
    icon: "PhoneCall",
  },
];

export function etiquetaCanal(canal: string): string {
  return CANALES.find((c) => c.key === canal)?.label ?? canal;
}

export function nombreTecnicoCanal(canal: string): string {
  return CANALES.find((c) => c.key === canal)?.tecnico ?? canal;
}

/**
 * Donde el servicio de inferencia deja el hueco del enlace.
 *
 * Tiene que coincidir con `MARCADOR_ENLACE` de
 * `apps/api/app/services/phishing_logic.py`. Es el único punto de contacto
 * entre los dos lados y por eso está escrito en los dos sitios con el mismo
 * nombre: el señuelo se guarda con el marcador puesto, y cada empleado recibe
 * el suyo resuelto con su token.
 */
export const MARCADOR_ENLACE = "{{ENLACE}}";

/** La dirección pública de la aplicación, que es la que ve el empleado. */
export function baseDeLaAplicacion(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** El enlace instrumentado de un empleado concreto en una campaña concreta. */
export function enlaceInstrumentado(token: string, base = baseDeLaAplicacion()): string {
  return `${base}/api/phishing/clic/${token}`;
}

/**
 * El cuerpo del señuelo tal y como lo ve un empleado.
 *
 * Si el señuelo no trae marcador —una campaña sembrada antes de esta fase, o
 * una plantilla antigua— el enlace se añade al final en vez de dejar el
 * mensaje sin nada que pulsar: una campaña sin clic no mide nada.
 */
export function cuerpoParaEmpleado(cuerpo: string, enlace: string): string {
  if (cuerpo.includes(MARCADOR_ENLACE)) {
    return cuerpo.split(MARCADOR_ENLACE).join(enlace);
  }
  return `${cuerpo.trimEnd()}\n\n${enlace}`;
}

/** El cuerpo con el marcador visible, para la previsualización del DPO. */
export function cuerpoParaPanel(cuerpo: string): string {
  return cuerpo.split(MARCADOR_ENLACE).join("[enlace instrumentado]");
}

export interface SugerenciaCanal {
  canal: CanalKey;
  motivo: string;
}

/**
 * Qué canal tiene más sentido probar en esta empresa, y por qué.
 *
 * Es una sugerencia, no una imposición: la decide el DPO. Pero decirle "SMS,
 * porque tu plantilla trabaja con móviles Android" convierte el perfil que
 * rellenó en el onboarding en un consejo concreto, que es de lo que va toda
 * la capa de adaptación.
 */
export function canalSugerido(perfil: PerfilEmpresa | null): SugerenciaCanal {
  if (!perfil) {
    return {
      canal: "EMAIL",
      motivo: "Sin perfil de empresa, el correo es el canal más habitual.",
    };
  }

  const moviles = perfil.sistemasOperativos.filter(
    (s) => s === "ANDROID" || s === "IOS"
  );
  const soloMoviles = moviles.length > 0 && moviles.length === perfil.sistemasOperativos.length;

  if (soloMoviles) {
    return {
      canal: "SMS",
      motivo: "Tu plantilla trabaja solo con móviles: el SMS es por donde le llegaría.",
    };
  }

  // Quien atiende al público recibe llamadas de desconocidos todo el día: es
  // justo el contexto en el que el vishing funciona.
  if (perfil.procesos.includes("ATENCION_CLIENTE")) {
    return {
      canal: "LLAMADA",
      motivo:
        "Atención al cliente recibe llamadas de desconocidos a diario, que es donde el vishing funciona.",
    };
  }

  if (moviles.length > 0) {
    return {
      canal: "SMS",
      motivo: "Declaras equipos móviles, así que el SMS es una vía real de entrada.",
    };
  }

  return {
    canal: "EMAIL",
    motivo: "Tus procesos se mueven por correo, que sigue siendo la vía más usada.",
  };
}
