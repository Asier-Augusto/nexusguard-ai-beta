"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { NexusGuardLogo } from "@/components/logo/NexusGuardLogo";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import {
  DEPARTAMENTOS,
  HERRAMIENTAS,
  NORMATIVAS,
  PROCESOS,
  SECTORES,
  SISTEMAS_OPERATIVOS,
  type DepartamentoKey,
  type SectorKey,
} from "@/lib/constants";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { completarOnboarding } from "@/app/actions/sesion";

/**
 * Cuestionario de perfilado de la empresa.
 *
 * Los pasos se declaran en este array en lugar de estar repartidos por el
 * componente: antes el número de pasos estaba escrito a mano en cuatro sitios
 * distintos (la condición de avance, la de guardado, la barra de progreso y el
 * texto del botón), de modo que añadir uno obligaba a acordarse de los cuatro.
 */
const PASOS = [
  { clave: "EMPRESA", titulo: "¿Cómo se llama tu empresa?" },
  { clave: "SECTOR", titulo: "¿A qué sector pertenece?" },
  { clave: "DEPARTAMENTO", titulo: "¿En qué departamento trabajas?" },
  { clave: "SISTEMAS", titulo: "¿Qué sistemas operativos usáis?" },
  { clave: "PROCESOS", titulo: "¿Cuáles son vuestros procesos críticos?" },
  { clave: "HERRAMIENTAS", titulo: "¿Con qué herramientas trabajáis?" },
  { clave: "NORMATIVAS", titulo: "¿Qué normativas os aplican?" },
  { clave: "RESUMEN", titulo: "Todo listo" },
] as const;

const ULTIMO_PASO = PASOS.length - 1;

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [guardando, iniciarGuardado] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [herramientaLibre, setHerramientaLibre] = useState("");

  const estado = useOnboardingStore();
  const {
    companyName,
    sector,
    department,
    sistemasOperativos,
    procesos,
    herramientas,
    otrasHerramientas,
    normativas,
  } = estado;

  const clavePaso = PASOS[step].clave;

  // Cada paso decide por su cuenta si permite avanzar. Los de perfilado exigen
  // al menos una respuesta: un perfil vacío no condicionaría nada.
  const puedeAvanzar: Record<(typeof PASOS)[number]["clave"], boolean> = {
    EMPRESA: companyName.trim().length > 1,
    SECTOR: !!sector,
    DEPARTAMENTO: !!department,
    SISTEMAS: sistemasOperativos.length > 0,
    PROCESOS: procesos.length > 0,
    HERRAMIENTAS: herramientas.length + otrasHerramientas.length > 0,
    NORMATIVAS: normativas.length > 0,
    RESUMEN: true,
  };

  function handleNext() {
    if (step < ULTIMO_PASO) {
      setStep((s) => s + 1);
      return;
    }

    if (!sector || !department) return;

    setError(null);
    iniciarGuardado(async () => {
      try {
        await completarOnboarding({
          nombreEmpresa: companyName,
          sector,
          departamento: department,
          sistemasOperativos,
          procesos,
          herramientas,
          otrasHerramientas,
          normativas,
        });
        router.push("/dashboard");
      } catch {
        setError(
          "No hemos podido guardar el perfil. Comprueba que la base de datos está levantada e inténtalo de nuevo."
        );
      }
    });
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function anadirHerramientaLibre() {
    estado.anadirOtraHerramienta(herramientaLibre);
    setHerramientaLibre("");
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center overflow-hidden px-6 py-12">
      {/* Fondo ambiental: halos difusos en movimiento, sello de plataforma premium */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-[100px]"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent-strong/10 blur-[110px]"
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative mb-8 flex items-center justify-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <NexusGuardLogo size={56} />
      </motion.div>

      {/* Barra de progreso: un segmento por paso declarado */}
      <div className="relative mb-3 flex gap-1.5">
        {PASOS.map((paso, i) => (
          <div
            key={paso.clave}
            className="h-2 flex-1 overflow-hidden rounded-full bg-surface-hover"
          >
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: i <= step ? "100%" : "0%" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        ))}
      </div>
      <p className="relative mb-8 text-center text-sm text-muted">
        Paso {step + 1} de {PASOS.length}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 32, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -32, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <h1 className="mb-8 text-center text-3xl font-bold text-foreground md:text-4xl">
            {PASOS[step].titulo}
          </h1>

          {clavePaso === "EMPRESA" && (
            <div className="mx-auto max-w-md">
              <label htmlFor="companyName" className="mb-3 block text-lg font-medium text-muted">
                Nombre de la empresa
              </label>
              <input
                id="companyName"
                autoFocus
                value={companyName}
                onChange={(e) => estado.setCompanyName(e.target.value)}
                placeholder="Ej: Transportes Ibérica S.A."
                className="w-full rounded-xl border border-border bg-surface px-5 py-4 text-lg text-foreground outline-none placeholder:text-muted/50 focus:border-accent"
              />
            </div>
          )}

          {clavePaso === "SECTOR" && (
            <Rejilla>
              {SECTORES.map((s) => (
                <motion.div key={s.key} variants={cardVariants}>
                  <TarjetaSeleccion
                    label={s.label}
                    icon={s.icon}
                    selected={sector === s.key}
                    onClick={() => estado.setSector(s.key as SectorKey)}
                  />
                </motion.div>
              ))}
            </Rejilla>
          )}

          {clavePaso === "DEPARTAMENTO" && (
            <Rejilla>
              {DEPARTAMENTOS.map((d) => (
                <motion.div key={d.key} variants={cardVariants}>
                  <TarjetaSeleccion
                    label={d.label}
                    icon={d.icon}
                    selected={department === d.key}
                    onClick={() => estado.setDepartment(d.key as DepartamentoKey)}
                  />
                </motion.div>
              ))}
            </Rejilla>
          )}

          {clavePaso === "SISTEMAS" && (
            <PasoMultiple
              ayuda="Marca todos los que se usen en la organización. Servirán para enfocar la formación."
              seleccionados={sistemasOperativos.length}
            >
              {SISTEMAS_OPERATIVOS.map((so) => (
                <motion.div key={so.key} variants={cardVariants}>
                  <TarjetaSeleccion
                    label={so.label}
                    icon={so.icon}
                    multiple
                    selected={sistemasOperativos.includes(so.key)}
                    onClick={() => estado.alternarSistemaOperativo(so.key)}
                  />
                </motion.div>
              ))}
            </PasoMultiple>
          )}

          {clavePaso === "PROCESOS" && (
            <PasoMultiple
              ayuda="Los procesos donde un engaño haría más daño. De aquí saldrán los pretextos de las simulaciones."
              seleccionados={procesos.length}
            >
              {PROCESOS.map((p) => (
                <motion.div key={p.key} variants={cardVariants}>
                  <TarjetaSeleccion
                    label={p.label}
                    icon={p.icon}
                    multiple
                    selected={procesos.includes(p.key)}
                    onClick={() => estado.alternarProceso(p.key)}
                  />
                </motion.div>
              ))}
            </PasoMultiple>
          )}

          {clavePaso === "HERRAMIENTAS" && (
            <div>
              <PasoMultiple
                ayuda="Las aplicaciones del día a día. Los correos trampa las suplantarán para que la simulación sea creíble."
                seleccionados={herramientas.length + otrasHerramientas.length}
              >
                {HERRAMIENTAS.map((h) => (
                  <motion.div key={h.key} variants={cardVariants}>
                    <TarjetaSeleccion
                      label={h.label}
                      icon={h.icon}
                      multiple
                      selected={herramientas.includes(h.key)}
                      onClick={() => estado.alternarHerramienta(h.key)}
                    />
                  </motion.div>
                ))}
              </PasoMultiple>

              <div className="mx-auto mt-6 max-w-lg">
                <label htmlFor="otraHerramienta" className="mb-2 block text-sm font-medium text-muted">
                  ¿Usáis alguna que no esté en la lista?
                </label>
                <div className="flex gap-2">
                  <input
                    id="otraHerramienta"
                    value={herramientaLibre}
                    onChange={(e) => setHerramientaLibre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        anadirHerramientaLibre();
                      }
                    }}
                    placeholder="Ej: TMS de flota"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-foreground outline-none placeholder:text-muted/50 focus:border-accent"
                  />
                  <Button
                    variant="secondary"
                    onClick={anadirHerramientaLibre}
                    disabled={!herramientaLibre.trim()}
                  >
                    <Icon name="Plus" size={18} />
                    Añadir
                  </Button>
                </div>

                {otrasHerramientas.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {otrasHerramientas.map((nombre) => (
                      <li key={nombre}>
                        <button
                          onClick={() => estado.quitarOtraHerramienta(nombre)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20"
                          aria-label={`Quitar ${nombre}`}
                        >
                          {nombre}
                          <Icon name="X" size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {clavePaso === "NORMATIVAS" && (
            <PasoMultiple
              ayuda="El marco normativo al que está sujeta la organización. Aparecerá en el informe de cumplimiento."
              seleccionados={normativas.length}
            >
              {NORMATIVAS.map((n) => (
                <motion.div key={n.key} variants={cardVariants}>
                  <TarjetaSeleccion
                    label={n.label}
                    icon={n.icon}
                    multiple
                    selected={normativas.includes(n.key)}
                    onClick={() => estado.alternarNormativa(n.key)}
                  />
                </motion.div>
              ))}
            </PasoMultiple>
          )}

          {clavePaso === "RESUMEN" && (
            <div className="mx-auto max-w-xl rounded-2xl border border-accent/30 bg-surface p-8 glow-accent">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
              >
                <Icon name="ShieldCheck" size={48} className="mx-auto mb-4 text-accent" />
              </motion.div>

              <p className="text-center text-lg text-foreground">
                Perfil de <b>{companyName || "tu empresa"}</b>, sector{" "}
                <b>{SECTORES.find((s) => s.key === sector)?.label}</b>.
              </p>

              <dl className="mt-6 space-y-3 text-sm">
                <FilaResumen
                  etiqueta="Tu departamento"
                  valores={[DEPARTAMENTOS.find((d) => d.key === department)?.label ?? ""]}
                />
                <FilaResumen
                  etiqueta="Sistemas operativos"
                  valores={sistemasOperativos.map(
                    (k) => SISTEMAS_OPERATIVOS.find((x) => x.key === k)?.label ?? k
                  )}
                />
                <FilaResumen
                  etiqueta="Procesos críticos"
                  valores={procesos.map((k) => PROCESOS.find((x) => x.key === k)?.label ?? k)}
                />
                <FilaResumen
                  etiqueta="Herramientas"
                  valores={[
                    ...herramientas.map(
                      (k) => HERRAMIENTAS.find((x) => x.key === k)?.label ?? k
                    ),
                    ...otrasHerramientas,
                  ]}
                />
                <FilaResumen
                  etiqueta="Normativas"
                  valores={normativas.map((k) => NORMATIVAS.find((x) => x.key === k)?.label ?? k)}
                />
              </dl>

              <p className="mt-6 text-center text-sm text-muted">
                Con esto adaptaremos las simulaciones de phishing y el informe de
                cumplimiento a tu organización.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p
          role="alert"
          className="relative mt-8 rounded-xl border border-status-critical/50 bg-status-critical/10 px-5 py-4 text-center text-sm text-foreground"
        >
          {error}
        </p>
      )}

      <div className="relative mt-12 flex justify-between">
        <Button variant="ghost" size="lg" onClick={handleBack} disabled={step === 0 || guardando}>
          <Icon name="ArrowLeft" size={20} />
          Atrás
        </Button>
        <Button
          size="lg"
          onClick={handleNext}
          disabled={!puedeAvanzar[clavePaso] || guardando}
        >
          {step === ULTIMO_PASO
            ? guardando
              ? "Guardando el perfil…"
              : "Entrar a NexusGuard AI"
            : "Continuar"}
          <Icon name={guardando ? "LoaderCircle" : "ArrowRight"} size={20} />
        </Button>
      </div>
    </div>
  );
}

function Rejilla({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {children}
    </motion.div>
  );
}

/** Paso de respuesta múltiple: rejilla, texto de ayuda y recuento de marcados. */
function PasoMultiple({
  ayuda,
  seleccionados,
  children,
}: {
  ayuda: string;
  seleccionados: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mx-auto mb-5 max-w-lg text-center text-muted">{ayuda}</p>
      <Rejilla>{children}</Rejilla>
      <p className="mt-5 text-center text-sm text-muted">
        {seleccionados === 0
          ? "Marca al menos una opción para continuar."
          : `${seleccionados} ${seleccionados === 1 ? "seleccionada" : "seleccionadas"}.`}
      </p>
    </div>
  );
}

function FilaResumen({ etiqueta, valores }: { etiqueta: string; valores: string[] }) {
  const utiles = valores.filter(Boolean);
  if (utiles.length === 0) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 border-t border-border pt-3">
      <dt className="text-muted">{etiqueta}:</dt>
      <dd className="font-medium text-foreground">{utiles.join(" · ")}</dd>
    </div>
  );
}

/**
 * Tarjeta de selección. En modo `multiple` funciona como casilla: alterna y
 * muestra una marca, en vez de sustituir a la opción anterior.
 */
function TarjetaSeleccion({
  label,
  icon,
  selected,
  multiple = false,
  onClick,
}: {
  label: string;
  icon: string;
  selected: boolean;
  multiple?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      role={multiple ? "checkbox" : undefined}
      aria-checked={multiple ? selected : undefined}
      aria-pressed={multiple ? undefined : selected}
      className={`relative flex w-full flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-colors ${
        selected
          ? "border-accent bg-accent/10 text-accent glow-accent"
          : "border-border bg-surface text-foreground hover:bg-surface-hover"
      }`}
    >
      {multiple && selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[#001015]">
          <Icon name="Check" size={13} />
        </span>
      )}
      <Icon name={icon} size={30} />
      <span className="text-sm font-medium leading-tight">{label}</span>
    </motion.button>
  );
}
