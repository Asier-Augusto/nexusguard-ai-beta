/**
 * El enlace instrumentado que va dentro de cada señuelo.
 *
 * Es la puerta por la que entra un clic de verdad: la pulsa una persona desde
 * su buzón, se registra y se la lleva a la página de concienciación, que es
 * donde se le explica qué acaba de pasar. Nunca enseña un error ni una página
 * en blanco, ni siquiera con un token inventado: quien pulsa un enlace de
 * estos merece una explicación, no un 404.
 *
 * POR QUÉ SOLO CUENTA EL GET
 * --------------------------
 * Los antivirus de correo y las vistas previas de mensajería pre-cargan los
 * enlaces antes de que nadie los toque, casi siempre con HEAD. Contar eso como
 * un clic inflaría la tasa de la campaña con gente que no hizo nada, que es el
 * error clásico de este tipo de medición. Aquí HEAD redirige sin registrar, y
 * el `userAgent` de los GET queda guardado para poder revisar después los que
 * parezcan automáticos.
 */
import { NextResponse, type NextRequest } from "next/server";
import { registrarEvento } from "@/lib/phishing/eventos";

export const dynamic = "force-dynamic";

function aConcienciacion(req: NextRequest, token: string): NextResponse {
  // 307 y no 301: un redirect permanente se quedaría cacheado en el navegador
  // y el siguiente clic de esa persona no llegaría a registrarse nunca.
  return NextResponse.redirect(new URL(`/concienciacion/${token}`, req.nextUrl.origin), 307);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;

  await registrarEvento(token, "CLIC", req.headers.get("user-agent"));

  return aConcienciacion(req, token);
}

export function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  return params.then(({ token }) => aConcienciacion(req, token));
}
