"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

const LEVEL_LABELS = ["Principiante", "Básico", "Intermedio", "Avanzado", "Experto"];

/**
 * Medidor de "Dificultad Dinámica" del motor CAT: 5 barras crecientes tipo
 * ecualizador. El nivel activo nunca se comunica solo con color: siempre
 * lleva el número y la etiqueta de nivel junto al icono.
 */
export function DifficultyMeter({ level }: { level: number }) {
  const bars = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-end gap-1.5" aria-hidden>
        {bars.map((b) => {
          const active = b <= level;
          return (
            <motion.div
              key={b}
              className="w-3 rounded-t-sm"
              style={{
                background: active ? "#22d3ee" : "var(--surface-hover)",
                height: 14 + b * 8,
              }}
              animate={{ opacity: active ? 1 : 0.5, scaleY: active ? 1 : 0.85 }}
              transition={{ duration: 0.3, delay: b * 0.03 }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold text-accent">
        <Icon name="Gauge" size={16} />
        Nivel {level}/5 · {LEVEL_LABELS[level - 1] ?? "—"}
      </div>
    </div>
  );
}
