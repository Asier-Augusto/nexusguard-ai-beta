"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { redactarInforme } from "@/app/actions/cumplimiento";
import type { EstadoInforme } from "@/lib/data/informe";
import { cn } from "@/lib/utils";

const TEXTO_BOTON: Record<EstadoInforme, string> = {
  SIN_GENERAR: "Redactar el informe con IA",
  DESACTUALIZADO: "Rehacer el informe",
  AL_DIA: "Volver a redactarlo",
};

/**
 * Pide la redacción del informe al modelo grande.
 *
 * Va a mano y no al abrir la pantalla porque tarda minuto y pico: las cifras
 * ya están calculadas y se ven arriba, y lo que se pide aquí es la prosa. Si
 * el modelo no está disponible se guarda igualmente la redacción de plantilla
 * del servicio, con las mismas cifras.
 */
export function BotonRedactarInforme({
  estado,
  puedeRedactar,
}: {
  estado: EstadoInforme;
  puedeRedactar: boolean;
}) {
  const router = useRouter();
  const [enCurso, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  if (!puedeRedactar) {
    return (
      <p className="text-sm text-muted">
        Solo el DPO o un administrador pueden redactar el informe.
      </p>
    );
  }

  function redactar() {
    setAviso(null);
    iniciar(async () => {
      const resultado = await redactarInforme();
      setAviso(resultado.detalle);
      router.refresh();
    });
  }

  return (
    <div>
      <Button onClick={redactar} disabled={enCurso}>
        <Icon
          name={enCurso ? "LoaderCircle" : "Sparkles"}
          size={18}
          className={cn(enCurso && "animate-spin")}
        />
        {enCurso ? "Redactando…" : TEXTO_BOTON[estado]}
      </Button>

      {enCurso && (
        <p role="status" className="mt-2 text-sm text-muted">
          El modelo está leyendo las cifras y escribiendo el informe. Suele tardar un
          par de minutos; no cierres la página.
        </p>
      )}

      {aviso && !enCurso && (
        <p role="status" className="mt-2 max-w-xl text-sm text-muted">
          {aviso}
        </p>
      )}
    </div>
  );
}
