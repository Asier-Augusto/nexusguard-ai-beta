import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { GeneradorCampania } from "@/components/phishing/GeneradorCampania";
import { listarCampanias } from "@/lib/data/phishing";
import { obtenerPerfil } from "@/lib/data/perfil";
import { canalSugerido, etiquetaCanal } from "@/lib/phishing/senuelo";
import { obtenerUsuarioActivo } from "@/lib/session";
import { DEPARTAMENTOS } from "@/lib/constants";

const ESTADO_META: Record<string, { etiqueta: string; variante: "good" | "accent" | "neutral" }> = {
  BORRADOR: { etiqueta: "Borrador", variante: "neutral" },
  PROGRAMADA: { etiqueta: "Programada", variante: "neutral" },
  ACTIVA: { etiqueta: "Activa", variante: "accent" },
  FINALIZADA: { etiqueta: "Finalizada", variante: "good" },
};

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function PhishingSimulatorPage() {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  const [campanias, perfil] = await Promise.all([
    listarCampanias(usuario.empresa.id),
    obtenerPerfil(usuario.empresa.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Simulador de Phishing</h1>
        <p className="mt-1 text-lg text-muted">
          Diseña una campaña interna y deja que la IA redacte el señuelo con las
          herramientas y los procesos que declaró tu empresa.
        </p>
      </div>

      <GeneradorCampania
        departamentoInicial={usuario.departamento}
        sugerencia={canalSugerido(perfil)}
      />

      <div>
        <h2 className="mb-1 text-xl font-bold text-foreground">Campañas de la empresa</h2>
        <p className="mb-4 text-sm text-muted">
          Al lanzar una campaña, cada empleado recibe su propio enlace instrumentado en
          el buzón de la plataforma. Los clics y los reportes entran por el webhook y se
          ven aquí.
        </p>

        {campanias.length === 0 ? (
          <Card className="text-center text-muted">
            Todavía no hay campañas. Genera la primera con el formulario de arriba.
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-border text-sm text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Campaña</th>
                  <th className="px-5 py-3 font-medium">Canal</th>
                  <th className="px-5 py-3 font-medium">Departamento</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 text-right font-medium">Enviados</th>
                  <th className="px-5 py-3 text-right font-medium">Clics</th>
                  <th className="px-5 py-3 text-right font-medium">Reportados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campanias.map((campania) => {
                  const meta = ESTADO_META[campania.estado] ?? {
                    etiqueta: campania.estado,
                    variante: "neutral" as const,
                  };
                  const departamento =
                    DEPARTAMENTOS.find((d) => d.key === campania.departamento)?.label ??
                    campania.departamento;

                  return (
                    <tr key={campania.id} className="hover:bg-surface-hover">
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/phishing/${campania.id}`}
                          className="font-medium text-foreground hover:text-accent"
                        >
                          {campania.nombre}
                        </Link>
                        <p className="truncate text-sm text-muted">{campania.asunto}</p>
                        <p className="text-xs text-muted">
                          {FORMATO_FECHA.format(campania.creadaEn)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {etiquetaCanal(campania.canal)}
                      </td>
                      <td className="px-5 py-4 text-muted">{departamento}</td>
                      <td className="px-5 py-4">
                        <Badge variant={meta.variante}>{meta.etiqueta}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right text-foreground">
                        {campania.enviados}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={
                            campania.clics > 0 ? "text-status-serious" : "text-foreground"
                          }
                        >
                          {campania.clics}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={
                            campania.reportes > 0 ? "text-status-good" : "text-foreground"
                          }
                        >
                          {campania.reportes}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        <p className="mt-4 flex items-start gap-2 text-xs text-muted">
          <Icon name="ShieldAlert" size={14} className="mt-0.5 shrink-0" />
          Todo el contenido de estas campañas es material de simulación para
          concienciación interna autorizada.
        </p>
      </div>
    </div>
  );
}
