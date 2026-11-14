/**
 * Diagnostics that never affect the reported heading: a sparse trace of the whole
 * session (F-012) and a comparison of the browser's two orientation streams (F-013).
 * Pure classes: time is passed in, so they can be unit tested. No coordinates are kept.
 */
import {
  type Vec3, BACK_OF_DEVICE, angleDelta, headingOf, matrixFromEuler, normalizeDegrees, pitchOf,
  screenUpInDevice, toEarth,
} from './math.js';
import type { PointingMode } from './orientation.js';

export type TraceValue = number | string | boolean | null;

export type TraceExport = {
  /** Shortest time between two rows, in ms. */
  intervalMs: number;
  /** Column names; every row has its values in this order. */
  columns: string[];
  rows: TraceValue[][];
};

export type Transition = { t: number; what: string; from: TraceValue; to: TraceValue };

/**
 * About one row per second for the last ten minutes, plus a list of state changes.
 * The dense sample list in the report covers only some 15–25 s at phone sensor rates, so
 * without this the start of a problem is usually gone when the report is downloaded.
 */
export class SessionTrace {
  private columns: string[] | null = null;
  private rows: TraceValue[][] = [];
  private transitions: Transition[] = [];
  private lastSample = -Infinity;
  private lastHeading: number | null = null;
  private updates = 0;
  private largestStep = 0;

  constructor(
    private readonly intervalMs = 1000,
    private readonly maxRows = 600,
    private readonly maxTransitions = 200,
  ) {}

  /** Call for every new heading: counts updates and keeps the largest single change per row. */
  noteHeading(heading: number | null): void {
    if (heading === null) { this.lastHeading = null; return; }
    if (this.lastHeading !== null) {
      const step = Math.abs(angleDelta(this.lastHeading, heading));
      if (step > 0) this.updates++;
      if (step > this.largestStep) this.largestStep = step;
    } else {
      this.updates++;
    }
    this.lastHeading = heading;
  }

  /**
   * Store a row if at least `intervalMs` has passed since the last one. `snapshot` is only
   * called when a row is stored. The row gets `t`, the snapshot's values, then `updates`
   * (heading changes since the last row) and `step` (largest single heading change, degrees).
   */
  sample(now: number, snapshot: () => Record<string, TraceValue>): boolean {
    if (now - this.lastSample < this.intervalMs) return false;
    this.lastSample = now;
    const values = snapshot();
    this.columns ??= ['t', ...Object.keys(values), 'updates', 'step'];
    const row: TraceValue[] = [Math.round(now)];
    for (const key of this.columns.slice(1, -2)) row.push(values[key] ?? null);
    row.push(this.updates, Math.round(this.largestStep * 10) / 10);
    this.rows.push(row);
    if (this.rows.length > this.maxRows) this.rows.splice(0, this.rows.length - this.maxRows);
    this.updates = 0;
    this.largestStep = 0;
    return true;
  }

  /** Record a state change, e.g. the compass going from "ok" to "stale". */
  transition(now: number, what: string, from: TraceValue, to: TraceValue): void {
    if (from === to) return;
    this.transitions.push({ t: Math.round(now), what, from, to });
    if (this.transitions.length > this.maxTransitions) this.transitions.splice(0, this.transitions.length - this.maxTransitions);
  }

  export(): { trace: TraceExport; transitions: Transition[] } {
    return {
      trace: { intervalMs: this.intervalMs, columns: [...(this.columns ?? [])], rows: this.rows.map(row => [...row]) },
      transitions: this.transitions.map(entry => ({ ...entry })),
    };
  }
}

export type StreamDifference = {
  /**
   * North-referenced heading minus relative heading for the pointing direction, 0..360.
   * The value itself is arbitrary; a change over time means the two streams drifted apart.
   * Null when no fresh pair exists or the phone points too close to straight up or down.
   */
  offset: number | null;
  /** North-referenced pitch minus relative pitch, in degrees. */
  pitchDifference: number | null;
};

type Pointing = { heading: number | null; pitch: number; time: number };

/**
 * Compares the north-referenced orientation stream with the relative (gyro) one. geo-kit
 * reports headings from the north-referenced stream only; on Android this comparison is the
 * only compass quality signal a web page has. It cannot say which stream is wrong.
 */
export class StreamComparison {
  private absolute: Pointing | null = null;
  private relative: Pointing | null = null;

  constructor(private readonly mode: PointingMode, private readonly maxGapMs = 100) {}

  reset(): void { this.absolute = null; this.relative = null; }

  pushAbsolute(alpha: number, beta: number, gamma: number, time: number, screenAngle = 0): void {
    this.absolute = this.pointing(alpha, beta, gamma, time, screenAngle);
  }

  pushRelative(alpha: number, beta: number, gamma: number, time: number, screenAngle = 0): void {
    this.relative = this.pointing(alpha, beta, gamma, time, screenAngle);
  }

  /** Difference between the latest pair of readings, or nulls when they are too far apart in time. */
  get(): StreamDifference {
    const a = this.absolute, r = this.relative;
    if (!a || !r || Math.abs(a.time - r.time) > this.maxGapMs) return { offset: null, pitchDifference: null };
    return {
      offset: a.heading === null || r.heading === null ? null : Math.round(normalizeDegrees(a.heading - r.heading) * 10) / 10 % 360,
      pitchDifference: Math.round((a.pitch - r.pitch) * 10) / 10,
    };
  }

  private pointing(alpha: number, beta: number, gamma: number, time: number, screenAngle: number): Pointing | null {
    if (![alpha, beta, gamma].every(Number.isFinite)) return null;
    const axis: Vec3 = this.mode === 'map' ? screenUpInDevice(screenAngle) : BACK_OF_DEVICE;
    const v = toEarth(matrixFromEuler(alpha, beta, gamma), axis);
    const { heading, horizontal } = headingOf(v);
    // Close to vertical the heading is undefined, so no offset is reported there.
    return { heading: horizontal < 0.2 ? null : heading, pitch: pitchOf(v), time };
  }
}
