import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { InteractiveInfographic } from "@/components/training/InteractiveInfographic";
import { PasswordForge } from "@/components/training/games/PasswordForge";
import { PhishSwipe } from "@/components/training/games/PhishSwipe";
import { obtenerPildoraPorTema } from "@/lib/data/formacion";
import { obtenerUsuarioActivo } from "@/lib/session";
import { tipoDeContenido } from "@/lib/training-types";
import type {
  ContenidoPildora,
  InfographicData,
  PasswordForgeData,
  PhishSwipeData,
} from "@/lib/training-types";

/**
 * Cualquier píldora del catálogo, renderizada desde su contenido en base de
 * datos. El segmento de la ruta es el tema en minúsculas (`contrasenas`,
 * `email`, `doble_factor`…).
 *
 * El contenido puede tener varios formatos, así que se despacha por su campo
 * `tipo`: la infografía clásica de tarjetas o uno de los juegos. Las píldoras
 * sembradas antes de que existieran los juegos no llevan `tipo` y caen en la
 * infografía, que es el comportamiento de siempre.
 */
export default async function PildoraPage({
  params,
}: {
  params: Promise<{ tema: string }>;
}) {
  const { tema } = await params;
  const usuario = await obtenerUsuarioActivo();
  if (!usuario) redirect("/onboarding");

  const pildora = await obtenerPildoraPorTema(
    tema.toUpperCase(),
    usuario.id,
    usuario.empresa.id
  );
  if (!pildora) notFound();

  return (
    <>
      {pildora.adaptacion === "AL_DIA" && (
        <div className="mx-auto mb-6 flex max-w-5xl items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 px-5 py-4 text-sm text-foreground">
          <Icon name="Sparkles" size={18} className="mt-0.5 shrink-0 text-accent" />
          <span>
            Los ejemplos de esta píldora los ha escrito la IA para{" "}
            <b>{usuario.empresa.nombre}</b>, a partir del perfil que declaró el DPO.
            {pildora.adaptadoEn && (
              <span className="text-muted">
                {" "}
                Generado el {formatearFecha(pildora.adaptadoEn)}.
              </span>
            )}
          </span>
        </div>
      )}

      {pildora.adaptacion === "OBSOLETA" && (
        <div className="mx-auto mb-6 flex max-w-5xl items-start gap-3 rounded-xl border border-status-warning/40 bg-status-warning/10 px-5 py-4 text-sm text-foreground">
          <Icon name="TriangleAlert" size={18} className="mt-0.5 shrink-0" />
          <span>
            Esta píldora tiene una versión adaptada, pero se generó con un perfil de
            empresa anterior, así que se está mostrando el contenido genérico. El DPO
            puede regenerarla desde el panel de Formación.
          </span>
        </div>
      )}

      {!pildora.aplicaALaEmpresa && (
        <div className="mx-auto mb-6 max-w-5xl rounded-xl border border-status-warning/40 bg-status-warning/10 px-5 py-4 text-sm text-foreground">
          Esta píldora es de un sistema operativo que tu empresa no ha declarado en su
          perfil, así que no forma parte de tu itinerario. Puedes leerla igualmente.
        </div>
      )}
      {renderizarContenido(pildora.id, pildora.contenido, pildora.yaCompletada)}
    </>
  );
}

/** Fecha corta en español, para el aviso de contenido adaptado. */
function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function renderizarContenido(
  pildoraId: string,
  contenido: ContenidoPildora,
  yaCompletada: boolean
) {
  switch (tipoDeContenido(contenido)) {
    case "password-forge":
      return (
        <PasswordForge
          pildoraId={pildoraId}
          data={contenido as PasswordForgeData}
          yaCompletada={yaCompletada}
        />
      );
    case "phishing-swipe":
      return (
        <PhishSwipe
          pildoraId={pildoraId}
          data={contenido as PhishSwipeData}
          yaCompletada={yaCompletada}
        />
      );
    default:
      return (
        <InteractiveInfographic
          pildoraId={pildoraId}
          data={contenido as InfographicData}
          yaCompletada={yaCompletada}
        />
      );
  }
}
