import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE_ONBOARDING } from "@/lib/session";

/**
 * Punto de entrada. La decisión se toma en servidor a partir de la cookie de
 * onboarding, así que el usuario aterriza directamente donde le toca.
 *
 * Antes esto era un componente de cliente que leía `localStorage` dentro de un
 * efecto, lo que provocaba que alguien con el alta ya hecha pasara por un
 * fugaz "Cargando…" y, en el primer render, por una redirección a /onboarding
 * antes de que el estado se rehidratara.
 */
export default async function RootPage() {
  const almacen = await cookies();
  const completado = almacen.get(COOKIE_ONBOARDING)?.value === "1";

  redirect(completado ? "/dashboard" : "/onboarding");
}
