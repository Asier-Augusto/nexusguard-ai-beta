"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PuntoHabilidad {
  /** Número de pregunta, empezando en 1. */
  pregunta: number;
  /** Habilidad estimada tras responderla. */
  habilidad: number;
  /** Extremos de la banda de error: [habilidad - SE, habilidad + SE]. */
  banda: [number, number];
  tema: string;
  acertada: boolean;
}

const ACCENT = "#22d3ee";
const MUTED = "#94a3b8";

/**
 * Cómo se ha ido situando al alumno pregunta a pregunta.
 *
 * Se dibuja la banda de error además de la línea porque sin ella el gráfico
 * miente: sugiere que el motor sabe la habilidad con precisión desde la
 * primera pregunta, cuando lo que ocurre es justo lo contrario. Que la banda se
 * estreche es la parte interesante, y es lo que justifica que el test pueda
 * terminar antes de agotar las preguntas.
 */
export function CurvaHabilidad({ puntos }: { puntos: PuntoHabilidad[] }) {
  const datos = puntos.map((p) => ({
    ...p,
    // Recharts pinta el área entre los dos valores del par.
    rango: p.banda,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={datos} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis
            dataKey="pregunta"
            stroke={MUTED}
            tick={{ fill: MUTED, fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[-3, 3]}
            ticks={[-3, -1.5, 0, 1.5, 3]}
            stroke={MUTED}
            tick={{ fill: MUTED, fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <ReferenceLine y={0} stroke="#334155" />
          <Area
            dataKey="rango"
            stroke="none"
            fill={ACCENT}
            fillOpacity={0.15}
            isAnimationActive={false}
          />
          <Line
            dataKey="habilidad"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ r: 3, fill: ACCENT }}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            labelFormatter={(v) => `Pregunta ${v}`}
            formatter={(valor, nombre, item) => {
              if (nombre === "rango") return [null, null];
              const p = item.payload as PuntoHabilidad;
              return [
                `${Number(valor).toFixed(2)} · ${p.tema} · ${p.acertada ? "acertada" : "fallada"}`,
                "Habilidad",
              ];
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
