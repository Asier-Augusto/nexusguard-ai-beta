"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import {
  finalizarCampania,
  lanzarCampania,
  simularEventoDePasarela,
} from "@/app/actions/phishing";
import type { DetalleCampania, ReaccionEmpleado } from "@/lib/data/phishing";

const REACCION: Record<ReaccionEmpleado, { etiqueta: string; variante: "warning" | "good" | "neutral" }> = {
  CLIC: { etiqueta: "Hizo clic", variante: "warning" },
  REPORTE: { etiqueta: "Lo reportó", variante: "good" },
  SIN_REACCION: { etiqueta: "Sin reaccionar", variante: "neutral" },
};

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function porDepartamento(detalle: DetalleCampania) {
  const mapa = new Map<string, { dept: string; clics: number; reportes: number; sin: number }>();

  for (const fila of detalle.resultados) {
    const actual = mapa.get(fila.departamento) ?? {
      dept: fila.departamento,
      clics: 0,
      reportes: 0,
      sin: 0,
    };
    if (fila.reaccion === "CLIC") actual.clics += 1;
    else if (fila.reaccion === "REPORTE") actual.reportes += 1;
    else actual.sin += 1;
    mapa.set(fila.departamento, actual);
  }

  return [...mapa.values()].sort((a, b) => b.clics - a.clics);
}

/**
 * Panel de resultados de una campaña.
 *
 * El botón de "simular" no es un atajo: dispara el webhook de verdad, firmado,
 * para poder enseñar el circuito completo sin depender de una pasarela de
 * correo externa. Si la firma estuviera mal configurada, este botón fallaría
 * exactamente igual que fallaría la integración real.
 */
export function ResultadoCampania({
  detalle,
  puedeGestionar,
}: {
  detalle: DetalleCampania;
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const [enCurso, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  const total = detalle.resultados.length;
  const clics = detalle.resultados.filter((r) => r.reaccion === "CLIC").length;
  const reportes = detalle.resultados.filter((r) => r.reaccion === "REPORTE").length;
  const sinReaccion = total - clics - reportes;
  const tasa = total === 0 ? 0 : Math.round((clics / total) * 100);

  function ejecutar(accion: () => Promise<{ detalle: string }>) {
    iniciar(async () => {
      setAviso((await accion()).detalle);
      router.refresh();
    });
  }

  /** El primero que no ha reaccionado todavía: es a quien tiene sentido simular. */
  const candidato = detalle.resultados.find(
    (r) => r.reaccion === "SIN_REACCION" && r.token
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {detalle.estado === "BORRADOR" && puedeGestionar && (
          <Button onClick={() => ejecutar(() => lanzarCampania(detalle.id))} disabled={enCurso}>
            <Icon name={enCurso ? "LoaderCircle" : "Send"} size={18} />
            Lanzar a la plantilla
          </Button>
        )}
        {detalle.estado === "ACTIVA" && puedeGestionar && (
          <>
            <Button
              variant="secondary"
              onClick={() => ejecutar(() => lanzarCampania(detalle.id))}
              disabled={enCurso}
            >
              <Icon name="UserPlus" size={18} />
              Repartir a quien falte
            </Button>
            <Button
              variant="secondary"
              onClick={() => ejecutar(() => finalizarCampania(detalle.id))}
              disabled={enCurso}
            >
              <Icon name="Flag" size={18} />
              Cerrar campaña
            </Button>
          </>
        )}
        {puedeGestionar && candidato && (
          <Button
            variant="ghost"
            onClick={() =>
              ejecutar(() => simularEventoDePasarela(candidato.token!, "CLIC"))
            }
            disabled={enCurso}
          >
            <Icon name="Webhook" size={18} />
            Simular un clic de {candidato.nombre.split(" ")[0]} vía webhook
          </Button>
        )}
      </div>

      {aviso && (
        <p
          role="status"
          className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-foreground"
        >
          {aviso}
        </p>
      )}

      {/* --- Cifras --- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { etiqueta: "Enviados", valor: total, color: "text-foreground", icono: "Send" },
          { etiqueta: "Hicieron clic", valor: clics, color: "text-status-serious", icono: "MousePointerClick" },
          { etiqueta: "Lo reportaron", valor: reportes, color: "text-status-good", icono: "ShieldCheck" },
          { etiqueta: "Sin reaccionar", valor: sinReaccion, color: "text-muted", icono: "Clock" },
        ].map((dato) => (
          <Card key={dato.etiqueta} className="p-5">
            <p className="flex items-center gap-2 text-sm text-muted">
              <Icon name={dato.icono} size={15} />
              {dato.etiqueta}
            </p>
            <p className={`mt-1 text-3xl font-bold ${dato.color}`}>{dato.valor}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-sm text-muted">Tasa de clic de la campaña</p>
        <p className="mt-1 text-4xl font-bold text-foreground">
          {tasa}
          <span className="text-2xl text-muted">%</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          {total === 0
            ? "La campaña todavía no se ha lanzado, así que no hay a quién medir."
            : `${clics} de ${total} personas pulsaron el enlace. Quien lo reportó hizo lo correcto: avisar protege a los demás.`}
        </p>
      </Card>

      {/* --- Por departamento --- */}
      {total > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-bold text-foreground">Por departamento</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={porDepartamento(detalle)}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis
                  dataKey="dept"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={54}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#131a24",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    color: "#f1f5f9",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="clics" name="Clic" stackId="a" fill="#ec835a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="reportes" name="Reportado" stackId="a" fill="#22d3ee" />
                <Bar dataKey="sin" name="Sin reaccionar" stackId="a" fill="#243040" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* --- Tabla por empleado --- */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left">
          <thead className="border-b border-border text-sm text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Empleado</th>
              <th className="px-5 py-3 font-medium">Departamento</th>
              <th className="px-5 py-3 font-medium">Reacción</th>
              <th className="px-5 py-3 font-medium">Cuándo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {detalle.resultados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted">
                  Nadie ha recibido esta campaña todavía.
                </td>
              </tr>
            )}
            {detalle.resultados.map((fila) => {
              const meta = REACCION[fila.reaccion];
              return (
                <tr key={fila.usuarioId}>
                  <td className="px-5 py-3 font-medium text-foreground">{fila.nombre}</td>
                  <td className="px-5 py-3 text-muted">{fila.departamento}</td>
                  <td className="px-5 py-3">
                    <Badge variant={meta.variante}>{meta.etiqueta}</Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {fila.cuando ? FORMATO_FECHA.format(fila.cuando) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
