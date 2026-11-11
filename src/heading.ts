/**
 * Browser wiring for the phone's direction: permission, event listeners, fallbacks,
 * restarts and timeouts. The maths lives in orientation.ts.
 */
import { OrientationTracker, type OrientationOptions, type OrientationOutput, type PoseHint } from './orientation.js';
import { normalizeDegrees } from './math.js';

export type HeadingStatus =
  | 'off' | 'unsupported' | 'insecure' | 'requesting' | 'denied'
  | 'waiting' | 'ok' | 'pose' | 'stale' | 'missing' | 'no-north';

export type HeadingState = {
  status: HeadingStatus;
  /** Degrees from north (0..360). Held during short gaps and bad poses; null when unknown. */
  heading: number | null;
  /** Aim mode with pitch only: degrees above (+) or below (-) the horizon. */
  pitch: number | null;
  hint: PoseHint;
  /** iOS compass accuracy in degrees, when reported. */
  accuracy: number | null;
  needsCalibration: boolean;
  /** Which browser source currently delivers data. */
  source: 'orientation' | 'sensor' | null;
  /** True when a manual north alignment is active. */
  aligned: boolean;
  /** True when the browser needs a tap before it can (re)start, e.g. iOS after a reload. */
  needsGesture: boolean;
};

export type HeadingTiming = {
  /** A running stream older than this is "stale". Default 3000 ms. */
  staleMs?: number;
  /** No usable data this long after start means "missing". Default 8000 ms. */
  missingMs?: number;
};

export type SampleLog = (entry: Record<string, unknown>) => void;

type PermissionApi = typeof DeviceOrientationEvent & { requestPermission?: (absolute?: boolean) => Promise<string> };
type AbsoluteSensor = EventTarget & { quaternion: readonly number[] | null; start(): void; stop(): void };
type SensorCtor = new (options: { frequency: number; referenceFrame: 'device' | 'screen' }) => AbsoluteSensor;

const initial = (): HeadingState => ({
  status: 'off', heading: null, pitch: null, hint: null, accuracy: null, needsCalibration: false,
  source: null, aligned: false, needsGesture: false,
});

export function needsMotionPermission(): boolean {
  return typeof window !== 'undefined' && typeof (window.DeviceOrientationEvent as PermissionApi | undefined)?.requestPermission === 'function';
}

const screenAngle = (): number => {
  const angle = window.screen?.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0;
  return Number.isFinite(angle) ? angle : 0;
};

export class HeadingController {
  state: HeadingState = initial();
  private tracker: OrientationTracker;
  private readonly staleMs: number;
  private readonly missingMs: number;
  private session = 0;
  private running = false;
  private granted = false;
  private startedAt = 0;
  private lastUsable = 0;
  private everUsable = false;
  private relativeSeen = false;
  private restarts = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private detach: (() => void) | null = null;
  private sensor: AbsoluteSensor | null = null;
  private orientationSeenAt = 0;

  constructor(options: OrientationOptions, timing: HeadingTiming, private readonly onChange: () => void, private readonly log?: SampleLog) {
    this.tracker = new OrientationTracker(options);
    this.staleMs = timing.staleMs ?? 3000;
    this.missingMs = timing.missingMs ?? 8000;
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
    if (typeof window !== 'undefined') window.addEventListener('pageshow', this.onVisibility);
  }

  /**
   * Start, asking for permission where the browser requires it.
   * MUST be called synchronously inside a tap/click handler (iOS requirement).
   */
  start(): void {
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) return this.set({ status: 'insecure' });
    if (typeof window.DeviceOrientationEvent === 'undefined' && !(window as Window & { AbsoluteOrientationSensor?: SensorCtor }).AbsoluteOrientationSensor) {
      return this.set({ status: 'unsupported' });
    }
    const api = window.DeviceOrientationEvent as PermissionApi | undefined;
    const session = ++this.session;
    if (api?.requestPermission && !this.granted) {
      this.set({ status: 'requesting', needsGesture: false });
      let request: Promise<string>;
      try { request = api.requestPermission(true); } catch { return this.set({ status: 'denied' }); }
      void request.then(result => {
        if (session !== this.session) return;
        if (result === 'granted') { this.granted = true; this.listen(session); }
        else this.set({ status: 'denied' });
      }, () => { if (session === this.session) this.set({ status: 'denied' }); });
      return;
    }
    this.granted = true;
    this.listen(session);
  }

  /** Start without asking (only works where no permission prompt is needed, e.g. Android). */
  startSilently(): boolean {
    if (typeof window === 'undefined' || !window.isSecureContext) return false;
    if (needsMotionPermission() && !this.granted) { this.set({ needsGesture: true }); return false; }
    this.start();
    return true;
  }

  stop(): void {
    this.session++;
    this.teardown();
    this.running = false;
    this.tracker.reset();
    this.state = { ...initial(), aligned: this.state.aligned };
    this.onChange();
  }

  destroy(): void {
    this.stop();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    if (typeof window !== 'undefined') window.removeEventListener('pageshow', this.onVisibility);
  }

  /** Make the current direction count as north (for a player facing a known north). */
  alignNorth(): boolean {
    const raw = this.tracker.rawHeading();
    if (raw === null || this.state.status !== 'ok') return false;
    this.tracker.setUserOffset(-raw);
    this.set({ aligned: true, heading: 0 });
    return true;
  }

  /** Add a fixed correction in degrees (positive = turn the reported heading clockwise). */
  setOffset(degrees: number): void {
    this.tracker.setUserOffset(degrees);
    this.set({ aligned: normalizeDegrees(degrees) !== 0 });
  }

  resetAlignment(): void {
    this.tracker.setUserOffset(0);
    this.set({ aligned: false });
  }

  private set(patch: Partial<HeadingState>): void {
    this.state = { ...this.state, ...patch };
    this.onChange();
  }

  private listen(session: number): void {
    if (session !== this.session) return;
    this.teardown();
    this.running = true;
    this.startedAt = performance.now();
    this.lastUsable = 0; this.everUsable = false; this.relativeSeen = false; this.restarts = 0;
    this.set({ status: 'waiting', needsGesture: false, source: null });
    this.attach(session);
    this.timer = setInterval(() => this.tick(session), 1000);
  }

  private attach(session: number): void {
    const receive = (raw: Event) => {
      if (session !== this.session || document.hidden) return;
      const event = raw as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
      const absolute = raw.type === 'deviceorientationabsolute' || event.absolute === true;
      const hasIos = typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading);
      // Some browsers emit empty events; they never replace real data.
      if (event.alpha === null && !hasIos) return;
      if (!absolute && !hasIos) { this.relativeSeen = true; return; }
      this.orientationSeenAt = performance.now();
      const out = this.tracker.pushEuler({
        alpha: event.alpha, beta: event.beta, gamma: event.gamma, absolute,
        compassHeading: hasIos ? event.webkitCompassHeading : null, compassAccuracy: event.webkitCompassAccuracy ?? null,
      }, performance.now(), screenAngle());
      this.log?.({ kind: 'orientation', type: raw.type, alpha: event.alpha, beta: event.beta, gamma: event.gamma, absolute, ios: hasIos ? event.webkitCompassHeading : undefined, iosAccuracy: event.webkitCompassAccuracy, heading: out?.heading, pitch: out?.pitch, valid: out?.valid });
      if (out) this.accept(out, 'orientation');
    };
    window.addEventListener('deviceorientationabsolute', receive);
    window.addEventListener('deviceorientation', receive);
    this.detach = () => {
      window.removeEventListener('deviceorientationabsolute', receive);
      window.removeEventListener('deviceorientation', receive);
    };
  }

  /** Android fallback when orientation events stay silent: the Generic Sensor API. */
  private startSensor(session: number): void {
    const Ctor = (window as Window & { AbsoluteOrientationSensor?: SensorCtor }).AbsoluteOrientationSensor;
    if (!Ctor || this.sensor) return;
    try {
      const sensor = new Ctor({ frequency: 30, referenceFrame: 'device' });
      sensor.addEventListener('reading', () => {
        if (session !== this.session || document.hidden) return;
        // Prefer orientation events while they flow; the sensor only fills gaps.
        if (performance.now() - this.orientationSeenAt < 500) return;
        const out = this.tracker.pushQuaternion(sensor.quaternion, performance.now(), screenAngle());
        this.log?.({ kind: 'sensor', quaternion: sensor.quaternion, heading: out?.heading, valid: out?.valid });
        if (out) this.accept(out, 'sensor');
      });
      sensor.addEventListener('error', () => { /* Reported through "missing" if nothing else works. */ });
      sensor.start();
      this.sensor = sensor;
    } catch { /* Not allowed or not available. */ }
  }

  private accept(out: OrientationOutput, source: 'orientation' | 'sensor'): void {
    const now = performance.now();
    this.lastUsable = now;
    this.everUsable = true;
    const status: HeadingStatus = out.valid ? 'ok' : 'pose';
    const s = this.state;
    const heading = out.heading === null ? null : Math.round(out.heading * 10) / 10;
    const pitch = out.pitch === null ? null : Math.round(out.pitch * 10) / 10;
    if (s.status === status && s.heading === heading && s.pitch === pitch && s.hint === out.hint && s.source === source
      && s.accuracy === out.accuracy && s.needsCalibration === out.needsCalibration) return;
    this.set({ status, heading, pitch, hint: out.hint, accuracy: out.accuracy, needsCalibration: out.needsCalibration, source });
  }

  private tick(session: number): void {
    if (session !== this.session || !this.running || document.hidden) return;
    const now = performance.now();
    if (this.everUsable) {
      if (now - this.lastUsable > this.staleMs && this.state.status !== 'stale') this.set({ status: 'stale' });
      return;
    }
    const silent = now - this.startedAt;
    if (silent >= 2000) this.startSensor(session);
    if (silent >= this.missingMs) {
      this.teardown(); this.running = false;
      this.set({ status: this.relativeSeen ? 'no-north' : 'missing' });
      return;
    }
    // Some browsers only start delivering after a fresh subscription. Never re-asks permission.
    if (this.restarts < 6) { this.restarts++; this.detach?.(); this.attach(session); }
  }

  private teardown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.detach?.(); this.detach = null;
    try { this.sensor?.stop(); } catch { /* ignore */ }
    this.sensor = null;
  }

  private onVisibility = (): void => {
    if (typeof document === 'undefined' || document.hidden) return;
    // Coming back to the page: resubscribe so sensors restart, without asking again.
    if (this.running || ['stale', 'missing', 'no-north'].includes(this.state.status)) {
      if (this.granted) this.listen(++this.session);
    }
  };
}
