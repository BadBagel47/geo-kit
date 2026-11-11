/**
 * Browser wiring for GPS: permission check, first fix, continuous watch, staleness.
 * Based on the flows proven in the wacka and blaster projects.
 */
import { normalizeDegrees } from './math.js';
export const isFresh = (fix, maxAgeMs = 5000, now = Date.now()) => !!fix && now - fix.timestamp <= maxAgeMs;
function pageMayAskForLocation() {
    const doc = document;
    try {
        return (doc.permissionsPolicy ?? doc.featurePolicy)?.allowsFeature('geolocation') !== false;
    }
    catch {
        return true;
    }
}
export class LocationController {
    constructor(options, onChange, log) {
        this.onChange = onChange;
        this.log = log;
        this.state = { status: 'off', fix: null, permission: null };
        this.watchId = null;
        this.session = 0;
        this.attempted = false;
        this.timer = null;
        this.permissionStatus = null;
        this.onPermissionChange = () => {
            const state = this.permissionStatus?.state ?? null;
            this.set({ permission: state });
            if (state === 'denied' && this.attempted) {
                this.teardown();
                this.set({ status: 'denied' });
            }
            if (state === 'granted' && this.state.status === 'denied')
                this.start();
            if (state === 'granted' && this.state.status === 'requesting')
                this.set({ status: 'searching' });
        };
        this.weakAccuracy = options.weakAccuracy ?? 25;
        this.staleMs = options.staleMs ?? 20000;
        this.courseMinSpeed = options.courseMinSpeed ?? 0.7;
    }
    /**
     * Ask the Permissions API whether location is already allowed. Resolves "granted",
     * "denied", "prompt" or null (unknown). Never blocks longer than 1.2 s, because some
     * browsers leave the query pending forever.
     */
    async checkPermission() {
        if (typeof navigator === 'undefined' || !navigator.permissions?.query)
            return null;
        const timeout = new Promise(resolve => setTimeout(() => resolve(null), 1200));
        try {
            const result = await Promise.race([navigator.permissions.query({ name: 'geolocation' }), timeout]);
            if (!result)
                return null;
            if (!this.permissionStatus) {
                this.permissionStatus = result;
                result.addEventListener('change', this.onPermissionChange);
            }
            this.set({ permission: result.state });
            return result.state;
        }
        catch {
            return null;
        }
    }
    /** Start. Call it inside a tap handler the first time, so the browser shows its question. */
    start() {
        if (typeof window === 'undefined')
            return;
        if (!window.isSecureContext)
            return this.set({ status: 'insecure' });
        if (!navigator.geolocation)
            return this.set({ status: 'unsupported' });
        if (!pageMayAskForLocation())
            return this.set({ status: 'blocked' });
        this.teardown();
        const session = ++this.session;
        this.attempted = true;
        this.set({ status: this.state.fix ? this.state.status : 'requesting' });
        const startWatch = () => {
            if (session !== this.session || this.watchId !== null)
                return;
            try {
                this.watchId = navigator.geolocation.watchPosition(p => this.received(p, session), e => this.failed(e, session), { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
            }
            catch {
                this.set({ status: 'unsupported' });
            }
        };
        try {
            // Ask for one fix directly in the tap handler, then keep watching.
            navigator.geolocation.getCurrentPosition(p => { this.received(p, session); startWatch(); }, e => {
                this.failed(e, session);
                if (e.code !== 1)
                    startWatch(); // A slow first fix can still arrive through the watch.
            }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
        }
        catch {
            this.set({ status: 'unsupported' });
            return;
        }
        this.timer = setInterval(() => this.tick(session), 1000);
    }
    stop() {
        this.session++;
        this.attempted = false;
        this.teardown();
        this.state = { status: 'off', fix: null, permission: this.state.permission };
        this.onChange();
    }
    destroy() {
        this.stop();
        this.permissionStatus?.removeEventListener('change', this.onPermissionChange);
        this.permissionStatus = null;
    }
    set(patch) {
        this.state = { ...this.state, ...patch };
        this.onChange();
    }
    received(position, session) {
        if (session !== this.session)
            return;
        const c = position.coords;
        const speed = typeof c.speed === 'number' && Number.isFinite(c.speed) ? c.speed : null;
        const course = speed !== null && speed >= this.courseMinSpeed && typeof c.heading === 'number' && Number.isFinite(c.heading)
            ? normalizeDegrees(c.heading) : null;
        const fix = {
            lat: c.latitude, lon: c.longitude, accuracy: c.accuracy, timestamp: position.timestamp || Date.now(),
            speed, course, altitude: typeof c.altitude === 'number' && Number.isFinite(c.altitude) ? c.altitude : null,
        };
        // Coordinates are deliberately not logged (privacy of diagnostic reports).
        this.log?.({ kind: 'gps', accuracy: fix.accuracy, speed, course });
        this.set({ fix, status: fix.accuracy > this.weakAccuracy ? 'weak' : 'ok' });
    }
    failed(error, session) {
        if (session !== this.session)
            return;
        this.log?.({ kind: 'gps-error', code: error.code });
        if (error.code === 1) {
            this.teardown();
            this.set({ status: 'denied' });
            return;
        }
        // Keep the last fix through a short gap; its age makes it unusable later.
        if (!this.state.fix || Date.now() - this.state.fix.timestamp > this.staleMs)
            this.set({ status: this.state.fix ? 'stale' : 'searching' });
    }
    tick(session) {
        if (session !== this.session)
            return;
        const fix = this.state.fix;
        if (fix && Date.now() - fix.timestamp > this.staleMs && this.state.status !== 'stale')
            this.set({ status: 'stale' });
        if (!fix && this.state.status === 'requesting' && this.state.permission === 'granted')
            this.set({ status: 'searching' });
    }
    teardown() {
        if (this.watchId !== null)
            navigator.geolocation?.clearWatch(this.watchId);
        this.watchId = null;
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
    }
}
