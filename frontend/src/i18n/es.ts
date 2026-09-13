import type { Dict } from './en'

const es: Dict = {
  app: { name: 'Udeos Launcher' },
  nav: {
    dashboard: 'Inicio', search: 'Buscar', skin: 'Skin', newInstance: 'Nueva instancia',
    comingSoon: 'Próximamente', privacy: 'Privacidad y términos',
    themeToDark: 'Cambiar a tema oscuro', themeToLight: 'Cambiar a tema claro',
  },
  common: { cancel: 'Cancelar', done: 'Listo', gotIt: 'Entendido', back: 'Volver', close: 'Cerrar', play: 'Jugar', delete: 'Eliminar', save: 'Guardar', ok: 'OK', or: 'o', running: 'Jugando…' },
  privacy: {
    title: 'Privacidad y términos',
    body: 'Udeos Launcher funciona completamente en tu equipo. Tu apodo y tus instancias se guardan localmente y nunca se suben — el launcher solo se conecta para descargar archivos del juego, mods y actualizaciones.',
  },
  language: { title: 'Idioma', more: 'Más idiomas llegarán en una próxima versión.', choose: 'Elige tu idioma' },
  login: {
    introLanguage: 'Elige el idioma del launcher. Puedes cambiarlo después desde la barra superior.',
    introNickname: 'Escribe un apodo para empezar a jugar. Sin cuenta ni inicio de sesión de Microsoft: todo se queda en tu equipo.',
    continue: 'Continuar', nickname: 'Apodo', placeholder: 'p. ej. ZorroCrafter',
    agree: 'Acepto la', and: 'y los', privacyPolicy: 'Política de privacidad', terms: 'Términos de uso',
    start: 'Empezar a jugar', backToLanguage: 'Volver al idioma',
    hint: 'De 3 a 16 letras, números o guiones bajos.',
  },
  dashboard: {
    title: 'Tus instancias', subtitle: 'Elige una para jugar o crea una nueva con otra versión o configuración de mods.',
    manage: 'Gestionar', mods: 'mods', packs: 'packs', worlds: 'mundos',
    lastPlayed: 'Última partida', openInstance: 'Abrir instancia', neverPlayed: 'Nunca jugada', playedAgo: 'Jugada {when} · {hours}h en total',
    empty: 'Aún no tienes instancias. Crea una para empezar a jugar.', createFirst: 'Crea tu primera instancia',
    justNow: 'ahora mismo', daysAgo: 'hace {n} días', hoursAgo: 'hace {n} horas', minutesAgo: 'hace {n} minutos', today: 'hoy', yesterday: 'ayer',
  },
  create: {
    title: 'Crear nueva instancia', subtitle: 'Ponle un nombre, elige una versión y un bloque como icono.',
    name: 'Nombre de la instancia', namePlaceholder: 'p. ej. Mundo Survival', version: 'Versión de Minecraft', chooseVersion: 'Elige una versión',
    showSnapshots: 'Mostrar snapshots y versiones antiguas', loader: 'Cargador de mods', icon: 'Icono de la instancia', required: 'El nombre y la versión son obligatorios.',
    submit: 'Crear instancia', loadingVersions: 'Cargando versiones de Mojang…', versionsError: 'No se pudo cargar la lista de versiones. Revisa tu conexión.',
    latest: 'última',
  },
  instance: {
    deleteInstance: 'Eliminar instancia', confirmDeleteTitle: '¿Eliminar esta instancia?', confirmDelete: 'Se borrará la instancia con todos sus mundos, capturas y packs. No se puede deshacer.',
    notInstalled: 'Aún no descargada — Jugar la descargará primero.', installed: 'Lista para jugar',
    tabs: { mods: 'Mods', resourcepacks: 'Paquetes de recursos', shaders: 'Shaders', worlds: 'Mundos', screenshots: 'Capturas' },
    saveToDevice: 'Guardar en el equipo', remove: 'Quitar', openFolder: 'Abrir carpeta', view: 'Ver',
    removeWorld: 'Eliminar mundo', confirmDeleteWorldTitle: '¿Eliminar este mundo?', confirmDeleteWorld: '"{name}" y todo lo construido en él se borrará de esta instancia. Guárdalo en tu equipo antes si quieres conservar una copia.',
    worldAdded: 'Mundo "{name}" añadido',
    dropHere: 'Arrastra un archivo de {kind} aquí', browse: 'Buscar archivo', kinds: { mods: 'mod (.jar)', resourcepacks: 'paquete de recursos (.zip)', shaders: 'shader', worlds: 'mundo (.zip o carpeta)' },
    empty: {
      mods: 'Aún no hay mods. Arrastra un archivo .jar aquí.', resourcepacks: 'Aún no hay paquetes de recursos. Arrastra un .zip aquí o usa Buscar.', shaders: 'Aún no hay shaders. Arrastra un shader pack aquí.',
      worlds: 'Aún no hay mundos. Juega la instancia para crear uno, o arrastra aquí una carpeta o .zip de un mundo.', screenshots: 'Aún no hay capturas. Haz una en el juego (F2) y aparecerá aquí.',
    },
    worldMeta: 'Jugado {when} • {size}', savedTo: 'Guardado en {path}',
  },
  launch: {
    preparing: 'Preparando {name}', starting: 'Iniciando el juego…',
    phases: { version: 'Leyendo la versión', libraries: 'Descargando librerías del juego', assets: 'Descargando sonidos y texturas', client: 'Descargando el juego', natives: 'Desempaquetando librerías nativas', java: 'Descargando Java', done: 'Lanzando' },
    firstTime: 'La primera vez que juegas una versión se descargan unos cientos de MB. Las siguientes veces es instantáneo.',
    errorTitle: 'No se pudo iniciar el juego', exitedTitle: 'El juego se cerró inesperadamente', exitBody: 'Código de salida {code}. El registro del launcher está en:', openLogs: 'Abrir carpeta de registros',
  },
}
export default es
