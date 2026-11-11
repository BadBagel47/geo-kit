/**
 * GeoKit: one object a game creates to get location and phone direction.
 * Framework-free. React projects can use `useSyncExternalStore(kit.subscribe, kit.getState)`.
 */
import { type HeadingState, type HeadingTiming } from './heading.js';
import { type LocationOptions, type LocationState } from './location.js';
import type { PointingMode } from './orientation.js';
export type GeoKitOptions = {
    /** Use GPS. Default true. */
    location?: boolean | LocationOptions;
    /** Use the phone's direction: "map" (flat, top edge) or "aim" (held up, back of phone). Default false. */
    heading?: false | PointingMode;
    /** Aim mode: also report up/down (pitch). Default false. */
    pitch?: boolean;
    /** Smoothing of the direction in ms. Default 150. */
    smoothingMs?: number;
    /** Use the GPS direction of travel when the compass is not available (map mode default true, aim false). */
    courseFallback?: boolean;
    /** Start automatically on load when location is already allowed. Default true. */
    autoStart?: boolean;
    headingTiming?: HeadingTiming;
    /** Keep a diagnostic log for exportReport(). Default true (no coordinates are logged). */
    diagnostics?: boolean;
};
export type DeviceInfo = {
    ios: boolean;
    android: boolean;
    mobile: boolean;
    secure: boolean;
    /** iOS: motion access needs a tap. */
    motionNeedsTap: boolean;
};
export type DirectionState = {
    /** Best available direction in degrees from north, or null. */
    heading: number | null;
    pitch: number | null;
    /** "compass" = phone direction, "course" = GPS direction of travel. */
    source: 'compass' | 'course' | null;
};
export type GeoKitState = {
    /** True once start() has been called (or auto start happened). */
    started: boolean;
    location: LocationState | null;
    compass: HeadingState | null;
    direction: DirectionState;
    device: DeviceInfo;
    mode: PointingMode | null;
    pitchEnabled: boolean;
};
export declare class GeoKit {
    private readonly options;
    private readonly loc;
    private readonly head;
    private readonly listeners;
    private readonly courseFallback;
    private readonly log;
    private readonly logEnabled;
    private readonly createdAt;
    private state;
    private readonly device;
    private started;
    private notifyQueued;
    constructor(options?: GeoKitOptions);
    /** Current state. Same object until something changes (safe for useSyncExternalStore). */
    getState: () => GeoKitState;
    subscribe: (listener: () => void) => (() => void);
    /**
     * Ask for everything the game needs and start. MUST be called directly in a tap/click
     * handler: iOS only shows its questions in response to a tap.
     */
    start(): void;
    /** Retry only the compass (call from a tap). */
    retryCompass(): void;
    /** Retry only GPS (call from a tap). */
    retryLocation(): void;
    stop(): void;
    destroy(): void;
    /** Treat the direction the phone points now as north. Returns false if no heading yet. */
    alignNorth(): boolean;
    /** Fixed correction in degrees (e.g. magnetic declination or a known offset). */
    setHeadingOffset(degrees: number): void;
    resetAlignment(): void;
    /** Diagnostic report for bug hunting. Contains sensor values and GPS accuracy, never coordinates. */
    exportReport(): Record<string, unknown>;
    /** Report as a downloadable JSON file (call from a tap). */
    downloadReport(fileName?: string): void;
    private tryAutoStart;
    private record;
    private compute;
    private changed;
}
