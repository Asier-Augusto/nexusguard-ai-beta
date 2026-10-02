/**
 * Petición HTTP para las generaciones que tardan minutos.
 *
 * POR QUÉ NO SE USA `fetch` AQUÍ
 * ------------------------------
 * El `fetch` de Node corta a los 300 segundos (`headersTimeout` de undici) y
 * no hay forma de subir ese límite sin traerse undici como dependencia. Con el
 * modelo grande, adaptar el banco de mensajes de una píldora son tres tandas de
 * kilo y medio de texto cada una: rondaba justo esos 300 segundos, así que el
 * cliente abortaba peticiones que el servidor SÍ estaba completando. En el log
 * del servicio aparecían como 200 OK mientras la web las daba por caídas.
 *
 * `node:http` no tiene ese tope y deja poner el tiempo de espera que
 * corresponde a lo que se está pidiendo. Es código de servidor y sólo lo usa
 * la adaptación de formación; todo lo demás sigue con `fetch` en
 * `lib/ai-client.ts`, que es lo correcto para llamadas de milisegundos.
 */
import { request as peticionHttp } from "node:http";

/**
 * Cuánto se espera como mucho a que el servicio conteste.
 *
 * Es el tope del lado del cliente y va holgado a propósito: el que manda de
 * verdad es el presupuesto por píldora del servicio de inferencia (300 s por
 * llamada al modelo y 420 s de reintentos, o sea 17 minutos en el peor caso).
 * Que salte este significa que algo se ha quedado colgado, no que el modelo
 * vaya lento.
 */
export const ESPERA_MAXIMA_MS = 20 * 60 * 1000;

export class ServicioNoResponde extends Error {}

/** POST de JSON sin el tope de cinco minutos de `fetch`. */
export function postJsonLargo<T>(
  url: string,
  cuerpo: unknown,
  esperaMs: number = ESPERA_MAXIMA_MS
): Promise<T> {
  const destino = new URL(url);
  const datos = Buffer.from(JSON.stringify(cuerpo), "utf-8");

  return new Promise<T>((resolver, rechazar) => {
    const peticion = peticionHttp(
      {
        protocol: destino.protocol,
        hostname: destino.hostname,
        port: destino.port,
        path: `${destino.pathname}${destino.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": datos.byteLength,
        },
      },
      (respuesta) => {
        const trozos: Buffer[] = [];
        respuesta.on("data", (trozo: Buffer) => trozos.push(trozo));
        respuesta.on("end", () => {
          const texto = Buffer.concat(trozos).toString("utf-8");
          if (!respuesta.statusCode || respuesta.statusCode >= 400) {
            rechazar(new ServicioNoResponde(`El servicio respondió ${respuesta.statusCode}`));
            return;
          }
          try {
            resolver(JSON.parse(texto) as T);
          } catch {
            rechazar(new ServicioNoResponde("El servicio devolvió algo que no era JSON."));
          }
        });
      }
    );

    // `setTimeout` de node:http mide INACTIVIDAD del socket, no duración
    // total: una generación larga que va enviando la respuesta no lo dispara.
    peticion.setTimeout(esperaMs, () => {
      peticion.destroy(new ServicioNoResponde("El servicio no respondió a tiempo."));
    });
    peticion.on("error", (error) =>
      rechazar(
        error instanceof ServicioNoResponde
          ? error
          : new ServicioNoResponde(`No se pudo hablar con el servicio: ${error.message}`)
      )
    );

    peticion.end(datos);
  });
}
