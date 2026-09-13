const en = {
  app: { name: 'Udeos Launcher' },
  nav: {
    dashboard: 'Dashboard', search: 'Search', skin: 'Skin', newInstance: 'New Instance',
    comingSoon: 'Coming soon', privacy: 'Privacy & Terms',
    themeToDark: 'Switch to dark theme', themeToLight: 'Switch to light theme',
  },
  common: { cancel: 'Cancel', done: 'Done', gotIt: 'Got it', back: 'Back', close: 'Close', play: 'Play', delete: 'Delete', save: 'Save', ok: 'OK', or: 'or', running: 'Running…' },
  privacy: {
    title: 'Privacy & Terms',
    body: 'Udeos Launcher runs entirely on your machine. Your nickname and instance data are stored locally and never uploaded — the launcher only connects out to download game files, mods, and updates.',
  },
  language: { title: 'Language', more: 'More languages are coming in a later release.', choose: 'Choose your language' },
  login: {
    introLanguage: 'Pick the language you want the launcher to use. You can change it later from the top bar.',
    introNickname: 'Set a nickname to start playing. No account, no Microsoft sign-in — everything stays on your machine.',
    continue: 'Continue', nickname: 'Nickname', placeholder: 'e.g. CraftyFox',
    agree: 'I agree to the', and: 'and', privacyPolicy: 'Privacy Policy', terms: 'Terms of Use',
    start: 'Start Playing', backToLanguage: 'Back to language',
    hint: '3–16 letters, numbers or underscores.',
  },
  dashboard: {
    title: 'Your Instances', subtitle: 'Pick one to play, or create a new instance for a different version or mod setup.',
    manage: 'Manage', mods: 'mods', packs: 'packs', worlds: 'worlds',
    lastPlayed: 'Last played', openInstance: 'Open instance', neverPlayed: 'Never played', playedAgo: 'Last played {when} · {hours}h total',
    empty: 'No instances yet. Create one to start playing.', createFirst: 'Create your first instance',
    justNow: 'just now', daysAgo: '{n} days ago', hoursAgo: '{n} hours ago', minutesAgo: '{n} minutes ago', today: 'today', yesterday: 'yesterday',
  },
  create: {
    title: 'Create New Instance', subtitle: 'Give it a name, pick a version and choose a block for its icon.',
    name: 'Instance name', namePlaceholder: 'e.g. Survival World', version: 'Minecraft version', chooseVersion: 'Choose a version',
    showSnapshots: 'Show snapshots and old versions', loader: 'Mod loader', icon: 'Instance icon', required: 'Name and version are both required.',
    submit: 'Create Instance', loadingVersions: 'Loading versions from Mojang…', versionsError: 'Could not load the version list. Check your connection.',
    latest: 'latest',
  },
  instance: {
    deleteInstance: 'Delete instance', confirmDeleteTitle: 'Delete this instance?', confirmDelete: 'This removes the instance and all its worlds, screenshots and packs. This cannot be undone.',
    notInstalled: 'Not downloaded yet — Play will download it first.', installed: 'Ready to play',
    tabs: { mods: 'Mods', resourcepacks: 'Resource Packs', shaders: 'Shaders', worlds: 'Worlds', screenshots: 'Screenshots' },
    saveToDevice: 'Save to Device', remove: 'Remove', openFolder: 'Open folder',
    dropHere: 'Drag a {kind} file here', browse: 'Browse files', kinds: { mods: '.jar mod', resourcepacks: 'resource pack (.zip)', shaders: 'shader pack' },
    empty: {
      mods: 'No mods installed yet. Drag a .jar file here.', resourcepacks: 'No resource packs installed yet. Drag a .zip file here or use Browse.', shaders: 'No shaders installed yet. Drag a shader pack here.',
      worlds: 'No worlds yet. Play the instance to create your first one.', screenshots: 'No screenshots yet. Take one in-game (F2) and it will show up here.',
    },
    worldMeta: 'Played {when} • {size}', savedTo: 'Saved to {path}',
  },
  launch: {
    preparing: 'Getting {name} ready', starting: 'Starting the game…',
    phases: { version: 'Reading version info', libraries: 'Downloading game libraries', assets: 'Downloading sounds and textures', client: 'Downloading the game', natives: 'Unpacking native libraries', java: 'Downloading Java runtime', done: 'Launching' },
    firstTime: 'The first launch of a version downloads a few hundred MB. Later launches are instant.',
    errorTitle: 'Could not start the game', exitedTitle: 'The game closed unexpectedly', exitBody: 'Exit code {code}. The launcher log is at:',
  },
}
export default en
export type Dict = typeof en
