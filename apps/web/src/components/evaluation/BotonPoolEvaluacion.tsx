"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { generarPoolDeTema } from "@/app/actions/evaluacion";
import type { ResultadoPool } from "@/lib/adaptacion/generar-pool";
import { cn } from "@/lib/utils";

export interface TemaConPool {
  tema: string;
  titulo: string;
  estado: "SIN_GENERAR" | "AL_DIA" | "OBSOLETO";
}

/**
 * Genera el pool de preguntas del test para la empresa, tema a tema.
 *
 * Va de uno en uno por lo mismo que la adaptación de la formación: con el
 * modelo grande cada tema son unos tres minutos, así que hay que ver que
 * aquello avanza, y si uno falla los demás se generan igual.
 *
 * Lo que no salga adaptado no se esconde: ese tema se sigue evaluando con el
 * banco genérico, que es exactamente lo que verá el empleado.
 */
export function BotonPoolEvaluacion({
  temas,
  puedeGenerar,
}: {
  temas: TemaConPool[];
  puedeGenerar: boolean;
}) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState(false);
  const [hechos, setHechos] = useState(0);
  const [enProceso, setEnProceso] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoPool[] | null>(null);

  const pendientes = temas.filter((t) => t.estado !== "AL_DIA");
  const alDia = temas.length - pendientes.length;
  const obsoletos = temas.filter((t) => t.estado === "OBSOLETO").length;
  const objetivo = pendientes.length > 0 ? pendientes : temas;

  async function generar(lista: TemaConPool[]) {
    setEnCurso(true);
    setResultados(null);
    setHechos(0);

    const salida: ResultadoPool[] = [];
    for (const tema of lista) {
      setEnProceso(tema.titulo);
      salida.push(await generarPoolDeTema(tema.tema));
      setHechos(salida.length);
    }

    setEnProceso(null);
    setResultados(salida);
    setEnCurso(false);
    router.refresh();
  }

  const conseguidos = resultados?.filter((r) => r.generado) ?? [];
  const fallidos = resultados?.filter((r) => !r.generado) ?? [];
  const preguntas = conseguidos.reduce((total, r) => total + r.preguntas, 0);

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Icon name="Sparkles" size={18} className="text-accent" />
            Preguntas escritas para tu empresa
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            La IA escribe cinco preguntas por tema, una de cada nivel, situadas en las
            herramientas, los procesos y las normativas de tu perfil. Se suman al banco
            general: la dificultad la sigue decidiendo el motor adaptativo, y lo que la IA
            aporta es que la pregunta hable de tu día a día.
          </p>
          <p className="mt-2 text-sm font-medium text-accent">
            {alDia} de {temas.length} temas con preguntas propias
            {obsoletos > 0 && (
              <span className="text-status-warning">
                {" "}
                · {obsoletos} {obsoletos === 1 ? "desactualizado" : "desactualizados"} porque
                el perfil ha cambiado
              </span>
            )}
          </p>
        </div>

        {puedeGenerar && (
          <Button
            onClick={() => void generar(objetivo)}
            disabled={enCurso || objetivo.length === 0}
          >
            <Icon
              name={enCurso ? "LoaderCircle" : "Wand2"}
              size={18}
              className={cn(enCurso && "animate-spin")}
            />
            {enCurso
              ? `Escribiendo ${hechos + 1} de ${objetivo.length}…`
              : pendientes.length > 0
                ? `Generar ${pendientes.length} ${pendientes.length === 1 ? "tema" : "temas"}`
                : "Regenerar todos"}
          </Button>
        )}
      </div>

      {!puedeGenerar && (
        <p className="mt-3 text-sm text-muted">
          Solo el DPO o un administrador pueden generar el pool de preguntas.
        </p>
      )}

      {enCurso && enProceso && (
        <p role="status" className="mt-3 text-sm text-muted">
          Escribiendo las preguntas de <b className="text-foreground">{enProceso}</b>. Son
          unos tres minutos por tema; no cierres la página.
        </p>
      )}

      {resultados && (
        <div role="status" className="mt-4 space-y-2 text-sm">
          <p className="font-medium text-foreground">
            {conseguidos.length}{" "}
            {conseguidos.length === 1 ? "tema con preguntas propias" : "temas con preguntas propias"}
            {preguntas > 0 && ` (${preguntas} preguntas)`}
            {fallidos.length > 0 && `, ${fallidos.length} sin generar`}.
          </p>
          {fallidos.length > 0 && (
            <ul className="space-y-1 text-muted">
              {fallidos.map((fallo) => (
                <li key={fallo.tema} className="flex gap-2">
                  <Icon name="Info" size={15} className="mt-0.5 shrink-0" />
                  <span>
                    {temas.find((t) => t.tema === fallo.tema)?.titulo ?? fallo.tema}:{" "}
                    {fallo.detalle} Se evalúa con el banco general.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
