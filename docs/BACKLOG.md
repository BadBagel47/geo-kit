# Backlog

IDs: one shared running series. B = bug, F = feature, D = planning/design. Priority: High, Medium, Low.

## Open

| ID | Type | Priority | Description | Needs |
|---|---|---|---|---|
| D-005 | Design | High | Field test the test page outdoors on a real phone: Android (Pixel) in all three modes, and an iPhone if available. Check that the heading matches reality, that there are no jumps when tilting, that the screens are understandable, and that "At target" triggers at the right place. Download a report if something is wrong. | Owner, outdoors with a phone |
| D-007 | Design | Medium | Write improvement notes for the existing projects, for their own agents: blaster (fix the heading jump when tilting, a small change limited to `src/compass.ts`), wacka (compare its flow with geo-kit and list any gaps), noxari (direction drift B-001, compare with geo-kit's approach). The owner prefers targeted fixes over replacing working code. Also record the B-009 kind of spin found 2026-11-12: wacka's compass button needle in FREE mode (`src/map/GameMap.tsx`, 80 ms transition, map bearing wraps at ±180°) and noxari's finder arrow (`finder-orbit-arrow`, 0.12 s transition, angle wraps when the target is straight below). blaster is not affected. | D-005 results preferred first |
| D-010 | Design | Low | Licence: the repo is public but has no licence file, so nobody else may legally reuse the code. Fine for the owner's own projects. Decide whether to add one (e.g. MIT) or keep it as is. | Owner's choice |
| D-011 | Design | Low | Location and privacy (GDPR) guidance for games that use geo-kit. geo-kit itself keeps the position in the browser and never sends it anywhere, and reports contain no coordinates. A game that sends or saves positions (server, database, scores with places) processes personal data and needs a privacy notice; the text `introPrivacy` can point to it. The test page saves a test target in the browser's local storage only when the player taps "Target here", which is storage needed for a function the player asked for. Add a short section to docs/INTEGRATION.md so implementing agents flag this. Not legal advice; official guidance: https://www.imy.se/ | – |
| F-006 | Feature | Low | Automatic magnetic declination (true north instead of magnetic north) from the GPS position. About 6° in Uppsala today; can be set manually with `setHeadingOffset()`. | – |

## Proposed runs

- **A** – strong model, high level – Fixes after the field test
  - D-005 – Fix whatever the owner's field test and report show
- **B** – strong model, medium level – Notes for the existing projects
  - D-007 – Improvement notes for blaster, wacka and noxari, incl. the spinning needle/arrow in wacka and noxari
- **C** – standard model, medium level – Privacy guidance and true north
  - D-011 – Privacy section in INTEGRATION.md
  - F-006 – Automatic magnetic declination

## Done

| ID | Type | Done | Description |
|---|---|---|---|
| D-001 | Design | 2026-11-11 | Architecture based on blaster, wacka and noxari: framework-free core, fixed `map`/`aim` modes with optional pitch, north-referenced data only, shared iOS/Android maths, guidance shared by built-in and custom UIs, themable screens via CSS variables, coordinates never in reports. See HANDOFF.md. |
| F-002 | Feature | 2026-11-11 | Core: GPS flow, compass with fallbacks and timeouts, map/aim/pitch maths, iOS offset, smoothing, manual north alignment, zone monitor, distance/bearing helpers, diagnostic report. |
| F-003 | Feature | 2026-11-11 | Ready-made screens (intro, waiting, denied with per-platform steps, missing compass, calibration, desktop) and status bar, in English and Swedish, with four theme presets and CSS variables. |
| B-009 | Bug | 2026-11-12 | Test page: the compass dial spun almost a full turn when the heading crossed north (CSS transition from 359° to 1°), seen as jerks and fast spins in the owner's first phone test. Fixed with `continuousAngle()`, now exported for games too. |
| F-008 | Feature | 2026-11-12 | Devices without GPS or compass (computers, Wi-Fi tablets): detection, project choice `noGps: 'warn' \| 'block' \| 'allow'`, own texts instead of phone advice, and an instruction in INTEGRATION.md that the implementing agent asks the owner with a recommendation. Version 0.2.0. |
| F-004 | Feature | 2026-11-11 | Test page with mode/theme/language switches, live compass, target test, screen previews, report download and simulated sensors; unit and browser tests. |
