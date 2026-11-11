/**
 * GeoKit: one object a game creates to get location and phone direction.
 * Framework-free. React projects can use `useSyncExternalStore(kit.subscribe, kit.getState)`.
 */
import { HeadingController, type HeadingState, type HeadingTiming, needsMotionPermission } from './heading.js';
import { LocationController, type LocationOptions, type LocationState } from './location.js';
import type { PointingMode } from './orientation.js';

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

  constructor(private readonly options: GeoKitOptions = {}) {
    this.logEnabled = options.diagnostics !== false;
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
    this.changed();
  }

  /** Retry only the compass (call from a tap). */
  retryCompass(): void { this.started = true; this.head?.start(); }
  /** Retry only GPS (call from a tap). */
  retryLocation(): void { this.started = true; this.loc?.start(); }

  stop(): void { this.started = false; this.head?.stop(); this.loc?.stop(); this.changed(); }

  destroy(): void { this.head?.destroy(); this.loc?.destroy(); this.listeners.clear(); }

  /** Treat the direction the phone points now as north. Returns false if no heading yet. */
  alignNorth(): boolean { return this.head?.alignNorth() ?? false; }
  /** Fixed correction in degrees (e.g. magnetic declination or a known offset). */
  setHeadingOffset(degrees: number): void { this.head?.setOffset(degrees); }
  resetAlignment(): void { this.head?.resetAlignment(); }

  /** Diagnostic report for bug hunting. Contains sensor values and GPS accuracy, never coordinates. */
  exportReport(): Record<string, unknown> {
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
    this.changed();
  }

  private record(entry: Record<string, unknown>): void {
    this.log.push({ t: Math.round(performance.now()), ...entry });
    if (this.log.length > 800) this.log.splice(0, this.log.length - 800);
  }

  private compute(): GeoKitState {
    const location = this.loc ? this.loc.state : null;
    const compass = this.head ? this.head.state : null;
    let direction: DirectionState = { heading: null, pitch: null, source: null };
    if (compass && compass.heading !== null && ['ok', 'pose'].includes(compass.status)) {
      direction = { heading: compass.heading, pitch: compass.pitch, source: 'compass' };
    } else if (this.courseFallback && location?.fix?.course != null && (location.status === 'ok' || location.status === 'weak')) {
      direction = { heading: location.fix.course, pitch: null, source: 'course' };
    } else if (compass && compass.heading !== null && compass.status === 'stale') {
      direction = { heading: compass.heading, pitch: compass.pitch, source: 'compass' };
    }
    return {
      started: this.started, location, compass, direction, device: this.device,
      mode: this.options.heading || null, pitchEnabled: this.options.heading === 'aim' && this.options.pitch === true,
    };
  }

  private changed(): void {
    this.state = this.compute();
    // Batch bursts of sensor events into one notification per microtask.
    if (this.notifyQueued) return;
    this.notifyQueued = true;
    queueMicrotask(() => {
      this.notifyQueued = false;
      for (const listener of [...this.listeners]) listener();
    });
  }
}
