/**
 * La página a la que llega quien pulsa el enlace de un señuelo.
 *
 * Es la parte formativa de toda la campaña: sin esto, una simulación de
 * phishing solo produce una estadística y un empleado que no sabe qué ha hecho
 * mal. Aquí se le dice, en este orden, que no ha pasado nada, que era una
 * simulación autorizada por su empresa, qué señales tenía delante y qué hacer
 * la próxima vez.
 *
 * NO ESTÁ DENTRO DEL DASHBOARD Y NO PIDE SESIÓN
 * ---------------------------------------------
 * Se abre desde un cliente de correo o desde el móvil, donde no hay ninguna
 * cookie de la plataforma. Quien conoce el token es, por construcción, la
 * persona a la que le tocó ese señuelo.
 *
 * El clic ya quedó registrado en `/api/phishing/clic/[token]`, que es quien
 * redirige aquí: esta página no escribe nada, solo explica.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { senueloDeToken } from "@/lib/phishing/eventos";
import { cuerpoParaPanel, nombreTecnicoCanal } from "@/lib/phishing/senuelo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Simulación de concienciación · NexusGuard AI",
  // Es una página con un identificador en la dirección: no tiene ningún
  // sentido que acabe indexada en un buscador.
  robots: { index: false, follow: false },
};

const SENALES_GENERICAS = [
  "El dominio del remitente no coincide con el oficial de tu empresa, aunque se le parezca.",
  "Mete prisa: un plazo corto es la forma más barata de que no compruebes nada.",
  "Pide entrar en un enlace para 'verificar' datos que tu empresa ya tiene.",
  "Llega por un canal por el que ese tipo de peticiones no se hacen nunca.",
];

export default async function ConcienciacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resultado = await senueloDeToken(token);

  // Token desconocido: se enseña la misma página en versión genérica. No se
  // dice "ese token no existe", que sería confirmarle a quien esté probando
  // enlaces cuáles valen y cuáles no.
  const campania = resultado?.campaign ?? null;
  const senales = campania?.redFlags?.length ? campania.redFlags : SENALES_GENERICAS;
  const nombre = resultado?.user.name ?? null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-status-warning/15">
          <Icon name="ShieldAlert" size={26} className="text-status-warning" />
        </span>
        <div>
          <p className="text-sm font-medium text-status-warning">
            {campania ? nombreTecnicoCanal(campania.canal) : "Phishing"} simulado
          </p>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {nombre ? `${nombre}, esto era una simulación` : "Esto era una simulación"}
          </h1>
        </div>
      </div>

      <Card className="border-status-warning/30 bg-status-warning/5">
        <p className="text-lg text-foreground">
          Acabas de pulsar el enlace de un mensaje trampa. <b>No ha pasado nada</b>: no
          se ha instalado nada en tu equipo, no has entregado ninguna contraseña y no
          hay ninguna consecuencia para ti.
        </p>
        <p className="mt-3 text-muted">
          {/* El nombre va en medio de la frase y no al final: muchas empresas
              acaban en "S.L." y quedaba un punto doble. */}
          {campania?.company.name
            ? `Forma parte de una campaña de concienciación interna que ${campania.company.name} ha autorizado para su plantilla.`
            : "Forma parte de una campaña de concienciación interna autorizada por tu empresa."}{" "}
          Lo único que se ha registrado es que el enlace se pulsó y cuándo, para
          medir cómo va la formación del equipo. Si hubiera sido un ataque real, aquí
          te habrían pedido tus credenciales.
        </p>
      </Card>

      {campania && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-foreground">
            <Icon name="Mail" size={20} className="text-muted" />
            El mensaje que has recibido
          </h2>

          <Card className="p-0">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm text-muted">
                De:{" "}
                <span className="text-foreground">{campania.senderName ?? "Desconocido"}</span>
                {campania.senderEmail && ` <${campania.senderEmail}>`}
              </p>
              <p className="mt-1 font-bold text-foreground">{campania.emailSubject}</p>
            </div>
            <p className="whitespace-pre-line px-5 py-4 text-muted">
              {cuerpoParaPanel(campania.emailBody)}
            </p>
          </Card>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-foreground">
          <Icon name="Eye" size={20} className="text-status-warning" />
          Lo que tenías delante
        </h2>
        <p className="mb-4 text-muted">
          Estas son las señales que delataban el mensaje. Con una sola habría bastado
          para desconfiar.
        </p>

        <ul className="space-y-3">
          {senales.map((senal, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-warning/15 text-sm font-bold text-status-warning">
                {i + 1}
              </span>
              <span className="text-foreground">{senal}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-foreground">
          <Icon name="CircleCheck" size={20} className="text-status-good" />
          Qué hacer la próxima vez
        </h2>
        <Card className="space-y-3 text-muted">
          <p>
            <b className="text-foreground">No pulses.</b> Si el mensaje dice venir de
            una herramienta que usas, entra en ella como entras siempre, escribiendo tú
            la dirección, y comprueba allí si hay algo pendiente.
          </p>
          <p>
            <b className="text-foreground">Comprueba el remitente entero</b>, no solo el
            nombre que se ve. La parte que importa es lo que hay después de la arroba.
          </p>
          <p>
            <b className="text-foreground">Repórtalo.</b> Avisar es la mejor respuesta
            posible: protege a los compañeros que van a recibir el mismo mensaje.
          </p>
        </Card>
      </section>

      <section className="mt-8">
        <Card className="flex flex-wrap items-center justify-between gap-4 border-accent/30 bg-accent/5">
          <div>
            <p className="font-bold text-foreground">Entrena la vista en cinco minutos</p>
            <p className="text-sm text-muted">
              Cazafraudes te pasa mensajes reales y falsos para que decidas cuál es cuál.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/formacion/email"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-[#001015] transition-all hover:bg-accent-soft"
            >
              <Icon name="Gamepad2" size={18} />
              Jugar a Cazafraudes
            </Link>
            <Link
              href="/dashboard/formacion"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-5 py-3 font-semibold text-foreground transition-all hover:bg-surface-hover"
            >
              Ver mi formación
            </Link>
          </div>
        </Card>
      </section>

      <p className="mt-8 flex items-start gap-2 text-xs text-muted">
        <Icon name="Info" size={14} className="mt-0.5 shrink-0" />
        <span>
          Simulación de concienciación interna autorizada. Se registra el clic y el
          momento, nunca tu dirección IP ni el contenido de tu equipo.{" "}
          {campania ? <Badge variant="neutral">{campania.name}</Badge> : null}
        </span>
      </p>
    </main>
  );
}
