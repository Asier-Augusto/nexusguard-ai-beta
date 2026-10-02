/**
 * Adaptación de una píldora al perfil de una empresa.
 *
 * No incluida en la beta pública: la formación se sirve con su contenido
 * genérico. Disponible en la versión completa de NexusGuard AI.
 */

export interface ResultadoAdaptacion {
  pildoraId: string;
  /** Verdadero solo si se ha guardado contenido nuevo para esta empresa. */
  adaptada: boolean;
  /** Qué ha pasado, en una frase, tanto si ha ido bien como si no. */
  detalle: string;
}

export async function adaptarPildoraDeEmpresa(
  _empresaId: string,
  pildoraId: string
): Promise<ResultadoAdaptacion> {
  return {
    pildoraId,
    adaptada: false,
    detalle: "La adaptación con IA está disponible en la versión completa.",
  };
}
