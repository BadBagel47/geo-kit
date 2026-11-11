# geo-kit – Handoff

- **Rules version:** adapted to agent rules v1.0.
- **Inventory:** done 2026-11-11. The repo was created empty on 2026-11-11 for this project; there were no branches, PRs, issues or earlier documentation.
- **Publishing:** the test page is served by GitHub Pages from `main`, folder `/` (root `index.html` redirects to `demo/`): https://badbagel47.github.io/geo-kit/demo/. Other projects use the library through a git tag (see [docs/INTEGRATION.md](docs/INTEGRATION.md)).
- **Last updated:** 2026-11-11

## Current state

Version 0.1.0 is built and tested automatically (20 unit tests, 8 browser checks with simulated sensors). It has **not yet been tested on real phones outdoors** (D-005). The iPhone handling in particular is untested on a device.

## Next steps

1. D-005: the owner tests the test page on a phone outdoors (Android and, if possible, iPhone) and downloads a report if something looks wrong.
2. D-007: write improvement notes for blaster, wacka and noxari (see BACKLOG). The owner prefers targeted fixes in existing games over replacing their code with geo-kit.

## Goals

- One proven way to get GPS position and phone direction in the owner's location-based web games, so new projects stop solving it from scratch.
- Clear, friendly screens that explain permissions and problems to players, easy to restyle per project.
- Works in any project: plain JS, Vite, React. No runtime dependencies.
- Not a goal: maps, routing, game rules, or protecting game coordinates (each project decides that, per the shared rules on project-sensitive information).

## Background and design decisions

The design is based on an analysis of the owner's three existing projects (2026-11-11):

| Project | Taken from it |
|---|---|
| wacka | GPS start flow: Permissions API check with 1.2 s timeout, auto start when already granted, first fix with `getCurrentPosition` then `watchPosition`, keep last fix through short gaps, embedded-page (permissions policy) check, desktop hint, compass optional with north-up fallback, top-edge maths for flat phones. |
| blaster | Absolute-only compass (never relative gyro angles), iOS permission requested in the same tap, AbsoluteOrientationSensor fallback on Android, stale data after 3 s, resubscribe when the page becomes visible, GPS direction of travel as a fallback, arrival rule 15 m enter / 35 m leave with 2 s grace. |
| noxari | Back-of-phone direction plus up/down (pitch) that also works in landscape, listener restarts when no data arrives, missing-data timeout (8 s), manual "align to north", diagnostic report download. |

Key decisions (see BACKLOG D-001 for the full list):

- **Fixed pointing mode per project, never automatic switching.** blaster switches between top edge and back of phone at about 76° tilt; with the phone rolled sideways that makes the heading jump by the roll angle (10–25° measured), and it flips 180° when tilted past upright. geo-kit has `map` (top edge, phone flat) and `aim` (back of phone, held up) and shows a hint instead when the pose does not fit.
- **Follow the north-referenced stream directly** (as blaster and wacka do, confirmed on the owner's Pixel). noxari follows the relative gyro stream with a stored offset, which can drift away from north; that is a likely (not proven) cause of its paused bug B-001, and the reason it needs a drift guard. geo-kit does not use relative data, so that kind of drift cannot build up. A wrong compass (magnets, no calibration) can still give a wrong heading; the calibration screen and "align to north" cover that. Light vector smoothing replaces it.
- **iPhone:** `alpha` has an arbitrary zero; `webkitCompassHeading` is the north-referenced equivalent of alpha. geo-kit learns the offset between them (with smoothing and outlier rejection) and then uses the same 3D maths as Android, so both platforms behave the same in both modes. Untested on a device.
- **Headings are magnetic** (what the phones report). In Uppsala the difference to true north is about 6°. `setHeadingOffset()` can correct it; automatic correction is F-006.
- **Diagnostic reports never contain coordinates**, only sensor values and GPS accuracy.

## Way of working

- Source is TypeScript in `src/`. `dist/` is **committed** so projects can use the library without a build step. Always run `npm run build` and commit `dist/` together with source changes.
- `npm test` builds and runs the unit tests. `npm run test:browser` runs the demo page in Chromium with simulated sensors (set `CHROME_PATH` to use an installed Chrome).
- Bump `version` in both `package.json` and `src/version.ts`, and create a git tag `vX.Y.Z` for each release that projects should use. Do not move existing tags.
- Player-facing texts live in `src/texts.ts` (English and Swedish). Keep both languages complete; a unit test checks that.
- No runtime dependencies.

## File map

| Path | Content |
|---|---|
| `src/math.ts` | Angles, rotation matrices, distance and bearing. |
| `src/orientation.ts` | Pure heading/pitch tracker for `map` and `aim` modes, iOS offset, smoothing, pose hints. |
| `src/heading.ts` | Browser wiring for direction: permission, listeners, fallbacks, timeouts. |
| `src/location.ts` | Browser wiring for GPS. |
| `src/zone.ts` | Noise-tolerant arrival detection. |
| `src/kit.ts` | `GeoKit`: combines everything, state store, report. |
| `src/guidance.ts` | Which screen/status bar to show for a state (shared by built-in UI and custom UIs). |
| `src/texts.ts` | All player-facing text, English and Swedish. |
| `src/ui.ts` | Ready-made themable screens, CSS and theme presets. |
| `demo/` | Test page. |
| `test/` | Unit tests and browser test. |
| `docs/INTEGRATION.md` | How to use geo-kit in a project (for agents). |
| `docs/BACKLOG.md` | Features, bugs, design items and proposed runs. |

## Log

- 2026-11-11 – Claude (Opus): repo inventory, analysis of blaster/wacka/noxari, built version 0.1.0 with tests, test page and docs (D-001, F-002, F-003, F-004).
