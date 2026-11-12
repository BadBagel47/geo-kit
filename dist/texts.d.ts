/**
 * All player-facing text. Projects can override any string (and add a new language)
 * by passing `texts` to the UI or to getTexts().
 * Placeholders: {accuracy} (metres), {app} (project name).
 */
export type Texts = {
    app: string;
    locationLabel: string;
    compassLabel: string;
    lamp: {
        off: string;
        busy: string;
        ok: string;
        warn: string;
        error: string;
    };
    introTitle: string;
    /** What the game uses location/direction for. Projects should replace this. */
    introBody: string;
    introLocation: string;
    introCompassMap: string;
    introCompassAim: string;
    introCompassPitch: string;
    /** Optional privacy sentence. Empty by default: only state what the project guarantees. */
    introPrivacy: string;
    introButton: string;
    compassTapTitle: string;
    compassTapBody: string;
    compassTapButton: string;
    requestingTitle: string;
    requestingBody: string;
    waitingTitle: string;
    waitingBody: string;
    locationDeniedTitle: string;
    locationDeniedBody: string;
    locationBlockedTitle: string;
    locationBlockedBody: string;
    compassDeniedTitle: string;
    compassDeniedBody: string;
    compassMissingTitle: string;
    compassMissingBody: string;
    compassNoNorthTitle: string;
    compassNoNorthBody: string;
    insecureTitle: string;
    insecureBody: string;
    unsupportedTitle: string;
    unsupportedBody: string;
    desktopTitle: string;
    desktopBody: string;
    noGpsTitle: string;
    noGpsBody: string;
    noCompassDeviceTitle: string;
    noCompassDeviceBody: string;
    stepsLocationIos: string[];
    stepsLocationAndroid: string[];
    stepsLocationOther: string[];
    stepsCompassIos: string[];
    stepsCompassAndroid: string[];
    stepsCompassOther: string[];
    calibrateTitle: string;
    calibrateBody: string;
    alignTitle: string;
    alignBody: string;
    tryAgain: string;
    continueAnyway: string;
    continueWithoutCompass: string;
    done: string;
    calibrateButton: string;
    alignButton: string;
    close: string;
    barSearching: string;
    barWeak: string;
    barStale: string;
    barFlatter: string;
    barHoldUp: string;
    barHoldLower: string;
    barCompassStale: string;
    barCalibrate: string;
    barCourse: string;
    barNoCompass: string;
    barCoarse: string;
    barNoCompassDevice: string;
};
export declare const en: Texts;
export declare const sv: Texts;
export declare const languages: Record<string, Texts>;
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends string[] ? string[] : T[K] extends object ? Partial<T[K]> : T[K];
};
export type TextOverrides = DeepPartial<Texts>;
/** Texts for a language ("en" default), with project overrides applied. */
export declare function getTexts(lang?: string, overrides?: TextOverrides): Texts;
/** Replace {placeholders}. */
export declare const fill: (text: string, values: Record<string, string | number>) => string;
export {};
