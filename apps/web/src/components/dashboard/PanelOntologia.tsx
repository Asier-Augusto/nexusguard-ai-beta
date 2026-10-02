/**
 * Lo que el grafo sabe y las tablas no.
 *
 * Componente de servidor: lanza las tres consultas Cypher y las pinta. Si
 * Neo4j no responde, cada una devuelve `null` y aquí se enseña cómo
 * levantarlo. **El resto del Command Center funciona igual**: el grafo es una
 * capa de explotación de datos que ya están en PostgreSQL, no una fuente de
 * verdad.
 *
 * Cada bloque enseña su Cypher en un `<details>`. No es decoración: en un
 * proyecto de máster la consulta es parte de lo que hay que demostrar, y así
 * se puede copiar y pegar en el Browser.
 */
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { grafoDisponible } from "@/lib/neo4j/conexion";
import {
  CYPHER_FORMACION_Y_CLICS,
  CYPHER_IMPACTO_NORMATIVO,
  CYPHER_RIESGO_POR_DEPARTAMENTO,
  formacionYClics,
  impactoNormativo,
  riesgoPorDepartamento,
} from "@/lib/neo4j/consultas";

function Cypher({ consulta }: { consulta: string }) {
  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer text-xs text-muted hover:text-accent">
        Ver la consulta Cypher
      </summary>
      <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-surface-elevated p-4 text-xs leading-relaxed text-muted">
        <code>{consulta.trim()}</code>
      </pre>
    </details>
  );
}

function GrafoApagado() {
  return (
    <Card className="border-border/70">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Icon name="Workflow" size={18} className="text-muted" />
        Ontología en Neo4j
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        El grafo no está levantado. Es funcionalidad opcional: todo lo que hay en esta
        página sale de PostgreSQL y funciona sin él. El grafo añade las preguntas que
        recorren caminos —quién pica entre los que no se han formado, qué tema arrastra a
        más normativas— que en tablas salen a cinco <i>JOIN</i>.
      </p>
      <p className="mt-2 text-xs text-muted">
        La ingesta del grafo está disponible en la versión completa de NexusGuard AI.
      </p>
    </Card>
  );
}

export async function PanelOntologia({ empresaId }: { empresaId: string }) {
  // Se pregunta UNA vez si el grafo está antes de lanzar las tres consultas.
  // Sin esta sonda, con el contenedor parado la página se comía tres tiempos
  // de espera seguidos: medido, 3,5 segundos. Con ella, 0,8.
  if (!(await grafoDisponible())) return <GrafoApagado />;

  const [riesgo, clics, impacto] = await Promise.all([
    riesgoPorDepartamento(empresaId),
    formacionYClics(empresaId),
    impactoNormativo(empresaId),
  ]);

  // Cinturón y tirantes: si el grafo se cae entre la sonda y las consultas.
  if (riesgo === null || clics === null || impacto === null) return <GrafoApagado />;

  const sinFormar = clics.find((c) => !c.formado);
  const formados = clics.find((c) => c.formado);
  const diferencia =
    sinFormar && formados ? sinFormar.tasaClic - formados.tasaClic : null;

  const masUrgente = impacto.find((i) => i.personasPendientes > 0) ?? impacto[0];

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Icon name="Workflow" size={18} className="text-accent" />
          Ontología en Neo4j
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Las mismas personas, píldoras, campañas y normativas que hay en PostgreSQL,
          pero como grafo. Estas tres preguntas recorren caminos entre entidades, que es
          lo que una tabla contesta mal.
        </p>
      </div>

      {/* --- 1. Riesgo por departamento --- */}
      <section className="border-t border-border pt-5">
        <h3 className="font-semibold text-foreground">
          Quién arrastra el riesgo de cada departamento
        </h3>
        <p className="mb-3 text-sm text-muted">
          El peor de cada área, con las píldoras de su itinerario que aún no ha hecho.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="pb-2 pr-4 font-medium">Departamento</th>
                <th className="pb-2 pr-4 font-medium">Empleado</th>
                <th className="pb-2 pr-4 text-right font-medium">Riesgo</th>
                <th className="pb-2 pr-4 text-right font-medium">Pendientes</th>
                <th className="pb-2 text-right font-medium">Media del área</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {riesgo.map((fila) => (
                <tr key={fila.departamento}>
                  <td className="py-2 pr-4 text-muted">{fila.departamento}</td>
                  <td className="py-2 pr-4 font-medium text-foreground">{fila.empleado}</td>
                  <td className="py-2 pr-4 text-right text-status-serious">{fila.score}</td>
                  <td className="py-2 pr-4 text-right text-foreground">{fila.pendientes}</td>
                  <td className="py-2 text-right text-muted">
                    {fila.mediaDepartamento} · {fila.plantilla}{" "}
                    {fila.plantilla === 1 ? "persona" : "personas"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Cypher consulta={CYPHER_RIESGO_POR_DEPARTAMENTO} />
      </section>

      {/* --- 2. Formación y clics --- */}
      <section className="border-t border-border pt-5">
        <h3 className="font-semibold text-foreground">
          ¿Pica menos quien ha hecho la formación de correo?
        </h3>
        <p className="mb-3 text-sm text-muted">
          Parte la plantilla en dos según haya completado o no la píldora, y compara cómo
          reaccionó cada mitad ante las simulaciones.
        </p>

        {clics.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no se ha lanzado ninguna campaña, así que no hay con qué comparar.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {clics.map((grupo) => (
                <div
                  key={String(grupo.formado)}
                  className={`rounded-xl border p-4 ${
                    grupo.formado
                      ? "border-status-good/30 bg-status-good/5"
                      : "border-status-serious/30 bg-status-serious/5"
                  }`}
                >
                  <p className="text-sm text-muted">
                    {grupo.formado ? "Hizo la formación" : "No la hizo"}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    {grupo.tasaClic}
                    <span className="text-xl text-muted">% de clic</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {grupo.personas} {grupo.personas === 1 ? "persona" : "personas"} ·{" "}
                    {grupo.clics} de {grupo.senuelos} señuelos
                  </p>
                </div>
              ))}
            </div>

            {diferencia !== null && (
              <p className="mt-3 flex items-start gap-2 text-sm text-foreground">
                <Icon
                  name={diferencia > 0 ? "TrendingDown" : "Info"}
                  size={16}
                  className="mt-0.5 shrink-0 text-accent"
                />
                {diferencia > 0
                  ? `Quien hizo la formación pica ${diferencia} puntos menos.`
                  : "Con estos datos la formación todavía no marca diferencia."}
              </p>
            )}
          </>
        )}
        <Cypher consulta={CYPHER_FORMACION_Y_CLICS} />
      </section>

      {/* --- 3. Impacto normativo --- */}
      <section className="border-t border-border pt-5">
        <h3 className="font-semibold text-foreground">
          Qué tema arrastra a más normativas a la vez
        </h3>
        <p className="mb-3 text-sm text-muted">
          Recorre normativa → requisito → tema → píldora → empleado. Dice por dónde
          empezar: el tema que, al cerrarse, sube varias coberturas de golpe.
        </p>

        {masUrgente && (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="accent">{masUrgente.tema}</Badge>
            <span className="text-muted">
              toca {masUrgente.cuantas}{" "}
              {masUrgente.cuantas === 1 ? "normativa" : "normativas"} y le falta a{" "}
              {masUrgente.personasPendientes}{" "}
              {masUrgente.personasPendientes === 1 ? "persona" : "personas"}.
            </span>
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="pb-2 pr-4 font-medium">Tema</th>
                <th className="pb-2 pr-4 font-medium">Normativas que dependen de él</th>
                <th className="pb-2 pr-4 text-right font-medium">Cobertura media</th>
                <th className="pb-2 text-right font-medium">Personas pendientes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {impacto.map((fila) => (
                <tr key={fila.tema}>
                  <td className="py-2 pr-4 font-medium text-foreground">
                    {fila.pildoras[0] ?? fila.tema}
                  </td>
                  <td className="py-2 pr-4 text-muted">{fila.normativas.join(" · ")}</td>
                  <td className="py-2 pr-4 text-right text-foreground">
                    {fila.coberturaMedia}%
                  </td>
                  <td className="py-2 text-right text-foreground">
                    {fila.personasPendientes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Cypher consulta={CYPHER_IMPACTO_NORMATIVO} />
      </section>

      <p className="flex items-start gap-2 border-t border-border pt-4 text-xs text-muted">
        <Icon name="Info" size={14} className="mt-0.5 shrink-0" />
        La ingesta y la documentación de la ontología están disponibles en la
        versión completa de NexusGuard AI.
      </p>
    </Card>
  );
}
