"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import type { MicroQuizQuestion } from "@/lib/training-types";
import { cn } from "@/lib/utils";

export function MicroQuiz({
  questions,
  temaTitulo,
  guardando = false,
  onComplete,
}: {
  questions: MicroQuizQuestion[];
  /** Título de la píldora, para que el mensaje final no hable siempre de 2FA. */
  temaTitulo: string;
  guardando?: boolean;
  onComplete: (aciertos: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answered = selected !== null;
  const isCorrect = selected === question?.correctIndex;

  function selectOption(i: number) {
    if (answered) return;
    setSelected(i);
    if (i === question.correctIndex) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  }

  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-accent/40 bg-surface-elevated p-8 text-center glow-accent"
      >
        <Icon name="Trophy" size={48} className="mx-auto mb-4 text-accent" />
        <h3 className="text-2xl font-bold text-foreground">
          ¡Completado! {correctCount} / {questions.length} correctas
        </h3>
        <p className="mt-2 text-muted">
          Ya tienes la base de {temaTitulo} interiorizada. Sigue así para desbloquear la
          Evaluación Adaptativa.
        </p>
        <Button className="mt-6" onClick={() => onComplete(correctCount)} disabled={guardando}>
          {guardando ? "Guardando tu progreso…" : "Completar píldora"}
          <Icon name={guardando ? "LoaderCircle" : "Check"} size={20} />
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
        Pregunta {index + 1} de {questions.length}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="mb-5 text-xl font-bold text-foreground">{question.prompt}</h3>

          <div className="space-y-3">
            {question.options.map((option, i) => {
              const isSelected = selected === i;
              const showCorrect = answered && i === question.correctIndex;
              const showWrong = answered && isSelected && i !== question.correctIndex;

              return (
                <button
                  key={i}
                  onClick={() => selectOption(i)}
                  disabled={answered}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left text-base transition-colors",
                    !answered && "border-border bg-surface-elevated hover:border-accent/50",
                    showCorrect && "border-status-good bg-status-good/10",
                    showWrong && "border-status-critical bg-status-critical/10",
                    answered && !showCorrect && !showWrong && "border-border opacity-50"
                  )}
                >
                  {showCorrect && <Icon name="CheckCircle2" size={20} className="shrink-0 text-status-good" />}
                  {showWrong && <Icon name="XCircle" size={20} className="shrink-0 text-status-critical" />}
                  <span className="text-foreground">{option}</span>
                </button>
              );
            })}
          </div>

          {answered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-5 rounded-xl border border-border bg-surface-elevated p-4"
            >
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <Icon
                  name={isCorrect ? "CheckCircle2" : "Info"}
                  size={18}
                  className={isCorrect ? "text-status-good" : "text-accent"}
                />
                {isCorrect ? "¡Correcto!" : "No es correcto, pero atento a esto:"}
              </p>
              <p className="mt-2 text-muted">{question.explanation}</p>
              <Button size="md" className="mt-4" onClick={next}>
                {isLast ? "Ver resultado" : "Siguiente pregunta"}
                <Icon name="ArrowRight" size={18} />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
