"use server";

/**
 * Adaptación del contenido de formación a la empresa que lo va a recibir.
 *
 * Se dispara a mano desde el panel de Formación, píldora a píldora, y no al
 * abrir una píldora: generar un banco de mensajes entero con el modelo local
 * lleva del orden de un minuto, y nadie debería mirar un spinner tanto rato
 * para leer una píldora que ya existe. Al pulsar el botón, en cambio, se ve el
 * progreso y el contenido queda cacheado para toda la plantilla.
 *
 * Esta capa solo resuelve QUIÉN puede lanzarlo. El cómo está en
 * `lib/adaptacion/generar.ts`, que también usa la herramienta de demostración.
 */
import { revalidatePath } from "next/cache";
import { adaptarPildoraDeEmpresa } from "@/lib/adaptacion/generar";
import type { ResultadoAdaptacion } from "@/lib/adaptacion/generar";
import { obtenerUsuarioActivo } from "@/lib/session";

/** Adapta UNA píldora al perfil de la empresa del usuario activo. */
export async function adaptarPildora(pildoraId: string): Promise<ResultadoAdaptacion> {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) {
    return { pildoraId, adaptada: false, detalle: "No hay ninguna sesión activa." };
  }

  // La adaptación cambia lo que ve toda la plantilla: es una decisión del
  // responsable, no de cada empleado.
  if (usuario.rol !== "DPO" && usuario.rol !== "ADMIN") {
    return {
      pildoraId,
      adaptada: false,
      detalle: "Solo el DPO o un administrador pueden adaptar la formación.",
    };
  }

  const resultado = await adaptarPildoraDeEmpresa(usuario.empresa.id, pildoraId);
  if (resultado.adaptada) {
    revalidatePath("/dashboard/formacion", "layout");
  }
  return resultado;
}
