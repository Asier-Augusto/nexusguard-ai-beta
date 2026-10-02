/**
 * Contenido de las píldoras de formación que siembra `seed.ts`.
 *
 * Hay una entrada por cada tema del catálogo (`src/lib/content/pill-catalog.ts`),
 * con la misma forma `InfographicData` que ya consume el componente
 * `InteractiveInfographic`. La píldora de 2FA reutiliza el contenido real que
 * ya existía en `src/lib/content/two-factor-auth.ts` en lugar de duplicarlo.
 *
 * Las nueve infografías restantes son versiones breves (3 pasos + 2 preguntas).
 *
 * Además del formato de infografía hay píldoras que son juegos: su contenido
 * lleva un campo `tipo` que la ruta usa para elegir el componente. La Fábrica
 * de contraseñas es la primera.
 */
import type { ContenidoPildora } from "../src/lib/training-types";
import { twoFactorInfographic } from "../src/lib/content/two-factor-auth";
import { fabricaDeContrasenas } from "../src/lib/content/password-forge";
import { cazafraudes } from "../src/lib/content/phishing-swipe";

export const PILL_CONTENT: ContenidoPildora[] = [
  twoFactorInfographic,
  fabricaDeContrasenas,

  cazafraudes,

  {
    topicKey: "WINDOWS",
    title: "Seguridad en Windows",
    subtitle: "Cuatro hábitos que convierten tu equipo de trabajo en un objetivo difícil.",
    durationMinutes: 5,
    steps: [
      {
        id: "actualizaciones",
        icon: "RefreshCw",
        title: "Las actualizaciones no son opcionales",
        summary: "Posponerlas deja la puerta abierta durante semanas.",
        detail:
          "La mayoría de los ataques reales no usan vulnerabilidades nuevas, sino fallos ya corregidos en equipos que no se actualizaron. Cuando Windows Update pida reiniciar, hazlo ese mismo día.",
      },
      {
        id: "uac",
        icon: "ShieldAlert",
        title: "El aviso de administrador es una pregunta, no un trámite",
        summary: "Si no has iniciado tú la instalación, di que no.",
        detail:
          "El Control de Cuentas de Usuario (UAC) te avisa cuando un programa quiere cambiar el sistema. Si aparece sin que tú hayas abierto un instalador, cancélalo y avisa a IT: puede ser software que se ha colado por un adjunto.",
      },
      {
        id: "bloqueo",
        icon: "Lock",
        title: "Bloquea al levantarte",
        summary: "Windows + L, cada vez.",
        detail:
          "Un equipo desbloqueado en una oficina abierta, una sala de reuniones o una zona de paso es acceso total a tu correo y tus documentos. El atajo Windows + L tarda menos de un segundo.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Aparece un aviso de UAC pidiendo permiso de administrador y tú no has abierto ningún instalador. ¿Qué haces?",
        options: [
          "Acepto: si sale es porque el sistema lo necesita",
          "Cancelo y lo comunico a IT",
          "Acepto y luego desinstalo lo que se haya instalado",
          "Reinicio el equipo y sigo trabajando",
        ],
        correctIndex: 1,
        explanation:
          "Un aviso de elevación que no has provocado tú es señal de que algo se está ejecutando sin tu conocimiento. Cancelar y reportar es la respuesta correcta.",
      },
      {
        id: "q2",
        prompt: "¿Por qué es peligroso posponer las actualizaciones de Windows durante semanas?",
        options: [
          "Porque el equipo va más lento",
          "Porque se acumulan archivos temporales",
          "Porque los fallos ya corregidos y publicados quedan explotables en tu equipo",
          "Porque se pierde la garantía del fabricante",
        ],
        correctIndex: 2,
        explanation:
          "Al publicarse un parche también se hace pública la vulnerabilidad. Los equipos sin actualizar se convierten en el objetivo más fácil.",
      },
    ],
  },

  {
    topicKey: "MACOS",
    title: "Seguridad en macOS",
    subtitle: "El mito del Mac invulnerable y lo que sí tienes que configurar.",
    durationMinutes: 5,
    steps: [
      {
        id: "mito",
        icon: "Laptop",
        title: "macOS también recibe malware",
        summary: "Menos frecuente no significa inmune.",
        detail:
          "Existen familias de malware específicas para macOS, sobre todo ladrones de credenciales que se distribuyen como instaladores de apps populares descargadas fuera de la App Store. La precaución vale igual que en Windows.",
      },
      {
        id: "gatekeeper",
        icon: "ShieldCheck",
        title: "No desactives Gatekeeper",
        summary: "Si una app te pide saltarte la protección, sospecha.",
        detail:
          "Gatekeeper bloquea aplicaciones sin firmar. Las instrucciones del tipo 'haz clic derecho y pulsa Abrir para saltar el aviso' son legítimas en algunos casos, pero también son exactamente lo que pide el software malicioso. Ante la duda, consulta con IT antes.",
      },
      {
        id: "filevault",
        icon: "HardDrive",
        title: "Activa FileVault",
        summary: "Cifra el disco por si el portátil se pierde.",
        detail:
          "FileVault cifra todo el disco. Sin él, quien encuentre o robe tu portátil puede sacar el disco y leer tus documentos y tu correo aunque no sepa tu contraseña. Se activa una vez y no molesta después.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Una web te ofrece una app y te indica cómo saltarte el aviso de seguridad de macOS. ¿Qué significa eso?",
        options: [
          "Que la app es demasiado nueva para estar firmada",
          "Que la app no está firmada y macOS no puede verificar su origen: hay que desconfiar",
          "Que macOS tiene un fallo de configuración",
          "Que hay que actualizar el sistema",
        ],
        correctIndex: 1,
        explanation:
          "El aviso existe precisamente porque el sistema no puede verificar quién publica la app. Saltárselo es asumir ese riesgo.",
      },
      {
        id: "q2",
        prompt: "¿Para qué sirve FileVault?",
        options: [
          "Para hacer copias de seguridad en iCloud",
          "Para cifrar el disco completo y proteger los datos si pierdes el equipo",
          "Para bloquear la pantalla automáticamente",
          "Para analizar virus en tiempo real",
        ],
        correctIndex: 1,
        explanation:
          "FileVault es cifrado de disco completo. Protege los datos en reposo, que es justo el escenario de un portátil perdido o robado.",
      },
    ],
  },

  {
    topicKey: "LINUX",
    title: "Seguridad en Linux",
    subtitle: "Permisos, sudo y claves SSH: los tres sitios donde se cometen los errores.",
    durationMinutes: 10,
    steps: [
      {
        id: "sudo",
        icon: "TerminalSquare",
        title: "sudo no es un prefijo mágico",
        summary: "Añadirlo por costumbre es cómo se rompen los sistemas.",
        detail:
          "Ejecutar con sudo un comando que no entiendes le da control total del sistema. Antes de copiar y pegar una línea de un foro o de un asistente de IA, léela entera y comprende qué hace cada parte.",
      },
      {
        id: "permisos",
        icon: "FileLock",
        title: "chmod 777 no es 'arreglarlo'",
        summary: "Es abrir el fichero a todo el mundo.",
        detail:
          "Dar permisos 777 a un directorio para que 'deje de dar error' permite a cualquier usuario o proceso del sistema leerlo, modificarlo y ejecutarlo. Ajusta el propietario y el grupo en lugar de abrir los permisos.",
      },
      {
        id: "ssh",
        icon: "KeyRound",
        title: "Claves SSH con contraseña, nunca contraseñas sueltas",
        summary: "Y jamás compartas tu clave privada.",
        detail:
          "Autentícate con claves y protégelas con una frase de paso. La clave privada no se envía por correo ni por chat bajo ningún concepto: si alguien la necesita, lo que se comparte es la pública.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Un tutorial te dice que hagas `sudo chmod -R 777 /var/www` para resolver un error de permisos. ¿Qué haces?",
        options: [
          "Lo ejecuto: es la solución más rápida",
          "Lo ejecuto pero solo en mi máquina de desarrollo",
          "Busco cuál es el usuario correcto y ajusto propietario y grupo en su lugar",
          "Lo ejecuto y luego lo revierto",
        ],
        correctIndex: 2,
        explanation:
          "777 concede lectura, escritura y ejecución a todo el sistema. El problema casi siempre es de propietario, y ajustarlo es la solución correcta.",
      },
      {
        id: "q2",
        prompt: "¿Cuál de estos ficheros NO debe salir nunca de tu equipo?",
        options: ["~/.ssh/id_ed25519.pub", "~/.ssh/known_hosts", "~/.ssh/id_ed25519", "~/.bashrc"],
        correctIndex: 2,
        explanation:
          "El fichero sin extensión .pub es la clave privada. Quien la tenga puede suplantarte en todos los servidores donde esté autorizada tu clave.",
      },
    ],
  },

  {
    topicKey: "ANDROID",
    title: "Seguridad en Android",
    subtitle: "Permisos, orígenes desconocidos y el móvil que también es de trabajo.",
    durationMinutes: 3,
    steps: [
      {
        id: "origenes",
        icon: "Smartphone",
        title: "Instala solo desde la tienda oficial",
        summary: "Los ficheros .apk sueltos son el vector número uno.",
        detail:
          "Un enlace por SMS o WhatsApp que descarga un .apk directamente salta todos los controles de Google Play. Si el móvil tiene tu correo corporativo, ese .apk tiene acceso a tu correo corporativo.",
      },
      {
        id: "permisos",
        icon: "ShieldAlert",
        title: "Revisa qué permisos pide cada app",
        summary: "Una linterna no necesita tus contactos.",
        detail:
          "Cuando una app pide permisos que no encajan con su función (accesibilidad, SMS, contactos, superposición de pantalla), es señal de alarma. El permiso de accesibilidad en particular permite leer y controlar todo lo que haces en el móvil.",
      },
      {
        id: "smishing",
        icon: "MessageSquareWarning",
        title: "El phishing también llega por SMS",
        summary: "Se llama smishing y funciona igual de bien.",
        detail:
          "Avisos de paquetes, multas o bancos por SMS con un enlace acortado. Igual que en el correo: no abras el enlace, entra tú a la web o la app oficial.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Recibes un SMS de una empresa de mensajería con un enlace para 'reprogramar tu entrega'. ¿Qué haces?",
        options: [
          "Abro el enlace, total es solo ver la web",
          "Abro el enlace pero no introduzco datos",
          "No abro el enlace y compruebo el envío en la app o web oficial de la empresa",
          "Respondo al SMS pidiendo más información",
        ],
        correctIndex: 2,
        explanation:
          "Es el patrón clásico de smishing. Comprueba siempre el envío entrando tú por la vía oficial, nunca por el enlace del mensaje.",
      },
      {
        id: "q2",
        prompt: "Una app de linterna solicita permiso de accesibilidad. ¿Qué implica?",
        options: [
          "Nada, es un permiso rutinario",
          "Que podría leer y controlar todo lo que haces en pantalla: no se lo concedas",
          "Que la app está optimizada para personas con discapacidad",
          "Que necesita ese permiso para acceder al flash",
        ],
        correctIndex: 1,
        explanation:
          "El permiso de accesibilidad es de los más potentes de Android y el malware bancario lo usa para capturar credenciales. Una linterna no lo necesita.",
      },
    ],
  },

  {
    topicKey: "IOS",
    title: "Seguridad en iOS",
    subtitle: "Perfiles de configuración, copias y el ecosistema cerrado que tampoco es infalible.",
    durationMinutes: 3,
    steps: [
      {
        id: "perfiles",
        icon: "FileWarning",
        title: "Cuidado con los perfiles de configuración",
        summary: "Instalar uno da control sobre tu dispositivo.",
        detail:
          "Un perfil de configuración puede redirigir tu tráfico, instalar certificados y ver a dónde navegas. Solo instala los que te envíe tu propio departamento de IT y siempre verificando por otro canal que son suyos.",
      },
      {
        id: "actualizar",
        icon: "RefreshCw",
        title: "Actualiza iOS en cuanto salga",
        summary: "Muchas versiones corrigen fallos ya explotados.",
        detail:
          "Apple publica con frecuencia actualizaciones que reparan vulnerabilidades activamente aprovechadas. En un móvil con acceso al correo de empresa, retrasar la actualización es un riesgo directo para la organización.",
      },
      {
        id: "jailbreak",
        icon: "Unlock",
        title: "Nada de jailbreak en dispositivos de trabajo",
        summary: "Rompe justo las protecciones que te defienden.",
        detail:
          "El jailbreak desactiva el aislamiento entre apps, que es la principal defensa de iOS. Un dispositivo con jailbreak no debe acceder a recursos corporativos.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Una web te pide instalar un perfil de configuración para 'mejorar la conexión'. ¿Qué haces?",
        options: [
          "Lo instalo, iOS es seguro por diseño",
          "Lo instalo y lo borro después",
          "No lo instalo: un perfil puede interceptar tu tráfico y solo debe venir de tu IT",
          "Lo instalo si la web usa HTTPS",
        ],
        correctIndex: 2,
        explanation:
          "Los perfiles de configuración conceden un control muy amplio del dispositivo. Solo deben instalarse los que provengan de tu departamento de IT.",
      },
      {
        id: "q2",
        prompt: "¿Por qué un iPhone con jailbreak no debe acceder al correo corporativo?",
        options: [
          "Porque consume más batería",
          "Porque pierde la garantía",
          "Porque desactiva el aislamiento entre apps, la defensa principal del sistema",
          "Porque no puede instalar apps de la App Store",
        ],
        correctIndex: 2,
        explanation:
          "El aislamiento (sandbox) impide que una app lea los datos de otra. Sin él, cualquier app instalada puede acceder al correo de empresa.",
      },
    ],
  },

  {
    topicKey: "IOT",
    title: "Dispositivos IoT",
    subtitle: "Cámaras, impresoras y sensores: los equipos que nadie actualiza.",
    durationMinutes: 5,
    steps: [
      {
        id: "credenciales",
        icon: "KeyRound",
        title: "Cambia las credenciales de fábrica",
        summary: "admin/admin sigue siendo la contraseña más usada del mundo.",
        detail:
          "Cámaras, grabadores, impresoras y routers salen de fábrica con usuarios y contraseñas públicos, documentados en el propio manual. Cambiarlos en el momento de la instalación es la medida más rentable que existe.",
      },
      {
        id: "segmentar",
        icon: "Router",
        title: "Sepáralos de la red de trabajo",
        summary: "Una cámara comprometida no debería ver tus servidores.",
        detail:
          "Los dispositivos IoT rara vez reciben parches. Colocarlos en una red o VLAN separada limita el daño: si alguien entra por la cámara del almacén, no llega a los equipos de administración.",
      },
      {
        id: "inventario",
        icon: "ClipboardList",
        title: "Lo que no está inventariado no se protege",
        summary: "Nadie parchea un dispositivo que ha olvidado que existe.",
        detail:
          "Mantén una lista de qué dispositivos hay conectados, quién es su responsable y cuándo se actualizaron por última vez. Es el punto de partida de cualquier auditoría.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "¿Cuál es el primer paso al instalar una cámara IP nueva en la oficina?",
        options: [
          "Conectarla a la red principal para que funcione ya",
          "Cambiar las credenciales de fábrica antes de exponerla a la red",
          "Configurar el acceso remoto desde el móvil",
          "Ajustar la calidad de la imagen",
        ],
        correctIndex: 1,
        explanation:
          "Las credenciales por defecto están publicadas en los manuales y se rastrean automáticamente en internet. Cambiarlas es lo primero.",
      },
      {
        id: "q2",
        prompt: "¿Por qué conviene poner los dispositivos IoT en una red separada?",
        options: [
          "Para que vayan más rápido",
          "Para ahorrar direcciones IP",
          "Para que si uno se ve comprometido no dé acceso al resto de sistemas",
          "Porque lo exige el fabricante",
        ],
        correctIndex: 2,
        explanation:
          "Es contención de daños: la segmentación evita que un dispositivo débil y sin parches sirva de puente hacia la red corporativa.",
      },
    ],
  },

  {
    topicKey: "SEGURIDAD_DATO",
    title: "Seguridad del Dato",
    subtitle: "Clasificar, minimizar y saber qué hacer cuando algo se escapa.",
    durationMinutes: 5,
    steps: [
      {
        id: "clasificar",
        icon: "Database",
        title: "No todos los datos valen lo mismo",
        summary: "Público, interno, confidencial y personal.",
        detail:
          "Antes de compartir un fichero, pregúntate en qué categoría cae. Los datos personales (nombres, DNI, salud, nóminas) están protegidos por el RGPD y su tratamiento indebido tiene consecuencias legales para la empresa.",
      },
      {
        id: "minimizar",
        icon: "Filter",
        title: "Comparte lo mínimo imprescindible",
        summary: "Exportar 'la tabla entera' es el error habitual.",
        detail:
          "Si te piden los datos de un cliente, envía los de ese cliente, no el listado completo. El principio de minimización del RGPD no es burocracia: reduce el daño de cualquier fuga posterior.",
      },
      {
        id: "incidente",
        icon: "AlertTriangle",
        title: "Si hay fuga, se notifica en 72 horas",
        summary: "Ocultarlo agrava el problema.",
        detail:
          "El RGPD obliga a notificar a la autoridad de control en un plazo de 72 horas desde que se conoce una brecha de datos personales. Avisar rápido al DPO permite cumplir el plazo; callar por miedo lo hace imposible.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Un compañero te pide por chat el teléfono de un cliente y le envías el listado completo de clientes. ¿Qué principio has incumplido?",
        options: [
          "Ninguno, es un compañero de la empresa",
          "El principio de minimización de datos",
          "El derecho al olvido",
          "El deber de portabilidad",
        ],
        correctIndex: 1,
        explanation:
          "La minimización exige tratar solo los datos necesarios para la finalidad concreta. Un dato pedido no justifica enviar el fichero entero.",
      },
      {
        id: "q2",
        prompt: "Descubres que un fichero con datos personales se ha enviado por error fuera de la empresa. ¿Qué haces?",
        options: [
          "Espero a ver si alguien lo nota",
          "Lo comunico de inmediato al DPO: hay un plazo de 72 horas para notificar",
          "Pido al destinatario que lo borre y lo doy por resuelto",
          "Lo comento en la próxima reunión de equipo",
        ],
        correctIndex: 1,
        explanation:
          "El plazo de notificación del RGPD corre desde que se conoce la brecha. Comunicarlo al DPO cuanto antes es lo que permite cumplirlo.",
      },
    ],
  },

  {
    topicKey: "USO_IA",
    title: "Uso responsable de la IA",
    subtitle: "Qué puedes pegar en un chatbot y qué no debe salir nunca de la empresa.",
    durationMinutes: 5,
    steps: [
      {
        id: "que-no-pegar",
        icon: "BrainCircuit",
        title: "Lo que pegas puede dejar de ser tuyo",
        summary: "Código, contratos y datos de clientes, fuera.",
        detail:
          "Salvo que uses una herramienta aprobada por tu empresa con acuerdo de tratamiento de datos, asume que lo que escribes en un chatbot sale de la organización. Nunca pegues datos personales, credenciales, código propietario ni información contractual.",
      },
      {
        id: "verificar",
        icon: "SearchCheck",
        title: "La IA se equivoca con mucha seguridad",
        summary: "Suena convincente aunque se lo esté inventando.",
        detail:
          "Los modelos generan texto plausible, no verdad verificada. Cualquier dato, cita normativa o fragmento de código que vayas a usar en un entregable debe comprobarse contra la fuente original.",
      },
      {
        id: "shadow-ai",
        icon: "EyeOff",
        title: "Evita la 'shadow AI'",
        summary: "Herramientas no aprobadas, riesgos invisibles.",
        detail:
          "Usar por tu cuenta servicios de IA no autorizados crea un canal de salida de información que la empresa no conoce ni puede auditar. Si necesitas una herramienta, pídela: es más rápido que gestionar una fuga.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Quieres que una IA pública te resuma un contrato con datos de un cliente. ¿Qué haces?",
        options: [
          "Lo pego entero, es solo un resumen",
          "Lo pego quitando el nombre de la empresa",
          "No lo pego en una herramienta no aprobada; uso la que la empresa autorice",
          "Lo pego pero borro la conversación después",
        ],
        correctIndex: 2,
        explanation:
          "Borrar la conversación no deshace el envío, y anonimizar parcialmente rara vez basta. La vía correcta es usar una herramienta aprobada con las garantías contractuales adecuadas.",
      },
      {
        id: "q2",
        prompt: "Una IA te da una referencia normativa concreta para un informe. ¿Qué haces antes de usarla?",
        options: [
          "La uso: si cita el artículo será correcto",
          "La verifico contra el texto oficial de la norma",
          "Pregunto a la misma IA si está segura",
          "La uso indicando que la generó una IA",
        ],
        correctIndex: 1,
        explanation:
          "Los modelos pueden fabricar citas y referencias que suenan verosímiles. La única comprobación válida es la fuente original.",
      },
    ],
  },
];
