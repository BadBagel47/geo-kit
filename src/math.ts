/**
 * Angle, rotation and geodesy helpers. Pure functions, no browser access.
 *
 * Earth frame used everywhere: x = East, y = North, z = Up (W3C DeviceOrientation).
 * Device frame: x = right edge, y = top edge, z = out of the screen towards the viewer.
 */

export type Vec3 = readonly [number, number, number];
/** 3x3 rotation matrix, row-major. Column i is device axis i expressed in the earth frame. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

export const DEG = Math.PI / 180;

/** Wrap any angle to [0, 360). */
export const normalizeDegrees = (angle: number): number => ((angle % 360) + 360) % 360;

/** Signed shortest difference `to - from`, in (-180, 180]. */
export function angleDelta(from: number, to: number): number {
  const d = normalizeDegrees(to - from);
  return d > 180 ? d - 360 : d;
}

/** Rotation matrix from W3C DeviceOrientation Euler angles (intrinsic Z-X'-Y''). */
export function matrixFromEuler(alpha: number, beta: number, gamma: number): Mat3 {
  const a = alpha * DEG, b = beta * DEG, g = gamma * DEG;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  return [
    ca * cg - sa * sb * sg, -sa * cb, ca * sg + sa * sb * cg,
    sa * cg + ca * sb * sg, ca * cb, sa * sg - ca * sb * cg,
    -cb * sg, sb, cb * cg,
  ];
}

/** Rotation matrix from a unit quaternion [x, y, z, w] (Generic Sensor API, device -> earth). */
export function matrixFromQuaternion(q: readonly number[]): Mat3 | null {
  if (q.length !== 4 || !q.every(Number.isFinite)) return null;
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  if (n < 1e-8) return null;
  const [x, y, z, w] = q.map(v => v / n) as [number, number, number, number];
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

/** Express a device-frame vector in the earth frame. */
export function toEarth(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/**
 * The "up" direction of the visible screen, in device coordinates.
 * `screenAngle` is screen.orientation.angle (0 portrait, 90 landscape with the top edge to the left).
 */
export function screenUpInDevice(screenAngle: number): Vec3 {
  const s = screenAngle * DEG;
  return [Math.sin(s), Math.cos(s), 0];
}

/** The direction the back of the phone (rear camera) points, in device coordinates. */
export const BACK_OF_DEVICE: Vec3 = [0, 0, -1];
/** The direction the screen faces, in device coordinates. */
export const SCREEN_NORMAL: Vec3 = [0, 0, 1];

/** Compass heading (0 = north, 90 = east) of a vector's horizontal part, and its horizontal length. */
export function headingOf(v: Vec3): { heading: number; horizontal: number } {
  const horizontal = Math.hypot(v[0], v[1]);
  return { heading: normalizeDegrees(Math.atan2(v[0], v[1]) / DEG), horizontal };
}

/** Elevation of a vector above the horizon in degrees (-90 down, +90 up). */
export function pitchOf(v: Vec3): number {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return Math.asin(Math.max(-1, Math.min(1, v[2] / n))) / DEG;
}

export type LatLon = { lat: number; lon: number };
const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in metres. */
export function distanceMeters(a: LatLon, b: LatLon): number {
  const p1 = a.lat * DEG, p2 = b.lat * DEG, dp = (b.lat - a.lat) * DEG, dl = (b.lon - a.lon) * DEG;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial compass bearing from `a` towards `b`, in degrees [0, 360). */
export function bearingDegrees(a: LatLon, b: LatLon): number {
  const p1 = a.lat * DEG, p2 = b.lat * DEG, dl = (b.lon - a.lon) * DEG;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return normalizeDegrees(Math.atan2(y, x) / DEG);
}

/**
 * Where a target is relative to the way the phone points, in (-180, 180].
 * 0 = straight ahead, positive = to the right, negative = to the left.
 */
export const relativeBearing = (heading: number, targetBearing: number): number => angleDelta(heading, targetBearing);

/**
 * For rotating things on screen: returns `next` as an unwrapped angle close to `previous`,
 * so a CSS transition or animation turns the short way (359° → 1° becomes 359° → 361°)
 * instead of spinning almost a full turn. Pass the returned value as `previous` next time.
 */
export function continuousAngle(previous: number | null, next: number): number {
  return previous === null || !Number.isFinite(previous) ? next : previous + angleDelta(previous, next);
}
