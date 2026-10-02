/**
 * Contenido del juego "Fábrica de contraseñas".
 *
 * Las contraseñas que aparecen aquí son EJEMPLOS didácticos, elegidos porque
 * ilustran errores típicos. Ninguna se usa en ningún sitio real.
 */
import type { PasswordForgeData } from "@/lib/training-types";

export const fabricaDeContrasenas: PasswordForgeData = {
  tipo: "password-forge",
  topicKey: "CONTRASENAS",
  title: "Fábrica de contraseñas",
  subtitle:
    "Forja una contraseña en el laboratorio y mira en directo cuánto tardarían en romperla.",
  durationMinutes: 5,

  anosObjetivo: 100,

  // Cumple todas las reglas clásicas (mayúscula, número, símbolo) y aun así se
  // rompe en un suspiro: es el contraejemplo perfecto para el segundo reto.
  contrasenaDebil: "Madrid2024!",

  opcionesMasDebil: [
    {
      id: "a",
      ejemplo: "P@ssw0rd!",
      explicacion:
        "Es la más débil con diferencia. Sustituir letras por símbolos parecidos (a por @, o por 0) es lo primero que prueba cualquier herramienta: la palabra sigue siendo 'password'.",
    },
    {
      id: "b",
      ejemplo: "kL8#vQ2z",
      explicacion:
        "Corta pero sin patrones reconocibles. Aguanta más que la anterior, aunque ocho caracteres se quedan cortos hoy y además es imposible de recordar.",
    },
    {
      id: "c",
      ejemplo: "caballo grapa batería correcto",
      explicacion:
        "Cuatro palabras sin relación: muy larga, fácil de recordar y con un espacio de búsqueda enorme. Es la más resistente de las cuatro.",
    },
    {
      id: "d",
      ejemplo: "Tr4nsp0rtes-N3xus",
      explicacion:
        "Larga y con aspecto complejo, pero contiene el nombre de la empresa. Un atacante dirigido prueba antes que nada las palabras del entorno de la víctima.",
    },
  ],
  indiceMasDebil: 0,

  preguntasCierre: [
    {
      id: "cierre-1",
      prompt:
        "Tienes cuarenta cuentas distintas y no puedes recordar cuarenta contraseñas largas. ¿Qué haces?",
      options: [
        "Uso la misma en todas, pero muy larga",
        "Uso un gestor de contraseñas: recuerdas una sola y él guarda el resto",
        "Las apunto en una nota del móvil",
        "Voy variando el último número en cada sitio",
      ],
      correctIndex: 1,
      explanation:
        "Un gestor genera una contraseña distinta y larga para cada servicio, y tú solo memorizas la maestra. Reutilizar es el fallo más caro: cuando filtran una web, prueban esa misma clave en tu correo y tu banco.",
    },
    {
      id: "cierre-2",
      prompt: "Tu contraseña es excelente. ¿Sobra entonces el doble factor?",
      options: [
        "Sí, con una contraseña fuerte es suficiente",
        "No: si te la roban por phishing o por una filtración, el segundo factor es lo único que queda en pie",
        "Solo hace falta en el banco",
        "Solo si usas WiFi pública",
      ],
      correctIndex: 1,
      explanation:
        "La fuerza de una contraseña protege frente a que la adivinen, no frente a que te la roben. Ante un engaño o una filtración, el segundo factor es la última barrera.",
    },
  ],
};
