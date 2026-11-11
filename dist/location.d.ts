export type LocationStatus = 'off' | 'unsupported' | 'insecure' | 'blocked' | 'requesting' | 'searching' | 'ok' | 'weak' | 'stale' | 'denied';
export type Fix = {
    lat: number;
    lon: number;
    /** 68% confidence radius in metres, as reported by the browser. */
    accuracy: number;
    /** Epoch ms of the reading. */
    timestamp: number;
    /** m/s, null when unknown. */
    speed: number | null;
    /** Direction of travel in degrees, only while moving; null otherwise. */
    course: number | null;
    altitude: number | null;
};
export type LocationState = {
    status: LocationStatus;
    /** Last fix. Kept through short signal gaps; check `status` or isFresh() before trusting it. */
    fix: Fix | null;
    /** Browser permission as last reported by the Permissions API, when available. */
    permission: PermissionState | null;
};
export type LocationOptions = {
    /** Accuracy (m) worse than this gives status "weak". Default 25. */
    weakAccuracy?: number;
    /** No new fix for this long gives status "stale". Default 20000 ms. */
    staleMs?: number;
    /** Minimum speed (m/s) before the travel direction is reported. Default 0.7. */
    courseMinSpeed?: number;
};
export declare const isFresh: (fix: Fix | null, maxAgeMs?: number, now?: number) => fix is Fix;
export declare class LocationController {
    private readonly onChange;
    private readonly log?;
    state: LocationState;
    private watchId;
    private session;
    private attempted;
    private timer;
    private permissionStatus;
    private readonly weakAccuracy;
    private readonly staleMs;
    private readonly courseMinSpeed;
    constructor(options: LocationOptions, onChange: () => void, log?: ((e: Record<string, unknown>) => void) | undefined);
    /**
     * Ask the Permissions API whether location is already allowed. Resolves "granted",
     * "denied", "prompt" or null (unknown). Never blocks longer than 1.2 s, because some
     * browsers leave the query pending forever.
     */
    checkPermission(): Promise<PermissionState | null>;
    /** Start. Call it inside a tap handler the first time, so the browser shows its question. */
    start(): void;
    stop(): void;
    destroy(): void;
    private set;
    private received;
    private failed;
    private tick;
    private teardown;
    private onPermissionChange;
}
