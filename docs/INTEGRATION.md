# Using geo-kit in a project

Guide for agents adding GPS and/or phone direction to one of the owner's projects. The owner is not a developer: pick the settings below from what the game needs, and explain the choice in plain words.

## 1. Ask the owner, with a recommendation

Some choices differ from project to project and belong to the owner. Before writing code, ask the questions below in one message, each with **your recommendation for this project and a one-line reason**, in plain words (the owner does not read code). Skip a question when the project's docs already answer it. Write the answers into the project's own docs (e.g. its decision log) so later agents do not ask again.

| Question to the owner | Options | Recommend when |
|---|---|---|
| How do players hold the phone? | `heading: false` / `'map'` / `'aim'` / `'aim'` + `pitch: true` | See the table in section 2. |
| Can the game be played without the compass? | `requireCompass: false` (default) / `true` | `true` only if the core of the game is pointing the phone. |
| What happens on devices without GPS (computers, Wi-Fi-only tablets)? | `noGps: 'warn'` (default) / `'block'` / `'allow'` | **warn**: outdoor games where someone may open the link on a computer first to look. **block**: games that are meaningless without walking with GPS (e.g. a ghost walk, geocaching). **allow**: games that also work at home, e.g. on a map or with a rough position. |
| Language and look | `lang`, `texts`, `theme` | Match the project's existing language and style. |

Example message to the owner (Swedish, as the owner prefers):

> Tre val för plats och kompass i det här spelet:
> 1. **Hur hålls telefonen?** Jag rekommenderar *sikta* (telefonen hålls upp), eftersom spelaren letar spöken genom att peka.
> 2. **Måste kompassen fungera?** Jag rekommenderar *nej*: spelet kan visa avstånd även utan riktning.
> 3. **Datorer och surfplattor utan GPS?** Jag rekommenderar *blockera*, eftersom spelet bara fungerar när man går runt ute.
> Säg till om något ska vara annorlunda.

## 2. Choose the settings

| The game needs… | Setting |
|---|---|
| Only where the player is | `heading: false` |
| A map or arrow that turns with the player, phone held flat or tilted | `heading: 'map'` |
| The player points the phone at things (a gadget, a "radar", finding a target by pointing) | `heading: 'aim'` |
| Pointing at the sky or the ground (stars, things above/below) | `heading: 'aim', pitch: true` |
| The game cannot be played without the compass | UI option `requireCompass: true` (otherwise players can continue without it) |

Never mix modes or switch between them while playing: that is what made blaster's needle jump.

How geo-kit spots a device without GPS: a computer is recognised directly; on phones and tablets, every position staying coarser than 200 m for 30 s counts (a phone's GPS can start coarse for a while). With `'warn'` the player sees an explanation once and can continue; with `'block'` there is no way past it; with `'allow'` only a small status note shows the rough accuracy. Computers never get phone troubleshooting steps for the missing compass.

## 3. Add it to the project

**Projects with npm (Vite, React…).** Use a tag so the project never changes by surprise:

```sh
npm install github:BadBagel47/geo-kit#v0.4.0
```

```js
import { GeoKit, mountGeoKitUI } from 'geo-kit';
```

**Projects without a build step** (plain HTML/JS):

```js
import { GeoKit, mountGeoKitUI } from 'https://cdn.jsdelivr.net/gh/BadBagel47/geo-kit@v0.4.0/dist/index.js';
```

The page must be served over `https://` (or `localhost`) for sensors to work.

## 4. Minimal example

```js
const kit = new GeoKit({ heading: 'aim' });           // one GeoKit per page
const ui = mountGeoKitUI(kit, {
  lang: 'en',                                         // or 'sv'
  noGps: 'block',                                     // the owner's choice, see section 1
  texts: { app: 'Ghost Hunt', introBody: 'Find the ghosts around the park. The game uses:' },
  theme: { accent: '#7a2e1d', font: 'Georgia, serif' },
  onReady: () => startGame(),
});

kit.subscribe(() => {
  const { location, direction } = kit.getState();
  // location.fix: { lat, lon, accuracy, timestamp, speed, course }
  // direction.heading: degrees from north, or null. direction.pitch: up/down (aim + pitch only)
});
```

The UI takes care of the start screen (permissions are requested inside the player's tap, as iOS requires), waiting for GPS, blocked permissions with steps for iPhone/Android, missing compass, and a small status bar while playing ("Hold the phone up", "Weak GPS"…). Open the calibration screen from a game button with `ui.showCalibration()`.

### React

Create the kit once, outside components (one per page), and read it with `useSyncExternalStore`:

```js
const kit = new GeoKit({ heading: 'map' });
mountGeoKitUI(kit, { lang: 'sv' });

function useGeo() {
  return useSyncExternalStore(kit.subscribe, kit.getState);
}
```

## 5. Match the project's look

Three levels, from least to most work:

1. **Theme values:** `theme: { … }` or a preset: `themes.light`, `themes.dark`, `themes.terminal`, `themes.parchment` (spread and change: `{ ...themes.dark, accent: '#f0c' }`). Keys: `font, titleFont, titleTransform, titleSpacing, backdrop, surface, text, muted, border, accent, accentText, buttonText, ok, warn, error, off, radius, buttonRadius, shadow, barBackground, barText, z`.
2. **CSS:** the same values are CSS variables (`--gk-accent`, `--gk-surface`, …) on `.gk-root`, and every part has a `gk-` class (`.gk-card`, `.gk-title`, `.gk-btn--primary`, `.gk-bar`, `.gk-lamp`…). Pass `className` to scope project CSS. Project CSS wins over the built-in styles.
3. **Fully custom screens** (e.g. blaster's device look): skip `mountGeoKitUI`. Call `getGuidance(kit.getState(), options)` to get which screen or status message to show and `getTexts(lang, overrides)` for the wording, then draw it yourself. Call `kit.start()` directly in your button's click handler.

All texts can be replaced through `texts`. Write `introBody` for the specific game. `introPrivacy` is empty by default: only fill it in with something the project really guarantees.

## 6. Useful helpers

- `distanceMeters(a, b)`, `bearingDegrees(a, b)`, `relativeBearing(heading, bearing)` (0 = straight ahead, + right, − left).
- `ZoneMonitor` for "has the player arrived?": enters after 3 fixes inside the radius within 3 s, leaves only after 2 s beyond the exit radius, ignores inaccurate or old fixes. Defaults 15 m / 35 m.
- `isFresh(fix, maxAgeMs)` before trusting a position.
- `continuousAngle(previous, next)` whenever something on screen rotates with the heading (needle, map, arrow), especially with CSS transitions or animations. Without it, crossing north (359° → 1°) makes the element spin almost a full turn.
- `kit.alignNorth()`, `kit.setHeadingOffset(deg)`, `kit.resetAlignment()` for manual corrections.
- **True north is automatic** (`trueNorth: true`, default): compass headings are corrected with the World Magnetic Model (WMM2025) at the player's position, so they match maps and `bearingDegrees()`. In Uppsala the correction is about +7.7° (2026). Until the first GPS position arrives the heading is magnetic; `direction.north` tells which (`'true'` or `'magnetic'`). Turn it off with `trueNorth: false` only if the game really wants magnetic north. `magneticDeclination(lat, lon)` is exported too. The model is valid until 2030; then the coefficients in `src/wmm.ts` need replacing with WMM2030.
- `kit.downloadReport()` for bug reports from the field (no coordinates included). Give the game a hidden or settings-menu button for it. The report keeps every sensor reading for the last seconds, about one reading per second for the last ten minutes, and every state change, so it still shows how a problem began when it is downloaded minutes later. It also records how far the phone's two orientation streams are apart (`relOffset`); a value that changes while the phone is still means the sensors disagree. Diagnostics never change the reported heading.

## 7. Location and privacy

geo-kit itself keeps positions in the browser: it never sends them anywhere and its diagnostic reports contain no coordinates. The game can still create obligations. Flag these to the owner (per the global agent rules on laws and regulations), with a recommendation:

- **The game sends or saves positions** (a server, a database, high scores with places, analytics, shared multiplayer positions): a player's location is personal data under the GDPR. The game then needs a short privacy notice (what is collected, why, for how long, who gets it) and must not collect more than it needs. Point to the notice from the start screen with `texts.introPrivacy`, e.g. "We save your route for 24 hours to show your score. Read more: example.com/privacy".
- **Positions only stay in the player's browser** (the usual case): no data reaches the owner. A friendly line in `introPrivacy` such as "Your position stays on your phone." is still good practice, but only write it if it is true for the whole game.
- **Storage in the browser** (localStorage, cookies): storage that is needed for something the player asked for (e.g. saving their progress) is generally allowed without consent; storage for analytics or ads needs consent (Swedish Electronic Communications Act, chapter 9, section 28).
- **Children as players**: be extra careful with any location data that leaves the device.

This is not legal advice. Official guidance: https://www.imy.se/ (data protection) and https://www.pts.se/ (cookies and storage). Record the owner's decision in the project's HANDOFF.md.

## 8. Before you finish

- Test on the project's own pages, and ask the owner to try it outdoors on a phone.
- Game coordinates (targets, caches, routes) in client code are project-sensitive information under the shared rules. geo-kit does not protect them; flag them and let the owner choose the protection.
- Try your settings first on the test page: https://badbagel47.github.io/geo-kit/demo/
