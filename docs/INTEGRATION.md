# Using geo-kit in a project

Guide for agents adding GPS and/or phone direction to one of the owner's projects. The owner is not a developer: pick the settings below from what the game needs, and explain the choice in plain words.

## 1. Choose the settings

| The game needs… | Setting |
|---|---|
| Only where the player is | `heading: false` |
| A map or arrow that turns with the player, phone held flat or tilted | `heading: 'map'` |
| The player points the phone at things (a gadget, a "radar", finding a target by pointing) | `heading: 'aim'` |
| Pointing at the sky or the ground (stars, things above/below) | `heading: 'aim', pitch: true` |
| The game cannot be played without the compass | UI option `requireCompass: true` (otherwise players can continue without it) |

Never mix modes or switch between them while playing: that is what made blaster's needle jump.

## 2. Add it to the project

**Projects with npm (Vite, React…).** Use a tag so the project never changes by surprise:

```sh
npm install github:BadBagel47/geo-kit#v0.1.0
```

```js
import { GeoKit, mountGeoKitUI } from 'geo-kit';
```

**Projects without a build step** (plain HTML/JS):

```js
import { GeoKit, mountGeoKitUI } from 'https://cdn.jsdelivr.net/gh/BadBagel47/geo-kit@v0.1.0/dist/index.js';
```

The page must be served over `https://` (or `localhost`) for sensors to work.

## 3. Minimal example

```js
const kit = new GeoKit({ heading: 'aim' });           // one GeoKit per page
const ui = mountGeoKitUI(kit, {
  lang: 'en',                                         // or 'sv'
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

## 4. Match the project's look

Three levels, from least to most work:

1. **Theme values:** `theme: { … }` or a preset: `themes.light`, `themes.dark`, `themes.terminal`, `themes.parchment` (spread and change: `{ ...themes.dark, accent: '#f0c' }`). Keys: `font, titleFont, titleTransform, titleSpacing, backdrop, surface, text, muted, border, accent, accentText, buttonText, ok, warn, error, off, radius, buttonRadius, shadow, barBackground, barText, z`.
2. **CSS:** the same values are CSS variables (`--gk-accent`, `--gk-surface`, …) on `.gk-root`, and every part has a `gk-` class (`.gk-card`, `.gk-title`, `.gk-btn--primary`, `.gk-bar`, `.gk-lamp`…). Pass `className` to scope project CSS. Project CSS wins over the built-in styles.
3. **Fully custom screens** (e.g. blaster's device look): skip `mountGeoKitUI`. Call `getGuidance(kit.getState(), options)` to get which screen or status message to show and `getTexts(lang, overrides)` for the wording, then draw it yourself. Call `kit.start()` directly in your button's click handler.

All texts can be replaced through `texts`. Write `introBody` for the specific game. `introPrivacy` is empty by default: only fill it in with something the project really guarantees.

## 5. Useful helpers

- `distanceMeters(a, b)`, `bearingDegrees(a, b)`, `relativeBearing(heading, bearing)` (0 = straight ahead, + right, − left).
- `ZoneMonitor` for "has the player arrived?": enters after 3 fixes inside the radius within 3 s, leaves only after 2 s beyond the exit radius, ignores inaccurate or old fixes. Defaults 15 m / 35 m.
- `isFresh(fix, maxAgeMs)` before trusting a position.
- `kit.alignNorth()`, `kit.setHeadingOffset(deg)`, `kit.resetAlignment()` for manual corrections. Headings are magnetic north; in Uppsala true north is about 6° different.
- `kit.downloadReport()` for bug reports from the field (no coordinates included).

## 6. Before you finish

- Test on the project's own pages, and ask the owner to try it outdoors on a phone.
- Game coordinates (targets, caches, routes) in client code are project-sensitive information under the shared rules. geo-kit does not protect them; flag them and let the owner choose the protection.
- Try your settings first on the test page: https://badbagel47.github.io/geo-kit/demo/
