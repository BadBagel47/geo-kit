/**
 * Browser wiring for the phone's direction: permission, event listeners, fallbacks,
 * restarts and timeouts. The maths lives in orientation.ts.
 */
import { type OrientationOptions, type PoseHint } from './orientation.js';
export type HeadingStatus = 'off' | 'unsupported' | 'insecure' | 'requesting' | 'denied' | 'waiting' | 'ok' | 'pose' | 'stale' | 'missing' | 'no-north';
export type HeadingState = {
    status: HeadingStatus;
    /** Degrees from north (0..360). Held during short gaps and bad poses; null when unknown. */
    heading: number | null;
    /** Aim mode with pitch only: degrees above (+) or below (-) the horizon. */
    pitch: number | null;
    hint: PoseHint;
    /** iOS compass accuracy in degrees, when reported. */
    accuracy: number | null;
    needsCalibration: boolean;
    /** Which browser source currently delivers data. */
    source: 'orientation' | 'sensor' | null;
    /** True when a manual north alignment is active. */
    aligned: boolean;
    /** True when the browser needs a tap before it can (re)start, e.g. iOS after a reload. */
    needsGesture: boolean;
};
export type HeadingTiming = {
    /** A running stream older than this is "stale". Default 3000 ms. */
    staleMs?: number;
    /** No usable data this long after start means "missing". Default 8000 ms. */
    missingMs?: number;
};
export type SampleLog = (entry: Record<string, unknown>) => void;
export declare function needsMotionPermission(): boolean;
export declare class HeadingController {
    private readonly onChange;
    private readonly log?;
    state: HeadingState;
    private tracker;
    private readonly staleMs;
    private readonly missingMs;
    private session;
    private running;
    private granted;
    private startedAt;
    private lastUsable;
    private everUsable;
    private relativeSeen;
    private restarts;
    private timer;
    private detach;
    private sensor;
    private orientationSeenAt;
    constructor(options: OrientationOptions, timing: HeadingTiming, onChange: () => void, log?: SampleLog | undefined);
    /**
     * Start, asking for permission where the browser requires it.
     * MUST be called synchronously inside a tap/click handler (iOS requirement).
     */
    start(): void;
    /** Start without asking (only works where no permission prompt is needed, e.g. Android). */
    startSilently(): boolean;
    stop(): void;
    destroy(): void;
    /** Make the current direction count as north (for a player facing a known north). */
    alignNorth(): boolean;
    /** Add a fixed correction in degrees (positive = turn the reported heading clockwise). */
    setOffset(degrees: number): void;
    resetAlignment(): void;
    private set;
    private listen;
    private attach;
    /** Android fallback when orientation events stay silent: the Generic Sensor API. */
    private startSensor;
    private accept;
    private tick;
    private teardown;
    private onVisibility;
}
