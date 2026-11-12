# geo-kit – Handoff

- **Rules version:** adapted to agent rules v1.2.
- Inventory: 2026-11-11
- **Publishing:** GitHub Pages from `main`, folder `/` (root `index.html` redirects to `demo/`): https://badbagel47.github.io/geo-kit/demo/. Every push to `main` publishes. Other projects use the library through a git tag (see [docs/INTEGRATION.md](docs/INTEGRATION.md)).
- **Project language:** English (README, code, docs). The player-facing texts ship in English and Swedish; each game picks its language.
- **Last updated:** 2026-11-12

## Current state

Version 0.3.0 is built and tested automatically (26 unit tests, 10 browser checks with simulated sensors). 0.3.0 added true north (F-006) and privacy guidance for games (D-011). Releases are created automatically by `.github/workflows/release.yml`. The owner's first phone test found the test page dial spinning across north (B-009, fixed). The library has **not yet been fully tested on real phones outdoors** (D-005); the iPhone handling is untested on a device.

## Next steps

1. D-005 (field test): the owner tests the test page on a phone outdoors in all three modes and downloads a report if something looks wrong. Check especially that the heading now matches true north (maps).
2. D-010 (licence): owner's choice.

## Decisions

- 2026-11-11 – The owner wants one shared module for new projects. Existing games (blaster, wacka, noxari) are **not** switched over to geo-kit; they get targeted fixes and improvement notes instead, because a full replacement risks new bugs.
- 2026-11-11 – Up/down (pitch) from noxari is included as an option for aim mode.
- 2026-11-12 – Devices without GPS or compass are a **project choice** (`noGps: 'warn' | 'block' | 'allow'`). The agent that adds geo-kit to a project asks the owner with a recommendation for that project (docs/INTEGRATION.md section 1).
- Technical decisions (D-001):
  - **Fixed pointing mode per project, never automatic switching.** blaster switches between top edge and back of phone at about 76° tilt; with the phone rolled sideways the heading jumps by the roll angle (10–25° measured) and flips 180° past upright. geo-kit has `map` (top edge, phone flat) and `aim` (back of phone, held up) and shows a hint when the pose does not fit.
  - **Follow the north-referenced stream directly** (as blaster and wacka do, confirmed on the owner's Pixel). noxari follows the relative gyro stream with a stored offset, which can drift away from north; a likely (not proven) cause of its paused bug B-001. A wrong compass (magnets, no calibration) can still give a wrong heading; the calibration screen and "align to north" cover that. Light vector smoothing is used.
  - **iPhone:** `alpha` has an arbitrary zero; `webkitCompassHeading` is the north-referenced equivalent. geo-kit learns the offset between them and then uses the same 3D maths as Android. Untested on a device.
  - **Headings are true north by default** (F-006): the phones report magnetic north, and geo-kit adds the declination from the World Magnetic Model WMM2025 (NOAA/BGS, public-domain coefficients in `src/wmm.ts`, verified against all 100 official test values) at the player's GPS position. About +7.7° in Uppsala in 2026. Until the first fix, headings are magnetic (`direction.north` says which). WMM2025 is valid until 2030.
  - **Diagnostic reports never contain coordinates**, only sensor values and GPS accuracy.

The design draws on the owner's three projects (analysis 2026-11-11): wacka (GPS start flow, permission check, desktop hint, optional compass, top-edge maths), blaster (absolute-only compass, iOS permission in the tap, Android sensor fallback, stale/resume handling, GPS course fallback, arrival rule 15 m / 35 m / 2 s), noxari (back-of-phone direction with pitch, listener restarts, missing-data timeout, align to north, report download).

## Goals

- One proven way to get GPS position and phone direction in the owner's location-based web games, so new projects stop solving it from scratch.
- Clear, friendly screens that explain permissions and problems to players, easy to restyle per project.
- Works in any project: plain JS, Vite, React. No runtime dependencies.
- Not a goal: maps, routing, game rules, or protecting game coordinates (each project decides that, per the global rules on project-sensitive information).

## Way of working

These are the project rules (linked from AGENTS.md).

- Source is TypeScript in `src/`. `dist/` is **committed** so projects can use the library without a build step. Always run `npm run build` and commit `dist/` together with source changes.
- `npm test` builds and runs the unit tests. `npm run test:browser` runs the demo page in Chromium with simulated sensors (set `CHROME_PATH` to use an installed Chrome).
- To release: bump `version` in both `package.json` and `src/version.ts` and push to `main`. The Release workflow then creates the tag and GitHub release `vX.Y.Z` (it fails if the two versions differ). Do not move existing tags. It can also be started by hand under Actions → Release → Run workflow.
- Player-facing texts live in `src/texts.ts` (English and Swedish). Keep both languages complete; a unit test checks that.
- Anything on screen that rotates with a heading uses `continuousAngle()` (B-009).
- No runtime dependencies.

## Environment limitations (2026-11-12, Claude Code on the web)

- Pushing to `main` works. Pushing tags is refused (HTTP 403).
- Package installs are blocked (no network for npm); the existing global TypeScript, Playwright and Chrome were used.
- The published site (`badbagel47.github.io`) cannot be reached from the environment, so publishing could not be verified by the agent.
- Some GitHub API paths (e.g. Pages build status) are refused through the proxy; repo, issue, PR and release reads work.

## One-time actions

- Done 2026-11-12: GitHub Pages enabled (owner).
- Done 2026-11-12: automatic releases (`.github/workflows/release.yml`), approved by the owner as adaptation item 1.1.

## Documentation map

| Path | Content |
|---|---|
| `README.md` | What geo-kit is, quick start. |
| `docs/INTEGRATION.md` | How to use geo-kit in a project (for agents), incl. the questions to ask the owner. |
| `docs/BACKLOG.md` | Bugs, features, design items and proposed runs. |

## File map

| Path | Content |
|---|---|
| `src/wmm.ts` | World Magnetic Model (declination for true north). |
| `src/math.ts` | Angles, rotation matrices, distance, bearing, `continuousAngle`. |
| `src/orientation.ts` | Pure heading/pitch tracker for `map` and `aim` modes, iOS offset, smoothing, pose hints. |
| `src/heading.ts` | Browser wiring for direction: permission, listeners, fallbacks, timeouts. |
| `src/location.ts` | Browser wiring for GPS, coarse-position detection. |
| `src/zone.ts` | Noise-tolerant arrival detection. |
| `src/kit.ts` | `GeoKit`: combines everything, state store, report. |
| `src/guidance.ts` | Which screen/status bar to show for a state (shared by built-in UI and custom UIs). |
| `src/texts.ts` | All player-facing text, English and Swedish. |
| `src/ui.ts` | Ready-made themable screens, CSS and theme presets. |
| `demo/` | Test page. |
| `test/` | Unit tests and browser test. |

## Latest entries

- 2026-11-12 – Version 0.3.0: true north (F-006), privacy guidance in INTEGRATION.md (D-011), notes for blaster/wacka/noxari (D-007).
- 2026-11-12 – Adapted to agent rules v1.2 (wording only, no repo changes needed).
- 2026-11-12 – Automatic releases via GitHub Actions (adaptation 1.1).
- 2026-11-12 – Adapted to agent rules v1.1: Decisions section, project language, environment limitations, one-time actions, legal review (D-010, D-011), neutral model levels in the backlog.
- 2026-11-12 – Fixed the test page dial spinning across north (B-009). Found the same kind of spin in wacka and noxari (added to D-007).
