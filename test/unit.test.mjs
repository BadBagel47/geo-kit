// Unit tests for the pure parts. Run with: npm test (builds first, then node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrientationTracker, ZoneMonitor, distanceMeters, bearingDegrees, relativeBearing, angleDelta, getGuidance, en, sv, getTexts, fill } from '../dist/index.js';
import { matrixFromEuler } from '../dist/math.js';

const close = (actual, expected, tolerance = 0.5, message = '') =>
  assert.ok(Math.abs(angleDelta(expected, actual)) <= tolerance, `${message} expected ${expected}, got ${actual}`);

// Rotation about the device's own z axis (screen normal), e.g. tilting a held-up phone like a steering wheel.
function withScreenRoll(m, rollDeg) {
  const r = rollDeg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const rz = [c, -s, 0, s, c, 0, 0, 0, 1];
  const out = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out.push(m[i * 3] * rz[j] + m[i * 3 + 1] * rz[3 + j] + m[i * 3 + 2] * rz[6 + j]);
  return out;
}
const euler = (alpha, beta, gamma, extra = {}) => ({ alpha, beta, gamma, absolute: true, ...extra });

test('map mode: flat phone follows the top edge', () => {
  const t = new OrientationTracker({ mode: 'map', smoothingMs: 0 });
  close(t.pushEuler(euler(0, 0, 0), 0).heading, 0);
  close(t.pushEuler(euler(90, 0, 0), 10).heading, 270, 0.5, 'alpha increases counter-clockwise');
  close(t.pushEuler(euler(-45, 0, 0), 20).heading, 45);
});

test('map mode: tilting and rolling keep the heading until the phone is nearly upright', () => {
  const t = new OrientationTracker({ mode: 'map', smoothingMs: 0 });
  for (let beta = 0; beta <= 70; beta += 5) for (const gamma of [-30, 0, 30]) {
    const out = t.pushEuler(euler(0, beta, gamma), beta * 10);
    assert.equal(out.valid, true, `beta ${beta} gamma ${gamma}`);
    close(out.heading, 0, 0.5, `beta ${beta} gamma ${gamma}`);
  }
  const upright = t.pushEuler(euler(0, 88, 0), 2000);
  assert.equal(upright.valid, false);
  assert.equal(upright.hint, 'hold-flatter');
  close(upright.heading, 0, 0.5, 'last heading is held');
  const faceDown = t.pushEuler(euler(0, 180, 0), 2100);
  assert.equal(faceDown.valid, false, 'screen facing down is not a map pose');
});

test('map mode: landscape uses the visible top edge', () => {
  const t = new OrientationTracker({ mode: 'map', smoothingMs: 0 });
  close(t.pushEuler(euler(0, 0, 0), 0, 90).heading, 90);
  close(t.pushEuler(euler(0, 0, 0), 10, 270).heading, 270);
});

test('aim mode: the back of the phone gives the heading, with no flips past upright', () => {
  const t = new OrientationTracker({ mode: 'aim', pitch: true, smoothingMs: 0 });
  for (let beta = 30; beta <= 150; beta += 1) {
    const out = t.pushEuler(euler(0, beta, 0), beta * 10);
    close(out.heading, 0, 0.5, `beta ${beta}`);
    assert.ok(Math.abs(out.pitch - (beta - 90)) < 0.5, `pitch at beta ${beta} was ${out.pitch}`);
  }
});

test('aim mode: steering-wheel tilt does not change the heading', () => {
  const t = new OrientationTracker({ mode: 'aim', smoothingMs: 0 });
  for (const roll of [-40, -20, 0, 20, 40]) {
    const out = t.pushMatrix(withScreenRoll(matrixFromEuler(30, 80, 0), roll), roll + 100);
    close(out.heading, 330, 0.5, `roll ${roll}`);
  }
});

test('aim mode: no jumps while tilting with the phone rolled sideways (blaster regression)', () => {
  const t = new OrientationTracker({ mode: 'aim', smoothingMs: 0 });
  let previous = null;
  for (let beta = 30; beta <= 120; beta += 1) {
    const { heading } = t.pushEuler(euler(0, beta, 25), beta * 10);
    if (previous !== null) assert.ok(Math.abs(angleDelta(previous, heading)) < 1, `step at beta ${beta}: ${previous} -> ${heading}`);
    previous = heading;
  }
});

test('aim mode without pitch asks to hold the phone up or lower it', () => {
  const t = new OrientationTracker({ mode: 'aim', smoothingMs: 0 });
  const flat = t.pushEuler(euler(0, 5, 0), 0);
  assert.equal(flat.valid, false); assert.equal(flat.hint, 'hold-up'); assert.equal(flat.pitch, null);
  const up = t.pushEuler(euler(0, 90, 0), 100);
  assert.equal(up.valid, true); assert.equal(up.hint, null);
  const sky = t.pushEuler(euler(0, 170, 0), 200);
  assert.equal(sky.valid, false); assert.equal(sky.hint, 'hold-lower');
});

test('aim mode with pitch keeps pitch near the zenith and holds the heading', () => {
  const t = new OrientationTracker({ mode: 'aim', pitch: true, smoothingMs: 0 });
  close(t.pushEuler(euler(90, 120, 0), 0).heading, 270);
  const zenith = t.pushEuler(euler(0, 179, 0), 50);
  assert.equal(zenith.valid, false);
  assert.equal(zenith.hint, null);
  close(zenith.heading, 270, 0.5, 'heading held at the zenith');
  assert.ok(zenith.pitch > 85);
});

test('iOS: arbitrary alpha zero is corrected with webkitCompassHeading, flat and upright', () => {
  for (const mode of ['map', 'aim']) {
    const t = new OrientationTracker({ mode, smoothingMs: 0 });
    const zero = 123; // iOS relative alpha starts at an arbitrary angle
    for (const [trueAlpha, beta] of mode === 'map' ? [[0, 10], [300, 20], [200, 60]] : [[0, 60], [300, 90], [200, 110]]) {
      const out = t.pushEuler({ alpha: trueAlpha + zero, beta, gamma: 0, absolute: false, compassHeading: (360 - trueAlpha) % 360, compassAccuracy: 10 }, beta * 1000);
      close(out.heading, (360 - trueAlpha) % 360, 1, `${mode} alpha ${trueAlpha}`);
    }
  }
});

test('iOS: poor accuracy is flagged for calibration', () => {
  const t = new OrientationTracker({ mode: 'map', smoothingMs: 0 });
  const out = t.pushEuler({ alpha: 0, beta: 0, gamma: 0, absolute: false, compassHeading: 0, compassAccuracy: 40 }, 0);
  assert.equal(out.needsCalibration, true);
});

test('relative-only samples are ignored (no north reference)', () => {
  const t = new OrientationTracker({ mode: 'map' });
  assert.equal(t.pushEuler({ alpha: 10, beta: 0, gamma: 0, absolute: false }, 0), null);
});

test('smoothing averages across north without swinging through south', () => {
  const t = new OrientationTracker({ mode: 'map', smoothingMs: 200 });
  let out;
  for (let i = 0; i < 40; i++) out = t.pushEuler(euler(i % 2 ? 2 : -2, 0, 0), i * 16);
  close(out.heading, 0, 2);
});

test('manual north alignment offsets the heading', () => {
  const t = new OrientationTracker({ mode: 'map', smoothingMs: 0 });
  t.pushEuler(euler(-40, 0, 0), 0);
  t.setUserOffset(-t.rawHeading());
  close(t.pushEuler(euler(-40, 0, 0), 10).heading, 0);
  close(t.pushEuler(euler(-130, 0, 0), 20).heading, 90);
});

test('geo helpers', () => {
  const a = { lat: 59.8586, lon: 17.6389 };
  assert.ok(Math.abs(distanceMeters(a, { lat: 59.8586 + 0.001, lon: 17.6389 }) - 111.2) < 0.5);
  close(bearingDegrees(a, { lat: 59.87, lon: 17.6389 }), 0);
  close(bearingDegrees(a, { lat: 59.8586, lon: 17.66 }), 90, 0.1);
  assert.equal(relativeBearing(350, 10), 20);
  assert.equal(relativeBearing(10, 350), -20);
});

const fix = (metresNorth, t, accuracy = 5) => ({ lat: 59.8586 + metresNorth / 111195, lon: 17.6389, accuracy, timestamp: t, speed: null, course: null, altitude: null });

test('zone: needs several fresh fixes to enter, and grace to leave', () => {
  const z = new ZoneMonitor({ center: { lat: 59.8586, lon: 17.6389 }, radius: 15, exitRadius: 35 });
  assert.equal(z.update(fix(10, 1000), 1000).inside, false);
  assert.equal(z.update(fix(40, 1500), 1500).inside, false, 'a jump outside resets the count');
  z.update(fix(10, 2000), 2000); z.update(fix(12, 3000), 3000);
  const entered = z.update(fix(8, 4000), 4000);
  assert.equal(entered.entered, true);
  assert.equal(z.update(fix(30, 5000), 5000).inside, true, 'still inside below exitRadius');
  assert.equal(z.update(fix(50, 6000), 6000).inside, true, 'grace period');
  const left = z.update(fix(50, 8100), 8100);
  assert.equal(left.exited, true);
});

test('zone: inaccurate and old fixes are ignored', () => {
  const z = new ZoneMonitor({ center: { lat: 59.8586, lon: 17.6389 }, requiredFixes: 1 });
  assert.equal(z.update(fix(0, 1000, 80), 1000).inside, false);
  assert.equal(z.update(fix(0, 1000), 20000).inside, false);
  assert.equal(z.update(fix(0, 21000), 21000).entered, true);
});

const baseState = (patch = {}) => ({
  started: true, mode: 'map', pitchEnabled: false,
  device: { ios: false, android: true, mobile: true, secure: true, motionNeedsTap: false },
  location: { status: 'ok', fix: fix(0, Date.now()), permission: 'granted' },
  compass: { status: 'ok', heading: 10, pitch: null, hint: null, accuracy: null, needsCalibration: false, source: 'orientation', aligned: false, needsGesture: false },
  direction: { heading: 10, pitch: null, source: 'compass' },
  ...patch,
});

test('guidance: screens follow the state', () => {
  assert.equal(getGuidance(baseState({ started: false })).screen, 'intro');
  assert.equal(getGuidance(baseState({ started: false, device: { ...baseState().device, mobile: false } })).screen, 'desktop');
  assert.equal(getGuidance(baseState()).screen, null);
  assert.equal(getGuidance(baseState({ location: { status: 'denied', fix: null, permission: 'denied' } })).screen, 'location-denied');
  assert.equal(getGuidance(baseState({ location: { status: 'searching', fix: null, permission: 'granted' } })).screen, 'waiting');
  assert.equal(getGuidance(baseState({ location: { status: 'searching', fix: null, permission: 'granted' } }), { waitForFix: false }).bar, 'searching');
});

test('guidance: optional compass problems can be dismissed, required ones cannot', () => {
  const state = baseState({ compass: { ...baseState().compass, status: 'denied', heading: null } });
  assert.equal(getGuidance(state).screen, 'compass-denied');
  assert.equal(getGuidance(state, { dismissed: new Set(['compass-denied']) }).screen, null);
  assert.equal(getGuidance(state, { dismissed: new Set(['compass-denied']) }).bar, 'no-compass');
  assert.equal(getGuidance(state, { requireCompass: true, dismissed: new Set(['compass-denied']) }).screen, 'compass-denied');
});

test('guidance: pose hints and weak GPS appear in the bar', () => {
  const pose = baseState({ compass: { ...baseState().compass, status: 'pose', hint: 'hold-flatter' } });
  assert.equal(getGuidance(pose).bar, 'flatter');
  const weak = baseState({ location: { status: 'weak', fix: fix(0, Date.now(), 40), permission: 'granted' } });
  const g = getGuidance(weak);
  assert.equal(g.bar, 'weak'); assert.equal(g.values.accuracy, 40);
});

test('texts: every language has every key, and overrides work', () => {
  assert.deepEqual(Object.keys(sv).sort(), Object.keys(en).sort());
  const t = getTexts('sv', { app: 'Spökjakten' });
  assert.equal(fill(t.introBody, { app: t.app }), 'Spökjakten använder telefonens sensorer när du spelar utomhus.');
  assert.equal(getTexts('xx').introTitle, en.introTitle);
});
