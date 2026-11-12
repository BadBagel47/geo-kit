/**
 * Decides what the player should see for a given state. Pure function, shared by the
 * built-in UI and by projects that draw their own screens ("headless" use).
 */
import type { GeoKitState } from './kit.js';
export type ScreenId = 'desktop' | 'intro' | 'compass-tap' | 'requesting' | 'waiting' | 'insecure' | 'unsupported' | 'location-denied' | 'location-blocked' | 'compass-denied' | 'compass-missing' | 'compass-no-north' | 'calibrate' | 'no-gps' | 'no-compass-device';
export type BarId = 'searching' | 'weak' | 'stale' | 'flatter' | 'hold-up' | 'hold-lower' | 'compass-stale' | 'calibrate' | 'course' | 'no-compass' | 'coarse' | 'no-compass-device';
export type LampState = 'off' | 'busy' | 'ok' | 'warn' | 'error';
/**
 * How to treat devices without GPS or compass (computers, Wi-Fi-only tablets). A project choice:
 * - "warn" (default): explain the problem once, then let the player continue.
 * - "block": the game cannot be played on them; no way past the message.
 * - "allow": the game works without GPS (e.g. it can be played at home); only a small status note.
 */
export type NoGpsPolicy = 'warn' | 'block' | 'allow';
/** On a phone, coarse positions are normal for a while after start; only this long counts as "no GPS". */
export declare const NO_GPS_GRACE_MS = 30000;
export type GuidanceOptions = {
    /** Devices without GPS or compass. Default "warn". */
    noGps?: NoGpsPolicy;
    /** Current time (epoch ms), for tests. Default Date.now(). */
    now?: number;
    /** The game cannot be played without the compass. Default false (it continues without). */
    requireCompass?: boolean;
    /** Keep the "finding your position" screen until the first fix. Default true. */
    waitForFix?: boolean;
    /** Screens the player has dismissed ("continue anyway"). */
    dismissed?: ReadonlySet<ScreenId>;
    /** Screen opened on purpose by the game, e.g. "calibrate". Shown on top of everything else. */
    forced?: ScreenId | null;
};
export type Guidance = {
    /** Blocking screen to show, or null when the game can be played. */
    screen: ScreenId | null;
    /** Small non-blocking message, or null. */
    bar: BarId | null;
    /** True when the bar can be tapped to open calibration. */
    barAction: 'calibrate' | null;
    lamps: {
        location: LampState | null;
        compass: LampState | null;
    };
    /** Values for text placeholders. */
    values: {
        accuracy: number | null;
    };
};
export declare function getGuidance(state: GeoKitState, options?: GuidanceOptions): Guidance;
