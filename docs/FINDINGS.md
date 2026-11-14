# Field findings from other projects

Findings from real phones in the owner's other projects that matter for geo-kit. Only aggregate measurements are kept here: no raw sensor logs, no coordinates.

## 2026-11-14: noxari direction report (Android phone, Brave)

Source: noxari bug B-001, analysed 2026-11-14. noxari's own write-up is `docs/DIRECTION_STABILITY.md` in that repo.

### Why it matters here

noxari follows the relative stream (`deviceorientation`) and stores an offset to north taken from the north-referenced stream (`deviceorientationabsolute`). When the two disagree by 20° or more for 1.5 s of stillness, it re-anchors to the compass in one step. geo-kit instead follows the north-referenced stream directly (decision D-001). This report is the first measured comparison of the two streams on the owner's phone during real use, so it tests that decision.

### What was measured

The report holds 473 pairs of readings (north-referenced and relative, at most 40 ms apart) from three windows of an 85 s session. "Offset" below is the north-referenced heading minus the relative heading for the direction the back of the phone points (aim mode with pitch).

| Observation | Measurement |
| --- | --- |
| Ordinary movement | Both streams moved together. A 27° swing and return in 3 s and a 10° step kept the offset within about 1°, apart from one 10° transient that followed a roll change and returned within 2 s. |
| Tilt | The two streams agreed on pitch within 0.5° throughout, and 2.3° right after a fast tilt. |
| Phone held still | Offset constant to a few tenths of a degree: 165.6–166.0° over 3.5 s, 282.4–284.1° over 9.7 s. |
| Offset over the session | 221° at the first anchor, 166° six seconds and one 64° turn later, 282° after an unrecorded 17 s, the same 282° on both sides of a 12 s gap with large tilt changes, then +43° within 0.4 s in one fast tilt (pitch −14° to −52° in about 0.25 s), still +26° after 4.5 s. |
| Settling | In two episodes the north-referenced heading crept at 5–9°/s for 2–4 s while the relative stream was still. |
| What the stored-offset model did | Two one-step corrections of −55° and +116°, 27 s apart. The view was more than 25° from the compass for at least 32 of the 85 s. |

### What it means for geo-kit

1. **D-001 is supported, not proven.** The north-referenced stream responds at gyro speed, so following it directly costs no responsiveness. The stored-offset model accumulated errors of 55° and 116° within half a minute and corrected them late and as jumps. The report has no ground truth, so it cannot say which stream pointed at north; that the compass is the better one rests on the owner's earlier physical checks (returning to the compass gave the right direction twice) and on blaster and wacka working on the same phone.
2. **After a fast movement the heading can be off for a few seconds.** A disagreement of 43° appeared in one fast tilt and the north-referenced heading then crept for several seconds. Whichever stream was wrong, a game should not treat the heading in the first seconds after a jerk as exact. The 150 ms smoothing does not cover this, and should not try to.
3. **"Stable" is not "correct".** A heading that creeps a few degrees per second passes a simple stillness test (noxari: within 3° for 1.2 s). A game that waits for a steady heading before it acts on it needs a longer window than that.
4. **Never correct a heading in one step.** The jumps were what the owner experienced as the compass "changing direction hard". Any future correction in geo-kit, such as the iOS offset or "align to north", should move the heading over a short time. `learnIosOffset` already blends small changes, but a change above 30° is applied in one step after 1 s.
5. **Android gives the page no compass accuracy.** `webkitCompassAccuracy` is iOS only. On Android the only quality signal available to a page is the comparison between the two streams, and that comparison cannot say which one is wrong.
6. **The diagnostic report must keep the start of a problem.** noxari's report keeps frozen windows around each warning (200 readings before, 100 after) plus a list of transitions, and that is what made this analysis possible. It still lost the 17 s in which the offset moved 116°. geo-kit's report is a rolling list of the last 800 entries, about 15–25 s at phone sensor rates, so the start of a problem is normally gone when the owner taps download.

### Proposals (in the backlog, not built)

- F-012: a sparse whole-session trace in the report.
- F-013: record the relative stream for diagnostics only.
- D-014: add fast-movement steps to the field test D-005.
- D-015: decide whether large iOS offset changes should glide.
