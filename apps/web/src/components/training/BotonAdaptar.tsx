"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { adaptarPildora } from "@/app/actions/adaptacion";
import type { ResultadoAdaptacion } from "@/lib/adaptacion/generar";
import { cn } from "@/lib/utils";

export interface PildoraAdaptable {
  id: string;
  titulo: string;
  estado: "SIN_ADAPTAR" | "AL_DIA" | "OBSOLETA";
}

/**
 * Lanza la adaptación del contenido de formación al perfil de la empresa.
 *
 * Va **de una en una** en lugar de mandar todo el catálogo en una sola
 * llamada, por dos motivos: cada píldora tarda entre diez segundos y un minuto
 * con el modelo local, así que el usuario necesita ver que aquello avanza; y si
 * una falla, las demás se adaptan igual. Ninguna petición larga se queda a
 * medias sin que se sepa cuál.
 *
 * Lo que no salga adaptado no es un error que haya que esconder: se dice
 * cuántas han quedado fuera y por qué, y esas píldoras siguen mostrando el
 * contenido genérico.
 */
export function BotonAdaptar({
  pildoras,
  puedeAdaptar,
}: {
  pildoras: PildoraAdaptable[];
  puedeAdaptar: boolean;
}) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState(false);
  const [hechas, setHechas] = useState(0);
  const [enProceso, setEnProceso] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoAdaptacion[] | null>(null);

  const pendientes = pildoras.filter((p) => p.estado !== "AL_DIA");
  const alDia = pildoras.length - pendientes.length;
  const obsoletas = pildoras.filter((p) => p.estado === "OBSOLETA").length;

  async function adaptar(objetivo: PildoraAdaptable[]) {
    setEnCurso(true);
    setResultados(null);
    setHechas(0);

    const salida: ResultadoAdaptacion[] = [];
    for (const pildora of objetivo) {
      setEnProceso(pildora.titulo);
      salida.push(await adaptarPildora(pildora.id));
      setHechas(salida.length);
    }

    setEnProceso(null);
    setResultados(salida);
    setEnCurso(false);
    router.refresh();
  }

  const objetivo = pendientes.length > 0 ? pendientes : pildoras;
  const conseguidas = resultados?.filter((r) => r.adaptada).length ?? 0;
  const fallidas = resultados?.filter((r) => !r.adaptada) ?? [];

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Icon name="Sparkles" size={18} className="text-accent" />
            Formación escrita para tu empresa
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            La IA reescribe los ejemplos de cada píldora con el sector, las herramientas,
            los procesos y las normativas que declaraste en el perfil. Los juegos son los
            mismos; lo que cambia es el contenido. Mientras no se adapte, o si la IA no
            está disponible, se muestra el contenido genérico.
          </p>
          <p className="mt-2 text-sm font-medium text-accent">
            {alDia} de {pildoras.length} píldoras adaptadas
            {obsoletas > 0 && (
              <span className="text-status-warning">
                {" "}
                · {obsoletas} {obsoletas === 1 ? "desactualizada" : "desactualizadas"} porque
                el perfil ha cambiado
              </span>
            )}
          </p>
        </div>

        {puedeAdaptar && (
          <Button onClick={() => void adaptar(objetivo)} disabled={enCurso || objetivo.length === 0}>
            <Icon name={enCurso ? "LoaderCircle" : "Wand2"} size={18} className={cn(enCurso && "animate-spin")} />
            {enCurso
              ? `Adaptando ${hechas + 1} de ${objetivo.length}…`
              : pendientes.length > 0
                ? `Adaptar ${pendientes.length} ${pendientes.length === 1 ? "píldora" : "píldoras"}`
                : "Regenerar todas"}
          </Button>
        )}
      </div>

      {!puedeAdaptar && (
        <p className="mt-3 text-sm text-muted">
          Solo el DPO o un administrador pueden lanzar la adaptación.
        </p>
      )}

      {enCurso && enProceso && (
        <p role="status" className="mt-3 text-sm text-muted">
          Escribiendo el contenido de <b className="text-foreground">{enProceso}</b>. Puede
          tardar hasta un minuto por píldora; no cierres la página.
        </p>
      )}

      {resultados && (
        <div role="status" className="mt-4 space-y-2 text-sm">
          <p className="font-medium text-foreground">
            {conseguidas} {conseguidas === 1 ? "píldora adaptada" : "píldoras adaptadas"}
            {fallidas.length > 0 && `, ${fallidas.length} sin adaptar`}.
          </p>
          {fallidas.length > 0 && (
            <ul className="space-y-1 text-muted">
              {fallidas.map((fallo) => (
                <li key={fallo.pildoraId} className="flex gap-2">
                  <Icon name="Info" size={15} className="mt-0.5 shrink-0" />
                  <span>
                    {pildoras.find((p) => p.id === fallo.pildoraId)?.titulo}: {fallo.detalle}{" "}
                    Se mantiene el contenido genérico.
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
