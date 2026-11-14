import type { PointingMode } from './orientation.js';
export type TraceValue = number | string | boolean | null;
export type TraceExport = {
    /** Shortest time between two rows, in ms. */
    intervalMs: number;
    /** Column names; every row has its values in this order. */
    columns: string[];
    rows: TraceValue[][];
};
export type Transition = {
    t: number;
    what: string;
    from: TraceValue;
    to: TraceValue;
};
/**
 * About one row per second for the last ten minutes, plus a list of state changes.
 * The dense sample list in the report covers only some 15–25 s at phone sensor rates, so
 * without this the start of a problem is usually gone when the report is downloaded.
 */
export declare class SessionTrace {
    private readonly intervalMs;
    private readonly maxRows;
    private readonly maxTransitions;
    private columns;
    private rows;
    private transitions;
    private lastSample;
    private lastHeading;
    private updates;
    private largestStep;
    constructor(intervalMs?: number, maxRows?: number, maxTransitions?: number);
    /** Call for every new heading: counts updates and keeps the largest single change per row. */
    noteHeading(heading: number | null): void;
    /**
     * Store a row if at least `intervalMs` has passed since the last one. `snapshot` is only
     * called when a row is stored. The row gets `t`, the snapshot's values, then `updates`
     * (heading changes since the last row) and `step` (largest single heading change, degrees).
     */
    sample(now: number, snapshot: () => Record<string, TraceValue>): boolean;
    /** Record a state change, e.g. the compass going from "ok" to "stale". */
    transition(now: number, what: string, from: TraceValue, to: TraceValue): void;
    export(): {
        trace: TraceExport;
        transitions: Transition[];
    };
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
/**
 * Compares the north-referenced orientation stream with the relative (gyro) one. geo-kit
 * reports headings from the north-referenced stream only; on Android this comparison is the
 * only compass quality signal a web page has. It cannot say which stream is wrong.
 */
export declare class StreamComparison {
    private readonly mode;
    private readonly maxGapMs;
    private absolute;
    private relative;
    constructor(mode: PointingMode, maxGapMs?: number);
    reset(): void;
    pushAbsolute(alpha: number, beta: number, gamma: number, time: number, screenAngle?: number): void;
    pushRelative(alpha: number, beta: number, gamma: number, time: number, screenAngle?: number): void;
    /** Difference between the latest pair of readings, or nulls when they are too far apart in time. */
    get(): StreamDifference;
    private pointing;
}
