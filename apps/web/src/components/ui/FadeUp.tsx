"use client";

import { motion } from "framer-motion";

/**
 * Envoltorio de animación de entrada.
 *
 * Existe para que las páginas puedan ser componentes de servidor (y consultar
 * la base de datos directamente) sin renunciar a la animación: framer-motion
 * necesita ejecutarse en el cliente, pero el contenido que recibe por
 * `children` se sigue renderizando en el servidor.
 */
export function FadeUp({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
