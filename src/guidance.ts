/**
 * Decides what the player should see for a given state. Pure function, shared by the
 * built-in UI and by projects that draw their own screens ("headless" use).
 */
import type { GeoKitState } from './kit.js';

export type ScreenId =
  | 'desktop' | 'intro' | 'compass-tap' | 'requesting' | 'waiting'
  | 'insecure' | 'unsupported' | 'location-denied' | 'location-blocked'
  | 'compass-denied' | 'compass-missing' | 'compass-no-north' | 'calibrate';

export type BarId =
  | 'searching' | 'weak' | 'stale' | 'flatter' | 'hold-up' | 'hold-lower'
  | 'compass-stale' | 'calibrate' | 'course' | 'no-compass';

export type LampState = 'off' | 'busy' | 'ok' | 'warn' | 'error';

export type GuidanceOptions = {
  /** The game cannot be played without the compass. Default false (it continues without). */
  requireCompass?: boolean;
  /** Keep the "finding your position" screen until the first fix. Default true. */
  waitForFix?: boolean;
  /** Screens the player has dismissed ("continue anyway"). */
  dismissed?: ReadonlySet<ScreenId>;
  /** Screen opened on purpose by the game, e.g. "calibrate". Shown on top of everything else. */
  forced?: ScreenId | null;
};

export type Guidance = {
  /** Blocking screen to show, or null when the game can be played. */
  screen: ScreenId | null;
  /** Small non-blocking message, or null. */
  bar: BarId | null;
  /** True when the bar can be tapped to open calibration. */
  barAction: 'calibrate' | null;
  lamps: { location: LampState | null; compass: LampState | null };
  /** Values for text placeholders. */
  values: { accuracy: number | null };
};

export function getGuidance(state: GeoKitState, options: GuidanceOptions = {}): Guidance {
  const { location: loc, compass, device } = state;
  const dismissed = options.dismissed ?? new Set<ScreenId>();
  const requireCompass = options.requireCompass === true;
  const waitForFix = options.waitForFix !== false;

  const lamps = {
    location: loc ? locationLamp(loc.status) : null,
    compass: compass ? compassLamp(compass.status) : null,
  };
  const accuracy = loc?.fix ? Math.round(loc.fix.accuracy) : null;
  const result = (screen: ScreenId | null, bar: BarId | null = null): Guidance =>
    ({ screen, bar, barAction: bar === 'calibrate' ? 'calibrate' : null, lamps, values: { accuracy } });

  if (options.forced) return result(options.forced);

  const block = (id: ScreenId) => !dismissed.has(id);
  if (!device.mobile && !state.started && block('desktop')) return result('desktop');
  if (!state.started) return result('intro');

  // Problems that stop everything.
  if (loc?.status === 'insecure' || compass?.status === 'insecure') return result('insecure');
  if (loc?.status === 'unsupported') return result('unsupported');
  if (loc?.status === 'blocked') return result('location-blocked');
  if (loc?.status === 'denied') return result('location-denied');

  // Compass problems: blocking when required, otherwise shown once and then dismissible.
  const compassScreen: ScreenId | null = !compass ? null
    : compass.needsGesture && compass.status === 'off' ? 'compass-tap'
    : compass.status === 'denied' ? 'compass-denied'
    : compass.status === 'missing' ? 'compass-missing'
    : compass.status === 'no-north' ? 'compass-no-north'
    : compass.status === 'unsupported' ? (requireCompass ? 'unsupported' : null)
    : null;
  if (compassScreen && (requireCompass || block(compassScreen))) return result(compassScreen);

  if (loc?.status === 'requesting' || compass?.status === 'requesting') return result('requesting');
  if (loc && waitForFix && !loc.fix && block('waiting')) return result('waiting');

  return result(null, pickBar(state));
}

function pickBar(state: GeoKitState): BarId | null {
  const { location: loc, compass, direction } = state;
  if (loc) {
    if (loc.status === 'stale') return 'stale';
    if (!loc.fix && (loc.status === 'searching' || loc.status === 'requesting')) return 'searching';
  }
  if (compass) {
    if (compass.status === 'pose') return compass.hint === 'hold-up' ? 'hold-up' : compass.hint === 'hold-lower' ? 'hold-lower' : 'flatter';
    if (compass.needsCalibration && compass.status === 'ok') return 'calibrate';
    if (compass.status === 'stale') return direction.source === 'course' ? 'course' : 'compass-stale';
    if (['denied', 'missing', 'no-north', 'unsupported'].includes(compass.status)) return direction.source === 'course' ? 'course' : 'no-compass';
  }
  if (loc?.status === 'weak') return 'weak';
  return null;
}

function locationLamp(status: string): LampState {
  switch (status) {
    case 'ok': return 'ok';
    case 'weak': case 'stale': return 'warn';
    case 'requesting': case 'searching': return 'busy';
    case 'off': return 'off';
    default: return 'error';
  }
}

function compassLamp(status: string): LampState {
  switch (status) {
    case 'ok': return 'ok';
    case 'pose': case 'stale': return 'warn';
    case 'requesting': case 'waiting': return 'busy';
    case 'off': return 'off';
    default: return 'error';
  }
}
