"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { RiskBreakdownChart } from "@/components/dashboard/RiskBreakdownChart";
import { computeRiskScore, type RiskComputeResponse } from "@/lib/ai-client";

/**
 * Simulador "qué pasaría si": permite jugar con los cuatro factores del Risk
 * Score y ver el resultado.
 *
 * El cálculo lo hace el servicio de inferencia (POST /risk/compute). Antes
 * había una tercera copia de la fórmula en el navegador, además de la del
 * servicio y la del seed; ahora la fórmula vive en un solo sitio.
 */
export function SimuladorRiesgo() {
  const [clics, setClics] = useState(30);
  const [formacion, setFormacion] = useState(70);
  const [evaluaciones, setEvaluaciones] = useState(75);
  const [inactividad, setInactividad] = useState(10);
  const [resultado, setResultado] = useState<RiskComputeResponse | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calcular() {
    setCalculando(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(
        await computeRiskScore({
          phishing_click_rate: clics / 100,
          training_completion_rate: formacion / 100,
          quiz_avg_score: evaluaciones,
          days_since_last_activity: inactividad,
        })
      );
    } catch {
      setError(
        "El motor de cálculo no responde. Arranca el servicio de inferencia (puerto 8010) con npm run dev:api y vuelve a intentarlo."
      );
    } finally {
      setCalculando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Simulador de Risk Score</h2>
          <p className="mt-1 text-sm text-muted">
            Lo calcula el motor de inferencia con la misma fórmula que puntúa a la
            plantilla.
          </p>
        </div>

        <Deslizador label="Clics en simulaciones de phishing" valor={clics} onChange={setClics} sufijo="%" />
        <Deslizador label="Formación completada" valor={formacion} onChange={setFormacion} sufijo="%" />
        <Deslizador label="Nota media en evaluaciones" valor={evaluaciones} onChange={setEvaluaciones} sufijo="/100" />
        <Deslizador label="Días desde la última actividad" valor={inactividad} onChange={setInactividad} max={90} sufijo=" días" />

        <Button onClick={() => void calcular()} disabled={calculando}>
          <Icon name={calculando ? "LoaderCircle" : "Calculator"} size={20} />
          {calculando ? "Calculando…" : "Calcular Risk Score"}
        </Button>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-status-critical/50 bg-status-critical/10 px-4 py-3 text-sm text-foreground"
          >
            {error}
          </p>
        )}
      </Card>

      <Card className="flex flex-col items-center justify-center">
        {resultado ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <RiskGauge score={resultado.score} />
            <div className="mt-6 w-full">
              <RiskBreakdownChart breakdown={resultado.breakdown} />
            </div>
          </motion.div>
        ) : (
          <p className="text-center text-muted">
            Ajusta los parámetros y pulsa &quot;Calcular Risk Score&quot; para ver el
            resultado del motor de IA.
          </p>
        )}
      </Card>
    </div>
  );
}

function Deslizador({
  label,
  valor,
  onChange,
  max = 100,
  sufijo = "",
}: {
  label: string;
  valor: number;
  onChange: (v: number) => void;
  max?: number;
  sufijo?: string;
}) {
  const id = `deslizador-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div>
      <div className="mb-2 flex justify-between text-base">
        <label htmlFor={id} className="font-medium text-muted">
          {label}
        </label>
        <span className="font-semibold text-foreground">
          {valor}
          {sufijo}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  );
}
