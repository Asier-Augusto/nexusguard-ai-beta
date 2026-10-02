/**
 * Cobertura de concienciación, normativa a normativa.
 *
 * Es la pantalla que cierra el Panel 5: el informe del DPO deja de tener dos
 * porcentajes escritos a mano y pasa a enmarcarse en las normativas que esa
 * empresa declaró, con la evidencia de cada requisito detrás.
 *
 * Va anidada bajo Command Center a propósito: el menú lateral resalta por
 * `startsWith`, así que la pantalla nueva no obliga a tocar la navegación ni a
 * inventarse un módulo que nadie contrata.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { BotonInforme } from "@/components/dashboard/BotonInforme";
import { BotonRedactarInforme } from "@/components/dashboard/BotonRedactarInforme";
import { coberturaDeEmpresa } from "@/lib/data/cumplimiento";
import { informeDeEmpresa } from "@/lib/data/informe";
import { encuadreDeEmpresa } from "@/lib/data/adaptacion";
import { listarPlantilla, resumenRiesgo } from "@/lib/data/command-center";
import { DESCRIPCION_INDICADOR, META_NIVEL } from "@/lib/cumplimiento/marco";
import { obtenerUsuarioActivo } from "@/lib/session";
import { RISK_LEVEL_META } from "@/lib/risk";
import { SECTORES } from "@/lib/constants";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function Barra({ porcentaje }: { porcentaje: number }) {
  const color =
    porcentaje >= 80
      ? "bg-status-good"
      : porcentaje >= 50
        ? "bg-status-warning"
        : "bg-status-critical";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
      <div className={`h-full ${color}`} style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

export default async function CumplimientoPage() {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  const [cobertura, encuadre, plantilla, resumen] = await Promise.all([
    coberturaDeEmpresa(usuario.empresa.id),
    encuadreDeEmpresa(usuario.empresa.id),
    listarPlantilla(usuario.empresa.id),
    resumenRiesgo(usuario.empresa.id),
  ]);

  const informe = await informeDeEmpresa(
    usuario.empresa.id,
    encuadre?.huella ?? null,
    cobertura.huellaDatos
  );

  const puedeRedactar = usuario.rol === "DPO" || usuario.rol === "ADMIN";
  const alDia = informe?.estado === "AL_DIA";
  const sector =
    SECTORES.find((s) => s.key === usuario.empresa.sector)?.label ?? usuario.empresa.sector;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <div>
        <Link
          href="/dashboard/command-center"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
        >
          <Icon name="ChevronLeft" size={16} />
          Command Center
        </Link>

        <h1 className="text-3xl font-bold text-foreground">Cobertura de concienciación</h1>
        <p className="mt-1 max-w-3xl text-lg text-muted">
          Lo que exige cada normativa que declaró {usuario.empresa.nombre}, cruzado con lo
          que ha hecho la plantilla: formación completada, evaluaciones superadas y reacción
          ante las simulaciones de phishing.
        </p>
      </div>

      <Card className="border-border/70 bg-surface-elevated">
        <p className="flex items-start gap-2 text-sm text-muted">
          <Icon name="Info" size={16} className="mt-0.5 shrink-0" />
          <span>
            Esto mide la <b className="text-foreground">parte de concienciación</b> de cada
            norma, que es la que esta plataforma puede evidenciar. No es un certificado de
            cumplimiento: las medidas técnicas, contractuales y organizativas que esas mismas
            normas exigen quedan fuera. Los cortes de alta, parcial e insuficiente los pone
            NexusGuard para poder ordenar por dónde empezar; ninguna norma dice a partir de
            qué porcentaje se cumple.
          </span>
        </p>
      </Card>

      {cobertura.normativas.length === 0 ? (
        <Card className="text-center">
          <Icon name="Scale" size={36} className="mx-auto mb-3 text-muted" />
          <p className="text-foreground">
            {usuario.empresa.nombre} no ha declarado ninguna normativa en su perfil.
          </p>
          <p className="mt-1 text-sm text-muted">
            No se le supone un marco por su sector: es la decisión que el formulario del DPO
            le pide.{" "}
            <Link href="/onboarding" className="text-accent hover:underline">
              Completar el perfil
            </Link>
            .
          </p>
        </Card>
      ) : (
        <>
          {/* --- Cabecera de cifras --- */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-muted">Cobertura global</p>
              <p className="mt-1 text-4xl font-bold text-foreground">
                {cobertura.global}
                <span className="text-2xl text-muted">%</span>
              </p>
              <div className="mt-3">
                <Barra porcentaje={cobertura.global} />
              </div>
              <p className="mt-2 text-sm text-muted">
                Media de las {cobertura.normativas.length} normativas declaradas.
              </p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Plantilla evaluada</p>
              <p className="mt-1 text-4xl font-bold text-foreground">{cobertura.plantilla}</p>
              <p className="mt-2 text-sm text-muted">
                Es el denominador de casi todas las cifras de abajo.
              </p>
            </Card>
            <Card>
              <p className="text-sm text-muted">Lo que peor va</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {cobertura.normativas[0].etiqueta}
              </p>
              <p className="mt-2 text-sm text-muted">
                Al {cobertura.normativas[0].porcentaje}%. Es por donde empezar.
              </p>
            </Card>
          </div>

          {/* --- Informe redactado --- */}
          <Card className="space-y-4 border-accent/30 bg-accent/5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Icon name="FileText" size={18} className="text-accent" />
                  Informe para dirección
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  La IA lee estas mismas cifras y escribe el resumen ejecutivo, la lectura de
                  cada normativa y las recomendaciones. No calcula nada ni cita artículos por
                  su cuenta: el marco lo pone la plataforma.
                </p>
                {informe && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={alDia ? "good" : "warning"}>
                      {alDia ? "Al día" : "Desactualizado"}
                    </Badge>
                    <span className="text-muted">
                      Redactado el {FORMATO_FECHA.format(informe.generadoEn)}
                      {informe.modelo ? ` con ${informe.modelo}` : ""}
                      {!alDia && " · las cifras o el perfil han cambiado desde entonces"}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-3">
                <BotonRedactarInforme
                  estado={informe?.estado ?? "SIN_GENERAR"}
                  puedeRedactar={puedeRedactar}
                />
                <BotonInforme
                  datos={{
                    nombreEmpresa: usuario.empresa.nombre,
                    sector,
                    riesgoGlobal: resumen.riesgoGlobal,
                    cobertura,
                    // Al documento solo baja la narrativa vigente: un texto que
                    // habla de cifras que ya no son las de arriba no puede
                    // salir de la plataforma con el membrete de la empresa.
                    narrativa: alDia ? informe!.narrativa : null,
                    modeloNarrativa: alDia ? informe!.modelo : null,
                    empleados: plantilla.map((e) => ({
                      nombre: e.nombre,
                      departamento: e.departamentoEtiqueta,
                      score: e.score,
                      nivel: RISK_LEVEL_META[e.nivel].label,
                    })),
                  }}
                />
              </div>
            </div>

            {informe && alDia && (
              <div className="space-y-4 border-t border-border pt-4">
                <p className="text-foreground">{informe.narrativa.resumen}</p>
                {informe.narrativa.recomendaciones.length > 0 && (
                  <div>
                    <p className="mb-2 font-semibold text-foreground">
                      Recomendaciones, por urgencia
                    </p>
                    <ol className="space-y-2">
                      {informe.narrativa.recomendaciones.map((r, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                            {i + 1}
                          </span>
                          {r}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {!informe && (
              <p className="border-t border-border pt-4 text-sm text-muted">
                Todavía no se ha redactado. Las cifras de esta pantalla y del informe
                descargable no dependen de ello: lo que falta es la prosa.
              </p>
            )}
          </Card>

          {/* --- Normativa a normativa --- */}
          <div className="space-y-5">
            {cobertura.normativas.map((normativa) => {
              const meta = META_NIVEL[normativa.nivel];
              const parrafo =
                alDia && informe
                  ? informe.narrativa.porNormativa.find((p) => p.clave === normativa.clave)
                      ?.texto
                  : undefined;

              return (
                <Card key={normativa.clave} className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                        <Icon name={normativa.icono} size={20} className="text-muted" />
                        {normativa.etiqueta}
                      </h2>
                      <p className="text-sm text-muted">
                        {normativa.nombreCompleto} · {normativa.fuente}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-foreground">
                        {normativa.porcentaje}
                        <span className="text-xl text-muted">%</span>
                      </p>
                      <Badge variant={meta.variante}>{meta.label}</Badge>
                    </div>
                  </div>

                  <Barra porcentaje={normativa.porcentaje} />

                  {parrafo && <p className="text-muted">{parrafo}</p>}

                  <div className="divide-y divide-border border-t border-border">
                    {normativa.requisitos.map((requisito) => (
                      <div key={requisito.id} className="py-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-medium text-foreground">
                            <span className="mr-2 rounded-md bg-surface-hover px-2 py-0.5 font-mono text-xs text-muted">
                              {requisito.referencia}
                            </span>
                            {requisito.titulo}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {requisito.sinDatos ? "sin datos" : `${requisito.porcentaje}%`}
                            <span className="ml-2 font-normal text-muted">
                              {requisito.numerador} de {requisito.denominador}{" "}
                              {requisito.unidad}
                            </span>
                          </p>
                        </div>

                        <div className="my-2">
                          <Barra porcentaje={requisito.porcentaje} />
                        </div>

                        <p className="text-sm text-muted">{requisito.exige}</p>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
                          <Icon
                            name={requisito.sinDatos ? "CircleDashed" : "ArrowRight"}
                            size={14}
                            className="mt-0.5 shrink-0"
                          />
                          {requisito.detalle}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {DESCRIPCION_INDICADOR[requisito.indicador]}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
