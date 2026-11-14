# Backlog

IDs: one shared running series. B = bug, F = feature, D = planning/design. Priority: High, Medium, Low.

## Open

| ID | Type | Priority | Description | Needs |
|---|---|---|---|---|
| D-005 | Design | High | Field test the test page outdoors on a real phone: Android (Pixel) in all three modes, and an iPhone if available. Check that the heading matches reality, that there are no jumps when tilting, that the screens are understandable, and that "At target" triggers at the right place. Download a report if something is wrong. | Owner, outdoors with a phone |
| D-010 | Design | Low | Licence: the repo is public but has no licence file, so nobody else may legally reuse the code. Fine for the owner's own projects. Decide whether to add one (e.g. MIT) or keep it as is. | Owner's choice |
| F-012 | Feature | Medium | Sparse whole-session trace in the diagnostic report: about one entry per second for the last 10 minutes (heading, pitch, status, validity), next to the existing dense list of the last 800 entries. The dense list covers only about 15–25 s, so the start of a problem is usually gone at download. From noxari's direction report 2026-11-14, see [FINDINGS.md](FINDINGS.md). Done when a report downloaded minutes after a fault still shows when it began. No coordinates. | Owner's go |
| F-013 | Feature | Medium | Record the relative stream for diagnostics only: geo-kit drops relative `deviceorientation` events today. Keep its heading in the sparse trace (F-012) as the difference from the north-referenced heading, without ever using it for the reported heading. That difference is the only compass quality signal a page has on Android. Done when the report shows the difference over time and the reported heading is unchanged (unit test). | Owner's go, after F-012 |
| D-014 | Design | Medium | Add to the field test D-005: lower and raise the phone fast, turn fast, then aim at a known landmark and note how many seconds the heading needs to settle and how far off it is. noxari's report showed 43° of disagreement between the streams after one fast tilt and several seconds of creeping. | Owner, outdoors with a phone |
| D-015 | Design | Low | Decide whether a large change of the iOS offset (above 30°, applied in one step after 1 s in `learnIosOffset`) and "align to north" should glide over a short time instead of stepping. One-step corrections of 55° and 116° were what made noxari's direction unusable for the owner. Untestable without an iPhone. | Owner's choice |

## Proposed runs

Last updated 2026-11-14. The letters apply to this list only.

**A — F-012 + F-013: a report that keeps the start of a problem** (standard model). Sparse whole-session trace and the relative stream recorded for diagnostics only. No change to the reported heading. Background in [FINDINGS.md](FINDINGS.md).

D-005 with D-014 (field test) waits for the owner's test outdoors; D-010 (licence) and D-015 (gliding corrections) are the owner's choice.

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
