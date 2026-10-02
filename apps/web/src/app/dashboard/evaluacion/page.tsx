import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { TestAdaptativo } from "@/components/evaluation/TestAdaptativo";
import { BotonPoolEvaluacion } from "@/components/evaluation/BotonPoolEvaluacion";
import { listarIntentos, listarTemasEvaluables } from "@/lib/data/evaluacion";
import { encuadreDeEmpresa } from "@/lib/data/adaptacion";
import { estadoPoolPorTema } from "@/lib/data/pool-evaluacion";
import { obtenerUsuarioActivo } from "@/lib/session";
import type { TemaEvaluable } from "@/lib/data/evaluacion";

/** Qué motor resolvió cada intento. Se muestra porque dos puntuaciones
 *  parecidas no son comparables si una salió del motor adaptativo y la otra
 *  de la heurística de respaldo. */
const ETIQUETA_MOTOR: Record<"RED_IRT" | "IRT" | "HEURISTICA", string> = {
  RED_IRT: "red neuronal + IRT",
  IRT: "solo IRT",
  HEURISTICA: "heurística",
};

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function EvaluacionAdaptativaPage() {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  let temas: TemaEvaluable[] = [];
  let servicioCaido = false;
  try {
    temas = await listarTemasEvaluables(usuario.empresa.id);
  } catch {
    servicioCaido = true;
  }

  const intentos = await listarIntentos(usuario.id);
  const titulosPorTema = new Map(temas.map((t) => [t.tema, t.titulo]));

  const encuadre = await encuadreDeEmpresa(usuario.empresa.id);
  const estadosPool = await estadoPoolPorTema(usuario.empresa.id, encuadre?.huella ?? null);
  const temasConPool = temas.map((t) => ({
    tema: t.tema,
    titulo: t.titulo,
    estado: estadosPool.get(t.tema) ?? ("SIN_GENERAR" as const),
  }));
  const conPoolPropio = temasConPool.filter((t) => t.estado === "AL_DIA").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Evaluación Adaptativa</h1>
        <p className="mt-1 text-lg text-muted">
          El motor CAT ajusta la dificultad según tus respuestas, en tiempo real.
        </p>
      </div>

      {servicioCaido ? (
        <Card className="text-center">
          <Icon name="PlugZap" size={40} className="mx-auto mb-3 text-muted" />
          <h2 className="text-lg font-bold text-foreground">
            El motor de evaluación no responde
          </h2>
          <p className="mt-2 text-muted">
            Las preguntas las sirve el servicio de inferencia en el puerto 8010. Arráncalo
            con <code className="text-accent">npm run dev:api</code> y vuelve a cargar esta
            página.
          </p>
        </Card>
      ) : (
        <>
          {encuadre && (
            <BotonPoolEvaluacion
              temas={temasConPool}
              puedeGenerar={usuario.rol === "DPO" || usuario.rol === "ADMIN"}
            />
          )}
          {conPoolPropio > 0 && (
            <p className="flex items-start gap-2 text-sm text-muted">
              <Icon name="Sparkles" size={15} className="mt-0.5 shrink-0 text-accent" />
              <span>
                {conPoolPropio === 1
                  ? "Un tema incluye"
                  : `${conPoolPropio} temas incluyen`}{" "}
                preguntas escritas por la IA para <b>{usuario.empresa.nombre}</b>, mezcladas
                con las del banco general.
              </span>
            </p>
          )}
          <TestAdaptativo temas={temas} />
        </>
      )}

      {intentos.length > 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-foreground">Tu historial</h2>
          <p className="mb-4 text-sm text-muted">Últimas evaluaciones que has completado.</p>
          <ul className="divide-y divide-border">
            {intentos.map((intento) => (
              <li key={intento.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {intento.modo === "MIXTO"
                      ? `Evaluación completa · ${intento.temas.length} temas`
                      : titulosPorTema.get(intento.tema) ?? intento.tema}
                  </p>
                  <p className="text-sm text-muted">
                    {FORMATO_FECHA.format(intento.fecha)} · nivel {intento.nivelFinal} de 5
                    {intento.habilidad !== null &&
                      ` · habilidad ${intento.habilidad.toFixed(2)}`}
                    {" · "}
                    {ETIQUETA_MOTOR[intento.motor]}
                  </p>
                </div>
                <Badge variant={intento.puntuacion >= 60 ? "good" : "neutral"}>
                  {intento.puntuacion}/100
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
