/**
 * Turns raw orientation samples into a heading (and optional pitch) for one fixed pointing mode.
 * Pure and deterministic: time and screen angle are passed in, so it can be unit tested.
 *
 * Modes (chosen by the project, never switched automatically):
 * - "map": the heading of the screen's top edge. For a phone held flat or tilted, like a map.
 * - "aim": the direction the back of the phone points. For a phone held up to sight at something.
 *          With `pitch` enabled it also reports how far up or down the phone aims.
 */
import { BACK_OF_DEVICE, SCREEN_NORMAL, angleDelta, headingOf, matrixFromEuler, matrixFromQuaternion, normalizeDegrees, pitchOf, screenUpInDevice, toEarth, } from './math.js';
/** Map mode: the screen's top edge must keep this much horizontal length (about 75° tilt). */
const MAP_ENTER = 0.3, MAP_LEAVE = 0.22;
/** Aim mode without pitch: usable between these elevations, with 5° hysteresis. */
const AIM_MIN = -65, AIM_MAX = 65, AIM_HYST = 5;
/** Aim mode with pitch: the heading is undefined near straight up/down. */
const AIM_PITCH_LIMIT = 86;
/** iOS accuracy (degrees) above which we suggest calibration. */
export const POOR_COMPASS_ACCURACY = 25;
export class OrientationTracker {
    constructor(options) {
        this.smoothed = null;
        this.lastTime = null;
        this.heading = null;
        this.pitch = null;
        this.poseOk = true;
        this.hint = null;
        /** iOS: difference between true and relative alpha, learned from webkitCompassHeading. */
        this.iosOffset = null;
        this.iosOutlierSince = null;
        this.iosOffsetTime = null;
        /** Manual correction added to every heading (e.g. after "align to north"). */
        this.userOffset = 0;
        this.mode = options.mode;
        this.withPitch = options.mode === 'aim' && options.pitch === true;
        this.tau = Math.max(0, options.smoothingMs ?? 150);
    }
    reset() {
        this.smoothed = null;
        this.lastTime = null;
        this.heading = null;
        this.pitch = null;
        this.poseOk = true;
        this.hint = null;
        this.iosOffset = null;
        this.iosOutlierSince = null;
        this.iosOffsetTime = null;
    }
    setUserOffset(degrees) { this.userOffset = normalizeDegrees(degrees); this.smoothed = null; }
    getUserOffset() { return this.userOffset; }
    /** Heading without the manual correction, for "align to north". */
    rawHeading() {
        return this.heading === null ? null : normalizeDegrees(this.heading - this.userOffset);
    }
    /** Feed a DeviceOrientation event. Returns null when the sample carries no north reference. */
    pushEuler(sample, time, screenAngle = 0) {
        const { alpha, beta, gamma } = sample;
        if (![alpha, beta, gamma].every(v => typeof v === 'number' && Number.isFinite(v)))
            return null;
        let trueAlpha = null, accuracy = null, needsCalibration = false;
        const ch = sample.compassHeading;
        if (typeof ch === 'number' && Number.isFinite(ch)) {
            // iOS: alpha has an arbitrary zero. webkitCompassHeading is the north-referenced
            // heading equivalent of alpha (heading = 360 - alpha), so learn the offset between them.
            const acc = sample.compassAccuracy;
            accuracy = typeof acc === 'number' && Number.isFinite(acc) ? acc : null;
            needsCalibration = accuracy !== null && (accuracy < 0 || accuracy > POOR_COMPASS_ACCURACY);
            if (accuracy === null || accuracy >= 0)
                this.learnIosOffset(normalizeDegrees(-ch - alpha), time);
            if (this.iosOffset !== null)
                trueAlpha = alpha + this.iosOffset;
        }
        else if (sample.absolute) {
            trueAlpha = alpha;
        }
        if (trueAlpha === null)
            return null;
        const out = this.pushMatrix(matrixFromEuler(trueAlpha, beta, gamma), time, screenAngle);
        return { ...out, accuracy, needsCalibration };
    }
    /** Feed an AbsoluteOrientationSensor quaternion (already north-referenced). */
    pushQuaternion(quaternion, time, screenAngle = 0) {
        const m = quaternion ? matrixFromQuaternion(quaternion) : null;
        return m ? this.pushMatrix(m, time, screenAngle) : null;
    }
    /** Feed a device-to-earth rotation matrix. */
    pushMatrix(m, time, screenAngle = 0) {
        const axis = this.mode === 'map' ? screenUpInDevice(screenAngle) : BACK_OF_DEVICE;
        const v = toEarth(m, axis);
        const usable = this.mode === 'map' ? this.mapPose(m, v) : this.aimPose(v);
        const smoothed = this.smooth(v, time);
        if (this.withPitch)
            this.pitch = pitchOf(smoothed);
        if (usable) {
            const { heading } = headingOf(smoothed);
            this.heading = normalizeDegrees(heading + this.userOffset);
        }
        return { heading: this.heading, pitch: this.withPitch ? this.pitch : null, valid: usable, hint: this.hint, accuracy: null, needsCalibration: false };
    }
    mapPose(m, screenUp) {
        const { horizontal } = headingOf(screenUp);
        const facingUp = toEarth(m, SCREEN_NORMAL)[2] > 0;
        const limit = this.poseOk ? MAP_LEAVE : MAP_ENTER;
        this.poseOk = facingUp && horizontal >= limit;
        this.hint = this.poseOk ? null : 'hold-flatter';
        if (!this.poseOk)
            this.smoothed = null;
        return this.poseOk;
    }
    aimPose(back) {
        const pitch = pitchOf(back);
        if (this.withPitch) {
            // Pitch keeps working; only the compass direction is undefined straight up/down.
            this.hint = null;
            this.poseOk = Math.abs(pitch) < AIM_PITCH_LIMIT;
            return this.poseOk;
        }
        const slack = this.poseOk ? AIM_HYST : -AIM_HYST;
        const low = pitch < AIM_MIN - slack, high = pitch > AIM_MAX + slack;
        this.poseOk = !low && !high;
        this.hint = low ? 'hold-up' : high ? 'hold-lower' : null;
        if (!this.poseOk)
            this.smoothed = null;
        return this.poseOk;
    }
    /** Exponential smoothing of the pointing vector; avoids 359°/0° wrap problems. */
    smooth(v, time) {
        const dt = this.lastTime === null ? Infinity : Math.max(0, time - this.lastTime);
        this.lastTime = time;
        if (!this.smoothed || this.tau === 0 || !Number.isFinite(dt) || dt > 1000) {
            this.smoothed = v;
            return v;
        }
        const k = 1 - Math.exp(-dt / this.tau);
        const s = this.smoothed;
        const next = [s[0] + (v[0] - s[0]) * k, s[1] + (v[1] - s[1]) * k, s[2] + (v[2] - s[2]) * k];
        const n = Math.hypot(...next);
        this.smoothed = n > 1e-6 ? [next[0] / n, next[1] / n, next[2] / n] : v;
        return this.smoothed;
    }
    learnIosOffset(raw, time) {
        if (this.iosOffset === null) {
            this.iosOffset = raw;
            this.iosOffsetTime = time;
            return;
        }
        const d = angleDelta(this.iosOffset, raw);
        if (Math.abs(d) > 30) {
            // A large jump must persist for a second before it is trusted (ignores single bad readings).
            if (this.iosOutlierSince === null)
                this.iosOutlierSince = time;
            if (time - this.iosOutlierSince < 1000)
                return;
            this.iosOffset = raw;
            this.iosOutlierSince = null;
            this.iosOffsetTime = time;
            return;
        }
        this.iosOutlierSince = null;
        const dt = this.iosOffsetTime === null ? 0 : Math.max(0, time - this.iosOffsetTime);
        this.iosOffsetTime = time;
        this.iosOffset = normalizeDegrees(this.iosOffset + d * (1 - Math.exp(-dt / 400)));
    }
}
