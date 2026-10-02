import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FadeUp } from "@/components/ui/FadeUp";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { StatCard } from "@/components/dashboard/StatCard";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { CompletionDonut } from "@/components/dashboard/CompletionDonut";
import { DepartmentRiskChart } from "@/components/dashboard/DepartmentRiskChart";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { MODULES } from "@/lib/modules";
import { modulosDesbloqueados } from "@/lib/permisos";
import { obtenerSesion } from "@/lib/session";
import { DEPARTAMENTOS, SECTORES } from "@/lib/constants";
import { riesgoPorDepartamento, resumenRiesgo } from "@/lib/data/command-center";
import { resumenProgreso } from "@/lib/data/formacion";
import { contarSimulacionesRecientes } from "@/lib/data/phishing";
import { coberturaDeEmpresa } from "@/lib/data/cumplimiento";
import {
  actividadUltimasSemanas,
  contarModulosActivos,
  nivelEvaluacion,
  porcentajePlantillaFormada,
  simulacionesRecibidas,
} from "@/lib/data/panel";

const NIVELES_CAT = ["Principiante", "Básico", "Intermedio", "Avanzado", "Experto"];

export default async function DashboardPage() {
  const { usuario, pildorasCompletadas } = await obtenerSesion();
  // El layout ya ha redirigido si no hay sesión; aquí siempre hay usuario.
  if (!usuario) return null;

  const empresaId = usuario.empresa.id;

  const [
    resumen,
    porDepartamento,
    progreso,
    plantillaFormada,
    modulosActivos,
    actividad,
    simulacionesEmpresa,
    misSimulaciones,
    nivel,
    cobertura,
  ] = await Promise.all([
    resumenRiesgo(empresaId),
    riesgoPorDepartamento(empresaId),
    resumenProgreso(usuario.id, empresaId),
    porcentajePlantillaFormada(empresaId),
    contarModulosActivos(empresaId),
    actividadUltimasSemanas(empresaId),
    contarSimulacionesRecientes(empresaId),
    simulacionesRecibidas(usuario.id),
    nivelEvaluacion(usuario.id),
    coberturaDeEmpresa(empresaId),
  ]);

  const sectorLabel =
    SECTORES.find((s) => s.key === usuario.empresa.sector)?.label ?? usuario.empresa.sector;
  const deptLabel =
    DEPARTAMENTOS.find((d) => d.key === usuario.departamento)?.label ?? usuario.departamento;

  const desbloqueados = modulosDesbloqueados({ rol: usuario.rol, pildorasCompletadas });
  const modulosOrdenados = [...MODULES].sort((a, b) => a.order - b.order);

  const mejora = resumen.variacionMensual !== null && resumen.variacionMensual <= 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Hola, {usuario.nombre.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-lg text-muted">
          {usuario.empresa.nombre} · {sectorLabel} · {deptLabel} — este es tu Centro de
          Mando de ciberseguridad.
        </p>
      </div>

      {/* Hero: Nivel de Riesgo Global */}
      <FadeUp>
        <Card className="relative overflow-hidden border-accent/30 glow-accent">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted">
                Nivel de Riesgo Global de la organización
              </p>
              <p className="mt-2 text-6xl font-black text-foreground">
                <AnimatedNumber value={resumen.riesgoGlobal} suffix="%" />
              </p>
              {resumen.variacionMensual !== null && (
                <Badge variant={mejora ? "good" : "serious"} className="mt-3">
                  <Icon name={mejora ? "TrendingDown" : "TrendingUp"} size={14} />
                  {resumen.variacionMensual > 0 ? "+" : ""}
                  {resumen.variacionMensual} pts vs. mes anterior
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
              <MiniStat icon="LayoutGrid" value={modulosActivos} suffix="" label="Módulos activos" />
              <MiniStat icon="Users" value={plantillaFormada} suffix="%" label="Plantilla formada" />
              <MiniStat icon="Fish" value={simulacionesEmpresa} suffix="" label="Simulaciones este mes" />
              {/* Antes aquí había un 87% escrito a mano. Ahora es la media de
                  las normativas que la empresa declaró, calculada sobre su
                  formación, sus evaluaciones y sus campañas. */}
              <MiniStat
                icon="ShieldCheck"
                value={cobertura.global}
                suffix="%"
                label={
                  cobertura.normativas.length > 0
                    ? `Concienciación · ${cobertura.normativas.length} normativas`
                    : "Sin marco normativo"
                }
              />
            </div>
          </div>
        </Card>
      </FadeUp>

      <FadeUp delay={0.05} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="BookOpenCheck"
          label="Píldoras completadas"
          value={`${progreso.completadas}`}
          hint={`de ${progreso.total} temas disponibles`}
        />
        <StatCard
          icon="Target"
          label="Nivel de evaluación"
          value={nivel !== null ? NIVELES_CAT[nivel - 1] ?? `Nivel ${nivel}` : "Sin datos"}
          hint={nivel !== null ? "Motor CAT adaptativo" : "Aún no has hecho ninguna"}
        />
        <StatCard
          icon="Fish"
          label="Simulaciones recibidas"
          value={`${misSimulaciones.total}`}
          hint={`${misSimulaciones.clics} ${misSimulaciones.clics === 1 ? "clic detectado" : "clics detectados"}`}
        />
        <StatCard
          icon="Users"
          label="Empleados formados"
          value={`${plantillaFormada}%`}
          hint="del catálogo, de media"
        />
      </FadeUp>

      <FadeUp delay={0.1} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-2 text-lg font-bold text-foreground">Tu Risk Score</h2>
          <p className="mb-4 text-sm text-muted">
            Calculado a partir de tu actividad, formación y simulaciones.
          </p>
          <RiskGauge score={usuario.riskScore} />
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-lg font-bold text-foreground">Progreso de formación</h2>
          <p className="mb-4 text-sm text-muted">Últimas 8 semanas</p>
          <ActivityChart data={actividad} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.15} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-1 text-lg font-bold text-foreground">Estado de tu formación</h2>
          <p className="mb-4 text-sm text-muted">{progreso.total} píldoras disponibles</p>
          <CompletionDonut
            completadas={progreso.completadas}
            enCurso={progreso.enCurso}
            pendientes={progreso.pendientes}
          />
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-lg font-bold text-foreground">
            Risk Score medio por departamento
          </h2>
          <p className="mb-4 text-sm text-muted">Identifica qué equipos necesitan refuerzo</p>
          <DepartmentRiskChart
            data={porDepartamento.map((d) => ({ dept: d.departamento, score: d.score }))}
          />
        </Card>
      </FadeUp>

      <FadeUp delay={0.2}>
        <h2 className="mb-4 text-xl font-bold text-foreground">Módulos de la plataforma</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modulosOrdenados.map((mod) => (
            <ModuleCard
              key={mod.key}
              module={mod}
              unlocked={desbloqueados.includes(mod.key)}
            />
          ))}
        </div>
      </FadeUp>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  suffix,
  label,
}: {
  icon: string;
  value: number;
  suffix: string;
  label: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-2xl font-bold text-foreground">
        <Icon name={icon} size={18} className="text-accent" />
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
