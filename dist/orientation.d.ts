/**
 * Turns raw orientation samples into a heading (and optional pitch) for one fixed pointing mode.
 * Pure and deterministic: time and screen angle are passed in, so it can be unit tested.
 *
 * Modes (chosen by the project, never switched automatically):
 * - "map": the heading of the screen's top edge. For a phone held flat or tilted, like a map.
 * - "aim": the direction the back of the phone points. For a phone held up to sight at something.
 *          With `pitch` enabled it also reports how far up or down the phone aims.
 */
import { type Mat3 } from './math.js';
export type PointingMode = 'map' | 'aim';
export type PoseHint = 'hold-flatter' | 'hold-up' | 'hold-lower' | null;
export type OrientationOptions = {
    mode: PointingMode;
    /** Aim mode only: also report pitch and keep tracking when aiming at sky or ground. */
    pitch?: boolean;
    /** Smoothing time constant in ms. 0 disables smoothing. Default 150. */
    smoothingMs?: number;
};
export type EulerSample = {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    /** True when alpha is referenced to north (deviceorientationabsolute, or absolute=true). */
    absolute: boolean;
    /** iOS Safari: webkitCompassHeading / webkitCompassAccuracy. */
    compassHeading?: number | null;
    compassAccuracy?: number | null;
};
export type OrientationOutput = {
    /** Last valid heading in degrees, held while the pose is unusable. */
    heading: number | null;
    /** Aim mode with pitch: elevation in degrees (-90 ground ... +90 sky). Otherwise null. */
    pitch: number | null;
    /** True when this sample gave a usable heading for the chosen mode. */
    valid: boolean;
    /** Advice for the player when the pose does not suit the mode. */
    hint: PoseHint;
    /** iOS compass accuracy in degrees when available, otherwise null. */
    accuracy: number | null;
    /** True when the compass reports that it needs calibration (iOS only). */
    needsCalibration: boolean;
};
/** iOS accuracy (degrees) above which we suggest calibration. */
export declare const POOR_COMPASS_ACCURACY = 25;
export declare class OrientationTracker {
    private readonly mode;
    private readonly withPitch;
    private readonly tau;
    private smoothed;
    private lastTime;
    private heading;
    private pitch;
    private poseOk;
    private hint;
    /** iOS: difference between true and relative alpha, learned from webkitCompassHeading. */
    private iosOffset;
    private iosOutlierSince;
    private iosOffsetTime;
    /** Manual correction added to every heading (e.g. after "align to north"). */
    private userOffset;
    constructor(options: OrientationOptions);
    reset(): void;
    setUserOffset(degrees: number): void;
    getUserOffset(): number;
    /** Heading without the manual correction, for "align to north". */
    rawHeading(): number | null;
    /** Feed a DeviceOrientation event. Returns null when the sample carries no north reference. */
    pushEuler(sample: EulerSample, time: number, screenAngle?: number): OrientationOutput | null;
    /** Feed an AbsoluteOrientationSensor quaternion (already north-referenced). */
    pushQuaternion(quaternion: readonly number[] | null, time: number, screenAngle?: number): OrientationOutput | null;
    /** Feed a device-to-earth rotation matrix. */
    pushMatrix(m: Mat3, time: number, screenAngle?: number): OrientationOutput;
    private mapPose;
    private aimPose;
    /** Exponential smoothing of the pointing vector; avoids 359°/0° wrap problems. */
    private smooth;
    private learnIosOffset;
}
