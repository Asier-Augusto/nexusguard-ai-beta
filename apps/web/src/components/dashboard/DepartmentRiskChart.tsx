"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface RiesgoDepartamento {
  dept: string;
  score: number;
}

export function DepartmentRiskChart({ data }: { data: RiesgoDepartamento[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="dept" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "#131a24", border: "1px solid #1e293b", borderRadius: 12, color: "#f1f5f9" }}
            formatter={(value) => [`${value}/100`, "Risk Score medio"]}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={36}>
            {data.map((d) => (
              <Cell key={d.dept} fill={d.score >= 50 ? "#ec835a" : "#22d3ee"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
