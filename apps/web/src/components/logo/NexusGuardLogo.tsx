"use client";

import { motion } from "framer-motion";

interface NexusGuardLogoProps {
  size?: number;
  withWordmark?: boolean;
  animated?: boolean;
  className?: string;
}

/**
 * Logo de NexusGuard AI: un escudo con un nodo neuronal central,
 * construido enteramente en SVG (sin assets externos). Representa la
 * fusión entre protección (escudo) e inteligencia artificial (red de nodos).
 * El pulso respirante en el núcleo comunica "IA en vigilancia activa".
 */
export function NexusGuardLogo({
  size = 40,
  withWordmark = true,
  animated = true,
  className,
}: NexusGuardLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Logo de NexusGuard AI"
        initial={false}
        animate={animated ? { filter: ["drop-shadow(0 0 2px #22d3ee66)", "drop-shadow(0 0 9px #22d3eeaa)", "drop-shadow(0 0 2px #22d3ee66)"] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="ngShieldGradient" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="55%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
          <radialGradient id="ngCoreGradient" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#e0f7fa" />
            <stop offset="45%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>
          <filter id="ngGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Escudo exterior */}
        <path
          d="M24 3L41 9.5V22C41 33 34.5 41 24 45C13.5 41 7 33 7 22V9.5L24 3Z"
          fill="#0a0e14"
          stroke="url(#ngShieldGradient)"
          strokeWidth="2"
        />
        {/* Contorno interior fino (efecto "doble borde" premium) */}
        <path
          d="M24 6.6L38 12V22C38 31.4 32.6 38.2 24 41.7C15.4 38.2 10 31.4 10 22V12L24 6.6Z"
          stroke="#22d3ee"
          strokeOpacity="0.25"
          strokeWidth="0.75"
        />

        {/* Red neuronal central */}
        <g filter="url(#ngGlow)">
          <path
            d="M24 19L16 27M24 19L32 27M16 27L24 33M32 27L24 33"
            stroke="#22d3ee"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="16" cy="27" r="2" fill="#22d3ee" />
          <circle cx="32" cy="27" r="2" fill="#22d3ee" />
          <circle cx="24" cy="33" r="2" fill="#67e8f9" />
          <motion.circle
            cx="24"
            cy="19"
            r={2.6}
            initial={{ r: 2.6 }}
            fill="url(#ngCoreGradient)"
            animate={animated ? { r: [2.6, 3.1, 2.6] } : undefined}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>
      </motion.svg>

      {withWordmark && (
        <span className="text-xl font-bold tracking-tight text-foreground">
          Nexus<span className="text-accent text-glow">Guard</span>
          <span className="text-muted font-medium"> AI</span>
        </span>
      )}
    </div>
  );
}
