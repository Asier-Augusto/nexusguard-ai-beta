/**
 * Redacción del informe de cumplimiento.
 *
 * No incluida en la beta pública. Disponible en la versión completa de
 * NexusGuard AI.
 */

export interface ResultadoRedaccion {
  redactado: boolean;
  /** "ollama" si lo escribió el modelo, "fallback" si salió de plantilla. */
  origen: "ollama" | "fallback" | null;
  detalle: string;
}

export async function redactarInformeDeEmpresa(
  _empresaId: string
): Promise<ResultadoRedaccion> {
  return {
    redactado: false,
    origen: null,
    detalle: "La redacción del informe está disponible en la versión completa.",
  };
}
