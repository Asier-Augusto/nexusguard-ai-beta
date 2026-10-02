"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MedidorFuerza } from "@/components/training/games/MedidorFuerza";
import { completarPildora } from "@/app/actions/formacion";
import { aAnos, evaluar, type FuerzaContrasena } from "@/lib/password-strength";
import type { PasswordForgeData } from "@/lib/training-types";
import { cn } from "@/lib/utils";

/**
 * Juego D: Fábrica de contraseñas.
 *
 * ============================================================================
 *  LA CONTRASEÑA QUE SE TECLEA AQUÍ NO SALE DEL NAVEGADOR.
 *  No se envía, no se guarda y no se registra. Su estado vive en este
 *  componente y muere con él. Lo único que viaja al servidor al terminar es la
 *  puntuación (un número de 0 a 100) mediante `completarPildora`.
 * ============================================================================
 *
 * Cuatro retos encadenados, sin ningún temporizador: nadie compite contra el
 * reloj y se avanza cuando el usuario quiere.
 */

const PUNTOS = { forjar: 30, frase: 30, elegir: 20, cierre: 20 };

type Fase = "FORJAR" | "FRASE" | "ELEGIR" | "CIERRE" | "RESUMEN";

const ORDEN: Fase[] = ["FORJAR", "FRASE", "ELEGIR", "CIERRE", "RESUMEN"];

export function PasswordForge({
  pildoraId,
  data,
  yaCompletada = false,
}: {
  pildoraId: string;
  data: PasswordForgeData;
  yaCompletada?: boolean;
}) {
  const [fase, setFase] = useState<Fase>("FORJAR");
  const [puntos, setPuntos] = useState(0);
  const [guardando, iniciarGuardado] = useTransition();
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const indiceFase = ORDEN.indexOf(fase);
  const progreso = Math.round((indiceFase / (ORDEN.length - 1)) * 100);

  function sumar(puntosDelReto: number, siguiente: Fase) {
    setPuntos((p) => p + puntosDelReto);
    setFase(siguiente);
  }

  function guardarResultado(total: number) {
    setError(null);
    iniciarGuardado(async () => {
      try {
        // Solo viaja el número. La contraseña nunca entra aquí.
        await completarPildora(pildoraId, total);
        setGuardado(true);
      } catch {
        setError(
          "No hemos podido guardar tu puntuación. Comprueba la conexión con la base de datos e inténtalo de nuevo."
        );
      }
    });
  }

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

      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-muted">
          <span>
            Reto {Math.min(indiceFase + 1, ORDEN.length - 1)} de {ORDEN.length - 1}
          </span>
          <span>{puntos} / 100 puntos</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-hover">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${progreso}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
        <Icon name="ShieldCheck" size={18} className="mt-0.5 shrink-0 text-accent" />
        <span>
          Lo que escribas se analiza <b className="text-foreground">dentro de tu navegador</b>. No
          se envía a ningún servidor, no se guarda y no queda registrado en ninguna parte. Al
          terminar solo se guarda tu puntuación.
        </span>
      </p>

      {fase === "FORJAR" && (
        <RetoForjar
          anosObjetivo={data.anosObjetivo}
          onSuperado={() => sumar(PUNTOS.forjar, "FRASE")}
        />
      )}

      {fase === "FRASE" && (
        <RetoFrase
          contrasenaDebil={data.contrasenaDebil}
          onSuperado={() => sumar(PUNTOS.frase, "ELEGIR")}
        />
      )}

      {fase === "ELEGIR" && (
        <RetoElegir
          opciones={data.opcionesMasDebil}
          indiceCorrecto={data.indiceMasDebil}
          onTerminado={(acierto) => sumar(acierto ? PUNTOS.elegir : 0, "CIERRE")}
        />
      )}

      {fase === "CIERRE" && (
        <RetoCierre
          preguntas={data.preguntasCierre}
          onTerminado={(aciertos) => {
            const ganados = Math.round(
              (aciertos / data.preguntasCierre.length) * PUNTOS.cierre
            );
            const total = puntos + ganados;
            setPuntos(total);
            setFase("RESUMEN");
            guardarResultado(total);
          }}
        />
      )}

      {fase === "RESUMEN" && (
        <Resumen
          puntos={puntos}
          guardando={guardando}
          guardado={guardado}
          error={error}
          onReintentar={() => guardarResultado(puntos)}
        />
      )}
    </div>
  );
}

// --- Reto 1: forjar ---------------------------------------------------------

function RetoForjar({
  anosObjetivo,
  onSuperado,
}: {
  anosObjetivo: number;
  onSuperado: () => void;
}) {
  const [valor, setValor] = useState("");
  const [visible, setVisible] = useState(false);
  const fuerza = useFuerza(valor);
  const cumple = fuerza.datos !== null && aAnos(fuerza.datos.segundos) >= anosObjetivo;

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Reto 1 · Que aguante {anosObjetivo} años
        </h2>
        <p className="mt-1 text-muted">
          Escribe una contraseña y observa el contador. No la uses de verdad después: esto es un
          laboratorio.
        </p>
      </div>

      <CampoContrasena
        id="forjar"
        etiqueta="Tu contraseña de laboratorio"
        valor={valor}
        onChange={setValor}
        visible={visible}
        onAlternarVisible={() => setVisible((v) => !v)}
      />

      <MedidorFuerza fuerza={fuerza.datos} cargando={fuerza.cargando} vacio={valor.length === 0} />

      <div
        className={cn(
          "flex items-start gap-2 rounded-xl px-4 py-3 text-sm",
          cumple ? "bg-status-good/10 text-foreground" : "bg-surface-hover text-muted"
        )}
        aria-live="polite"
      >
        <Icon
          name={cumple ? "CircleCheck" : "Target"}
          size={18}
          className={cn("mt-0.5 shrink-0", cumple ? "text-status-good" : "text-muted")}
        />
        <span>
          {cumple
            ? `Conseguido: aguantaría ${fuerza.datos?.tiempoLegible}. Fíjate en que lo que te ha llevado ahí es sobre todo la longitud.`
            : `Objetivo: superar los ${anosObjetivo} años. Ve probando, no hay prisa ni límite de intentos.`}
        </span>
      </div>

      <Button onClick={onSuperado} disabled={!cumple} className="w-full">
        Reto superado, continuar
        <Icon name="ArrowRight" size={20} />
      </Button>
    </Card>
  );
}

// --- Reto 2: frase de paso --------------------------------------------------

function RetoFrase({
  contrasenaDebil,
  onSuperado,
}: {
  contrasenaDebil: string;
  onSuperado: () => void;
}) {
  const [valor, setValor] = useState("");
  const [visible, setVisible] = useState(true);
  const fuerza = useFuerza(valor);
  const debil = useFuerza(contrasenaDebil);

  const palabras = valor.trim().split(/\s+/).filter(Boolean).length;
  const cumple = fuerza.datos !== null && fuerza.datos.puntuacion >= 4 && palabras >= 3;

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Reto 2 · De débil a memorable</h2>
        <p className="mt-1 text-muted">
          Esta contraseña cumple todas las reglas de siempre (mayúscula, números, símbolo) y aun
          así se rompe enseguida:
        </p>
      </div>

      <div className="rounded-xl border border-status-critical/40 bg-status-critical/10 p-4">
        <p className="break-all font-mono text-lg text-foreground">{contrasenaDebil}</p>
        <p className="mt-1 text-sm text-muted">
          Aguantaría {debil.cargando ? "…" : debil.datos?.tiempoLegible}. Lleva dentro una palabra
          de diccionario y un año: dos de los primeros patrones que prueba un atacante.
        </p>
      </div>

      <p className="text-muted">
        Escribe ahora una <b className="text-foreground">frase de paso</b>: al menos tres palabras
        sin relación entre sí, separadas por espacios. Larga, absurda y fácil de recordar.
      </p>

      <CampoContrasena
        id="frase"
        etiqueta="Tu frase de paso"
        valor={valor}
        onChange={setValor}
        visible={visible}
        onAlternarVisible={() => setVisible((v) => !v)}
        placeholder="ej: cactus violin aduana miercoles"
      />

      <MedidorFuerza fuerza={fuerza.datos} cargando={fuerza.cargando} vacio={valor.length === 0} />

      <div className="rounded-xl bg-surface-hover px-4 py-3 text-sm text-muted" aria-live="polite">
        {palabras < 3
          ? `Llevas ${palabras} ${palabras === 1 ? "palabra" : "palabras"}. Hacen falta al menos 3, separadas por espacios.`
          : cumple
            ? "Perfecto: sin patrones previsibles y con longitud de sobra."
            : "Ya son tres palabras, pero el motor aún encuentra patrones. Prueba con palabras menos relacionadas entre sí."}
      </div>

      <Button onClick={onSuperado} disabled={!cumple} className="w-full">
        Reto superado, continuar
        <Icon name="ArrowRight" size={20} />
      </Button>
    </Card>
  );
}

// --- Reto 3: elegir la más débil --------------------------------------------

function RetoElegir({
  opciones,
  indiceCorrecto,
  onTerminado,
}: {
  opciones: PasswordForgeData["opcionesMasDebil"];
  indiceCorrecto: number;
  onTerminado: (acierto: boolean) => void;
}) {
  const [elegida, setElegida] = useState<number | null>(null);
  const respondido = elegida !== null;
  const acierto = elegida === indiceCorrecto;

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Reto 3 · ¿Cuál es la más débil?</h2>
        <p className="mt-1 text-muted">
          Las cuatro parecen razonables. Solo una se rompe casi al instante.
        </p>
      </div>

      <div className="space-y-3">
        {opciones.map((opcion, i) => {
          const esLaCorrecta = i === indiceCorrecto;
          const esLaElegida = i === elegida;

          return (
            <button
              key={opcion.id}
              onClick={() => !respondido && setElegida(i)}
              disabled={respondido}
              aria-pressed={esLaElegida}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                !respondido && "border-border bg-surface-elevated hover:border-accent/50",
                respondido && esLaCorrecta && "border-status-good bg-status-good/10",
                respondido &&
                  esLaElegida &&
                  !esLaCorrecta &&
                  "border-status-critical bg-status-critical/10",
                respondido && !esLaCorrecta && !esLaElegida && "border-border opacity-50"
              )}
            >
              <span className="flex items-start gap-3">
                {respondido && esLaCorrecta && (
                  <Icon name="CircleCheck" size={20} className="mt-0.5 shrink-0 text-status-good" />
                )}
                {respondido && esLaElegida && !esLaCorrecta && (
                  <Icon
                    name="CircleX"
                    size={20}
                    className="mt-0.5 shrink-0 text-status-critical"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block break-all font-mono text-foreground">
                    {opcion.ejemplo}
                  </span>
                  {respondido && (
                    <span className="mt-2 block text-sm text-muted">{opcion.explicacion}</span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {respondido && (
        <>
          <p
            role="status"
            className={cn(
              "rounded-xl px-4 py-3 text-sm text-foreground",
              acierto ? "bg-status-good/10" : "bg-status-warning/10"
            )}
          >
            {acierto
              ? "Exacto. Sustituir letras por símbolos parecidos no añade seguridad real: los diccionarios de ataque ya contemplan esas variantes."
              : "No era esa. La más débil es la que solo disfraza una palabra de diccionario cambiando letras por símbolos; el atacante deshace ese disfraz al instante."}
          </p>
          <Button onClick={() => onTerminado(acierto)} className="w-full">
            Continuar
            <Icon name="ArrowRight" size={20} />
          </Button>
        </>
      )}
    </Card>
  );
}

// --- Reto 4: cierre ---------------------------------------------------------

function RetoCierre({
  preguntas,
  onTerminado,
}: {
  preguntas: PasswordForgeData["preguntasCierre"];
  onTerminado: (aciertos: number) => void;
}) {
  const [indice, setIndice] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);
  const [aciertos, setAciertos] = useState(0);

  const pregunta = preguntas[indice];
  const respondido = elegida !== null;
  const esUltima = indice === preguntas.length - 1;

  function responder(i: number) {
    if (respondido) return;
    setElegida(i);
    if (i === pregunta.correctIndex) setAciertos((a) => a + 1);
  }

  function siguiente() {
    if (esUltima) {
      onTerminado(aciertos);
    } else {
      setIndice((i) => i + 1);
      setElegida(null);
    }
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Reto 4 · Para llevarte a casa</h2>
        <p className="mt-1 text-sm text-muted">
          Pregunta {indice + 1} de {preguntas.length}
        </p>
      </div>

      <h3 className="text-lg font-semibold text-foreground">{pregunta.prompt}</h3>

      <div className="space-y-3">
        {pregunta.options.map((opcion, i) => {
          const esLaCorrecta = i === pregunta.correctIndex;
          const esLaElegida = i === elegida;

          return (
            <button
              key={i}
              onClick={() => responder(i)}
              disabled={respondido}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                !respondido && "border-border bg-surface-elevated hover:border-accent/50",
                respondido && esLaCorrecta && "border-status-good bg-status-good/10",
                respondido &&
                  esLaElegida &&
                  !esLaCorrecta &&
                  "border-status-critical bg-status-critical/10",
                respondido && !esLaCorrecta && !esLaElegida && "border-border opacity-50"
              )}
            >
              {respondido && esLaCorrecta && (
                <Icon name="CircleCheck" size={20} className="shrink-0 text-status-good" />
              )}
              {respondido && esLaElegida && !esLaCorrecta && (
                <Icon name="CircleX" size={20} className="shrink-0 text-status-critical" />
              )}
              <span className="text-foreground">{opcion}</span>
            </button>
          );
        })}
      </div>

      {respondido && (
        <>
          <p role="status" className="rounded-xl bg-surface-hover px-4 py-3 text-muted">
            {pregunta.explanation}
          </p>
          <Button onClick={siguiente} className="w-full">
            {esUltima ? "Ver resultado" : "Siguiente pregunta"}
            <Icon name="ArrowRight" size={20} />
          </Button>
        </>
      )}
    </Card>
  );
}

// --- Resumen ----------------------------------------------------------------

function Resumen({
  puntos,
  guardando,
  guardado,
  error,
  onReintentar,
}: {
  puntos: number;
  guardando: boolean;
  guardado: boolean;
  error: string | null;
  onReintentar: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="space-y-5 text-center">
        <Icon name="Award" size={48} className="mx-auto text-accent" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Taller terminado</h2>
          <p className="mt-2 text-4xl font-black text-accent">{puntos}/100</p>
        </div>

        <ul className="mx-auto max-w-md space-y-2 text-left text-muted">
          <li className="flex items-start gap-2">
            <Icon name="Check" size={18} className="mt-0.5 shrink-0 text-status-good" />
            La longitud pesa más que los símbolos raros.
          </li>
          <li className="flex items-start gap-2">
            <Icon name="Check" size={18} className="mt-0.5 shrink-0 text-status-good" />
            Una frase de varias palabras es más fuerte y más fácil de recordar.
          </li>
          <li className="flex items-start gap-2">
            <Icon name="Check" size={18} className="mt-0.5 shrink-0 text-status-good" />
            Nunca reutilices: un gestor se encarga de las demás por ti.
          </li>
          <li className="flex items-start gap-2">
            <Icon name="Check" size={18} className="mt-0.5 shrink-0 text-status-good" />
            El doble factor es lo que queda en pie si te la roban.
          </li>
        </ul>

        <p className="text-sm text-muted" aria-live="polite">
          {guardando
            ? "Guardando tu puntuación…"
            : guardado
              ? "Puntuación guardada en tu progreso."
              : ""}
        </p>

        {error && (
          <div role="alert" className="space-y-3">
            <p className="rounded-xl border border-status-critical/50 bg-status-critical/10 px-4 py-3 text-foreground">
              {error}
            </p>
            <Button variant="secondary" onClick={onReintentar}>
              Reintentar guardado
              <Icon name="RotateCcw" size={18} />
            </Button>
          </div>
        )}

        <Link
          href="/dashboard/formacion"
          className="inline-flex items-center gap-1 font-semibold text-accent"
        >
          Volver a Formación <Icon name="ArrowRight" size={16} />
        </Link>
      </Card>
    </motion.div>
  );
}

// --- Piezas compartidas -----------------------------------------------------

/** Evalúa con un pequeño retardo para no recalcular en cada pulsación. */
function useFuerza(valor: string) {
  const [datos, setDatos] = useState<FuerzaContrasena | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    // El indicador de carga se enciende dentro del temporizador y no en el
    // cuerpo del efecto: así no se actualiza el estado en cada pulsación y no
    // parpadea mientras se escribe.
    const temporizador = setTimeout(async () => {
      if (cancelado) return;
      setCargando(true);
      const resultado = await evaluar(valor);
      if (!cancelado) {
        setDatos(resultado);
        setCargando(false);
      }
    }, 180);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [valor]);

  return { datos, cargando };
}

function CampoContrasena({
  id,
  etiqueta,
  valor,
  onChange,
  visible,
  onAlternarVisible,
  placeholder,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  visible: boolean;
  onAlternarVisible: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-medium text-muted">
        {etiqueta}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          // Ni el navegador ni los gestores deben guardarla: es de laboratorio.
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface-elevated px-4 py-3 font-mono text-lg text-foreground outline-none placeholder:font-sans placeholder:text-muted/50 focus:border-accent"
        />
        <Button
          variant="secondary"
          size="md"
          onClick={onAlternarVisible}
          aria-label={visible ? "Ocultar la contraseña" : "Mostrar la contraseña"}
        >
          <Icon name={visible ? "EyeOff" : "Eye"} size={20} />
        </Button>
      </div>
    </div>
  );
}
