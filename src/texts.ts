/**
 * All player-facing text. Projects can override any string (and add a new language)
 * by passing `texts` to the UI or to getTexts().
 * Placeholders: {accuracy} (metres), {app} (project name).
 */
export type Texts = {
  app: string;
  locationLabel: string;
  compassLabel: string;
  lamp: { off: string; busy: string; ok: string; warn: string; error: string };

  introTitle: string;
  /** What the game uses location/direction for. Projects should replace this. */
  introBody: string;
  introLocation: string;
  introCompassMap: string;
  introCompassAim: string;
  introCompassPitch: string;
  /** Optional privacy sentence. Empty by default: only state what the project guarantees. */
  introPrivacy: string;
  introButton: string;
  compassTapTitle: string;
  compassTapBody: string;
  compassTapButton: string;

  requestingTitle: string;
  requestingBody: string;
  waitingTitle: string;
  waitingBody: string;

  locationDeniedTitle: string;
  locationDeniedBody: string;
  locationBlockedTitle: string;
  locationBlockedBody: string;
  compassDeniedTitle: string;
  compassDeniedBody: string;
  compassMissingTitle: string;
  compassMissingBody: string;
  compassNoNorthTitle: string;
  compassNoNorthBody: string;
  insecureTitle: string;
  insecureBody: string;
  unsupportedTitle: string;
  unsupportedBody: string;
  desktopTitle: string;
  desktopBody: string;
  noGpsTitle: string;
  noGpsBody: string;
  noCompassDeviceTitle: string;
  noCompassDeviceBody: string;

  stepsLocationIos: string[];
  stepsLocationAndroid: string[];
  stepsLocationOther: string[];
  stepsCompassIos: string[];
  stepsCompassAndroid: string[];
  stepsCompassOther: string[];

  calibrateTitle: string;
  calibrateBody: string;
  alignTitle: string;
  alignBody: string;

  tryAgain: string;
  continueAnyway: string;
  continueWithoutCompass: string;
  done: string;
  calibrateButton: string;
  alignButton: string;
  close: string;

  barSearching: string;
  barWeak: string;
  barStale: string;
  barFlatter: string;
  barHoldUp: string;
  barHoldLower: string;
  barCompassStale: string;
  barCalibrate: string;
  barCourse: string;
  barNoCompass: string;
  barCoarse: string;
  barNoCompassDevice: string;
};

export const en: Texts = {
  app: 'this game',
  locationLabel: 'Location',
  compassLabel: 'Compass',
  lamp: { off: 'Off', busy: 'Starting…', ok: 'Ready', warn: 'Weak', error: 'Blocked' },

  introTitle: 'Before you start',
  introBody: '{app} uses your phone’s sensors while you play outdoors.',
  introLocation: 'Location, to know where you are.',
  introCompassMap: 'Compass, to turn the map the way you face.',
  introCompassAim: 'Compass, to know where you point the phone.',
  introCompassPitch: 'Motion sensors, to know where you point the phone, up or down.',
  introPrivacy: '',
  introButton: 'Allow and start',
  compassTapTitle: 'Turn on the compass',
  compassTapBody: 'Your browser needs one tap before it shares the compass.',
  compassTapButton: 'Turn on compass',

  requestingTitle: 'Answer the question',
  requestingBody: 'Your browser is asking for access. Tap Allow.',
  waitingTitle: 'Finding your position',
  waitingBody: 'This can take up to a minute. Stand outdoors with a clear view of the sky.',

  locationDeniedTitle: 'Location is blocked',
  locationDeniedBody: '{app} cannot work without your location. Allow it like this, then tap Try again:',
  locationBlockedTitle: 'Location is not allowed here',
  locationBlockedBody: 'This page is shown inside another page that does not allow location. Open {app} directly in your browser.',
  compassDeniedTitle: 'Compass is blocked',
  compassDeniedBody: 'Allow motion and orientation access like this, then tap Try again:',
  compassMissingTitle: 'No compass signal',
  compassMissingBody: 'Your phone sent no compass data. Try again, and check the settings below.',
  compassNoNorthTitle: 'No direction to north',
  compassNoNorthBody: 'Your browser shares motion, but not which way is north. This often happens when privacy protection blocks sensors.',
  insecureTitle: 'Secure connection needed',
  insecureBody: 'Location and compass only work on pages opened with https://.',
  unsupportedTitle: 'Sensors not available',
  unsupportedBody: 'This browser cannot share location or direction. Try another browser on your phone.',
  desktopTitle: 'Use your phone',
  desktopBody: '{app} is played outdoors with a phone. Open this page on your phone for location and compass.',
  noGpsTitle: 'This device has no GPS',
  noGpsBody: 'It only knows roughly where you are (±{accuracy} m), from Wi-Fi or the internet connection. {app} needs a phone with GPS.',
  noCompassDeviceTitle: 'This device has no compass',
  noCompassDeviceBody: '{app} needs to know which way you point. Open it on a phone.',

  stepsLocationIos: [
    'Tap “aA” (or the page icon) in the address bar.',
    'Choose Website Settings → Location → Allow.',
    'If that does not help: Settings → Privacy & Security → Location Services must be on, and your browser must be allowed “While Using”.',
  ],
  stepsLocationAndroid: [
    'Tap the icon to the left of the web address.',
    'Open Permissions (or Site settings) → Location → Allow.',
    'Check that Location is turned on in the phone’s quick settings.',
  ],
  stepsLocationOther: [
    'Open this site’s settings in your browser.',
    'Allow Location, and check that location is on in the phone’s settings.',
  ],
  stepsCompassIos: [
    'Your browser only asks once per visit. Close this tab.',
    'Open the page again and tap Allow when asked about motion and orientation.',
  ],
  stepsCompassAndroid: [
    'Tap the icon to the left of the web address.',
    'Open Permissions (or Site settings) → Motion sensors → Allow.',
    'If your browser has privacy protection or a shield for this site, turn it off.',
  ],
  stepsCompassOther: [
    'Open this site’s settings in your browser and allow motion sensors.',
    'If your browser has privacy protection for this site, turn it off.',
  ],

  calibrateTitle: 'Calibrate the compass',
  calibrateBody: 'Move the phone in a large figure eight a few times. Stay away from metal, cars and other electronics.',
  alignTitle: 'Point at north',
  alignBody: 'Only if you know exactly where north is: point the phone that way and tap the button.',

  tryAgain: 'Try again',
  continueAnyway: 'Continue anyway',
  continueWithoutCompass: 'Play without compass',
  done: 'Done',
  calibrateButton: 'Calibrate',
  alignButton: 'This is north',
  close: 'Close',

  barSearching: 'Searching for GPS…',
  barWeak: 'Weak GPS (±{accuracy} m). Move into the open.',
  barStale: 'GPS lost. Waiting for a new position…',
  barFlatter: 'Hold the phone flatter.',
  barHoldUp: 'Hold the phone up in front of you.',
  barHoldLower: 'Lower the phone a little.',
  barCompassStale: 'Compass paused. Move the phone a little.',
  barCalibrate: 'Compass unsure. Tap to calibrate.',
  barCourse: 'Direction from walking (no compass).',
  barNoCompass: 'Playing without compass.',
  barCoarse: 'Rough position only (±{accuracy} m). This device has no GPS.',
  barNoCompassDevice: 'This device has no compass.',
};

export const sv: Texts = {
  app: 'spelet',
  locationLabel: 'Plats',
  compassLabel: 'Kompass',
  lamp: { off: 'Av', busy: 'Startar…', ok: 'Klar', warn: 'Svag', error: 'Blockerad' },

  introTitle: 'Innan du börjar',
  introBody: '{app} använder telefonens sensorer när du spelar utomhus.',
  introLocation: 'Plats, för att veta var du är.',
  introCompassMap: 'Kompass, för att vrida kartan åt det håll du tittar.',
  introCompassAim: 'Kompass, för att veta vart du pekar med telefonen.',
  introCompassPitch: 'Rörelsesensorer, för att veta vart du pekar, uppåt eller nedåt.',
  introPrivacy: '',
  introButton: 'Tillåt och starta',
  compassTapTitle: 'Slå på kompassen',
  compassTapBody: 'Webbläsaren behöver ett tryck innan den delar kompassen.',
  compassTapButton: 'Slå på kompassen',

  requestingTitle: 'Svara på frågan',
  requestingBody: 'Webbläsaren frågar om åtkomst. Tryck Tillåt.',
  waitingTitle: 'Söker din position',
  waitingBody: 'Det kan ta upp till en minut. Stå utomhus med fri sikt mot himlen.',

  locationDeniedTitle: 'Platsen är blockerad',
  locationDeniedBody: '{app} fungerar inte utan din plats. Tillåt den så här och tryck sedan Försök igen:',
  locationBlockedTitle: 'Plats är inte tillåten här',
  locationBlockedBody: 'Sidan visas inuti en annan sida som inte tillåter plats. Öppna {app} direkt i webbläsaren.',
  compassDeniedTitle: 'Kompassen är blockerad',
  compassDeniedBody: 'Tillåt rörelse och orientering så här och tryck sedan Försök igen:',
  compassMissingTitle: 'Ingen kompassignal',
  compassMissingBody: 'Telefonen skickade ingen kompassdata. Försök igen och kontrollera inställningarna nedan.',
  compassNoNorthTitle: 'Ingen riktning mot norr',
  compassNoNorthBody: 'Webbläsaren delar rörelser men inte var norr är. Det händer ofta när ett integritetsskydd blockerar sensorer.',
  insecureTitle: 'Säker anslutning krävs',
  insecureBody: 'Plats och kompass fungerar bara på sidor som öppnas med https://.',
  unsupportedTitle: 'Sensorer saknas',
  unsupportedBody: 'Den här webbläsaren kan inte dela plats eller riktning. Prova en annan webbläsare i telefonen.',
  desktopTitle: 'Använd telefonen',
  desktopBody: '{app} spelas utomhus med en telefon. Öppna sidan i telefonen för plats och kompass.',
  noGpsTitle: 'Enheten saknar GPS',
  noGpsBody: 'Den vet bara ungefär var du är (±{accuracy} m), utifrån wifi eller internetanslutningen. {app} behöver en telefon med GPS.',
  noCompassDeviceTitle: 'Enheten saknar kompass',
  noCompassDeviceBody: '{app} behöver veta åt vilket håll du pekar. Öppna det i en telefon.',

  stepsLocationIos: [
    'Tryck på ”aA” (eller sidikonen) i adressfältet.',
    'Välj Webbplatsinställningar → Plats → Tillåt.',
    'Hjälper inte det: Inställningar → Integritet och säkerhet → Platstjänster ska vara på, och webbläsaren ska ha ”Medan appen används”.',
  ],
  stepsLocationAndroid: [
    'Tryck på ikonen till vänster om webbadressen.',
    'Öppna Behörigheter (eller Webbplatsinställningar) → Plats → Tillåt.',
    'Kontrollera att Plats är påslaget i telefonens snabbinställningar.',
  ],
  stepsLocationOther: [
    'Öppna webbläsarens inställningar för den här sidan.',
    'Tillåt Plats och kontrollera att platstjänster är på i telefonen.',
  ],
  stepsCompassIos: [
    'Webbläsaren frågar bara en gång per besök. Stäng fliken.',
    'Öppna sidan igen och tryck Tillåt när den frågar om rörelse och orientering.',
  ],
  stepsCompassAndroid: [
    'Tryck på ikonen till vänster om webbadressen.',
    'Öppna Behörigheter (eller Webbplatsinställningar) → Rörelsesensorer → Tillåt.',
    'Om webbläsaren har ett integritetsskydd för sidan: stäng av det.',
  ],
  stepsCompassOther: [
    'Öppna webbläsarens inställningar för sidan och tillåt rörelsesensorer.',
    'Om webbläsaren har ett integritetsskydd för sidan: stäng av det.',
  ],

  calibrateTitle: 'Kalibrera kompassen',
  calibrateBody: 'Rör telefonen i en stor åtta några gånger. Håll dig borta från metall, bilar och annan elektronik.',
  alignTitle: 'Peka mot norr',
  alignBody: 'Bara om du vet exakt var norr är: peka telefonen dit och tryck på knappen.',

  tryAgain: 'Försök igen',
  continueAnyway: 'Fortsätt ändå',
  continueWithoutCompass: 'Spela utan kompass',
  done: 'Klar',
  calibrateButton: 'Kalibrera',
  alignButton: 'Här är norr',
  close: 'Stäng',

  barSearching: 'Söker GPS…',
  barWeak: 'Svag GPS (±{accuracy} m). Gå ut i det fria.',
  barStale: 'GPS tappad. Väntar på ny position…',
  barFlatter: 'Håll telefonen plattare.',
  barHoldUp: 'Håll upp telefonen framför dig.',
  barHoldLower: 'Sänk telefonen lite.',
  barCompassStale: 'Kompassen pausad. Rör telefonen lite.',
  barCalibrate: 'Kompassen osäker. Tryck för att kalibrera.',
  barCourse: 'Riktning från gången (ingen kompass).',
  barNoCompass: 'Spelar utan kompass.',
  barCoarse: 'Bara ungefärlig position (±{accuracy} m). Enheten saknar GPS.',
  barNoCompassDevice: 'Enheten saknar kompass.',
};

export const languages: Record<string, Texts> = { en, sv };

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string[] ? string[] : T[K] extends object ? Partial<T[K]> : T[K] };
export type TextOverrides = DeepPartial<Texts>;

/** Texts for a language ("en" default), with project overrides applied. */
export function getTexts(lang = 'en', overrides: TextOverrides = {}): Texts {
  const base = languages[lang] ?? en;
  return { ...base, ...overrides, lamp: { ...base.lamp, ...(overrides.lamp ?? {}) } } as Texts;
}

/** Replace {placeholders}. */
export const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
