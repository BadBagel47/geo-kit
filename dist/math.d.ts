/**
 * Angle, rotation and geodesy helpers. Pure functions, no browser access.
 *
 * Earth frame used everywhere: x = East, y = North, z = Up (W3C DeviceOrientation).
 * Device frame: x = right edge, y = top edge, z = out of the screen towards the viewer.
 */
export type Vec3 = readonly [number, number, number];
/** 3x3 rotation matrix, row-major. Column i is device axis i expressed in the earth frame. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];
export declare const DEG: number;
/** Wrap any angle to [0, 360). */
export declare const normalizeDegrees: (angle: number) => number;
/** Signed shortest difference `to - from`, in (-180, 180]. */
export declare function angleDelta(from: number, to: number): number;
/** Rotation matrix from W3C DeviceOrientation Euler angles (intrinsic Z-X'-Y''). */
export declare function matrixFromEuler(alpha: number, beta: number, gamma: number): Mat3;
/** Rotation matrix from a unit quaternion [x, y, z, w] (Generic Sensor API, device -> earth). */
export declare function matrixFromQuaternion(q: readonly number[]): Mat3 | null;
/** Express a device-frame vector in the earth frame. */
export declare function toEarth(m: Mat3, v: Vec3): Vec3;
/**
 * The "up" direction of the visible screen, in device coordinates.
 * `screenAngle` is screen.orientation.angle (0 portrait, 90 landscape with the top edge to the left).
 */
export declare function screenUpInDevice(screenAngle: number): Vec3;
/** The direction the back of the phone (rear camera) points, in device coordinates. */
export declare const BACK_OF_DEVICE: Vec3;
/** The direction the screen faces, in device coordinates. */
export declare const SCREEN_NORMAL: Vec3;
/** Compass heading (0 = north, 90 = east) of a vector's horizontal part, and its horizontal length. */
export declare function headingOf(v: Vec3): {
    heading: number;
    horizontal: number;
};
/** Elevation of a vector above the horizon in degrees (-90 down, +90 up). */
export declare function pitchOf(v: Vec3): number;
export type LatLon = {
    lat: number;
    lon: number;
};
/** Great-circle distance in metres. */
export declare function distanceMeters(a: LatLon, b: LatLon): number;
/** Initial compass bearing from `a` towards `b`, in degrees [0, 360). */
export declare function bearingDegrees(a: LatLon, b: LatLon): number;
/**
 * Where a target is relative to the way the phone points, in (-180, 180].
 * 0 = straight ahead, positive = to the right, negative = to the left.
 */
export declare const relativeBearing: (heading: number, targetBearing: number) => number;
/**
 * For rotating things on screen: returns `next` as an unwrapped angle close to `previous`,
 * so a CSS transition or animation turns the short way (359° → 1° becomes 359° → 361°)
 * instead of spinning almost a full turn. Pass the returned value as `previous` next time.
 */
export declare function continuousAngle(previous: number | null, next: number): number;
