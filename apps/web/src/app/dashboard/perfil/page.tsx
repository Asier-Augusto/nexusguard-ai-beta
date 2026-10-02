import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FadeUp } from "@/components/ui/FadeUp";
import { obtenerPerfil } from "@/lib/data/perfil";
import { obtenerUsuarioActivo } from "@/lib/session";
import {
  HERRAMIENTAS,
  NORMATIVAS,
  PROCESOS,
  SECTORES,
  SISTEMAS_OPERATIVOS,
} from "@/lib/constants";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function PerfilPage() {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  const perfil = await obtenerPerfil(usuario.empresa.id);
  const sector =
    SECTORES.find((s) => s.key === usuario.empresa.sector)?.label ?? usuario.empresa.sector;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perfil de la empresa</h1>
          <p className="mt-1 text-lg text-muted">
            {usuario.empresa.nombre} · {sector}
          </p>
          {perfil && (
            <p className="mt-1 text-sm text-muted">
              Declarado el {FORMATO_FECHA.format(perfil.actualizadoEn)}
            </p>
          )}
        </div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          <Icon name="PencilLine" size={18} />
          Rehacer el cuestionario
        </Link>
      </div>

      {!perfil ? (
        <Card className="text-center">
          <Icon name="ClipboardList" size={40} className="mx-auto mb-3 text-muted" />
          <h2 className="text-lg font-bold text-foreground">Todavía no hay perfil</h2>
          <p className="mt-2 text-muted">
            Completa el cuestionario para que la plataforma adapte las simulaciones y el
            informe de cumplimiento a tu organización.
          </p>
        </Card>
      ) : (
        <>
          <FadeUp className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <BloquePerfil
              titulo="Sistemas operativos"
              descripcion="Los puestos y dispositivos que hay que proteger."
              icono="MonitorCog"
              elementos={perfil.sistemasOperativos.map((k) => ({
                clave: k,
                label: SISTEMAS_OPERATIVOS.find((x) => x.key === k)?.label ?? k,
                icono: SISTEMAS_OPERATIVOS.find((x) => x.key === k)?.icon ?? "Circle",
              }))}
              nota="La formación segmentada por sistema operativo llegará en una fase posterior; de momento este dato queda registrado."
            />

            <BloquePerfil
              titulo="Procesos críticos"
              descripcion="Donde un engaño haría más daño."
              icono="Workflow"
              elementos={perfil.procesos.map((k) => ({
                clave: k,
                label: PROCESOS.find((x) => x.key === k)?.label ?? k,
                icono: PROCESOS.find((x) => x.key === k)?.icon ?? "Circle",
              }))}
              nota="Alimentan el pretexto de los correos trampa del simulador."
            />

            <BloquePerfil
              titulo="Herramientas"
              descripcion="Las aplicaciones del día a día."
              icono="Boxes"
              elementos={[
                ...perfil.herramientas.map((k) => ({
                  clave: k as string,
                  label: HERRAMIENTAS.find((x) => x.key === k)?.label ?? k,
                  icono: HERRAMIENTAS.find((x) => x.key === k)?.icon ?? "Circle",
                })),
                ...perfil.otrasHerramientas.map((nombre) => ({
                  clave: nombre,
                  label: nombre,
                  icono: "Sparkles",
                })),
              ]}
              nota="Son las que suplantan los señuelos para que la simulación resulte creíble."
            />

            <BloquePerfil
              titulo="Marco normativo"
              descripcion="Normativas a las que está sujeta la organización."
              icono="Scale"
              elementos={perfil.normativas.map((k) => ({
                clave: k,
                label: NORMATIVAS.find((x) => x.key === k)?.label ?? k,
                icono: NORMATIVAS.find((x) => x.key === k)?.icon ?? "Circle",
              }))}
              nota="Aparecen en el informe de cumplimiento que se descarga desde el Command Center."
            />
          </FadeUp>

          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="Info" size={20} className="text-accent" />
              Qué hace la plataforma con este perfil
            </h2>
            <ul className="space-y-2 text-muted">
              <li className="flex items-start gap-2">
                <Icon name="Check" size={18} className="mt-0.5 shrink-0 text-status-good" />
                Los correos trampa del <b className="text-foreground">Simulador de Phishing</b>{" "}
                suplantan vuestras herramientas y se apoyan en vuestros procesos críticos, en
                lugar de usar pretextos genéricos.
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Check" size={18} className="mt-0.5 shrink-0 text-status-good" />
                El <b className="text-foreground">informe de cumplimiento</b> lista vuestro
                marco normativo real.
              </li>
              <li className="flex items-start gap-2">
                <Icon name="Clock" size={18} className="mt-0.5 shrink-0 text-muted" />
                La segmentación de la formación según vuestros sistemas operativos está
                pendiente de una fase posterior.
              </li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function BloquePerfil({
  titulo,
  descripcion,
  icono,
  elementos,
  nota,
}: {
  titulo: string;
  descripcion: string;
  icono: string;
  elementos: { clave: string; label: string; icono: string }[];
  nota: string;
}) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon name={icono} size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">{titulo}</h2>
          <p className="text-sm text-muted">{descripcion}</p>
        </div>
      </div>

      {elementos.length === 0 ? (
        <p className="mt-5 text-sm text-muted">Sin respuestas.</p>
      ) : (
        <ul className="mt-5 flex flex-wrap gap-2">
          {elementos.map((elemento) => (
            <li key={elemento.clave}>
              <Badge variant="accent">
                <Icon name={elemento.icono} size={13} /> {elemento.label}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-auto pt-5 text-xs text-muted">{nota}</p>
    </Card>
  );
}
