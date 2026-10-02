"use client";

import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";
import { Icon } from "@/components/ui/Icon";
import { RISK_LEVEL_META, riskLevelFromScore } from "@/lib/risk";

/**
 * Gauge de Risk Score. El color nunca es la única señal: siempre acompaña
 * el número exacto y la etiqueta textual del nivel de riesgo (icono +
 * texto), como exige la paleta de estado fija de la plataforma.
 */
export function RiskGauge({ score }: { score: number }) {
  const level = riskLevelFromScore(score);
  const meta = RISK_LEVEL_META[level];
  const data = [{ name: "risk", value: score, fill: meta.hex }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <RadialBarChart
          width={192}
          height={192}
          cx={96}
          cy={96}
          innerRadius={72}
          outerRadius={92}
          barSize={16}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "var(--surface-hover)" }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground">{score}</span>
          <span className="text-sm text-muted">/ 100</span>
        </div>
      </div>
      <div
        className="mt-4 flex items-center gap-2 text-base font-semibold"
        style={{ color: meta.hex }}
      >
        <Icon
          name={
            level === "BAJO"
              ? "CheckCircle2"
              : level === "MEDIO"
              ? "AlertTriangle"
              : level === "ALTO"
              ? "AlertOctagon"
              : "ShieldAlert"
          }
          size={20}
        />
        {meta.label}
      </div>
    </div>
  );
}
