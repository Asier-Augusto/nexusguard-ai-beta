"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { FlipCard } from "@/components/training/FlipCard";
import { MicroQuiz } from "@/components/training/MicroQuiz";
import { completarPildora } from "@/app/actions/formacion";
import type { InfographicData } from "@/lib/training-types";

export function InteractiveInfographic({
  pildoraId,
  data,
  yaCompletada = false,
}: {
  pildoraId: string;
  data: InfographicData;
  /** Si el usuario ya la había terminado en una sesión anterior. */
  yaCompletada?: boolean;
}) {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [pillCompleted, setPillCompleted] = useState(yaCompletada);
  const [guardando, iniciarGuardado] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allViewed = viewedIds.size === data.steps.length;
  const progressPct = useMemo(
    () => Math.round((viewedIds.size / data.steps.length) * 100),
    [viewedIds, data.steps.length]
  );

  function markViewed(id: string) {
    setViewedIds((prev) => new Set(prev).add(id));
  }

  function handleQuizComplete(aciertos: number) {
    setError(null);
    iniciarGuardado(async () => {
      try {
        const total = data.quiz.length;
        const puntuacion = total > 0 ? Math.round((aciertos / total) * 100) : 0;
        await completarPildora(pildoraId, puntuacion);
        setPillCompleted(true);
      } catch {
        setError(
          "No hemos podido guardar tu progreso. Comprueba la conexión con la base de datos e inténtalo de nuevo."
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
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
        </div>
        <p className="mt-2 text-lg text-muted">{data.subtitle}</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-muted">
          <span>Tu progreso</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-hover">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            <FlipCard
              step={step}
              viewed={viewedIds.has(step.id)}
              onViewed={() => markViewed(step.id)}
            />
          </motion.div>
        ))}
      </div>

      {!allViewed && (
        <p className="text-center text-muted">
          Toca las {data.steps.length} tarjetas para desbloquear el reto final ({viewedIds.size}/
          {data.steps.length}).
        </p>
      )}

      {allViewed && !pillCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
            <Icon name="Sparkles" size={22} className="text-accent" />
            Comprueba lo aprendido
          </h2>
          <MicroQuiz
            questions={data.quiz}
            temaTitulo={data.title}
            guardando={guardando}
            onComplete={handleQuizComplete}
          />
        </motion.div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-status-critical/50 bg-status-critical/10 px-5 py-4 text-center text-foreground"
        >
          {error}
        </p>
      )}

      {pillCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-status-good/40 bg-status-good/10 p-6 text-center"
        >
          <Icon name="PartyPopper" size={40} className="mx-auto mb-3 text-status-good" />
          <p className="text-lg font-semibold text-foreground">
            Píldora completada. La Evaluación Adaptativa ya está desbloqueada en tu menú.
          </p>
          <Link
            href="/dashboard/formacion"
            className="mt-4 inline-flex items-center gap-1 font-semibold text-accent"
          >
            Ver más píldoras <Icon name="ArrowRight" size={16} />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
