import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { senuelosPendientes } from "@/lib/data/phishing";
import { modulosDesbloqueados } from "@/lib/permisos";
import { listarUsuariosSeleccionables, obtenerSesion } from "@/lib/session";

/**
 * El control de acceso al dashboard vive ahora en el servidor. Antes lo hacía
 * `AppShell` tras hidratar `localStorage`, lo que obligaba a devolver una
 * pantalla de "Cargando…" en el HTML inicial y dejaba todas las páginas sin
 * renderizado en servidor.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, pildorasCompletadas, onboardingCompleto } = await obtenerSesion();

  if (!onboardingCompleto || !usuario) {
    redirect("/onboarding");
  }

  const desbloqueados = modulosDesbloqueados({
    rol: usuario.rol,
    pildorasCompletadas,
  });

  return (
    <AppShell
      usuario={usuario}
      usuarios={await listarUsuariosSeleccionables()}
      modulosDesbloqueados={desbloqueados}
      senuelosPendientes={await senuelosPendientes(usuario.id)}
    >
      {children}
    </AppShell>
  );
}
