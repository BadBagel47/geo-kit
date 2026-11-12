# geo-kit

GPS position and phone direction for location-based web games, with ready-made, themable screens that explain permissions and problems to players.

- **Location:** fast first fix, continuous watch, auto start when already allowed, weak/stale detection.
- **Direction**, in one fixed mode per game:
  - `map`: phone held flat, heading of the screen's top edge.
  - `aim`: phone held up, direction the back of the phone points; optional **up/down (pitch)** for sky and ground.
- Same behaviour on Android and iPhone, with fallbacks, timeouts and restarts.
- Headings relative to true north (like maps), corrected with the World Magnetic Model at the player's position.
- Screens in English and Swedish (start, waiting, blocked permission with phone-specific steps, missing compass, calibration) plus a status bar. Restyle with theme values, CSS variables, or draw your own.
- Helpers: distance, bearing, noise-tolerant arrival detection.
- No dependencies. Plain JS, Vite or React.

**Test page:** https://badbagel47.github.io/geo-kit/demo/ (open it on a phone, outdoors).

**How to use it in a project:** [docs/INTEGRATION.md](docs/INTEGRATION.md).

```js
import { GeoKit, mountGeoKitUI } from 'https://cdn.jsdelivr.net/gh/BadBagel47/geo-kit@v0.3.0/dist/index.js';

const kit = new GeoKit({ heading: 'aim', pitch: true });
mountGeoKitUI(kit, { lang: 'sv', texts: { app: 'Stjärnjakten' } });
kit.subscribe(() => console.log(kit.getState().direction));
```

## Development

```sh
npm install
npm test              # build + unit tests
npm run test:browser  # demo page in Chromium with simulated sensors
```

`dist/` is committed so projects can use the library without building. See [HANDOFF.md](HANDOFF.md) for the current state and design decisions.
