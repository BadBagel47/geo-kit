/**
 * GeoKit: one object a game creates to get location and phone direction.
 * Framework-free. React projects can use `useSyncExternalStore(kit.subscribe, kit.getState)`.
 */
import { HeadingController, type HeadingDiagnostics, type HeadingState, type HeadingTiming, needsMotionPermission } from './heading.js';
import { SessionTrace, type TraceValue } from './diagnostics.js';
import { LocationController, type LocationOptions, type LocationState } from './location.js';
import type { PointingMode } from './orientation.js';
import { magneticDeclination } from './wmm.js';
import { distanceMeters, normalizeDegrees } from './math.js';

export type GeoKitOptions = {
  /** Use GPS. Default true. */
  location?: boolean | LocationOptions;
  /** Use the phone's direction: "map" (flat, top edge) or "aim" (held up, back of phone). Default false. */
  heading?: false | PointingMode;
  /** Aim mode: also report up/down (pitch). Default false. */
  pitch?: boolean;
  /** Smoothing of the direction in ms. Default 150. */
  smoothingMs?: number;
  /** Use the GPS direction of travel when the compass is not available (map mode default true, aim false). */
  courseFallback?: boolean;
  /**
   * Report compass headings relative to true north (like maps and bearingDegrees) instead of
   * magnetic north. Uses the World Magnetic Model at the player's GPS position. Default true.
   */
  trueNorth?: boolean;
  /** Start automatically on load when location is already allowed. Default true. */
  autoStart?: boolean;
  headingTiming?: HeadingTiming;
  /** Keep a diagnostic log for exportReport(). Default true (no coordinates are logged). */
  diagnostics?: boolean;
};

export type DeviceInfo = {
  ios: boolean;
  android: boolean;
  mobile: boolean;
  secure: boolean;
  /** iOS: motion access needs a tap. */
  motionNeedsTap: boolean;
};

export type DirectionState = {
  /** Best available direction in degrees from north, or null. */
  heading: number | null;
  pitch: number | null;
  /** "compass" = phone direction, "course" = GPS direction of travel. */
  source: 'compass' | 'course' | null;
  /**
   * Which north `heading` refers to. GPS course is always true north. A compass heading is
   * "magnetic" until the first position is known (or when trueNorth is off).
   */
  north: 'true' | 'magnetic' | null;
  /** Magnetic declination applied to the compass heading, in degrees (east positive), or null. */
  declination: number | null;
};

export type GeoKitState = {
  /** True once start() has been called (or auto start happened). */
  started: boolean;
  location: LocationState | null;
  compass: HeadingState | null;
  direction: DirectionState;
  device: DeviceInfo;
  mode: PointingMode | null;
  pitchEnabled: boolean;
};

function detectDevice(): DeviceInfo {
  if (typeof navigator === 'undefined') return { ios: false, android: false, mobile: false, secure: false, motionNeedsTap: false };
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const uaMobile = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return { ios, android, mobile: uaMobile ?? (ios || android || coarse), secure: window.isSecureContext, motionNeedsTap: needsMotionPermission() };
}

export class GeoKit {
  private readonly loc: LocationController | null;
  private readonly head: HeadingController | null;
  private readonly listeners = new Set<() => void>();
  private readonly courseFallback: boolean;
  private readonly log: Record<string, unknown>[] = [];
  private readonly logEnabled: boolean;
  private readonly createdAt = Date.now();
  private state: GeoKitState;
  private readonly device: DeviceInfo = detectDevice();
  private started = false;
  private notifyQueued = false;
  private declination: number | null = null;
  private declinationAt: { lat: number; lon: number } | null = null;
  private readonly trace: SessionTrace | null;
  private traceTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: GeoKitOptions = {}) {
    this.logEnabled = options.diagnostics !== false;
    // The timer fires once a second; the lower limit leaves room for timer jitter.
    this.trace = this.logEnabled ? new SessionTrace(900) : null;
    const record = this.logEnabled ? (entry: Record<string, unknown>) => this.record(entry) : undefined;
    const onChange = () => this.changed();
    const locOptions = typeof options.location === 'object' ? options.location : {};
    this.loc = options.location === false ? null : new LocationController(locOptions, onChange, record);
    const mode = options.heading || null;
    this.head = mode ? new HeadingController({ mode, pitch: options.pitch, smoothingMs: options.smoothingMs }, options.headingTiming ?? {}, onChange, record) : null;
    this.courseFallback = options.courseFallback ?? mode === 'map';
    this.state = this.compute();
    if (options.autoStart !== false && this.loc) void this.tryAutoStart();
  }

  /** Current state. Same object until something changes (safe for useSyncExternalStore). */
  getState = (): GeoKitState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /**
   * Ask for everything the game needs and start. MUST be called directly in a tap/click
   * handler: iOS only shows its questions in response to a tap.
   */
  start(): void {
    this.started = true;
    this.head?.start();   // iOS motion question first, synchronously in the tap.
    this.loc?.start();
    this.startTrace();
    this.changed();
  }

  /** Retry only the compass (call from a tap). */
  retryCompass(): void { this.started = true; this.head?.start(); this.startTrace(); }
  /** Retry only GPS (call from a tap). */
  retryLocation(): void { this.started = true; this.loc?.start(); this.startTrace(); }

  stop(): void { this.started = false; this.head?.stop(); this.loc?.stop(); this.stopTrace(); this.changed(); }

  destroy(): void { this.stopTrace(); this.head?.destroy(); this.loc?.destroy(); this.listeners.clear(); }

  /**
   * Live diagnostic values (difference between the browser's two orientation streams, iOS
   * offset). For test pages and bug hunting; never needed for game logic.
   */
  getDiagnostics(): HeadingDiagnostics | null { return this.head ? this.head.diagnostics() : null; }

  /** Treat the direction the phone points now as north. Returns false if no heading yet. */
  alignNorth(): boolean {
    if (!this.head?.alignNorth()) return false;
    // The player points at true north: compensate for the declination added later.
    if (this.useTrueNorth() && this.declination !== null) this.head.setOffset(this.head.getOffset() - this.declination);
    return true;
  }
  /** Fixed correction in degrees on top of the automatic true-north correction (e.g. a known device offset). */
  setHeadingOffset(degrees: number): void { this.head?.setOffset(degrees); }
  resetAlignment(): void { this.head?.resetAlignment(); }

  /** Diagnostic report for bug hunting. Contains sensor values and GPS accuracy, never coordinates. */
  exportReport(): Record<string, unknown> {
    const s = this.state;
    return {
      library: 'geo-kit', reportVersion: 2, createdAt: new Date().toISOString(),
      sessionSeconds: Math.round((Date.now() - this.createdAt) / 1000),
      // The same clock as `t` in trace, transitions and samples (ms since the page loaded).
      now: typeof performance === 'undefined' ? null : Math.round(performance.now()),
      userAgent: typeof navigator === 'undefined' ? null : navigator.userAgent,
      options: { ...this.options, location: this.options.location === false ? false : true },
      device: s.device, mode: s.mode, pitchEnabled: s.pitchEnabled,
      location: s.location && { status: s.location.status, permission: s.location.permission, accuracy: s.location.fix?.accuracy ?? null },
      compass: s.compass, direction: s.direction,
      diagnostics: this.getDiagnostics(),
      // About one row per second for the last ten minutes, and every state change.
      ...(this.trace ? this.trace.export() : {}),
      // Every sensor reading for the last seconds.
      samples: [...this.log],
    };
  }

  /** Report as a downloadable JSON file (call from a tap). */
  downloadReport(fileName = 'geo-kit-report.json'): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.exportReport(), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async tryAutoStart(): Promise<void> {
    const permission = await this.loc!.checkPermission();
    if (permission !== 'granted' || this.started) return;
    this.started = true;
    this.loc!.start();
    // Android needs no motion prompt, so the compass can start too. iOS waits for a tap.
    this.head?.startSilently();
    this.startTrace();
    this.changed();
  }

  private startTrace(): void {
    if (!this.trace || this.traceTimer !== null) return;
    this.sampleTrace();
    this.traceTimer = setInterval(() => this.sampleTrace(), 1000);
  }

  private stopTrace(): void {
    if (this.traceTimer !== null) clearInterval(this.traceTimer);
    this.traceTimer = null;
  }

  /** One row of the sparse session trace. No coordinates. */
  private sampleTrace(): void {
    this.trace?.sample(performance.now(), (): Record<string, TraceValue> => {
      const { location, compass, direction } = this.state;
      const diag = this.getDiagnostics();
      return {
        hidden: typeof document !== 'undefined' && document.hidden,
        location: location?.status ?? null,
        gpsAccuracy: location?.fix ? Math.round(location.fix.accuracy) : null,
        compass: compass?.status ?? null,
        hint: compass?.hint ?? null,
        source: direction.source,
        heading: direction.heading,
        magnetic: compass?.heading ?? null,
        pitch: direction.pitch,
        compassAccuracy: compass?.accuracy ?? null,
        relOffset: diag?.offset ?? null,
        relPitch: diag?.pitchDifference ?? null,
        iosOffset: diag?.iosOffset ?? null,
      };
    });
  }

  private record(entry: Record<string, unknown>): void {
    this.log.push({ t: Math.round(performance.now()), ...entry });
    if (this.log.length > 800) this.log.splice(0, this.log.length - 800);
  }

  private compute(): GeoKitState {
    const location = this.loc ? this.loc.state : null;
    const compass = this.head ? this.head.state : null;
    this.updateDeclination(location?.fix ?? null);
    const decl = this.useTrueNorth() ? this.declination : null;
    const fromCompass = (heading: number, pitch: number | null): DirectionState => ({
      heading: decl === null ? heading : Math.round(normalizeDegrees(heading + decl) * 10) / 10 % 360,
      pitch, source: 'compass', north: decl === null ? 'magnetic' : 'true', declination: decl,
    });
    let direction: DirectionState = { heading: null, pitch: null, source: null, north: null, declination: null };
    if (compass && compass.heading !== null && ['ok', 'pose'].includes(compass.status)) {
      direction = fromCompass(compass.heading, compass.pitch);
    } else if (this.courseFallback && location?.fix?.course != null && (location.status === 'ok' || location.status === 'weak')) {
      direction = { heading: location.fix.course, pitch: null, source: 'course', north: 'true', declination: null };
    } else if (compass && compass.heading !== null && compass.status === 'stale') {
      direction = fromCompass(compass.heading, compass.pitch);
    }
    return {
      started: this.started, location, compass, direction, device: this.device,
      mode: this.options.heading || null, pitchEnabled: this.options.heading === 'aim' && this.options.pitch === true,
    };
  }

  /** Feed the session trace: heading changes and state transitions. */
  private noteChange(before: GeoKitState, after: GeoKitState): void {
    const trace = this.trace!;
    const now = typeof performance === 'undefined' ? 0 : performance.now();
    trace.noteHeading(after.compass && ['ok', 'pose'].includes(after.compass.status) ? after.compass.heading : null);
    trace.transition(now, 'started', before.started, after.started);
    trace.transition(now, 'location', before.location?.status ?? null, after.location?.status ?? null);
    trace.transition(now, 'compass', before.compass?.status ?? null, after.compass?.status ?? null);
    trace.transition(now, 'hint', before.compass?.hint ?? null, after.compass?.hint ?? null);
    trace.transition(now, 'sensor', before.compass?.source ?? null, after.compass?.source ?? null);
    trace.transition(now, 'calibration', before.compass?.needsCalibration ?? null, after.compass?.needsCalibration ?? null);
    trace.transition(now, 'aligned', before.compass?.aligned ?? null, after.compass?.aligned ?? null);
    trace.transition(now, 'direction', before.direction.source, after.direction.source);
    trace.transition(now, 'north', before.direction.north, after.direction.north);
  }

  private useTrueNorth(): boolean { return this.options.trueNorth !== false; }

  /** Recompute the declination for the first fix and after moving more than 5 km. */
  private updateDeclination(fix: { lat: number; lon: number } | null): void {
    if (!this.useTrueNorth() || !fix) return;
    if (this.declinationAt && distanceMeters(this.declinationAt, fix) < 5000) return;
    try {
      const value = magneticDeclination(fix.lat, fix.lon);
      if (Number.isFinite(value)) { this.declination = Math.round(value * 10) / 10; this.declinationAt = { lat: fix.lat, lon: fix.lon }; }
    } catch { /* keep magnetic headings */ }
  }

  private changed(): void {
    const before = this.state;
    this.state = this.compute();
    if (this.trace) this.noteChange(before, this.state);
    // Batch bursts of sensor events into one notification per microtask.
    if (this.notifyQueued) return;
    this.notifyQueued = true;
    queueMicrotask(() => {
      this.notifyQueued = false;
      for (const listener of [...this.listeners]) listener();
    });
  }
}
