import type { Dict } from './en'

const es: Dict = {
  app: { name: 'Udeos Launcher' },
  nav: {
    dashboard: 'Instancias', search: 'Complementos', newInstance: 'Nueva instancia', privacy: 'Privacidad y términos',
    themeToDark: 'Cambiar a tema oscuro', themeToLight: 'Cambiar a tema claro',
  },
  common: { cancel: 'Cancelar', gotIt: 'Entendido', close: 'Cerrar', play: 'Jugar', delete: 'Eliminar', or: 'o', running: 'Jugando…', loading: 'Cargando' },
  privacy: {
    title: 'Privacidad y términos',
    body: 'Udeos Launcher funciona completamente en tu equipo. Tu apodo y tus instancias se guardan localmente y nunca se suben — el launcher solo se conecta para descargar archivos del juego, mods y actualizaciones.',
  },
  language: { choose: 'Elige tu idioma' },
  login: {
    continue: 'Continuar', nickname: 'Apodo', placeholder: 'p. ej. ZorroCrafter',
    agree: 'Acepto la', and: 'y los', privacyPolicy: 'Política de privacidad', terms: 'Términos de uso',
    start: 'Empezar a jugar', backToLanguage: 'Volver al idioma',
  },
  errors: {
    failed: 'Error', loadFailed: 'No se pudo cargar', connectionLost: 'Sin conexión', incompatible: 'Mod incompatible',
    noBuild: 'Sin versión', alreadyAdded: 'Ya añadido', launchFailed: 'No se pudo iniciar', gameCrashed: 'El juego se cerró',
    invalidNickname: 'Apodo no válido',
  },
  dashboard: {
    title: 'Tus instancias', subtitle: 'Elige una para jugar o crea una nueva con otra versión o configuración de mods.',
    manage: 'Gestionar', mods: 'mods', packs: 'packs', worlds: 'mundos',
    lastPlayed: 'Última partida', openInstance: 'Abrir instancia', neverPlayed: 'Nunca jugada', playedAgo: 'Jugada {when} · {hours}h en total',
    empty: 'Aún no tienes instancias. Crea una para empezar a jugar.', createFirst: 'Crea tu primera instancia',
  },
  create: {
    title: 'Crear nueva instancia', subtitle: 'Ponle un nombre, elige una versión y un bloque como icono.',
    name: 'Nombre de la instancia', namePlaceholder: 'p. ej. Mundo Survival', version: 'Versión de Minecraft', chooseVersion: 'Elige una versión',
    showSnapshots: 'Mostrar snapshots y versiones antiguas', loader: 'Cargador de mods', icon: 'Icono de la instancia',
    submit: 'Crear instancia', loadingVersions: 'Cargando versiones de Mojang…', versionsError: 'No se pudo cargar la lista de versiones. Revisa tu conexión.',
    latest: 'última',
    loaderVanilla: 'El juego tal como lo publica Mojang. Sin mods.',
    loaderHint: '{loader} {version} se descargará e instalará junto con el juego la primera vez que juegues. Solo se muestran las versiones compatibles con {loader}.',
    loadingLoaders: 'Comprobando qué versiones admite {loader}…', loadersError: 'No se pudo conectar con los servidores de {loader}. Revisa tu conexión.',
    loaderUnsupported: '{loader} no tiene una versión para {version}.',
  },
  instance: {
    deleteInstance: 'Eliminar instancia', confirmDeleteTitle: '¿Eliminar esta instancia?', confirmDelete: 'Se borrará la instancia con todos sus mundos, capturas y packs. No se puede deshacer.',
    notInstalled: 'Aún no descargada — Jugar la descargará primero.', installed: 'Lista para jugar',
    tabs: { mods: 'Mods', resourcepacks: 'Paquetes de recursos', shaders: 'Shaders', worlds: 'Mundos', screenshots: 'Capturas' },
    saveToDevice: 'Guardar en el equipo', remove: 'Quitar', openFolder: 'Abrir carpeta', view: 'Ver',
    removeWorld: 'Eliminar mundo', confirmDeleteWorldTitle: '¿Eliminar este mundo?', confirmDeleteWorld: '"{name}" y todo lo construido en él se borrará de esta instancia. Guárdalo en tu equipo antes si quieres conservar una copia.',
    worldAdded: 'Mundo "{name}" añadido', fileAdded: '{name} añadido',
    dropHere: 'Arrastra un archivo de {kind} aquí', browse: 'Buscar archivo', browseModrinth: 'Buscar en Addons', kinds: { mods: 'mod (.jar)', resourcepacks: 'paquete de recursos (.zip)', shaders: 'shader', worlds: 'mundo (.zip o carpeta)' },
    empty: {
      mods: 'Aún no hay mods. Arrastra un archivo .jar aquí.', resourcepacks: 'Aún no hay paquetes de recursos. Arrastra un .zip aquí o usa Buscar.', shaders: 'Aún no hay shaders. Arrastra un shader pack aquí.',
      worlds: 'Aún no hay mundos. Juega la instancia para crear uno, o arrastra aquí una carpeta o .zip de un mundo.', screenshots: 'Aún no hay capturas. Haz una en el juego (F2) y aparecerá aquí.',
    },
    worldMeta: 'Jugado {when} • {size}', savedTo: 'Guardado en {path}',
  },
  search: {
    title: 'Buscar', subtitle: 'Explora mods, paquetes de recursos, shaders y modpacks de Modrinth.',
    searchPlaceholder: 'Buscar…', anyVersion: 'Cualquier versión', anyLoader: 'Cualquier cargador',
    types: { mod: 'Mods', resourcepack: 'Paquetes de recursos', shader: 'Shaders', modpack: 'Modpacks' },
    downloads: '{n} descargas', empty: 'No se encontraron resultados.',
    previous: 'Anterior', next: 'Siguiente', pageOf: 'Página {page} de {total}',
    add: 'Añadir', details: 'Detalles', createInstance: 'Crear instancia',
    added: 'Añadido', adding: 'Añadiendo…',
    sort: { relevance: 'Relevancia', downloads: 'Más descargados', newest: 'Más nuevos', updated: 'Actualizados recientemente' },
    forInstance: 'Añadiendo a {name}', backToInstance: 'Volver a {name}',
  },
  compat: {
    vanilla: 'Vanilla — sin mods', needsLoader: 'necesita {loaders}', noBuild: 'sin versión para {version}', ok: 'Compatible',
  },
  detail: {
    back: 'Volver a Buscar',
    versionsHeading: 'Versiones disponibles', loadersHeading: 'Cargadores', instancesHeading: 'Tus instancias',
    noInstances: 'Todavía no tienes instancias.', add: 'Añadir a una instancia',
  },
  content: {
    pickTitle: 'Añadir {title} a…', pickHint: 'Elige una instancia: se instala al momento.',
    noCompatible: 'Ninguna instancia puede usar esto todavía. Crea una instancia {loaders} para {versions} para instalarlo.',
    noInstancesTitle: 'Aún no hay instancias', noInstancesBody: 'Crea una instancia primero y luego añádele {title}.',
    planning: 'Comprobando versiones…',
    installingTo: 'Añadiendo {title} a {name}', queued: 'Esperando…',
    alreadyInstalled: '{title} ya está en {name}.', done: '{n} archivo(s) añadidos a {name}.', doneOne: '{title} añadido a {name}.',
  },
  launch: {
    preparing: 'Preparando {name}', starting: 'Iniciando el juego…',
    phases: { version: 'Leyendo la versión', libraries: 'Descargando librerías del juego', assets: 'Descargando sonidos y texturas', client: 'Descargando el juego', natives: 'Desempaquetando librerías nativas', java: 'Descargando Java', loader: 'Instalando el cargador de mods', done: 'Lanzando' },
    loaderTakesAWhile: 'Forge parchea los archivos del juego en la primera instalación; puede tardar un par de minutos.',
    firstTime: 'La primera vez que juegas una versión se descargan unos cientos de MB. Las siguientes veces es instantáneo.',
    exitBody: 'Código de salida {code}. El registro del launcher está en:', openLogs: 'Abrir carpeta de registros',
  },
}
export default es
