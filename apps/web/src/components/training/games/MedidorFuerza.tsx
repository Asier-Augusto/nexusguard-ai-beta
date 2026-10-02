"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { etiquetaFuerza, type FuerzaContrasena } from "@/lib/password-strength";

/** Color de estado por nivel. Tokens del sistema, nunca hex sueltos. */
const COLOR_POR_NIVEL = [
  "bg-status-critical",
  "bg-status-critical",
  "bg-status-warning",
  "bg-status-serious",
  "bg-status-good",
];

const TEXTO_POR_NIVEL = [
  "text-status-critical",
  "text-status-critical",
  "text-status-warning",
  "text-status-serious",
  "text-status-good",
];

/**
 * Medidor de resistencia con el contador de "tiempo en crackearla".
 *
 * El nivel se comunica con barra, texto e icono a la vez: el color nunca es el
 * único portador del significado.
 */
export function MedidorFuerza({
  fuerza,
  cargando,
  vacio,
}: {
  fuerza: FuerzaContrasena | null;
  cargando: boolean;
  vacio: boolean;
}) {
  const nivel = fuerza?.puntuacion ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-wider text-muted">
          Resistencia
        </span>
        {!vacio && fuerza && (
          <span
            className={`flex items-center gap-1.5 text-sm font-bold ${TEXTO_POR_NIVEL[nivel]}`}
          >
            <Icon name={nivel >= 3 ? "ShieldCheck" : "ShieldAlert"} size={16} />
            {etiquetaFuerza(nivel)}
          </span>
        )}
      </div>

      {/* Cinco segmentos: se ven "cuántos te faltan", no solo un porcentaje. */}
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
            <motion.div
              className={`h-full rounded-full ${COLOR_POR_NIVEL[nivel]}`}
              initial={false}
              animate={{ width: !vacio && i <= nivel ? "100%" : "0%" }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-sm text-muted">Tiempo estimado en romperla por fuerza bruta</p>
        {/* aria-live para que un lector de pantalla cante el cambio. */}
        <p
          aria-live="polite"
          className={`text-2xl font-black ${vacio ? "text-muted" : TEXTO_POR_NIVEL[nivel]}`}
        >
          {vacio
            ? "Escribe algo para empezar"
            : cargando
              ? "calculando…"
              : (fuerza?.tiempoLegible ?? "—")}
        </p>
      </div>

      {!vacio && fuerza?.aviso && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-status-warning/10 px-3 py-2 text-sm text-foreground">
          <Icon name="TriangleAlert" size={16} className="mt-0.5 shrink-0 text-status-warning" />
          {fuerza.aviso}
        </p>
      )}

      {!vacio && fuerza && fuerza.sugerencias.length > 0 && (
        <ul className="mt-3 space-y-2">
          {fuerza.sugerencias.map((consejo) => (
            <li key={consejo} className="flex items-start gap-2 text-sm text-muted">
              <Icon name="Lightbulb" size={16} className="mt-0.5 shrink-0 text-accent" />
              {consejo}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
