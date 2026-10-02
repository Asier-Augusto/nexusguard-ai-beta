/**
 * Firma del webhook de phishing.
 *
 * POR QUÉ SE FIRMA
 * ----------------
 * El webhook es la única ruta de la plataforma que escribe en base de datos
 * sin que haya nadie con sesión al otro lado: la llama una pasarela de correo
 * externa. Sin firma, cualquiera que conociera un token podría marcar a un
 * compañero como "ha picado", y ese dato acaba en su Risk Score y en el
 * informe que ve el DPO.
 *
 * Se firma el cuerpo CRUDO, tal cual llega, con HMAC-SHA256 y un secreto
 * compartido. Sobre el cuerpo crudo y no sobre el JSON ya interpretado porque
 * dos serializaciones distintas del mismo objeto dan firmas distintas.
 *
 * La comparación va con `timingSafeEqual`: comparar firmas con `===` filtra,
 * por el tiempo que tarda en fallar, cuántos caracteres iniciales acertaste.
 *
 * Solo para código de servidor.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const CABECERA_FIRMA = "x-nexusguard-firma";

/** Secreto compartido con la pasarela. En desarrollo hay uno en `.env.example`. */
export function secretoDelWebhook(): string {
  return process.env.PHISHING_WEBHOOK_SECRET ?? "";
}

/** `sha256=<hex>`, que es el formato habitual de este tipo de cabecera. */
export function firmar(cuerpo: string, secreto = secretoDelWebhook()): string {
  return `sha256=${createHmac("sha256", secreto).update(cuerpo, "utf8").digest("hex")}`;
}

/**
 * Si la firma recibida corresponde a este cuerpo.
 *
 * Sin secreto configurado devuelve `false` y el webhook responde 401: es
 * preferible que la integración no funcione y se vea, a que acepte cualquier
 * cosa porque a alguien se le olvidó rellenar el `.env`.
 */
export function firmaValida(cuerpo: string, recibida: string | null): boolean {
  const secreto = secretoDelWebhook();
  if (!secreto || !recibida) return false;

  const esperada = Buffer.from(firmar(cuerpo, secreto), "utf8");
  const candidata = Buffer.from(recibida, "utf8");

  if (esperada.length !== candidata.length) return false;
  return timingSafeEqual(esperada, candidata);
}
