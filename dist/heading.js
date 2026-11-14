/**
 * Browser wiring for the phone's direction: permission, event listeners, fallbacks,
 * restarts and timeouts. The maths lives in orientation.ts.
 */
import { OrientationTracker } from './orientation.js';
import { normalizeDegrees } from './math.js';
import { StreamComparison } from './diagnostics.js';
const initial = () => ({
    status: 'off', heading: null, pitch: null, hint: null, accuracy: null, needsCalibration: false,
    source: null, aligned: false, needsGesture: false,
});
export function needsMotionPermission() {
    return typeof window !== 'undefined' && typeof window.DeviceOrientationEvent?.requestPermission === 'function';
}
const screenAngle = () => {
    const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
    return Number.isFinite(angle) ? angle : 0;
};
export class HeadingController {
    constructor(options, timing, onChange, log) {
        this.onChange = onChange;
        this.log = log;
        this.state = initial();
        this.session = 0;
        this.running = false;
        this.granted = false;
        this.startedAt = 0;
        this.lastUsable = 0;
        this.everUsable = false;
        this.relativeSeen = false;
        this.restarts = 0;
        this.timer = null;
        this.detach = null;
        this.sensor = null;
        this.orientationSeenAt = 0;
        this.onVisibility = () => {
            if (typeof document === 'undefined' || document.hidden)
                return;
            // Coming back to the page: resubscribe so sensors restart, without asking again.
            if (this.running || ['stale', 'missing', 'no-north'].includes(this.state.status)) {
                if (this.granted)
                    this.listen(++this.session);
            }
        };
        this.tracker = new OrientationTracker(options);
        this.comparison = new StreamComparison(options.mode);
        this.staleMs = timing.staleMs ?? 3000;
        this.missingMs = timing.missingMs ?? 8000;
        if (typeof document !== 'undefined')
            document.addEventListener('visibilitychange', this.onVisibility);
        if (typeof window !== 'undefined')
            window.addEventListener('pageshow', this.onVisibility);
    }
    /**
     * Start, asking for permission where the browser requires it.
     * MUST be called synchronously inside a tap/click handler (iOS requirement).
     */
    start() {
        if (typeof window === 'undefined')
            return;
        if (!window.isSecureContext)
            return this.set({ status: 'insecure' });
        if (typeof window.DeviceOrientationEvent === 'undefined' && !window.AbsoluteOrientationSensor) {
            return this.set({ status: 'unsupported' });
        }
        const api = window.DeviceOrientationEvent;
        const session = ++this.session;
        if (api?.requestPermission && !this.granted) {
            this.set({ status: 'requesting', needsGesture: false });
            let request;
            try {
                request = api.requestPermission(true);
            }
            catch {
                return this.set({ status: 'denied' });
            }
            void request.then(result => {
                if (session !== this.session)
                    return;
                if (result === 'granted') {
                    this.granted = true;
                    this.listen(session);
                }
                else
                    this.set({ status: 'denied' });
            }, () => { if (session === this.session)
                this.set({ status: 'denied' }); });
            return;
        }
        this.granted = true;
        this.listen(session);
    }
    /** Start without asking (only works where no permission prompt is needed, e.g. Android). */
    startSilently() {
        if (typeof window === 'undefined' || !window.isSecureContext)
            return false;
        if (needsMotionPermission() && !this.granted) {
            this.set({ needsGesture: true });
            return false;
        }
        this.start();
        return true;
    }
    stop() {
        this.session++;
        this.teardown();
        this.running = false;
        this.tracker.reset();
        this.state = { ...initial(), aligned: this.state.aligned };
        this.onChange();
    }
    destroy() {
        this.stop();
        if (typeof document !== 'undefined')
            document.removeEventListener('visibilitychange', this.onVisibility);
        if (typeof window !== 'undefined')
            window.removeEventListener('pageshow', this.onVisibility);
    }
    /** Make the current direction count as north (for a player facing a known north). */
    alignNorth() {
        const raw = this.tracker.rawHeading();
        if (raw === null || this.state.status !== 'ok')
            return false;
        this.tracker.setUserOffset(-raw);
        this.set({ aligned: true, heading: 0 });
        return true;
    }
    /** Add a fixed correction in degrees (positive = turn the reported heading clockwise). */
    setOffset(degrees) {
        this.tracker.setUserOffset(degrees);
        this.set({ aligned: normalizeDegrees(degrees) !== 0 });
    }
    /** Values for the diagnostic report. Not used for the reported heading. */
    diagnostics() {
        const offset = this.tracker.getIosOffset();
        return { ...this.comparison.get(), iosOffset: offset === null ? null : Math.round(offset * 10) / 10 };
    }
    /** The manual correction currently applied, in degrees. */
    getOffset() { return this.tracker.getUserOffset(); }
    resetAlignment() {
        this.tracker.setUserOffset(0);
        this.set({ aligned: false });
    }
    set(patch) {
        this.state = { ...this.state, ...patch };
        this.onChange();
    }
    listen(session) {
        if (session !== this.session)
            return;
        this.teardown();
        this.running = true;
        this.startedAt = performance.now();
        this.lastUsable = 0;
        this.everUsable = false;
        this.relativeSeen = false;
        this.restarts = 0;
        this.comparison.reset();
        this.set({ status: 'waiting', needsGesture: false, source: null });
        this.attach(session);
        this.timer = setInterval(() => this.tick(session), 1000);
    }
    attach(session) {
        const receive = (raw) => {
            if (session !== this.session || document.hidden)
                return;
            const event = raw;
            const absolute = raw.type === 'deviceorientationabsolute' || event.absolute === true;
            const hasIos = typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading);
            // Some browsers emit empty events; they never replace real data.
            if (event.alpha === null && !hasIos)
                return;
            if (!absolute && !hasIos) {
                // The relative stream is recorded for diagnostics only and never reaches the tracker.
                this.relativeSeen = true;
                if (this.log)
                    this.comparison.pushRelative(event.alpha, event.beta, event.gamma, performance.now(), screenAngle());
                return;
            }
            this.orientationSeenAt = performance.now();
            if (this.log && !hasIos)
                this.comparison.pushAbsolute(event.alpha, event.beta, event.gamma, performance.now(), screenAngle());
            const out = this.tracker.pushEuler({
                alpha: event.alpha, beta: event.beta, gamma: event.gamma, absolute,
                compassHeading: hasIos ? event.webkitCompassHeading : null, compassAccuracy: event.webkitCompassAccuracy ?? null,
            }, performance.now(), screenAngle());
            this.log?.({ kind: 'orientation', type: raw.type, alpha: event.alpha, beta: event.beta, gamma: event.gamma, absolute, ios: hasIos ? event.webkitCompassHeading : undefined, iosAccuracy: event.webkitCompassAccuracy, heading: out?.heading, pitch: out?.pitch, valid: out?.valid, relOffset: this.comparison.get().offset ?? undefined });
            if (out)
                this.accept(out, 'orientation');
        };
        window.addEventListener('deviceorientationabsolute', receive);
        window.addEventListener('deviceorientation', receive);
        this.detach = () => {
            window.removeEventListener('deviceorientationabsolute', receive);
            window.removeEventListener('deviceorientation', receive);
        };
    }
    /** Android fallback when orientation events stay silent: the Generic Sensor API. */
    startSensor(session) {
        const Ctor = window.AbsoluteOrientationSensor;
        if (!Ctor || this.sensor)
            return;
        try {
            const sensor = new Ctor({ frequency: 30, referenceFrame: 'device' });
            sensor.addEventListener('reading', () => {
                if (session !== this.session || document.hidden)
                    return;
                // Prefer orientation events while they flow; the sensor only fills gaps.
                if (performance.now() - this.orientationSeenAt < 500)
                    return;
                const out = this.tracker.pushQuaternion(sensor.quaternion, performance.now(), screenAngle());
                this.log?.({ kind: 'sensor', quaternion: sensor.quaternion, heading: out?.heading, valid: out?.valid });
                if (out)
                    this.accept(out, 'sensor');
            });
            sensor.addEventListener('error', () => { });
            sensor.start();
            this.sensor = sensor;
        }
        catch { /* Not allowed or not available. */ }
    }
    accept(out, source) {
        const now = performance.now();
        this.lastUsable = now;
        this.everUsable = true;
        const status = out.valid ? 'ok' : 'pose';
        const s = this.state;
        const heading = out.heading === null ? null : normalizeDegrees(Math.round(out.heading * 10) / 10);
        const pitch = out.pitch === null ? null : Math.round(out.pitch * 10) / 10;
        if (s.status === status && s.heading === heading && s.pitch === pitch && s.hint === out.hint && s.source === source
            && s.accuracy === out.accuracy && s.needsCalibration === out.needsCalibration)
            return;
        this.set({ status, heading, pitch, hint: out.hint, accuracy: out.accuracy, needsCalibration: out.needsCalibration, source });
    }
    tick(session) {
        if (session !== this.session || !this.running || document.hidden)
            return;
        const now = performance.now();
        if (this.everUsable) {
            if (now - this.lastUsable > this.staleMs && this.state.status !== 'stale')
                this.set({ status: 'stale' });
            return;
        }
        const silent = now - this.startedAt;
        if (silent >= 2000)
            this.startSensor(session);
        if (silent >= this.missingMs) {
            this.teardown();
            this.running = false;
            this.set({ status: this.relativeSeen ? 'no-north' : 'missing' });
            return;
        }
        // Some browsers only start delivering after a fresh subscription. Never re-asks permission.
        if (this.restarts < 6) {
            this.restarts++;
            this.detach?.();
            this.attach(session);
        }
    }
    teardown() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
        this.detach?.();
        this.detach = null;
        try {
            this.sensor?.stop();
        }
        catch { /* ignore */ }
        this.sensor = null;
    }
}
