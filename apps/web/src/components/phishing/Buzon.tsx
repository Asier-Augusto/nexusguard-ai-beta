"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { reportarSenuelo } from "@/app/actions/phishing";
import type { SenueloRecibido } from "@/lib/data/phishing";
import { CANALES } from "@/lib/phishing/senuelo";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * El cuerpo del señuelo con su enlace convertido en enlace de verdad.
 *
 * Se parte el texto por la dirección en vez de usar `dangerouslySetInnerHTML`:
 * el cuerpo lo escribe un modelo de lenguaje, así que es exactamente el tipo
 * de texto que no se puede inyectar como HTML.
 */
function CuerpoConEnlace({ cuerpo, enlace }: { cuerpo: string; enlace: string }) {
  const trozos = cuerpo.split(enlace);

  return (
    <p className="whitespace-pre-line text-foreground">
      {trozos.map((trozo, i) => (
        <span key={i}>
          {trozo}
          {i < trozos.length - 1 && (
            <a
              href={enlace}
              className="break-all font-medium text-accent underline underline-offset-2 hover:text-accent-soft"
            >
              {enlace}
            </a>
          )}
        </span>
      ))}
    </p>
  );
}

function Cabecera({ senuelo }: { senuelo: SenueloRecibido }) {
  const canal = CANALES.find((c) => c.key === senuelo.canal);

  if (senuelo.canal === "SMS") {
    return (
      <p className="text-sm text-muted">
        SMS de <span className="font-semibold text-foreground">{senuelo.remitenteNombre}</span>
      </p>
    );
  }

  if (senuelo.canal === "LLAMADA") {
    return (
      <p className="text-sm text-muted">
        Llamada de{" "}
        <span className="font-semibold text-foreground">{senuelo.remitenteNombre}</span> —
        transcripción
      </p>
    );
  }

  return (
    <p className="text-sm text-muted">
      De: <span className="text-foreground">{senuelo.remitenteNombre ?? canal?.label}</span>
      {senuelo.remitenteEmail && ` <${senuelo.remitenteEmail}>`}
    </p>
  );
}

function Mensaje({ senuelo }: { senuelo: SenueloRecibido }) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  const canal = CANALES.find((c) => c.key === senuelo.canal);
  const reaccionado = senuelo.yaPico || senuelo.yaReporto;

  function reportar() {
    iniciar(async () => {
      const respuesta = await reportarSenuelo(senuelo.token);
      setAviso(respuesta.detalle);
      router.refresh();
    });
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <Icon name={canal?.icon ?? "Mail"} size={16} className="text-muted" />
            <Cabecera senuelo={senuelo} />
          </div>
          <p className="font-bold text-foreground">{senuelo.asunto}</p>
        </div>
        <div className="flex items-center gap-2">
          {senuelo.recibidoEn && (
            <span className="text-xs text-muted">
              {FORMATO_FECHA.format(senuelo.recibidoEn)}
            </span>
          )}
          {senuelo.yaReporto && <Badge variant="good">Reportado</Badge>}
          {senuelo.yaPico && <Badge variant="warning">Pulsaste el enlace</Badge>}
        </div>
      </div>

      <div className="px-5 py-4">
        <CuerpoConEnlace cuerpo={senuelo.cuerpo} enlace={senuelo.enlace} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
        <p className="text-sm text-muted">
          {reaccionado
            ? "Ya has reaccionado a este mensaje."
            : "¿Te fías de este mensaje?"}
        </p>
        {!senuelo.yaReporto && (
          <Button variant="secondary" size="sm" onClick={reportar} disabled={enviando}>
            <Icon name={enviando ? "LoaderCircle" : "ShieldAlert"} size={16} />
            {enviando ? "Enviando…" : "Reportar como sospechoso"}
          </Button>
        )}
      </div>

      {aviso && (
        <p role="status" className="px-5 pb-4 text-sm text-status-good">
          {aviso}
        </p>
      )}
    </Card>
  );
}

/**
 * La bandeja de entrada de la simulación.
 *
 * NexusGuard no manda correos de verdad: los señuelos se entregan aquí. Lo que
 * sí es real es el enlace —lleva el token instrumentado de esta persona—, así
 * que pulsarlo registra un clic igual que lo haría desde un cliente de correo.
 */
export function Buzon({ senuelos }: { senuelos: SenueloRecibido[] }) {
  if (senuelos.length === 0) {
    return (
      <Card className="text-center text-muted">
        <Icon name="Inbox" size={36} className="mx-auto mb-3 text-muted" />
        No tienes ningún mensaje de simulación pendiente. Cuando tu empresa lance una
        campaña, aparecerá aquí.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {senuelos.map((senuelo) => (
        <Mensaje key={senuelo.token} senuelo={senuelo} />
      ))}
    </div>
  );
}
