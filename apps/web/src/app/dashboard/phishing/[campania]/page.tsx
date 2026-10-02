/**
 * Resultados de una campaña: quién picó, quién avisó y quién no reaccionó.
 *
 * Es la pantalla que cierra el ciclo de la Fase 5: la campaña se escribe con
 * IA, se lanza, los clics entran por el webhook y acaban aquí, empleado a
 * empleado.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ResultadoCampania } from "@/components/phishing/ResultadoCampania";
import { detalleCampania } from "@/lib/data/phishing";
import { cuerpoParaPanel, etiquetaCanal, nombreTecnicoCanal } from "@/lib/phishing/senuelo";
import { obtenerUsuarioActivo } from "@/lib/session";

const ESTADO_META: Record<string, { etiqueta: string; variante: "good" | "accent" | "neutral" }> = {
  BORRADOR: { etiqueta: "Borrador", variante: "neutral" },
  PROGRAMADA: { etiqueta: "Programada", variante: "neutral" },
  ACTIVA: { etiqueta: "Activa", variante: "accent" },
  FINALIZADA: { etiqueta: "Finalizada", variante: "good" },
};

export default async function CampaniaPage({
  params,
}: {
  params: Promise<{ campania: string }>;
}) {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  const { campania: campaniaId } = await params;
  const detalle = await detalleCampania(usuario.empresa.id, campaniaId);
  if (!detalle) notFound();

  const estado = ESTADO_META[detalle.estado] ?? {
    etiqueta: detalle.estado,
    variante: "neutral" as const,
  };
  const puedeGestionar = usuario.rol === "DPO" || usuario.rol === "ADMIN";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div>
        <Link
          href="/dashboard/phishing"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
        >
          <Icon name="ChevronLeft" size={16} />
          Campañas
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">{detalle.nombre}</h1>
          <Badge variant={estado.variante}>{estado.etiqueta}</Badge>
          <Badge variant="neutral">
            {nombreTecnicoCanal(detalle.canal)} · {etiquetaCanal(detalle.canal)}
          </Badge>
          {detalle.origen === "ollama" ? (
            <Badge variant="accent">
              <Icon name="Sparkles" size={12} />
              Escrita por {detalle.modelo ?? "el modelo"}
            </Badge>
          ) : (
            <Badge variant="neutral">Plantilla de respaldo</Badge>
          )}
        </div>
        <p className="mt-1 text-muted">
          Pretexto del área de {detalle.departamento} · dificultad{" "}
          {detalle.dificultad.toLowerCase()}
        </p>
      </div>

      <ResultadoCampania detalle={detalle} puedeGestionar={puedeGestionar} />

      {/* --- El señuelo --- */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-foreground">El señuelo</h2>
        <Card className="p-0">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm text-muted">
              De:{" "}
              <span className="text-foreground">{detalle.remitenteNombre ?? "—"}</span>
              {detalle.remitenteEmail && ` <${detalle.remitenteEmail}>`}
            </p>
            <p className="mt-1 font-bold text-foreground">{detalle.asunto}</p>
          </div>
          <p className="whitespace-pre-line px-5 py-4 text-muted">
            {cuerpoParaPanel(detalle.cuerpo)}
          </p>
        </Card>
        <p className="mt-2 text-xs text-muted">
          El hueco del enlace se sustituye por el enlace instrumentado de cada persona
          al entregar el mensaje; por eso aquí no aparece ninguna dirección.
        </p>
      </section>

      {detalle.senales.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">
            Señales de alerta que se le explican a quien pica
          </h2>
          <ul className="space-y-2">
            {detalle.senales.map((senal, i) => (
              <li key={i} className="flex items-start gap-2 text-muted">
                <Icon
                  name="AlertTriangle"
                  size={18}
                  className="mt-0.5 shrink-0 text-status-warning"
                />
                {senal}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex items-start gap-2 text-xs text-muted">
        <Icon name="ShieldAlert" size={14} className="mt-0.5 shrink-0" />
        Todo el contenido de esta campaña es material de simulación para concienciación
        interna autorizada.
      </p>
    </div>
  );
}
