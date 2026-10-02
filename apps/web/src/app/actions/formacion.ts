"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioActivo } from "@/lib/session";

/**
 * Registra que el usuario activo ha terminado una píldora.
 *
 * Es un `upsert` sobre la clave única (usuario, píldora): repetir una píldora
 * actualiza la nota en vez de crear una fila nueva. Antes esto era un contador
 * en `localStorage` que se incrementaba a ciegas, sin saber qué píldora se
 * había completado y sumando otra vez si se repetía.
 *
 * Recibe la puntuación ya calculada (0-100) en vez de aciertos sobre total,
 * porque los juegos no puntúan por preguntas acertadas sino por retos
 * ponderados. Cada formato decide cómo llega a su nota.
 *
 * Nota importante para el juego de contraseñas: aquí NUNCA llega la contraseña
 * que el usuario ha tecleado. Esta acción solo acepta un número.
 */
export async function completarPildora(
  pildoraId: string,
  puntuacion: number
): Promise<void> {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) {
    throw new Error("No hay usuario activo con el que registrar el progreso.");
  }

  // Se acota por si un cliente manipulado enviara un valor fuera de rango.
  const nota = Math.max(0, Math.min(100, Math.round(puntuacion)));

  await prisma.trainingProgress.upsert({
    where: { userId_pillId: { userId: usuario.id, pillId: pildoraId } },
    update: { completedAt: new Date(), score: nota },
    create: {
      userId: usuario.id,
      pillId: pildoraId,
      completedAt: new Date(),
      score: nota,
    },
  });

  // Completar la primera píldora desbloquea la Evaluación Adaptativa en el
  // menú, que se pinta desde el layout.
  revalidatePath("/dashboard", "layout");
}
