"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { DEPARTAMENTOS, type DepartamentoKey } from "@/lib/constants";
import {
  generarCampania,
  lanzarCampania,
  type CampaniaGenerada,
} from "@/app/actions/phishing";
import { CANALES, cuerpoParaPanel, type SugerenciaCanal } from "@/lib/phishing/senuelo";
import type { CanalCampania } from "@/lib/ai-client";
import { cn } from "@/lib/utils";

const DIFICULTADES = [
  { key: "facil", label: "Fácil" },
  { key: "media", label: "Media" },
  { key: "dificil", label: "Difícil" },
] as const;

export function GeneradorCampania({
  departamentoInicial,
  sugerencia,
}: {
  departamentoInicial: DepartamentoKey;
  /** Canal que encaja con el perfil de la empresa, y por qué. */
  sugerencia: SugerenciaCanal;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("Campaña Q1 - Concienciación");
  const [departamento, setDepartamento] = useState<DepartamentoKey>(departamentoInicial);
  const [canal, setCanal] = useState<CanalCampania>(sugerencia.canal);
  const [dificultad, setDificultad] =
    useState<(typeof DIFICULTADES)[number]["key"]>("media");
  const [resultado, setResultado] = useState<CampaniaGenerada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lanzamiento, setLanzamiento] = useState<string | null>(null);
  const [generando, iniciarGeneracion] = useTransition();
  const [lanzando, iniciarLanzamiento] = useTransition();

  function generar() {
    setError(null);
    setResultado(null);
    setLanzamiento(null);
    iniciarGeneracion(async () => {
      try {
        setResultado(await generarCampania({ nombre, departamento, canal, dificultad }));
        router.refresh();
      } catch {
        setError(
          "No hemos podido generar la campaña. Comprueba que el servicio de inferencia (puerto 8010) y la base de datos están levantados."
        );
      }
    });
  }

  function lanzar(campaniaId: string) {
    iniciarLanzamiento(async () => {
      const respuesta = await lanzarCampania(campaniaId);
      setLanzamiento(respuesta.detalle);
      router.refresh();
    });
  }

  const etiquetaDepartamento =
    DEPARTAMENTOS.find((d) => d.key === departamento)?.label ?? departamento;
  const canalActual = CANALES.find((c) => c.key === canal);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
      {/* Columna de configuración */}
      <Card className="space-y-6">
        <div>
          <label htmlFor="nombre" className="mb-2 block text-base font-medium text-muted">
            Nombre de la campaña
          </label>
          <input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <span className="mb-2 block text-base font-medium text-muted">
            Canal de la simulación
          </span>
          <div className="grid grid-cols-3 gap-2">
            {CANALES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCanal(c.key)}
                title={c.descripcion}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors",
                  canal === c.key
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface-elevated text-foreground hover:bg-surface-hover"
                )}
              >
                <Icon name={c.icon} size={18} />
                {c.label}
                <span className="text-[11px] font-normal text-muted">{c.tecnico}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
            <Icon name="Lightbulb" size={13} className="mt-0.5 shrink-0 text-accent" />
            Sugerido: <b className="text-foreground">
              {CANALES.find((c) => c.key === sugerencia.canal)?.label}
            </b>
            . {sugerencia.motivo}
          </p>
        </div>

        <div>
          <label htmlFor="departamento" className="mb-2 block text-base font-medium text-muted">
            Departamento del pretexto
          </label>
          <select
            id="departamento"
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value as DepartamentoKey)}
            className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-foreground outline-none focus:border-accent"
          >
            {DEPARTAMENTOS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            El señuelo se hará pasar por una comunicación de esa área. La campaña se
            manda a toda la plantilla, como las de verdad.
          </p>
        </div>

        <div>
          <span className="mb-2 block text-base font-medium text-muted">
            Dificultad del señuelo
          </span>
          <div className="flex gap-2">
            {DIFICULTADES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDificultad(d.key)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                  dificultad === d.key
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface-elevated text-foreground hover:bg-surface-hover"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          animate={
            generando
              ? { boxShadow: ["0 0 0px #22d3ee00", "0 0 22px #22d3ee55", "0 0 0px #22d3ee00"] }
              : {}
          }
          transition={{ duration: 1.4, repeat: generando ? Infinity : 0 }}
        >
          <Button onClick={generar} disabled={generando} className="w-full">
            <Icon name="Sparkles" size={20} />
            {generando ? "Escribiendo con IA…" : "Generar campaña con IA"}
          </Button>
        </motion.div>

        <p className="text-xs text-muted">
          Uso exclusivo para formación interna autorizada. La campaña se guarda como
          borrador: no llega a nadie hasta que la lances.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-status-critical/50 bg-status-critical/10 px-4 py-3 text-sm text-foreground"
          >
            {error}
          </p>
        )}
      </Card>

      {/* Columna de previsualización */}
      <Card className="min-h-[420px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted">
            <Icon name={canalActual?.icon ?? "Mail"} size={16} />
            {canalActual?.tecnico} — {etiquetaDepartamento}
          </p>
          {resultado && (
            <Badge variant={resultado.origen === "ollama" ? "accent" : "neutral"}>
              <Icon name="Sparkles" size={12} />
              {resultado.origen === "ollama"
                ? "Redactado por el modelo"
                : "Plantilla de respaldo"}
            </Badge>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-status-critical/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-status-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-status-good/70" />
            <span className="ml-3 truncate text-xs text-muted">
              {canal === "LLAMADA" ? "Guion de llamada" : "Bandeja de entrada"} — {nombre}
            </span>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {generando && (
                <motion.div
                  key="cargando"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {[100, 70, 90, 60, 80, 40].map((w, i) => (
                    <motion.div
                      key={i}
                      className="h-4 rounded bg-surface-hover"
                      style={{ width: `${w}%` }}
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                  <p className="pt-3 text-sm text-accent">
                    La IA está escribiendo el señuelo para {etiquetaDepartamento}. Con el
                    modelo grande tarda un par de minutos; no cierres la página.
                  </p>
                </motion.div>
              )}

              {!generando && !resultado && (
                <motion.div
                  key="vacio"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-64 flex-col items-center justify-center text-center text-muted"
                >
                  <Icon name="MailPlus" size={40} className="mb-3 text-muted" />
                  Configura la campaña y pulsa &quot;Generar campaña con IA&quot; para ver la
                  previsualización aquí.
                </motion.div>
              )}

              {!generando && resultado && (
                <motion.div key="resultado" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-sm text-muted">
                    De: <span className="text-foreground">{resultado.remitenteNombre}</span>
                    {resultado.remitenteEmail && ` <${resultado.remitenteEmail}>`}
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">{resultado.asunto}</p>
                  <p className="mt-3 whitespace-pre-line text-foreground">
                    {cuerpoParaPanel(resultado.cuerpo)}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {!generando && resultado && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="flex items-center gap-2 font-semibold text-status-good">
                <Icon name="CircleCheck" size={18} />
                Campaña guardada como borrador.
              </p>
              <Button
                size="sm"
                onClick={() => lanzar(resultado.campaniaId)}
                disabled={lanzando}
              >
                <Icon name={lanzando ? "LoaderCircle" : "Send"} size={16} />
                {lanzando ? "Repartiendo…" : "Lanzar a la plantilla"}
              </Button>
            </div>

            {lanzamiento && (
              <p role="status" className="mb-4 text-sm text-accent">
                {lanzamiento} Cada persona la verá en su buzón, con su propio enlace.
              </p>
            )}

            {resultado.origen === "fallback" && resultado.detalle && (
              <p className="mb-4 flex items-start gap-2 text-sm text-muted">
                <Icon name="Info" size={15} className="mt-0.5 shrink-0" />
                {resultado.detalle} Se ha usado la plantilla de respaldo del canal.
              </p>
            )}

            {resultado.contextoPerfil.length > 0 && (
              <p className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                <Icon name="Building" size={14} className="shrink-0" />
                Contextualizado con el perfil de la empresa:
                {resultado.contextoPerfil.map((elemento) => (
                  <span
                    key={elemento}
                    className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-xs text-foreground"
                  >
                    {elemento}
                  </span>
                ))}
              </p>
            )}
            <p className="mb-3 font-semibold text-foreground">
              Señales de alerta (se le enseñan a quien pique):
            </p>
            <ul className="space-y-2">
              {resultado.senalesAlerta.map((senal, i) => (
                <li key={i} className="flex items-start gap-2 text-muted">
                  <Icon
                    name="AlertTriangle"
                    size={18}
                    className="mt-0.5 shrink-0 text-status-warning"
                  />
                  {senal}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
