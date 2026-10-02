/**
 * El buzón del empleado: donde se entregan los señuelos de las campañas.
 *
 * NexusGuard no tiene servidor de correo ni pasarela de SMS, y montarlos para
 * una demo académica no aportaría nada que no se vea aquí. Lo que sí es real
 * es el enlace: cada persona recibe el suyo, con su token, y al pulsarlo entra
 * por `/api/phishing/clic/[token]` y queda registrado como un clic de verdad.
 *
 * Solo se ven los señuelos de campañas ACTIVAS, y solo los propios.
 */
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Buzon } from "@/components/phishing/Buzon";
import { senuelosDeUsuario } from "@/lib/data/phishing";
import { obtenerUsuarioActivo } from "@/lib/session";

export default async function BuzonPage() {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  const senuelos = await senuelosDeUsuario(usuario.id);
  const pendientes = senuelos.filter((s) => !s.yaPico && !s.yaReporto).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Buzón</h1>
        <p className="mt-1 text-lg text-muted">
          {pendientes > 0
            ? `Tienes ${pendientes} ${pendientes === 1 ? "mensaje" : "mensajes"} sin revisar. Alguno puede no ser lo que parece.`
            : "Aquí llegan los mensajes de las campañas de tu empresa."}
        </p>
      </div>

      <Buzon senuelos={senuelos} />

      <p className="flex items-start gap-2 text-xs text-muted">
        <Icon name="Info" size={14} className="mt-0.5 shrink-0" />
        Los mensajes de este buzón forman parte de las campañas de concienciación de tu
        empresa. Trátalos como tratarías un correo cualquiera: eso es justo lo que se
        está midiendo.
      </p>
    </div>
  );
}
