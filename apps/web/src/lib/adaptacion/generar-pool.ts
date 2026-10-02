/**
 * Pool de preguntas adaptado a una empresa.
 *
 * No incluido en la beta pública: la evaluación usa el banco genérico.
 * Disponible en la versión completa de NexusGuard AI.
 */

export interface ResultadoPool {
  tema: string;
  /** Verdadero solo si se han guardado preguntas nuevas para esta empresa. */
  generado: boolean;
  /** Cuántas preguntas propias tiene ahora ese tema. */
  preguntas: number;
  detalle: string;
}

export async function generarPoolDeEmpresa(
  _empresaId: string,
  tema: string
): Promise<ResultadoPool> {
  return {
    tema,
    generado: false,
    preguntas: 0,
    detalle: "El pool de preguntas adaptado está disponible en la versión completa.",
  };
}
