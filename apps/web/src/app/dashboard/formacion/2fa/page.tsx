import { permanentRedirect } from "next/navigation";

/**
 * Ruta histórica. La píldora de doble factor ya no tiene página propia: se
 * sirve desde la ruta genérica que renderiza cualquier tema desde la base de
 * datos. Se mantiene la redirección para no romper enlaces guardados.
 */
export default function DobleFactorLegacyPage() {
  permanentRedirect("/dashboard/formacion/doble_factor");
}
