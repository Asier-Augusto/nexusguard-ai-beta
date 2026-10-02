"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

/** Estados de progreso (no identidad de series): rampa de un solo tono de
 * marca, de más saturado (completado) a neutro (pendiente), siempre con
 * leyenda directa junto al gráfico. */
export function CompletionDonut({
  completadas,
  enCurso,
  pendientes,
}: {
  completadas: number;
  enCurso: number;
  pendientes: number;
}) {
  const DATA = [
    { name: "Completado", value: completadas, color: "#22d3ee" },
    { name: "En curso", value: enCurso, color: "#67e8f9" },
    { name: "Pendiente", value: pendientes, color: "var(--surface-hover)" },
  ];
  const total = DATA.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={DATA}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              stroke="none"
            >
              {DATA.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#131a24", border: "1px solid #1e293b", borderRadius: 12, color: "#f1f5f9" }}
              formatter={(value, name) => [`${value} de ${total} píldoras`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-sm">
        {DATA.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-foreground">{d.name}</span>
            <span className="text-muted">· {d.value}/{total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
