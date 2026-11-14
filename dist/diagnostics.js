/**
 * Diagnostics that never affect the reported heading: a sparse trace of the whole
 * session (F-012) and a comparison of the browser's two orientation streams (F-013).
 * Pure classes: time is passed in, so they can be unit tested. No coordinates are kept.
 */
import { BACK_OF_DEVICE, angleDelta, headingOf, matrixFromEuler, normalizeDegrees, pitchOf, screenUpInDevice, toEarth, } from './math.js';
/**
 * About one row per second for the last ten minutes, plus a list of state changes.
 * The dense sample list in the report covers only some 15–25 s at phone sensor rates, so
 * without this the start of a problem is usually gone when the report is downloaded.
 */
export class SessionTrace {
    constructor(intervalMs = 1000, maxRows = 600, maxTransitions = 200) {
        this.intervalMs = intervalMs;
        this.maxRows = maxRows;
        this.maxTransitions = maxTransitions;
        this.columns = null;
        this.rows = [];
        this.transitions = [];
        this.lastSample = -Infinity;
        this.lastHeading = null;
        this.updates = 0;
        this.largestStep = 0;
    }
    /** Call for every new heading: counts updates and keeps the largest single change per row. */
    noteHeading(heading) {
        if (heading === null) {
            this.lastHeading = null;
            return;
        }
        if (this.lastHeading !== null) {
            const step = Math.abs(angleDelta(this.lastHeading, heading));
            if (step > 0)
                this.updates++;
            if (step > this.largestStep)
                this.largestStep = step;
        }
        else {
            this.updates++;
        }
        this.lastHeading = heading;
    }
    /**
     * Store a row if at least `intervalMs` has passed since the last one. `snapshot` is only
     * called when a row is stored. The row gets `t`, the snapshot's values, then `updates`
     * (heading changes since the last row) and `step` (largest single heading change, degrees).
     */
    sample(now, snapshot) {
        if (now - this.lastSample < this.intervalMs)
            return false;
        this.lastSample = now;
        const values = snapshot();
        this.columns ?? (this.columns = ['t', ...Object.keys(values), 'updates', 'step']);
        const row = [Math.round(now)];
        for (const key of this.columns.slice(1, -2))
            row.push(values[key] ?? null);
        row.push(this.updates, Math.round(this.largestStep * 10) / 10);
        this.rows.push(row);
        if (this.rows.length > this.maxRows)
            this.rows.splice(0, this.rows.length - this.maxRows);
        this.updates = 0;
        this.largestStep = 0;
        return true;
    }
    /** Record a state change, e.g. the compass going from "ok" to "stale". */
    transition(now, what, from, to) {
        if (from === to)
            return;
        this.transitions.push({ t: Math.round(now), what, from, to });
        if (this.transitions.length > this.maxTransitions)
            this.transitions.splice(0, this.transitions.length - this.maxTransitions);
    }
    export() {
        return {
            trace: { intervalMs: this.intervalMs, columns: [...(this.columns ?? [])], rows: this.rows.map(row => [...row]) },
            transitions: this.transitions.map(entry => ({ ...entry })),
        };
    }
}
/**
 * Compares the north-referenced orientation stream with the relative (gyro) one. geo-kit
 * reports headings from the north-referenced stream only; on Android this comparison is the
 * only compass quality signal a web page has. It cannot say which stream is wrong.
 */
export class StreamComparison {
    constructor(mode, maxGapMs = 100) {
        this.mode = mode;
        this.maxGapMs = maxGapMs;
        this.absolute = null;
        this.relative = null;
    }
    reset() { this.absolute = null; this.relative = null; }
    pushAbsolute(alpha, beta, gamma, time, screenAngle = 0) {
        this.absolute = this.pointing(alpha, beta, gamma, time, screenAngle);
    }
    pushRelative(alpha, beta, gamma, time, screenAngle = 0) {
        this.relative = this.pointing(alpha, beta, gamma, time, screenAngle);
    }
    /** Difference between the latest pair of readings, or nulls when they are too far apart in time. */
    get() {
        const a = this.absolute, r = this.relative;
        if (!a || !r || Math.abs(a.time - r.time) > this.maxGapMs)
            return { offset: null, pitchDifference: null };
        return {
            offset: a.heading === null || r.heading === null ? null : Math.round(normalizeDegrees(a.heading - r.heading) * 10) / 10 % 360,
            pitchDifference: Math.round((a.pitch - r.pitch) * 10) / 10,
        };
    }
    pointing(alpha, beta, gamma, time, screenAngle) {
        if (![alpha, beta, gamma].every(Number.isFinite))
            return null;
        const axis = this.mode === 'map' ? screenUpInDevice(screenAngle) : BACK_OF_DEVICE;
        const v = toEarth(matrixFromEuler(alpha, beta, gamma), axis);
        const { heading, horizontal } = headingOf(v);
        // Close to vertical the heading is undefined, so no offset is reported there.
        return { heading: horizontal < 0.2 ? null : heading, pitch: pitchOf(v), time };
    }
}
