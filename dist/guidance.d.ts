/**
 * Decides what the player should see for a given state. Pure function, shared by the
 * built-in UI and by projects that draw their own screens ("headless" use).
 */
import type { GeoKitState } from './kit.js';
export type ScreenId = 'desktop' | 'intro' | 'compass-tap' | 'requesting' | 'waiting' | 'insecure' | 'unsupported' | 'location-denied' | 'location-blocked' | 'compass-denied' | 'compass-missing' | 'compass-no-north' | 'calibrate';
export type BarId = 'searching' | 'weak' | 'stale' | 'flatter' | 'hold-up' | 'hold-lower' | 'compass-stale' | 'calibrate' | 'course' | 'no-compass';
export type LampState = 'off' | 'busy' | 'ok' | 'warn' | 'error';
export type GuidanceOptions = {
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
