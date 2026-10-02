/**
 * Banco de mensajes del juego "Cazafraudes".
 *
 * TODO ESTE CONTENIDO ES MATERIAL DE SIMULACIÓN para formación interna
 * autorizada. Los dominios, remitentes y enlaces son ficticios o deliberadamente
 * malformados y no apuntan a ningún sitio real.
 *
 * Hay a propósito mensajes **legítimos que parecen trampa**: si todos los
 * ejemplos fraudulentos fueran obvios y todos los legítimos inofensivos, el
 * juego enseñaría a desconfiar de todo, que es tan inútil como no desconfiar de
 * nada. La habilidad que se entrena es distinguir, no sospechar.
 *
 * Gancho de futuro (Fase 5): estos mismos ejemplos y sus señales están pensados
 * para reutilizarse en la campaña real de phishing, de modo que la formación y
 * la campaña hablen el mismo idioma.
 */
import type { MensajeSospechoso, PhishSwipeData } from "@/lib/training-types";

const MENSAJES: MensajeSospechoso[] = [
  // --- Dificultad 1: fraudes evidentes y legítimos claros -------------------
  {
    id: "loteria",
    canal: "email",
    remitente: "premios@loteria-internacional-ganador.net",
    asunto: "¡FELICIDADES! Ha resultado GANADOR de 950.000 EUR",
    contenido:
      "Estimado afortunado,\n\nSu dirección de correo ha sido seleccionada entre millones en nuestro sorteo anual. Para recibir su premio de 950.000 EUR debe abonar una tasa administrativa de 250 EUR y enviarnos copia de su DNI y su número de cuenta.\n\nResponda en 48 horas o el premio pasará al siguiente ganador.",
    esLegitimo: false,
    senales: [
      "Nadie gana un sorteo en el que no ha participado.",
      "Pedir dinero por adelantado para cobrar un premio es el fraude de la tasa anticipada, uno de los más antiguos que existen.",
      "Solicita DNI y número de cuenta: dos piezas con las que suplantar tu identidad.",
      "El dominio no tiene ninguna relación con una lotería oficial.",
    ],
    dificultad: 1,
  },
  {
    id: "sms-paquete",
    canal: "sms",
    remitente: "+34 622 118 043",
    contenido:
      "Su paquete no ha podido entregarse por una tasa aduanera pendiente de 1,79 EUR. Regularice aquí: correos-entrega.info/pago",
    esLegitimo: false,
    senales: [
      "Cantidad ridículamente pequeña: busca que pagues sin pensarlo. El objetivo no es el euro, son los datos de tu tarjeta.",
      "El dominio imita al de una empresa de reparto pero no es el suyo.",
      "Llega de un número de móvil particular, no de un remitente corporativo.",
      "Si no esperas ningún paquete, no hay nada que regularizar.",
    ],
    dificultad: 1,
  },
  {
    id: "boletin-interno",
    canal: "email",
    remitente: "comunicacion@transportesnexus.es",
    asunto: "Boletín interno de marzo: nuevas rutas y calendario de formación",
    contenido:
      "Hola a todos,\n\nOs dejamos el resumen del mes: dos rutas nuevas en la zona norte, el calendario de formación del segundo trimestre y las fechas de las revisiones de flota.\n\nPodéis consultarlo en la intranet, en el apartado de Comunicación. Cualquier duda, respondednos a este correo.\n\nEquipo de Comunicación Interna",
    esLegitimo: true,
    senales: [
      "El dominio del remitente es el corporativo real.",
      "No pide credenciales, ni datos bancarios, ni que hagas nada urgente.",
      "Remite a la intranet por su nombre, sin incluir ningún enlace externo.",
      "El tono es informativo: no hay amenaza ni recompensa.",
    ],
    dificultad: 1,
  },
  {
    id: "principe",
    canal: "email",
    remitente: "barrister.okafor@legal-trustee-services.org",
    asunto: "Confidencial: herencia no reclamada de 4,2 millones",
    contenido:
      "Muy señor mío:\n\nSoy albacea de un cliente fallecido que compartía su mismo apellido. Existe una herencia no reclamada de 4.200.000 EUR. Si acepta figurar como beneficiario, repartiremos el importe al 60/40.\n\nNecesito absoluta discreción y sus datos bancarios para iniciar la transferencia.",
    esLegitimo: false,
    senales: [
      "Ofrece dinero a cambio de nada, que es la señal más antigua del manual.",
      "Exige secreto: busca que no lo consultes con nadie que te haga dudar.",
      "Te invita a participar en algo ilegal, lo que dificulta que denuncies después.",
      "Pide datos bancarios en el primer contacto.",
    ],
    dificultad: 1,
  },
  {
    id: "wifi-oficina",
    canal: "whatsapp",
    remitente: "Sistemas (grupo de la empresa)",
    contenido:
      "Buenas: mañana de 8:00 a 9:00 cortaremos el wifi de la planta 2 por mantenimiento del router. No hay que hacer nada por vuestra parte. Si a las 9:15 seguís sin cobertura, avisadnos por el canal de siempre.",
    esLegitimo: true,
    senales: [
      "No pide ninguna acción, ni datos, ni clics.",
      "Llega por el canal interno habitual y da una ventana concreta.",
      "Ofrece una vía de contacto ya conocida en lugar de un enlace nuevo.",
    ],
    dificultad: 1,
  },
  {
    id: "antivirus",
    canal: "email",
    remitente: "alerta@seguridad-pc-proteccion.com",
    asunto: "Su equipo tiene 3 virus. Actúe AHORA",
    contenido:
      "ANÁLISIS COMPLETADO\n\nHemos detectado 3 amenazas críticas en su equipo. Su información bancaria está en riesgo.\n\nDescargue nuestro limpiador gratuito desde este enlace y ejecútelo como administrador para eliminar las amenazas.",
    esLegitimo: false,
    senales: [
      "Nadie puede analizar tu equipo por correo: no tienen forma de saber qué hay en él.",
      "Alarma extrema y prisa, la combinación clásica para saltarse el pensamiento.",
      "Te pide descargar y ejecutar algo como administrador, que es exactamente lo que hace falta para infectar un equipo.",
      "Tu empresa ya tiene antivirus gestionado: nunca te pediría instalar otro por correo.",
    ],
    dificultad: 1,
  },

  // --- Dificultad 2: verosímiles, requieren fijarse ------------------------
  {
    id: "microsoft-caducidad",
    canal: "email",
    remitente: "no-reply@micros0ft-online.com",
    asunto: "Su contraseña de Microsoft 365 caduca hoy",
    contenido:
      "Estimado usuario,\n\nSu contraseña caduca en las próximas 4 horas. Para conservar el acceso a su correo y archivos, confirme sus credenciales actuales en el portal de renovación.\n\nSi no actúa, su cuenta quedará bloqueada.\n\nSoporte de Microsoft 365",
    esLegitimo: false,
    senales: [
      "El dominio es 'micros0ft' con un cero en lugar de la letra o. Es la señal decisiva y hay que mirarla con calma.",
      "Ningún sistema legítimo te pide escribir tu contraseña actual para renovarla.",
      "Plazo de cuatro horas: la urgencia artificial es el motor del engaño.",
      "Saludo genérico. Tu empresa sabe cómo te llamas.",
    ],
    dificultad: 2,
  },
  {
    id: "rrhh-nomina",
    canal: "email",
    remitente: "rrhh@transportesnexus-portal.es",
    asunto: "Revisión salarial: consulta tu nueva nómina",
    contenido:
      "Hola,\n\nYa está disponible la revisión salarial aprobada para este ejercicio. Accede al portal del empleado con tu usuario habitual para consultar tu nueva nómina antes del viernes.\n\nDepartamento de Recursos Humanos",
    esLegitimo: false,
    senales: [
      "El dominio añade '-portal' al nombre real de la empresa. Un dominio parecido no es el mismo dominio.",
      "Usa un asunto que casi nadie deja sin abrir: dinero propio.",
      "Pide iniciar sesión desde el mensaje en lugar de decirte que entres tú a la intranet.",
      "Ante cualquier correo sobre tu nómina, entra al portal por tu vía de siempre y compruébalo.",
    ],
    dificultad: 2,
  },
  {
    id: "factura-proveedor",
    canal: "email",
    remitente: "administracion@suministrosbereda.com",
    asunto: "Factura F-2024-0871 y cambio de cuenta bancaria",
    contenido:
      "Buenos días,\n\nAdjuntamos la factura correspondiente al pedido de febrero. Le informamos de que hemos cambiado de entidad bancaria, por lo que le rogamos actualice nuestros datos de pago al nuevo IBAN que figura en el documento.\n\nGracias por su colaboración.",
    esLegitimo: false,
    senales: [
      "Un cambio de número de cuenta comunicado por correo es la señal de alarma más importante que existe en el fraude al CEO y al proveedor.",
      "Se apoya en una relación comercial real para resultar creíble: puede que hasta la factura sea auténtica.",
      "La verificación obligatoria es llamar al proveedor al teléfono que ya tenías registrado, nunca al que aparezca en el correo.",
      "Nadie cambia de banco con prisa y por escrito sin previo aviso.",
    ],
    dificultad: 2,
  },
  {
    id: "vishing-banco",
    canal: "llamada",
    remitente: "Llamada entrante: 900 123 456 (identificado como tu banco)",
    contenido:
      "Le llamo del departamento de fraude de su banco. Hemos detectado un cargo de 840 euros en Polonia. Para bloquearlo necesito que me confirme el código que le acabamos de enviar por SMS. Es solo para verificar que habla con el titular.",
    esLegitimo: false,
    senales: [
      "Ningún banco pide jamás el código que te llega por SMS: ese código es precisamente lo que autoriza la operación del atacante.",
      "El número que aparece en la pantalla se puede falsificar; no prueba nada.",
      "Crea pánico con un cargo inventado para que actúes sin pensar.",
      "Cuelga y llama tú al número del reverso de tu tarjeta.",
    ],
    dificultad: 2,
  },
  {
    id: "docusign",
    canal: "email",
    remitente: "notificaciones@firma-documentos-online.net",
    asunto: "Tienes un documento pendiente de firma",
    contenido:
      "Se ha compartido contigo el documento 'Contrato_Marco_2024.pdf' para su revisión y firma electrónica.\n\nEl enlace caduca en 24 horas.\n\nRevisar documento",
    esLegitimo: false,
    senales: [
      "No dice quién te lo envía. Una firma real siempre identifica al remitente y a la empresa.",
      "El dominio es genérico y no corresponde a ninguna plataforma de firma conocida.",
      "Caducidad de 24 horas para que no te dé tiempo a comprobarlo.",
      "Si esperas un contrato, pregunta a quien debía enviártelo antes de abrir nada.",
    ],
    dificultad: 2,
  },
  {
    id: "it-mantenimiento",
    canal: "email",
    remitente: "sistemas@transportesnexus.es",
    asunto: "Ventana de mantenimiento del ERP: sábado de 22:00 a 02:00",
    contenido:
      "Hola,\n\nEste sábado actualizaremos el ERP entre las 22:00 y las 02:00. Durante ese intervalo el sistema no estará disponible.\n\nNo tenéis que hacer nada. El lunes todo funcionará con normalidad; si notáis algo raro, abrid un ticket como siempre.\n\nEquipo de Sistemas",
    esLegitimo: true,
    senales: [
      "Dominio corporativo correcto, sin variaciones ni sufijos añadidos.",
      "Informa de una ventana en fin de semana y fuera de horario, que es lo normal para un mantenimiento.",
      "No pide credenciales ni incluye enlaces.",
      "Remite al procedimiento interno de siempre para incidencias.",
    ],
    dificultad: 2,
  },
  {
    id: "sms-2fa-legitimo",
    canal: "sms",
    remitente: "NexusGuard",
    contenido:
      "Tu código de verificación es 481920. Caduca en 5 minutos. Nadie de NexusGuard te pedirá este código: si no lo has solicitado tú, cámbiate la contraseña.",
    esLegitimo: true,
    senales: [
      "Un código de un solo uso es un mensaje normal cuando lo has pedido tú.",
      "Advierte explícitamente de que nadie te lo va a pedir: eso es lo que hace un servicio serio.",
      "No contiene ningún enlace.",
      "Si te llega sin haberlo solicitado, la señal no es el mensaje: es que alguien tiene tu contraseña.",
    ],
    dificultad: 2,
  },
  {
    id: "whatsapp-hijo",
    canal: "whatsapp",
    remitente: "+34 631 902 774 (desconocido)",
    contenido:
      "Hola mamá, se me ha roto el móvil y te escribo desde este número. ¿Me puedes hacer un bizum de 380 € para pagar una cosa urgente? Luego te lo devuelvo, es que desde este teléfono no puedo entrar a mi banco.",
    esLegitimo: false,
    senales: [
      "Número nuevo y desconocido que reclama una identidad familiar.",
      "Justifica de antemano por qué no puedes verificarlo por el canal habitual: el móvil 'roto'.",
      "Petición de dinero urgente, que es el objetivo real del mensaje.",
      "Llama al número de siempre de esa persona antes de mover un euro.",
    ],
    dificultad: 2,
  },
  {
    id: "encuesta-rrhh",
    canal: "email",
    remitente: "personas@transportesnexus.es",
    asunto: "Encuesta de clima laboral (anónima, 5 minutos)",
    contenido:
      "Buenos días,\n\nComo cada año lanzamos la encuesta de clima laboral. Es anónima y no pide ningún dato identificativo. Está abierta hasta fin de mes y se responde en unos cinco minutos.\n\nLa encontraréis enlazada en el tablón de la intranet.\n\nÁrea de Personas",
    esLegitimo: true,
    senales: [
      "Dominio corporativo legítimo.",
      "No pide credenciales ni datos personales, y lo dice expresamente.",
      "El plazo es amplio: no hay urgencia fabricada.",
      "Remite a la intranet en lugar de incrustar un enlace externo.",
    ],
    dificultad: 2,
  },

  // --- Dificultad 3: dirigidos, casi perfectos -----------------------------
  {
    id: "spear-director",
    canal: "email",
    remitente: "elena.vidal@transportesnexus.es",
    asunto: "RE: Pago pendiente proveedor Bereda",
    contenido:
      "Hola,\n\nEstoy en el aeropuerto y me han llamado de Bereda por la factura de febrero. Necesito que salga hoy sin falta o nos paran el suministro.\n\nSon 14.780 €. Te paso el IBAN por aquí porque no tengo acceso al ERP desde el móvil. No hace falta que lo pases por el circuito habitual, ya lo justifico yo el lunes.\n\nGracias,\nElena",
    esLegitimo: false,
    senales: [
      "Pide expresamente saltarse el procedimiento de aprobación. Ese es el corazón del fraude al CEO y basta por sí solo para parar la operación.",
      "El remitente parece interno, pero la dirección mostrada se falsifica con facilidad: hay que mirar las cabeceras reales o llamar.",
      "Combina autoridad, urgencia y una excusa para no poder verificarlo (está de viaje, sin acceso).",
      "Un IBAN nuevo enviado por mensaje se verifica siempre por voz, con la persona, en un número que ya tuvieras.",
    ],
    dificultad: 3,
  },
  {
    id: "spear-rrhh-real",
    canal: "email",
    remitente: "marta.gil@transportesnexus.es",
    asunto: "Documentación para la auditoría de prevención",
    contenido:
      "Hola,\n\nComo comentamos en la reunión del martes, necesito recopilar la documentación de prevención antes del viernes. ¿Me puedes reenviar el listado de personal con NIF y categoría que preparaste el año pasado?\n\nGracias,\nMarta — Recursos Humanos",
    esLegitimo: false,
    senales: [
      "Cita una reunión concreta para ganar credibilidad: el atacante ha investigado antes o ha comprometido otra cuenta.",
      "Lo que pide es lo valioso: un fichero con datos personales de toda la plantilla.",
      "Aunque el remitente sea real, la cuenta puede estar comprometida. Ante una petición de datos personales masivos, confirma por otro canal.",
      "Enviar ese listado sería además una cesión de datos que el RGPD exige justificar.",
    ],
    dificultad: 3,
  },
  {
    id: "calendario-compartido",
    canal: "email",
    remitente: "calendar-notification@transportesnexus-workspace.com",
    asunto: "Invitación: Revisión trimestral de seguridad — mañana 10:00",
    contenido:
      "Se te ha invitado a la reunión 'Revisión trimestral de seguridad'.\n\nOrganiza: Dirección\nCuándo: mañana, 10:00 - 11:00\n\nPara aceptar la invitación e iniciar sesión en la sala, confirma tu identidad corporativa.",
    esLegitimo: false,
    senales: [
      "El dominio añade '-workspace' al de la empresa: parecido no es igual.",
      "Una invitación de calendario real no te pide 'confirmar tu identidad corporativa'.",
      "Se disfraza de notificación automática, un formato al que nadie presta atención.",
      "La reunión es mañana: suficiente urgencia para que aceptes sin mirar.",
    ],
    dificultad: 3,
  },
  {
    id: "proveedor-hilo-real",
    canal: "email",
    remitente: "j.ramos@suministrosbereda.com",
    asunto: "RE: RE: Pedido 4471 — confirmación de recepción",
    contenido:
      "Buenos días,\n\nConfirmado, el pedido 4471 salió ayer del almacén y llega el jueves. Os adjunto el albarán firmado.\n\nSobre lo que preguntabais del calibre, os confirmo que es el de 12 mm, como en el pedido anterior.\n\nUn saludo,\nJavier Ramos — Suministros Bereda",
    esLegitimo: true,
    senales: [
      "Continúa un hilo real con detalles concretos y verificables: número de pedido, fecha, medida.",
      "No pide dinero, ni credenciales, ni cambios de datos bancarios.",
      "El dominio coincide con el del proveedor habitual, sin sufijos añadidos.",
      "Que un correo lleve adjunto no lo convierte en fraudulento; lo que importa es qué te pide que hagas.",
    ],
    dificultad: 3,
  },
  {
    id: "vishing-soporte-interno",
    canal: "llamada",
    remitente: "Llamada interna: extensión 412 (Soporte IT)",
    contenido:
      "Hola, soy Dani de Sistemas. Estamos migrando los buzones y el tuyo ha dado error. Te voy a mandar un enlace por Teams para que vuelvas a iniciar sesión y así lo reactivo desde aquí. ¿Me confirmas que te ha llegado y me dices el código de seis dígitos que te sale?",
    esLegitimo: false,
    senales: [
      "Pide un código de verificación: nadie de tu organización necesita ese código jamás.",
      "La extensión interna que aparece también se puede falsificar en muchas centralitas.",
      "El pretexto técnico es plausible, y por eso funciona: la señal no es la excusa, es la petición.",
      "Cuelga y llama tú a Sistemas por el canal de siempre para confirmar que existe esa migración.",
    ],
    dificultad: 3,
  },
  {
    id: "aviso-legal-rgpd",
    canal: "email",
    remitente: "dpo@transportesnexus.es",
    asunto: "Recordatorio: revisión anual del registro de actividades",
    contenido:
      "Hola,\n\nRecordatorio de que en octubre toca la revisión anual del registro de actividades de tratamiento. Cada responsable de área debe revisar sus fichas y comunicarme los cambios.\n\nNo hay que hacer nada todavía: la semana que viene os paso el calendario con las reuniones por área.\n\nElena Vidal — Delegada de Protección de Datos",
    esLegitimo: true,
    senales: [
      "Dominio corporativo y firma con cargo real.",
      "Anuncia un proceso conocido y anual, sin urgencia ni plazo agresivo.",
      "Dice expresamente que no hay que hacer nada aún: lo contrario de lo que busca un ataque.",
      "No contiene enlaces ni adjuntos.",
    ],
    dificultad: 3,
  },
  {
    id: "sms-banco-perfecto",
    canal: "sms",
    remitente: "BANCO (mismo hilo que los SMS reales del banco)",
    contenido:
      "Detectado acceso desde un dispositivo no habitual. Si no has sido tú, revisa y bloquea aquí: bbva-seguridad-clientes.com/alerta",
    esLegitimo: false,
    senales: [
      "Aparece dentro del mismo hilo que los mensajes auténticos del banco: los SMS se agrupan por nombre de remitente, y ese nombre se falsifica. Que salga ahí no lo hace legítimo.",
      "El dominio no es el del banco, aunque lo contenga como prefijo.",
      "Un aviso real te dice que entres a la app, no te da un enlace para 'bloquear'.",
      "Ante la duda, abre la aplicación del banco tú mismo. Nunca desde el mensaje.",
    ],
    dificultad: 3,
  },
  {
    id: "curriculum",
    canal: "email",
    remitente: "laura.mendez.rrhh@gmail.com",
    asunto: "Candidatura para el puesto de administrativo/a",
    contenido:
      "Buenos días,\n\nAdjunto mi currículum en respuesta a la oferta publicada. Tengo cinco años de experiencia en gestión administrativa en el sector logístico.\n\nQuedo a su disposición.\n\nLaura Méndez\nCV_Laura_Mendez.docm",
    esLegitimo: false,
    senales: [
      "La extensión .docm indica un documento de Word con macros, es decir, con código ejecutable dentro. Un currículum no necesita macros.",
      "Es un vector clásico contra Recursos Humanos, precisamente porque su trabajo es abrir adjuntos de desconocidos.",
      "Si tienes que abrirlo, hazlo en el visor protegido y nunca pulses 'Habilitar contenido'.",
      "Que el remitente use un correo personal es normal en una candidatura: eso por sí solo no es la señal.",
    ],
    dificultad: 3,
  },
];

export const cazafraudes: PhishSwipeData = {
  tipo: "phishing-swipe",
  topicKey: "EMAIL",
  title: "Cazafraudes",
  subtitle:
    "Van pasando mensajes reales de oficina. Decide de un vistazo cuáles son trampa y cuáles no.",
  durationMinutes: 5,
  mensajesPorPartida: 12,
  mensajes: MENSAJES,
};
