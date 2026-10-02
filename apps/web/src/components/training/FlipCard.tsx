"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { InfographicStep } from "@/lib/training-types";

export function FlipCard({
  step,
  viewed,
  onViewed,
}: {
  step: InfographicStep;
  viewed: boolean;
  onViewed: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  function toggle() {
    setFlipped((f) => !f);
    if (!viewed) onViewed();
  }

  return (
    <button
      onClick={toggle}
      className="group h-64 w-full text-left [perspective:1200px]"
      aria-pressed={flipped}
      aria-label={`${step.title}. Toca para ${flipped ? "ver el resumen" : "descubrir más"}`}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* Cara frontal */}
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 [backface-visibility:hidden]"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon name={step.icon} size={26} />
            </div>
            {viewed && (
              <span className="flex items-center gap-1 text-xs font-medium text-status-good">
                <Icon name="CheckCircle2" size={16} />
                Visto
              </span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
            <p className="mt-1 text-sm text-muted">{step.summary}</p>
          </div>
          <span className="text-sm font-semibold text-accent">Toca para descubrir más →</span>
        </div>

        {/* Cara trasera */}
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-accent/40 bg-surface-elevated p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <p className="text-base leading-relaxed text-foreground">{step.detail}</p>
          <span className="text-sm font-semibold text-accent">← Volver al resumen</span>
        </div>
      </motion.div>
    </button>
  );
}
