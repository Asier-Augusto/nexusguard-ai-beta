import type { InfographicData } from "@/lib/training-types";

export const twoFactorInfographic: InfographicData = {
  topicKey: "DOBLE_FACTOR",
  title: "Autenticación de Doble Factor (2FA)",
  subtitle: "Descubre por qué un solo candado ya no es suficiente para proteger tu cuenta.",
  durationMinutes: 5,
  steps: [
    {
      id: "concepto",
      icon: "ShieldCheck",
      title: "¿Qué es 2FA?",
      summary: "Un segundo candado para tu cuenta.",
      detail:
        "2FA significa confirmar quién eres con DOS pruebas distintas en lugar de una sola. Aunque alguien robe tu contraseña, no podrá entrar sin la segunda prueba. Es como cerrar la puerta con llave Y con alarma.",
    },
    {
      id: "sabes",
      icon: "KeyRound",
      title: "Factor 1: Algo que SABES",
      summary: "Tu contraseña o PIN.",
      detail:
        "Es la información secreta que memorizas: una contraseña, un PIN o la respuesta a una pregunta. Es el primer factor, pero por sí solo es fácil de robar (phishing, reutilización, fugas de datos).",
    },
    {
      id: "tienes",
      icon: "Smartphone",
      title: "Factor 2: Algo que TIENES",
      summary: "Tu móvil, una app o una llave física.",
      detail:
        "Un objeto físico que solo tú posees: tu teléfono (recibe un código o notificación), una app autenticadora (Google Authenticator, Microsoft Authenticator) o una llave USB de seguridad (FIDO2).",
    },
    {
      id: "eres",
      icon: "Fingerprint",
      title: "Factor 3: Algo que ERES",
      summary: "Tu huella o tu cara.",
      detail:
        "La biometría (huella dactilar, reconocimiento facial) es otro factor posible. Se combina con los anteriores en dispositivos modernos para desbloquear apps o confirmar pagos.",
    },
    {
      id: "codigo-no-solicitado",
      icon: "AlertTriangle",
      title: "Señal de alerta: un código que no pediste",
      summary: "Si recibes un código sin haberlo solicitado…",
      detail:
        "Significa que alguien más ya tiene tu contraseña y está intentando entrar a tu cuenta ahora mismo. Nunca compartas ese código con nadie (ni con 'soporte técnico') y avisa a IT inmediatamente.",
    },
    {
      id: "mfa-fatigue",
      icon: "BellRing",
      title: "El ataque 'MFA Fatigue'",
      summary: "Te bombardean con avisos hasta que aceptas por error.",
      detail:
        "Algunos atacantes envían decenas de notificaciones de aprobación seguidas, esperando que aceptes una sin pensar solo para que paren. La regla de oro: si no lo pediste TÚ, rechaza SIEMPRE.",
    },
  ],
  quiz: [
    {
      id: "q1",
      prompt: "Recibes en tu móvil un código de verificación que no has solicitado. ¿Qué haces?",
      options: [
        "Lo introduzco para comprobar si funciona",
        "Lo ignoro, seguro que es un error del sistema",
        "No lo comparto con nadie y aviso a IT: alguien tiene mi contraseña",
        "Se lo reenvío a un compañero para que me confirme si es normal",
      ],
      correctIndex: 2,
      explanation:
        "Un código no solicitado es la señal más clara de que alguien está intentando entrar con tu contraseña robada. Nunca lo compartas y avisa de inmediato.",
    },
    {
      id: "q2",
      prompt: "¿Cuál de estas opciones combina DOS factores distintos de autenticación?",
      options: [
        "Tu contraseña y tu PIN del banco",
        "Tu contraseña y un código generado por tu app autenticadora",
        "Tu nombre de usuario y tu contraseña",
        "Dos contraseñas diferentes para la misma cuenta",
      ],
      correctIndex: 1,
      explanation:
        "Contraseña (algo que sabes) + código de una app (algo que tienes) son dos factores de tipo distinto. Dos contraseñas siguen siendo el mismo factor.",
    },
    {
      id: "q3",
      prompt: "Empiezas a recibir 15 notificaciones seguidas pidiendo aprobar un inicio de sesión que tú no iniciaste. ¿Qué es esto?",
      options: [
        "Un fallo técnico de la aplicación sin importancia",
        "Un ataque de 'MFA Fatigue': debes rechazar todas y avisar a IT",
        "Debo aceptar una para que dejen de llegar",
        "Debo cambiar mi PIN del móvil",
      ],
      correctIndex: 1,
      explanation:
        "Es un bombardeo deliberado (MFA Fatigue). Rechaza todas las solicitudes que no hayas iniciado tú y notifica al equipo de seguridad.",
    },
  ],
};
