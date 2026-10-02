"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

const LABELS: Record<string, string> = {
  phishing: "Clics en phishing",
  formacion: "Formación pendiente",
  evaluaciones: "Evaluaciones bajas",
  inactividad: "Inactividad",
};

export function RiskBreakdownChart({ breakdown }: { breakdown: Record<string, number> }) {
  const data = Object.entries(breakdown).map(([key, value]) => ({
    key,
    label: LABELS[key] ?? key,
    value,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid horizontal={false} stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis type="number" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#94a3b8"
            tick={{ fill: "#f1f5f9", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip
            contentStyle={{ background: "#131a24", border: "1px solid #1e293b", borderRadius: 12, color: "#f1f5f9" }}
            formatter={(value) => [`${value} pts`, "Contribución al riesgo"]}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
            {data.map((d) => (
              <Cell key={d.key} fill="#22d3ee" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
