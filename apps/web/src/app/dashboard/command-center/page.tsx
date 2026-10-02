import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/dashboard/StatCard";
import { SimuladorRiesgo } from "@/components/dashboard/SimuladorRiesgo";
import { BotonInforme } from "@/components/dashboard/BotonInforme";
import { PanelOntologia } from "@/components/dashboard/PanelOntologia";
import { listarPlantilla, resumenRiesgo } from "@/lib/data/command-center";
import { coberturaDeEmpresa } from "@/lib/data/cumplimiento";
import { informeDeEmpresa } from "@/lib/data/informe";
import { encuadreDeEmpresa } from "@/lib/data/adaptacion";
import { obtenerUsuarioActivo } from "@/lib/session";
import { RISK_LEVEL_META, riskLevelFromScore } from "@/lib/risk";
import { META_NIVEL } from "@/lib/cumplimiento/marco";
import { SECTORES } from "@/lib/constants";

export default async function CommandCenterPage() {
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  const [plantilla, resumen, cobertura, encuadre] = await Promise.all([
    listarPlantilla(usuario.empresa.id),
    resumenRiesgo(usuario.empresa.id),
    coberturaDeEmpresa(usuario.empresa.id),
    encuadreDeEmpresa(usuario.empresa.id),
  ]);

  const informe = await informeDeEmpresa(
    usuario.empresa.id,
    encuadre?.huella ?? null,
    cobertura.huellaDatos
  );
  const narrativaVigente = informe?.estado === "AL_DIA" ? informe : null;

  const sector =
    SECTORES.find((s) => s.key === usuario.empresa.sector)?.label ?? usuario.empresa.sector;
  const peor = cobertura.normativas[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Command Center DPO</h1>
          <p className="mt-1 text-lg text-muted">
            Risk Score de la plantilla y cobertura de concienciación de las normativas que
            declaró la empresa.
          </p>
        </div>
        <BotonInforme
          datos={{
            nombreEmpresa: usuario.empresa.nombre,
            sector,
            riesgoGlobal: resumen.riesgoGlobal,
            // Las cifras se recalculan aquí mismo; la narrativa solo baja al
            // documento si sigue hablando de estas cifras.
            cobertura,
            narrativa: narrativaVigente?.narrativa ?? null,
            modeloNarrativa: narrativaVigente?.modelo ?? null,
            empleados: plantilla.map((e) => ({
              nombre: e.nombre,
              departamento: e.departamentoEtiqueta,
              score: e.score,
              nivel: RISK_LEVEL_META[e.nivel].label,
            })),
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="Gauge"
          label="Riesgo global de la organización"
          value={`${resumen.riesgoGlobal}/100`}
          hint={RISK_LEVEL_META[riskLevelFromScore(resumen.riesgoGlobal)].label}
        />
        {/* Estas dos tarjetas eran un 87% y un 94% escritos a mano, iguales
            para cualquier empresa. Ahora salen del marco que declaró esta. */}
        <StatCard
          icon="ShieldCheck"
          label="Cobertura de concienciación"
          value={`${cobertura.global}%`}
          hint={
            cobertura.normativas.length > 0
              ? `${cobertura.normativas.length} normativas declaradas`
              : "Sin marco normativo declarado"
          }
        />
        <StatCard
          icon="Scale"
          label="Normativa peor cubierta"
          value={peor ? `${peor.porcentaje}%` : "—"}
          hint={peor ? peor.etiqueta : "Completa el perfil de empresa"}
        />
        <StatCard
          icon="AlertTriangle"
          label="Empleados en riesgo"
          value={`${resumen.enRiesgo}`}
          hint={`de ${resumen.totalEmpleados} analizados`}
        />
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 border-accent/30 bg-accent/5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Icon name="Scale" size={18} className="text-accent" />
            Cobertura normativa
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {cobertura.normativas.length > 0 ? (
              <>
                {cobertura.normativas.map((n) => n.etiqueta).join(" · ")} — requisito a
                requisito, con la evidencia detrás y el informe para dirección.
              </>
            ) : (
              <>
                La empresa no ha declarado ninguna normativa en su perfil, así que no hay
                marco contra el que medir la concienciación.
              </>
            )}
          </p>
          {peor && (
            <p className="mt-2">
              <Badge variant={META_NIVEL[peor.nivel].variante}>
                {peor.etiqueta} al {peor.porcentaje}%
              </Badge>
            </p>
          )}
        </div>
        <Link
          href="/dashboard/command-center/cumplimiento"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-[#001015] transition-all hover:bg-accent-soft"
        >
          Ver el detalle
          <Icon name="ChevronRight" size={18} />
        </Link>
      </Card>

      <PanelOntologia empresaId={usuario.empresa.id} />

      <SimuladorRiesgo />

      <Card>
        <h2 className="mb-1 text-lg font-bold text-foreground">Plantilla</h2>
        <p className="mb-4 text-sm text-muted">
          {plantilla.length} empleados, ordenados de mayor a menor riesgo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-sm text-muted">
                <th className="pb-3 pr-4">Empleado</th>
                <th className="pb-3 pr-4">Departamento</th>
                <th className="pb-3">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {plantilla.map((empleado) => {
                const meta = RISK_LEVEL_META[empleado.nivel];
                return (
                  <tr key={empleado.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{empleado.nombre}</td>
                    <td className="py-3 pr-4 text-muted">{empleado.departamentoEtiqueta}</td>
                    <td className="py-3">
                      <Badge variant={meta.variant}>
                        {empleado.score} · {meta.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
