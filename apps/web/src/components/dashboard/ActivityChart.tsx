"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PuntoActividad {
  semana: string;
  /** Porcentaje del catálogo completado por la plantilla en esa semana. */
  progreso: number;
}

export function ActivityChart({ data }: { data: PuntoActividad[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="progresoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis
            dataKey="semana"
            stroke="#94a3b8"
            tick={{ fill: "#94a3b8", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: "#94a3b8", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "#131a24",
              border: "1px solid #1e293b",
              borderRadius: 12,
              color: "#f1f5f9",
            }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(value) => [`${value}%`, "Progreso de formación"]}
          />
          <Area
            type="monotone"
            dataKey="progreso"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#progresoFill)"
            activeDot={{ r: 6, fill: "#22d3ee", stroke: "#05070a", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
