"use server";

/**
 * Redacción del informe de cumplimiento, disparada desde el panel del DPO.
 *
 * Se hace a mano y no al abrir la pantalla por lo mismo que la adaptación de
 * la formación: con el modelo grande son minuto y pico, y nadie debería mirar
 * un spinner tanto rato para ver unas cifras que ya están calculadas. Las
 * cifras se pintan siempre; el texto es lo que se pide con el botón.
 *
 * Esta capa solo resuelve QUIÉN puede lanzarlo. El cómo está en
 * `lib/cumplimiento/redactar.ts`.
 */
import { revalidatePath } from "next/cache";
import { redactarInformeDeEmpresa } from "@/lib/cumplimiento/redactar";
import type { ResultadoRedaccion } from "@/lib/cumplimiento/redactar";
import { obtenerUsuarioActivo } from "@/lib/session";

export async function redactarInforme(): Promise<ResultadoRedaccion> {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) {
    return { redactado: false, origen: null, detalle: "No hay ninguna sesión activa." };
  }

  // El informe es el documento que la empresa enseña fuera: lo pide el
  // responsable, no cada empleado.
  if (usuario.rol !== "DPO" && usuario.rol !== "ADMIN") {
    return {
      redactado: false,
      origen: null,
      detalle: "Solo el DPO o un administrador pueden redactar el informe.",
    };
  }

  const resultado = await redactarInformeDeEmpresa(usuario.empresa.id);
  if (resultado.redactado) {
    revalidatePath("/dashboard/command-center", "layout");
  }
  return resultado;
}
