"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { completarPildora } from "@/app/actions/formacion";
import type { MensajeSospechoso, PhishSwipeData } from "@/lib/training-types";
import { cn } from "@/lib/utils";

/**
 * Juego A: Cazafraudes.
 *
 * Van pasando mensajes y el usuario decide si son trampa o legítimos. Se puede
 * responder de tres maneras equivalentes: arrastrando la tarjeta, pulsando uno
 * de los dos botones grandes o con las flechas del teclado. **Deslizar nunca es
 * la única vía**: es un requisito de accesibilidad, no un adorno.
 *
 * No hay temporizador ni penalización por tiempo. Tras cada respuesta se
 * explican las señales del mensaje, tanto si era fraude como si no: aprender
 * por qué algo era legítimo importa tanto como detectar la trampa.
 */

const CANAL = {
  email: { etiqueta: "Correo", icono: "Mail" },
  sms: { etiqueta: "SMS", icono: "MessageSquare" },
  whatsapp: { etiqueta: "Mensajería", icono: "MessagesSquare" },
  llamada: { etiqueta: "Llamada", icono: "PhoneCall" },
} as const;

/** Distancia en píxeles a partir de la cual soltar la tarjeta cuenta como respuesta. */
const UMBRAL_ARRASTRE = 110;

type Respuesta = "TRAMPA" | "LEGITIMO";

interface Resultado {
  mensaje: MensajeSospechoso;
  respuesta: Respuesta;
  acierto: boolean;
}

/**
 * Elige los mensajes de la partida: reparto por dificultad y orden creciente,
 * variando entre partidas para que repetir el juego no sea idéntico.
 */
function prepararPartida(
  mensajes: MensajeSospechoso[],
  cuantos: number
): MensajeSospechoso[] {
  const barajar = <T,>(lista: T[]): T[] => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  const porDificultad = [1, 2, 3].map((d) =>
    barajar(mensajes.filter((m) => m.dificultad === d))
  );

  const porNivel = Math.ceil(cuantos / 3);
  const elegidos = porDificultad.flatMap((grupo) => grupo.slice(0, porNivel));

  // De fácil a difícil: el juego debe calentar antes de apretar.
  return elegidos.slice(0, cuantos).sort((a, b) => a.dificultad - b.dificultad);
}

export function PhishSwipe({
  pildoraId,
  data,
  yaCompletada = false,
}: {
  pildoraId: string;
  data: PhishSwipeData;
  yaCompletada?: boolean;
}) {
  const [partida, setPartida] = useState<MensajeSospechoso[]>([]);
  const [indice, setIndice] = useState(0);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [ultimo, setUltimo] = useState<Resultado | null>(null);
  const [guardando, iniciarGuardado] = useTransition();
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mensaje = partida[indice] ?? null;
  const terminada = partida.length > 0 && indice >= partida.length;

  const puntuacion = useMemo(() => {
    // Ponderada por dificultad: cazar un spear-phishing vale más que descartar
    // un fraude burdo.
    const posibles = partida.reduce((t, m) => t + m.dificultad, 0);
    const logrados = resultados
      .filter((r) => r.acierto)
      .reduce((t, r) => t + r.mensaje.dificultad, 0);
    return posibles === 0 ? 0 : Math.round((logrados / posibles) * 100);
  }, [partida, resultados]);

  const guardarResultado = useCallback(
    (nota: number) => {
      setError(null);
      iniciarGuardado(async () => {
        try {
          await completarPildora(pildoraId, nota);
          setGuardado(true);
        } catch {
          setError(
            "No hemos podido guardar tu puntuación. Comprueba la conexión con la base de datos e inténtalo de nuevo."
          );
        }
      });
    },
    [pildoraId]
  );

  function responder(respuesta: Respuesta) {
    if (!mensaje || ultimo) return;
    const acierto =
      (respuesta === "TRAMPA" && !mensaje.esLegitimo) ||
      (respuesta === "LEGITIMO" && mensaje.esLegitimo);
    setUltimo({ mensaje, respuesta, acierto });
  }

  function siguiente() {
    if (!ultimo) return;
    const acumulados = [...resultados, ultimo];
    setResultados(acumulados);
    setUltimo(null);
    setIndice((i) => i + 1);

    // Al cerrar el último mensaje se guarda la puntuación aquí mismo, en el
    // manejador, en vez de en un efecto que observe "ya ha terminado".
    if (acumulados.length === partida.length) {
      const posibles = partida.reduce((t, m) => t + m.dificultad, 0);
      const logrados = acumulados
        .filter((r) => r.acierto)
        .reduce((t, r) => t + r.mensaje.dificultad, 0);
      guardarResultado(posibles === 0 ? 0 : Math.round((logrados / posibles) * 100));
    }
  }

  /** Sortea la partida. Se llama desde un clic, nunca durante el render. */
  function empezar() {
    setPartida(prepararPartida(data.mensajes, data.mensajesPorPartida));
    setIndice(0);
    setResultados([]);
    setUltimo(null);
    setGuardado(false);
    setError(null);
  }

  // Atajos de teclado: alternativa completa al arrastre.
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (ultimo) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          siguiente();
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        responder("TRAMPA");
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        responder("LEGITIMO");
      }
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div>
        <Link
          href="/dashboard/formacion"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent"
        >
          <Icon name="ArrowLeft" size={16} /> Volver a Formación
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">{data.title}</h1>
          <Badge variant="accent">
            <Icon name="Clock" size={14} /> {data.durationMinutes} min
          </Badge>
          {yaCompletada && <Badge variant="good">Ya la completaste, puedes repetirla</Badge>}
        </div>
        <p className="mt-2 text-lg text-muted">{data.subtitle}</p>
      </div>

      {partida.length > 0 && !terminada && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-muted">
              <span>
                Mensaje {Math.min(indice + 1, partida.length)} de {partida.length}
              </span>
              <span>
                {resultados.filter((r) => r.acierto).length} aciertos
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-hover">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={false}
                animate={{ width: `${(indice / partida.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {mensaje && (
            <TarjetaMensaje
              key={mensaje.id}
              mensaje={mensaje}
              bloqueada={ultimo !== null}
              onResponder={responder}
            />
          )}

          {!ultimo && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={() => responder("TRAMPA")}
                  className="border-status-critical/40 py-6 text-status-critical hover:border-status-critical"
                >
                  <Icon name="ShieldAlert" size={24} />
                  Es trampa
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => responder("LEGITIMO")}
                  className="border-status-good/40 py-6 text-status-good hover:border-status-good"
                >
                  <Icon name="ShieldCheck" size={24} />
                  Es legítimo
                </Button>
              </div>
              <p className="text-center text-sm text-muted">
                Pulsa un botón, arrastra la tarjeta o usa las flechas ← y → del teclado. No hay
                tiempo límite.
              </p>
            </>
          )}

          <AnimatePresence>
            {ultimo && <Explicacion resultado={ultimo} onSiguiente={siguiente} />}
          </AnimatePresence>
        </>
      )}

      {terminada && (
        <Resumen
          puntuacion={puntuacion}
          resultados={resultados}
          guardando={guardando}
          guardado={guardado}
          error={error}
          onReintentarGuardado={() => guardarResultado(puntuacion)}
          onJugarDeNuevo={empezar}
        />
      )}

      {partida.length === 0 && (
        <Card className="space-y-5">
          <h2 className="text-xl font-bold text-foreground">Cómo se juega</h2>
          <ul className="space-y-2 text-muted">
            <li className="flex items-start gap-2">
              <Icon name="MousePointerClick" size={18} className="mt-0.5 shrink-0 text-accent" />
              Van pasando {data.mensajesPorPartida} mensajes. En cada uno decides si es una trampa
              o si puedes fiarte.
            </li>
            <li className="flex items-start gap-2">
              <Icon name="Hand" size={18} className="mt-0.5 shrink-0 text-accent" />
              Responde como prefieras: con los dos botones, arrastrando la tarjeta a izquierda o
              derecha, o con las flechas ← y → del teclado.
            </li>
            <li className="flex items-start gap-2">
              <Icon name="Clock" size={18} className="mt-0.5 shrink-0 text-accent" />
              No hay tiempo límite ni penalización por tardar. Léelos con calma.
            </li>
            <li className="flex items-start gap-2">
              <Icon name="Lightbulb" size={18} className="mt-0.5 shrink-0 text-accent" />
              Tras cada respuesta se explican las señales del mensaje, aciertes o no. Hay mensajes
              legítimos que parecen trampa: la gracia está en distinguir, no en desconfiar de todo.
            </li>
          </ul>
          <p className="rounded-xl bg-surface-hover px-4 py-3 text-sm text-muted">
            Todos los ejemplos son material de simulación para formación interna. Los remitentes y
            los enlaces son ficticios.
          </p>
          <Button onClick={empezar} className="w-full">
            Empezar la partida
            <Icon name="ArrowRight" size={20} />
          </Button>
        </Card>
      )}
    </div>
  );
}

// --- Tarjeta del mensaje ----------------------------------------------------

function TarjetaMensaje({
  mensaje,
  bloqueada,
  onResponder,
}: {
  mensaje: MensajeSospechoso;
  bloqueada: boolean;
  onResponder: (r: Respuesta) => void;
}) {
  const x = useMotionValue(0);
  const rotacion = useTransform(x, [-260, 260], [-9, 9]);
  const opacidadTrampa = useTransform(x, [-UMBRAL_ARRASTRE, 0], [1, 0]);
  const opacidadLegitimo = useTransform(x, [0, UMBRAL_ARRASTRE], [0, 1]);

  const canal = CANAL[mensaje.canal];

  return (
    <motion.div
      drag={bloqueada ? false : "x"}
      dragSnapToOrigin
      dragElastic={0.5}
      style={{ x, rotate: rotacion }}
      onDragEnd={(_, info) => {
        if (bloqueada) return;
        if (info.offset.x < -UMBRAL_ARRASTRE) onResponder("TRAMPA");
        else if (info.offset.x > UMBRAL_ARRASTRE) onResponder("LEGITIMO");
      }}
      className={cn("relative", !bloqueada && "cursor-grab active:cursor-grabbing")}
    >
      {/* Pistas visuales del arrastre. Meramente decorativas: la información
          también está en los botones, por eso van ocultas al lector de pantalla. */}
      <motion.div
        style={{ opacity: opacidadTrampa }}
        aria-hidden
        className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border-2 border-status-critical bg-background/80 px-4 py-2 text-lg font-black text-status-critical"
      >
        TRAMPA
      </motion.div>
      <motion.div
        style={{ opacity: opacidadLegitimo }}
        aria-hidden
        className="pointer-events-none absolute right-4 top-4 z-10 rounded-xl border-2 border-status-good bg-background/80 px-4 py-2 text-lg font-black text-status-good"
      >
        LEGÍTIMO
      </motion.div>

      <Card className="min-h-[320px] select-none">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <Badge variant="neutral">
            <Icon name={canal.icono} size={14} /> {canal.etiqueta}
          </Badge>
          <span className="min-w-0 flex-1 truncate text-sm text-muted">
            De: <span className="text-foreground">{mensaje.remitente}</span>
          </span>
        </div>

        {mensaje.asunto && (
          <h2 className="mb-3 text-xl font-bold text-foreground">{mensaje.asunto}</h2>
        )}

        <p className="whitespace-pre-line text-foreground">{mensaje.contenido}</p>
      </Card>
    </motion.div>
  );
}

// --- Explicación tras responder ---------------------------------------------

function Explicacion({
  resultado,
  onSiguiente,
}: {
  resultado: Resultado;
  onSiguiente: () => void;
}) {
  const { mensaje, acierto } = resultado;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="status"
    >
      <Card
        className={cn(
          "space-y-4 border-2",
          acierto ? "border-status-good/50" : "border-status-warning/50"
        )}
      >
        <div className="flex items-start gap-3">
          <Icon
            name={acierto ? "CircleCheck" : "Info"}
            size={26}
            className={cn("mt-0.5 shrink-0", acierto ? "text-status-good" : "text-status-warning")}
          />
          <div>
            <p className="text-lg font-bold text-foreground">
              {acierto ? "Bien visto" : "Se te ha colado"}
            </p>
            <p className="text-muted">
              {mensaje.esLegitimo
                ? "Este mensaje era legítimo."
                : "Este mensaje era una trampa."}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 font-semibold text-foreground">
            {mensaje.esLegitimo ? "Por qué podías fiarte:" : "Las señales que lo delataban:"}
          </p>
          <ul className="space-y-2">
            {mensaje.senales.map((senal, i) => (
              <li key={i} className="flex items-start gap-2 text-muted">
                <Icon
                  name={mensaje.esLegitimo ? "Check" : "TriangleAlert"}
                  size={17}
                  className={cn(
                    "mt-1 shrink-0",
                    mensaje.esLegitimo ? "text-status-good" : "text-status-warning"
                  )}
                />
                {senal}
              </li>
            ))}
          </ul>
        </div>

        <Button onClick={onSiguiente} className="w-full" autoFocus>
          Siguiente mensaje
          <Icon name="ArrowRight" size={20} />
        </Button>
      </Card>
    </motion.div>
  );
}

// --- Resumen final ----------------------------------------------------------

function Resumen({
  puntuacion,
  resultados,
  guardando,
  guardado,
  error,
  onReintentarGuardado,
  onJugarDeNuevo,
}: {
  puntuacion: number;
  resultados: Resultado[];
  guardando: boolean;
  guardado: boolean;
  error: string | null;
  onReintentarGuardado: () => void;
  onJugarDeNuevo: () => void;
}) {
  const aciertos = resultados.filter((r) => r.acierto).length;
  const fallos = resultados.filter((r) => !r.acierto);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="space-y-6">
        <div className="text-center">
          <Icon name="Award" size={48} className="mx-auto text-accent" />
          <h2 className="mt-3 text-2xl font-bold text-foreground">Partida terminada</h2>
          <p className="mt-2 text-4xl font-black text-accent">{puntuacion}/100</p>
          <p className="mt-1 text-muted">
            {aciertos} de {resultados.length} mensajes bien clasificados
          </p>
          <p className="mt-1 text-sm text-muted">
            La puntuación pondera por dificultad: los mensajes más elaborados valen más.
          </p>
        </div>

        {fallos.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold text-foreground">
              Repasa los que se te colaron
            </h3>
            <ul className="space-y-3">
              {fallos.map((r) => (
                <li
                  key={r.mensaje.id}
                  className="rounded-xl border border-border bg-surface-elevated p-4"
                >
                  <p className="text-sm text-muted">
                    {CANAL[r.mensaje.canal].etiqueta} · {r.mensaje.remitente}
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {r.mensaje.asunto ?? r.mensaje.contenido.slice(0, 70) + "…"}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Era{" "}
                    <b className="text-foreground">
                      {r.mensaje.esLegitimo ? "legítimo" : "una trampa"}
                    </b>
                    . {r.mensaje.senales[0]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fallos.length === 0 && (
          <p className="rounded-xl bg-status-good/10 px-4 py-3 text-center text-foreground">
            Partida perfecta. Ni una sola se te ha colado.
          </p>
        )}

        <p className="text-center text-sm text-muted" aria-live="polite">
          {guardando
            ? "Guardando tu puntuación…"
            : guardado
              ? "Puntuación guardada en tu progreso."
              : ""}
        </p>

        {error && (
          <div role="alert" className="space-y-3 text-center">
            <p className="rounded-xl border border-status-critical/50 bg-status-critical/10 px-4 py-3 text-foreground">
              {error}
            </p>
            <Button variant="secondary" onClick={onReintentarGuardado}>
              Reintentar guardado
              <Icon name="RotateCcw" size={18} />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={onJugarDeNuevo}>
            <Icon name="RotateCcw" size={18} />
            Jugar otra partida
          </Button>
          <Link
            href="/dashboard/formacion"
            className="inline-flex items-center gap-1 px-4 py-3 font-semibold text-accent"
          >
            Volver a Formación <Icon name="ArrowRight" size={16} />
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
