"use server";

import { revalidatePath } from "next/cache";
import { obtenerUsuarioActivo } from "@/lib/session";
import { registrarIntento } from "@/lib/data/evaluacion";
import { fetchNextCatQuestion } from "@/lib/ai-client";
import { encuadreDeEmpresa } from "@/lib/data/adaptacion";
import { poolDeEmpresa } from "@/lib/data/pool-evaluacion";
import { generarPoolDeEmpresa } from "@/lib/adaptacion/generar-pool";
import type {
  CatHistoryItem,
  CatNextOptions,
  CatNextResponse,
  MotorCat,
  ModoEvaluacion,
} from "@/lib/ai-client";
import type { ResultadoPool } from "@/lib/adaptacion/generar-pool";
import type { PasoDificultad, RespuestaIntento } from "@/lib/data/evaluacion";

export type { PasoDificultad, RespuestaIntento };

const MOTOR_A_ENUM: Record<MotorCat, "RED_IRT" | "IRT" | "HEURISTICA"> = {
  "red+irt": "RED_IRT",
  irt: "IRT",
  heuristica: "HEURISTICA",
};

/**
 * Guarda un intento de evaluación adaptativa terminado.
 *
 * La acción se limita a resolver quién es el usuario y traducir el nombre del
 * motor; la escritura vive en `lib/data/evaluacion.ts` para que se pueda
 * ejercitar desde un script sin montar el contexto de petición.
 */
export async function guardarIntento(datos: {
  tema: string;
  temas: string[];
  modo: ModoEvaluacion;
  motor: MotorCat;
  recorrido: PasoDificultad[];
  respuestas: RespuestaIntento[];
  nivelFinal: number;
  puntuacion: number;
  habilidad: number;
  errorEstandar: number;
}): Promise<void> {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) {
    throw new Error("No hay usuario activo con el que registrar la evaluación.");
  }

  await registrarIntento(usuario.id, {
    ...datos,
    motor: MOTOR_A_ENUM[datos.motor],
  });

  revalidatePath("/dashboard", "layout");
}


/**
 * La siguiente pregunta de la evaluación, con el pool de la empresa metido.
 *
 * El cliente llamaba antes al servicio de inferencia directamente desde el
 * navegador. Ahora pasa por aquí porque el pool lleva las respuestas correctas
 * de TODAS sus preguntas, y eso no puede bajar al navegador: hoy solo se expone
 * la de la pregunta en curso, y así se queda. El servicio sigue sin estado; el
 * pool viaja en la petición como el historial.
 *
 * Si la empresa no tiene pool, o su perfil ha cambiado desde que se generó, se
 * manda vacío y el motor evalúa con el banco genérico de siempre.
 */
export async function siguientePregunta(
  topic: string,
  history: CatHistoryItem[],
  opciones: CatNextOptions
): Promise<CatNextResponse> {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) {
    return fetchNextCatQuestion(topic, history, opciones);
  }

  const encuadre = await encuadreDeEmpresa(usuario.empresa.id);
  const pool = await poolDeEmpresa(usuario.empresa.id, encuadre?.huella ?? null);

  return fetchNextCatQuestion(topic, history, opciones, pool);
}

/**
 * Escribe el pool de preguntas de UN tema para la empresa del usuario activo.
 *
 * Reservada al DPO y al administrador, como la adaptación de la formación:
 * cambia el examen de toda la plantilla.
 */
export async function generarPoolDeTema(tema: string): Promise<ResultadoPool> {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) {
    return { tema, generado: false, preguntas: 0, detalle: "No hay ninguna sesión activa." };
  }

  if (usuario.rol !== "DPO" && usuario.rol !== "ADMIN") {
    return {
      tema,
      generado: false,
      preguntas: 0,
      detalle: "Solo el DPO o un administrador pueden generar el pool de preguntas.",
    };
  }

  const resultado = await generarPoolDeEmpresa(usuario.empresa.id, tema);
  if (resultado.generado) {
    revalidatePath("/dashboard/evaluacion");
  }
  return resultado;
}
