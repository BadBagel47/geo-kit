/**
 * Noise-tolerant "am I at the target?" detection, based on rules field-tested in
 * blaster (enter at 15 m, stay unlocked to 35 m, 2 s grace for jumps) and
 * wacka (several fresh fixes within a short window).
 */
import { type LatLon } from './math.js';
import type { Fix } from './location.js';
export type ZoneOptions = {
    center: LatLon;
    /** Distance (m) to count as arrived. Default 15. */
    radius?: number;
    /** Distance (m) to count as having left again. Must be >= radius. Default radius + 20. */
    exitRadius?: number;
    /** Fixes inside the radius needed to enter. Default 3. */
    requiredFixes?: number;
    /** Those fixes must arrive within this window. Default 3000 ms. */
    windowMs?: number;
    /** Ignore fixes less accurate than this (m). Default 30. */
    maxAccuracy?: number;
    /** Ignore fixes older than this (ms). Default 5000. */
    maxAgeMs?: number;
    /** Must stay beyond exitRadius this long to leave. Default 2000 ms. */
    exitGraceMs?: number;
};
export type ZoneResult = {
    inside: boolean;
    /** True on the update where the zone was entered / left. */
    entered: boolean;
    exited: boolean;
    /** Distance from the latest usable fix, or null. */
    distance: number | null;
};
export declare class ZoneMonitor {
    private readonly o;
    private hits;
    private inside;
    private outsideSince;
    private lastTimestamp;
    constructor(options: ZoneOptions);
    get isInside(): boolean;
    reset(): void;
    /** Feed every new fix (repeated fixes are ignored). `now` defaults to Date.now(). */
    update(fix: Fix | null, now?: number): ZoneResult;
}
