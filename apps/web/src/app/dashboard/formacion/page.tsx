import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FadeUp } from "@/components/ui/FadeUp";
import { BotonAdaptar } from "@/components/training/BotonAdaptar";
import { listarPildoras, type PildoraConProgreso } from "@/lib/data/formacion";
import { etiquetasSistemasOperativos, obtenerPerfil } from "@/lib/data/perfil";
import { obtenerUsuarioActivo } from "@/lib/session";

const ESTADO_META: Record<
  PildoraConProgreso["estado"],
  { etiqueta: string; variante: "good" | "accent" | "neutral"; icono: string }
> = {
  COMPLETADA: { etiqueta: "Completada", variante: "good", icono: "CircleCheck" },
  EN_CURSO: { etiqueta: "En curso", variante: "accent", icono: "CirclePlay" },
  PENDIENTE: { etiqueta: "Pendiente", variante: "neutral", icono: "Circle" },
};

export default async function FormacionPage() {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  const [pildoras, perfil] = await Promise.all([
    listarPildoras(usuario.id, usuario.empresa.id),
    obtenerPerfil(usuario.empresa.id),
  ]);
  const completadas = pildoras.filter((p) => p.estado === "COMPLETADA").length;
  const sistemas = perfil ? etiquetasSistemasOperativos(perfil) : [];
  const especificas = pildoras.filter((p) => p.especificaDelSistema).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Formación Inmersiva</h1>
        <p className="mt-1 text-lg text-muted">
          Píldoras interactivas de 3, 5 y 10 minutos. Toca una tarjeta y descubre cada
          detalle.
        </p>
        <p className="mt-3 text-sm font-medium text-accent">
          Has completado {completadas} de {pildoras.length} píldoras.
        </p>

        {sistemas.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <Icon name="MonitorCog" size={15} className="shrink-0" />
            Itinerario adaptado a los sistemas de tu empresa
            {sistemas.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-xs text-foreground"
              >
                {s}
              </span>
            ))}
            <span className="text-xs">
              · {especificas} {especificas === 1 ? "píldora específica" : "píldoras específicas"} de
              sistema operativo, el resto son transversales
            </span>
          </p>
        )}
      </div>

      {perfil && (
        <BotonAdaptar
          pildoras={pildoras.map((p) => ({
            id: p.id,
            titulo: p.titulo,
            estado: p.adaptacion,
          }))}
          puedeAdaptar={usuario.rol === "DPO" || usuario.rol === "ADMIN"}
        />
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pildoras.map((pildora, i) => {
          const meta = ESTADO_META[pildora.estado];

          return (
            <FadeUp key={pildora.id} delay={i * 0.05}>
              <Link href={`/dashboard/formacion/${pildora.tema.toLowerCase()}`}>
                <Card className="h-full transition-all hover:border-accent/50 hover:bg-surface-hover">
                  <div className="mb-1 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon name={pildora.icono} size={26} />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={meta.variante}>
                        <Icon name={meta.icono} size={12} /> {meta.etiqueta}
                      </Badge>
                      <Badge variant="neutral" className="text-xs">
                        {pildora.categoria}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-foreground">{pildora.titulo}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{pildora.resumen}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="neutral">
                      <Icon name="Clock" size={12} /> {pildora.duracionMinutos} min
                    </Badge>
                    {pildora.adaptacion === "AL_DIA" && (
                      <Badge variant="accent">
                        <Icon name="Sparkles" size={12} /> Adaptada
                      </Badge>
                    )}
                    {pildora.puntuacion !== null && (
                      <Badge variant="neutral">
                        <Icon name="Trophy" size={12} /> {pildora.puntuacion}/100
                      </Badge>
                    )}
                  </div>

                  <p className="mt-4 text-sm font-semibold">
                    <span className="inline-flex items-center gap-1 text-accent">
                      {pildora.estado === "COMPLETADA" ? "Repasar" : "Empezar"}
                      <Icon name="ArrowRight" size={16} />
                    </span>
                  </p>
                </Card>
              </Link>
            </FadeUp>
          );
        })}
      </div>
    </div>
  );
}
