# Backlog

IDs: one shared running series. B = bug, F = feature, D = planning/design. Priority: High, Medium, Low.

## Open

| ID | Type | Priority | Description | Needs |
|---|---|---|---|---|
| D-005 | Design | High | Field test the test page outdoors on a real phone: Android (Pixel) in all three modes, and an iPhone if available. Check that the heading matches reality, that there are no jumps when tilting, that the screens are understandable, and that "At target" triggers at the right place. Download a report if something is wrong. | Owner, outdoors with a phone |
| D-010 | Design | Low | Licence: the repo is public but has no licence file, so nobody else may legally reuse the code. Fine for the owner's own projects. Decide whether to add one (e.g. MIT) or keep it as is. | Owner's choice |

## Proposed runs

No run is ready. D-005 (field test) waits for the owner's test outdoors; D-010 (licence) is the owner's choice.

## Done

| ID | Type | Done | Description |
|---|---|---|---|
| D-001 | Design | 2026-11-11 | Architecture based on blaster, wacka and noxari: framework-free core, fixed `map`/`aim` modes with optional pitch, north-referenced data only, shared iOS/Android maths, guidance shared by built-in and custom UIs, themable screens via CSS variables, coordinates never in reports. See HANDOFF.md. |
| F-002 | Feature | 2026-11-11 | Core: GPS flow, compass with fallbacks and timeouts, map/aim/pitch maths, iOS offset, smoothing, manual north alignment, zone monitor, distance/bearing helpers, diagnostic report. |
| F-003 | Feature | 2026-11-11 | Ready-made screens (intro, waiting, denied with per-platform steps, missing compass, calibration, desktop) and status bar, in English and Swedish, with four theme presets and CSS variables. |
| D-007 | Design | 2026-11-12 | Notes written into the existing projects' own docs: blaster (geo-kit references for its compass findings B12–B14 and the magnetic/true north question), wacka (B-036 spinning N needle in FREE mode, F-037 AUTO uses magnetic north), noxari (B-013 spinning finder arrow, note on B-001 comparing geo-kit's approach). Documentation only; no code changed in those games. |
| F-006 | Feature | 2026-11-12 | True north: compass headings corrected with the World Magnetic Model WMM2025 at the player's position (`trueNorth`, default on; `magneticDeclination()` exported), verified against NOAA's 100 official test values. Version 0.3.0. |
| D-011 | Design | 2026-11-12 | Section "Location and privacy" in docs/INTEGRATION.md: when a game needs a privacy notice, browser storage, children; links to IMY and PTS. |
| B-009 | Bug | 2026-11-12 | Test page: the compass dial spun almost a full turn when the heading crossed north (CSS transition from 359° to 1°), seen as jerks and fast spins in the owner's first phone test. Fixed with `continuousAngle()`, now exported for games too. |
| F-008 | Feature | 2026-11-12 | Devices without GPS or compass (computers, Wi-Fi tablets): detection, project choice `noGps: 'warn' \| 'block' \| 'allow'`, own texts instead of phone advice, and an instruction in INTEGRATION.md that the implementing agent asks the owner with a recommendation. Version 0.2.0. |
| F-004 | Feature | 2026-11-11 | Test page with mode/theme/language switches, live compass, target test, screen previews, report download and simulated sensors; unit and browser tests. |
