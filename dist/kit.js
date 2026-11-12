/**
 * GeoKit: one object a game creates to get location and phone direction.
 * Framework-free. React projects can use `useSyncExternalStore(kit.subscribe, kit.getState)`.
 */
import { HeadingController, needsMotionPermission } from './heading.js';
import { LocationController } from './location.js';
import { magneticDeclination } from './wmm.js';
import { distanceMeters, normalizeDegrees } from './math.js';
function detectDevice() {
    if (typeof navigator === 'undefined')
        return { ios: false, android: false, mobile: false, secure: false, motionNeedsTap: false };
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const uaMobile = navigator.userAgentData?.mobile;
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return { ios, android, mobile: uaMobile ?? (ios || android || coarse), secure: window.isSecureContext, motionNeedsTap: needsMotionPermission() };
}
export class GeoKit {
    constructor(options = {}) {
        this.options = options;
        this.listeners = new Set();
        this.log = [];
        this.createdAt = Date.now();
        this.device = detectDevice();
        this.started = false;
        this.notifyQueued = false;
        this.declination = null;
        this.declinationAt = null;
        /** Current state. Same object until something changes (safe for useSyncExternalStore). */
        this.getState = () => this.state;
        this.subscribe = (listener) => {
            this.listeners.add(listener);
            return () => { this.listeners.delete(listener); };
        };
        this.logEnabled = options.diagnostics !== false;
        const record = this.logEnabled ? (entry) => this.record(entry) : undefined;
        const onChange = () => this.changed();
        const locOptions = typeof options.location === 'object' ? options.location : {};
        this.loc = options.location === false ? null : new LocationController(locOptions, onChange, record);
        const mode = options.heading || null;
        this.head = mode ? new HeadingController({ mode, pitch: options.pitch, smoothingMs: options.smoothingMs }, options.headingTiming ?? {}, onChange, record) : null;
        this.courseFallback = options.courseFallback ?? mode === 'map';
        this.state = this.compute();
        if (options.autoStart !== false && this.loc)
            void this.tryAutoStart();
    }
    /**
     * Ask for everything the game needs and start. MUST be called directly in a tap/click
     * handler: iOS only shows its questions in response to a tap.
     */
    start() {
        this.started = true;
        this.head?.start(); // iOS motion question first, synchronously in the tap.
        this.loc?.start();
        this.changed();
    }
    /** Retry only the compass (call from a tap). */
    retryCompass() { this.started = true; this.head?.start(); }
    /** Retry only GPS (call from a tap). */
    retryLocation() { this.started = true; this.loc?.start(); }
    stop() { this.started = false; this.head?.stop(); this.loc?.stop(); this.changed(); }
    destroy() { this.head?.destroy(); this.loc?.destroy(); this.listeners.clear(); }
    /** Treat the direction the phone points now as north. Returns false if no heading yet. */
    alignNorth() {
        if (!this.head?.alignNorth())
            return false;
        // The player points at true north: compensate for the declination added later.
        if (this.useTrueNorth() && this.declination !== null)
            this.head.setOffset(this.head.getOffset() - this.declination);
        return true;
    }
    /** Fixed correction in degrees on top of the automatic true-north correction (e.g. a known device offset). */
    setHeadingOffset(degrees) { this.head?.setOffset(degrees); }
    resetAlignment() { this.head?.resetAlignment(); }
    /** Diagnostic report for bug hunting. Contains sensor values and GPS accuracy, never coordinates. */
    exportReport() {
        const s = this.state;
        return {
            library: 'geo-kit', reportVersion: 1, createdAt: new Date().toISOString(),
            sessionSeconds: Math.round((Date.now() - this.createdAt) / 1000),
            userAgent: typeof navigator === 'undefined' ? null : navigator.userAgent,
            options: { ...this.options, location: this.options.location === false ? false : true },
            device: s.device, mode: s.mode, pitchEnabled: s.pitchEnabled,
            location: s.location && { status: s.location.status, permission: s.location.permission, accuracy: s.location.fix?.accuracy ?? null },
            compass: s.compass, direction: s.direction,
            samples: [...this.log],
        };
    }
    /** Report as a downloadable JSON file (call from a tap). */
    downloadReport(fileName = 'geo-kit-report.json') {
        const url = URL.createObjectURL(new Blob([JSON.stringify(this.exportReport(), null, 2)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    async tryAutoStart() {
        const permission = await this.loc.checkPermission();
        if (permission !== 'granted' || this.started)
            return;
        this.started = true;
        this.loc.start();
        // Android needs no motion prompt, so the compass can start too. iOS waits for a tap.
        this.head?.startSilently();
        this.changed();
    }
    record(entry) {
        this.log.push({ t: Math.round(performance.now()), ...entry });
        if (this.log.length > 800)
            this.log.splice(0, this.log.length - 800);
    }
    compute() {
        const location = this.loc ? this.loc.state : null;
        const compass = this.head ? this.head.state : null;
        this.updateDeclination(location?.fix ?? null);
        const decl = this.useTrueNorth() ? this.declination : null;
        const fromCompass = (heading, pitch) => ({
            heading: decl === null ? heading : normalizeDegrees(Math.round((heading + decl) * 10) / 10),
            pitch, source: 'compass', north: decl === null ? 'magnetic' : 'true', declination: decl,
        });
        let direction = { heading: null, pitch: null, source: null, north: null, declination: null };
        if (compass && compass.heading !== null && ['ok', 'pose'].includes(compass.status)) {
            direction = fromCompass(compass.heading, compass.pitch);
        }
        else if (this.courseFallback && location?.fix?.course != null && (location.status === 'ok' || location.status === 'weak')) {
            direction = { heading: location.fix.course, pitch: null, source: 'course', north: 'true', declination: null };
        }
        else if (compass && compass.heading !== null && compass.status === 'stale') {
            direction = fromCompass(compass.heading, compass.pitch);
        }
        return {
            started: this.started, location, compass, direction, device: this.device,
            mode: this.options.heading || null, pitchEnabled: this.options.heading === 'aim' && this.options.pitch === true,
        };
    }
    useTrueNorth() { return this.options.trueNorth !== false; }
    /** Recompute the declination for the first fix and after moving more than 5 km. */
    updateDeclination(fix) {
        if (!this.useTrueNorth() || !fix)
            return;
        if (this.declinationAt && distanceMeters(this.declinationAt, fix) < 5000)
            return;
        try {
            const value = magneticDeclination(fix.lat, fix.lon);
            if (Number.isFinite(value)) {
                this.declination = Math.round(value * 10) / 10;
                this.declinationAt = { lat: fix.lat, lon: fix.lon };
            }
        }
        catch { /* keep magnetic headings */ }
    }
    changed() {
        this.state = this.compute();
        // Batch bursts of sensor events into one notification per microtask.
        if (this.notifyQueued)
            return;
        this.notifyQueued = true;
        queueMicrotask(() => {
            this.notifyQueued = false;
            for (const listener of [...this.listeners])
                listener();
        });
    }
}
