"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { DifficultyMeter } from "@/components/evaluation/DifficultyMeter";
import { CurvaHabilidad, type PuntoHabilidad } from "@/components/evaluation/CurvaHabilidad";
import type {
  CatHistoryItem,
  CatQuestion,
  ModoEvaluacion,
  MotorCat,
} from "@/lib/ai-client";
import {
  guardarIntento,
  siguientePregunta,
  type RespuestaIntento,
} from "@/app/actions/evaluacion";
import type { TemaEvaluable } from "@/lib/data/evaluacion";
import { cn } from "@/lib/utils";

type Fase = "ELEGIR" | "EN_CURSO" | "TERMINADO";

/** Longitud de la evaluación completa: más larga porque recorre varios temas. */
const PREGUNTAS_MODO_MIXTO = 12;

const ETIQUETA_MOTOR: Record<MotorCat, { texto: string; detalle: string }> = {
  "red+irt": {
    texto: "Red neuronal + IRT",
    detalle:
      "Las preguntas se han elegido con la red de trazado de conocimiento y el modelo psicométrico calibrado.",
  },
  irt: {
    texto: "Solo IRT",
    detalle:
      "La red neuronal no estaba disponible. Las preguntas se han elegido por información de Fisher.",
  },
  heuristica: {
    texto: "Heurística",
    detalle:
      "No hay parámetros calibrados: se ha usado la regla de subir o bajar un nivel. Ejecuta la calibración para activar el motor adaptativo.",
  },
};

export function TestAdaptativo({ temas }: { temas: TemaEvaluable[] }) {
  const [fase, setFase] = useState<Fase>("ELEGIR");
  const [modo, setModo] = useState<ModoEvaluacion>("TEMA_UNICO");
  const [temaInicial, setTemaInicial] = useState<TemaEvaluable | null>(null);
  const [historial, setHistorial] = useState<CatHistoryItem[]>([]);
  const [respuestas, setRespuestas] = useState<RespuestaIntento[]>([]);
  const [curva, setCurva] = useState<PuntoHabilidad[]>([]);
  const [pregunta, setPregunta] = useState<CatQuestion | null>(null);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [resumen, setResumen] = useState({
    puntuacion: 0,
    nivel: 3,
    habilidad: 0,
    error: 1,
    motor: "heuristica" as MotorCat,
    dominio: {} as Record<string, number>,
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  /** Momento en que se pintó la pregunta actual, para medir cuánto se tarda
   *  en responder. Se sella en un efecto y no en el manejador porque
   *  `Date.now()` es impura y el compilador de React no la admite en render. */
  const mostradaEn = useRef<number>(0);

  useEffect(() => {
    if (pregunta) mostradaEn.current = Date.now();
  }, [pregunta]);

  const totalPreguntas =
    modo === "MIXTO" ? PREGUNTAS_MODO_MIXTO : temaInicial?.numeroPreguntas ?? 0;
  const titulosPorTema = new Map(temas.map((t) => [t.tema, t.titulo]));

  const ERROR_SERVICIO =
    "No hemos podido contactar con el motor de evaluación. Comprueba que el servicio de inferencia está levantado en el puerto 8010 e inténtalo de nuevo.";

  function opciones(modoElegido: ModoEvaluacion, tema: TemaEvaluable | null) {
    return {
      maxQuestions:
        modoElegido === "MIXTO" ? PREGUNTAS_MODO_MIXTO : tema?.numeroPreguntas ?? 10,
      mode: modoElegido,
      topics: modoElegido === "MIXTO" ? temas.map((t) => t.tema) : [],
    };
  }

  async function empezar(modoElegido: ModoEvaluacion, tema: TemaEvaluable | null) {
    setError(null);
    setCargando(true);
    try {
      const primerTema = tema?.tema ?? temas[0]?.tema;
      if (!primerTema) {
        setError("No hay temas evaluables para tu empresa ahora mismo.");
        return;
      }
      const res = await siguientePregunta(primerTema, [], opciones(modoElegido, tema));
      if (!res.question) {
        setError("Este tema no tiene preguntas disponibles ahora mismo.");
        return;
      }
      setModo(modoElegido);
      setTemaInicial(tema ?? temas[0] ?? null);
      setHistorial([]);
      setRespuestas([]);
      setCurva([]);
      setSeleccion(null);
      setPregunta(res.question);
      setResumen((r) => ({ ...r, motor: res.engine, nivel: res.next_level }));
      setFase("EN_CURSO");
    } catch {
      setError(ERROR_SERVICIO);
    } finally {
      setCargando(false);
    }
  }

  async function siguiente() {
    if (!pregunta || seleccion === null) return;

    const acertada = seleccion === pregunta.correct_index;
    const milisegundos = mostradaEn.current ? Date.now() - mostradaEn.current : undefined;
    // El `item_id` es lo que impide que el motor vuelva a servir esta misma
    // pregunta más adelante en el intento.
    const nuevoHistorial: CatHistoryItem[] = [
      ...historial,
      {
        item_id: pregunta.id,
        topic: pregunta.topic,
        level: pregunta.level,
        correct: acertada,
        elapsed_ms: milisegundos,
      },
    ];
    setHistorial(nuevoHistorial);
    setSeleccion(null);
    setError(null);
    setCargando(true);

    try {
      const res = await siguientePregunta(
        pregunta.topic,
        nuevoHistorial,
        opciones(modo, temaInicial)
      );

      // Se registra lo que el motor sabía al plantear la pregunta y lo que
      // estima justo después de contestarla: es el dato que permitirá
      // recalibrar el banco y reentrenar la red con respuestas reales.
      const nuevasRespuestas: RespuestaIntento[] = [
        ...respuestas,
        {
          itemId: pregunta.id,
          tema: pregunta.topic,
          nivel: pregunta.level,
          acertada,
          dificultadB: pregunta.difficulty_b,
          discriminacionA: pregunta.discrimination_a,
          probabilidadPredicha: pregunta.predicted_prob,
          thetaDespues: res.ability_theta,
          errorDespues: res.ability_se,
          origen: pregunta.source,
          milisegundos,
        },
      ];
      setRespuestas(nuevasRespuestas);

      const nuevaCurva: PuntoHabilidad[] = [
        ...curva,
        {
          pregunta: nuevoHistorial.length,
          habilidad: res.ability_theta,
          banda: [res.ability_theta - res.ability_se, res.ability_theta + res.ability_se],
          tema: titulosPorTema.get(pregunta.topic) ?? pregunta.topic,
          acertada,
        },
      ];
      setCurva(nuevaCurva);

      const nuevoResumen = {
        puntuacion: res.estimated_score,
        nivel: res.next_level,
        habilidad: res.ability_theta,
        error: res.ability_se,
        motor: res.engine,
        dominio: res.topic_mastery,
      };
      setResumen(nuevoResumen);

      if (res.finished || !res.question) {
        setPregunta(null);
        setFase("TERMINADO");
        // El intento se persiste en cuanto termina, no al salir de la página.
        iniciarGuardado(async () => {
          try {
            await guardarIntento({
              tema: temaInicial?.tema ?? pregunta.topic,
              temas: [...new Set(nuevoHistorial.map((h) => h.topic))],
              modo,
              motor: nuevoResumen.motor,
              recorrido: nuevoHistorial.map((h) => ({
                level: h.level,
                correct: h.correct,
              })),
              respuestas: nuevasRespuestas,
              nivelFinal: nuevoResumen.nivel,
              puntuacion: nuevoResumen.puntuacion,
              habilidad: nuevoResumen.habilidad,
              errorEstandar: nuevoResumen.error,
            });
          } catch {
            setError(
              "La evaluación ha terminado pero no hemos podido guardarla. Revisa la conexión con la base de datos."
            );
          }
        });
      } else {
        setPregunta(res.question);
      }
    } catch {
      setError(ERROR_SERVICIO);
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setFase("ELEGIR");
    setTemaInicial(null);
    setPregunta(null);
    setHistorial([]);
    setRespuestas([]);
    setCurva([]);
    setSeleccion(null);
    setError(null);
  }

  if (fase === "ELEGIR") {
    return (
      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-bold text-foreground">Evaluación completa</h2>
          <p className="mt-1 text-sm text-muted">
            Recorre todos los temas que le aplican a tu empresa. Cada tres preguntas el
            motor cambia al tema en el que peor estimas, y ajusta la dificultad pregunta a
            pregunta.
          </p>
          <Button
            className="mt-4"
            onClick={() => void empezar("MIXTO", null)}
            disabled={cargando || temas.length === 0}
          >
            Empezar evaluación completa
            <Icon name={cargando ? "LoaderCircle" : "Sparkles"} size={18} />
          </Button>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-foreground">…o practica un tema suelto</h2>
          <p className="mt-1 text-sm text-muted">
            El motor arranca en dificultad intermedia y sube o baja según aciertes.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {temas.map((tema) => (
              <button
                key={tema.tema}
                onClick={() => void empezar("TEMA_UNICO", tema)}
                disabled={cargando}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated p-4 text-left transition-colors hover:border-accent/50 disabled:opacity-60"
              >
                <span>
                  <span className="block font-semibold text-foreground">{tema.titulo}</span>
                  <span className="block text-sm text-muted">
                    hasta {tema.numeroPreguntas} preguntas
                  </span>
                </span>
                <Icon name="ArrowRight" size={18} className="shrink-0 text-accent" />
              </button>
            ))}
          </div>
        </Card>

        {error && <MensajeError texto={error} />}
      </div>
    );
  }

  const temaActual = pregunta?.topic ?? historial.at(-1)?.topic ?? "";
  const nivelActual = pregunta?.level ?? historial.at(-1)?.level ?? 3;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <div className="mb-2 flex justify-between text-sm font-medium text-muted">
            <span>{titulosPorTema.get(temaActual) ?? temaActual}</span>
            <span>
              {historial.length}/{totalPreguntas}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-hover">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{
                width: `${totalPreguntas ? (historial.length / totalPreguntas) * 100 : 0}%`,
              }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
        <DifficultyMeter level={nivelActual} />
      </Card>

      {error && <MensajeError texto={error} />}

      {pregunta && (
        <Card>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge variant="accent">Nivel {pregunta.level} / 5</Badge>
            {modo === "MIXTO" && (
              <Badge variant="neutral">
                {titulosPorTema.get(pregunta.topic) ?? pregunta.topic}
              </Badge>
            )}
            {pregunta.source === "ollama" && (
              <Badge variant="warning">Generada por IA para reforzar</Badge>
            )}
            <span className="ml-auto text-sm text-muted">
              Pregunta {historial.length + 1}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={pregunta.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              <h2 className="mb-5 text-xl font-bold text-foreground">{pregunta.prompt}</h2>
              <div className="space-y-3">
                {pregunta.options.map((opcion, i) => {
                  const elegida = seleccion === i;
                  const esCorrecta = seleccion !== null && i === pregunta.correct_index;
                  const esFallo = seleccion !== null && elegida && i !== pregunta.correct_index;
                  return (
                    <button
                      key={i}
                      onClick={() => seleccion === null && setSeleccion(i)}
                      disabled={seleccion !== null}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                        seleccion === null &&
                          "border-border bg-surface-elevated hover:border-accent/50",
                        esCorrecta && "border-status-good bg-status-good/10",
                        esFallo && "border-status-critical bg-status-critical/10",
                        seleccion !== null && !esCorrecta && !esFallo && "border-border opacity-50"
                      )}
                    >
                      {esCorrecta && (
                        <Icon name="CheckCircle2" size={18} className="text-status-good" />
                      )}
                      {esFallo && (
                        <Icon name="XCircle" size={18} className="text-status-critical" />
                      )}
                      <span className="text-foreground">{opcion}</span>
                    </button>
                  );
                })}
              </div>

              {seleccion !== null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-5 rounded-xl border border-border bg-surface-elevated p-4"
                >
                  <p className="text-muted">{pregunta.explanation}</p>
                  <Button size="md" className="mt-4" onClick={() => void siguiente()} disabled={cargando}>
                    {cargando ? "Calculando…" : "Siguiente"}
                    <Icon name={cargando ? "LoaderCircle" : "ArrowRight"} size={18} />
                  </Button>
                  {cargando && seleccion !== pregunta.correct_index && (
                    <p className="mt-2 text-sm text-muted">
                      Preparando otra pregunta sobre lo mismo…
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      )}

      {fase === "TERMINADO" && (
        <Resultado
          resumen={resumen}
          curva={curva}
          respuestas={respuestas}
          titulos={titulosPorTema}
          guardando={guardando}
          onReiniciar={reiniciar}
        />
      )}
    </div>
  );
}

function Resultado({
  resumen,
  curva,
  respuestas,
  titulos,
  guardando,
  onReiniciar,
}: {
  resumen: {
    puntuacion: number;
    nivel: number;
    habilidad: number;
    error: number;
    motor: MotorCat;
    dominio: Record<string, number>;
  };
  curva: PuntoHabilidad[];
  respuestas: RespuestaIntento[];
  titulos: Map<string, string>;
  guardando: boolean;
  onReiniciar: () => void;
}) {
  const motor = ETIQUETA_MOTOR[resumen.motor];
  const dominio = Object.entries(resumen.dominio).sort((a, b) => a[1] - b[1]);
  const generadas = respuestas.filter((r) => r.origen === "ollama").length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <Card className="text-center">
        <Icon name="Trophy" size={44} className="mx-auto mb-3 text-accent" />
        <h2 className="text-2xl font-bold text-foreground">Evaluación completada</h2>
        <p className="mt-2 text-lg text-muted">
          Puntuación estimada: {resumen.puntuacion}/100
        </p>
        <p className="mt-1 text-sm text-muted">
          Nivel alcanzado: {resumen.nivel} de 5 · habilidad {resumen.habilidad.toFixed(2)} ±{" "}
          {resumen.error.toFixed(2)} ·{" "}
          {guardando ? "guardando resultado…" : "resultado guardado en tu historial"}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge variant={resumen.motor === "heuristica" ? "warning" : "accent"}>
            {motor.texto}
          </Badge>
          {generadas > 0 && (
            <Badge variant="neutral">
              {generadas} {generadas === 1 ? "pregunta generada" : "preguntas generadas"} por IA
            </Badge>
          )}
        </div>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted">{motor.detalle}</p>
      </Card>

      {curva.length > 1 && (
        <Card>
          <h3 className="text-lg font-bold text-foreground">Cómo te ha ido situando</h3>
          <p className="mb-4 text-sm text-muted">
            La línea es la habilidad estimada y la banda su margen de error. Que la banda
            se estreche significa que el motor está cada vez más seguro: por eso el test
            puede terminar antes de agotar las preguntas.
          </p>
          <CurvaHabilidad puntos={curva} />
        </Card>
      )}

      {dominio.length > 1 && (
        <Card>
          <h3 className="text-lg font-bold text-foreground">Tu perfil por temas</h3>
          <p className="mb-4 text-sm text-muted">
            Ordenado de lo que peor se te da a lo que mejor. Es lo que usa el motor para
            decidir por dónde seguir.
          </p>
          <ul className="space-y-3">
            {dominio.map(([tema, valor]) => {
              // La escala de habilidad va de -3 a 3; se lleva a 0-100 para la barra.
              const porcentaje = Math.max(0, Math.min(100, ((valor + 3) / 6) * 100));
              return (
                <li key={tema}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-foreground">{titulos.get(tema) ?? tema}</span>
                    <span className="text-muted">{valor.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        valor < -0.3 ? "bg-status-warning" : "bg-accent"
                      )}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="text-center">
        <Button variant="secondary" onClick={onReiniciar}>
          Hacer otra evaluación
          <Icon name="RotateCcw" size={18} />
        </Button>
      </div>
    </motion.div>
  );
}

function MensajeError({ texto }: { texto: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-status-critical/50 bg-status-critical/10 px-5 py-4 text-foreground"
    >
      {texto}
    </p>
  );
}
