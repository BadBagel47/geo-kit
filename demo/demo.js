// geo-kit test page. Plain JavaScript on top of the built library in ../dist.
import { GeoKit, mountGeoKitUI, themes, ZoneMonitor, distanceMeters, bearingDegrees, relativeBearing, continuousAngle, VERSION } from '../dist/index.js';

const params = new URLSearchParams(location.search);
const setup = {
  mode: params.get('mode') ?? 'map',
  theme: params.get('theme') ?? 'light',
  lang: params.get('lang') ?? 'en',
  nogps: params.get('nogps') ?? 'warn',
  north: params.get('north') === 'magnetic' ? 'magnetic' : 'true',
  require: params.get('require') === '1',
  sim: params.get('sim') === '1',
};
document.getElementById('version').textContent = 'v' + VERSION;

// ---------- Setup form (changes reload the page for a clean start) ----------
const form = document.getElementById('setup');
form.mode.value = setup.mode; form.theme.value = setup.theme; form.lang.value = setup.lang;
form.nogps.value = setup.nogps; form.north.value = setup.north; form.require.checked = setup.require; form.sim.checked = setup.sim;
form.addEventListener('change', () => {
  const next = new URLSearchParams({ mode: form.mode.value, theme: form.theme.value, lang: form.lang.value, nogps: form.nogps.value, north: form.north.value });
  if (form.require.checked) next.set('require', '1');
  if (form.sim.checked) next.set('sim', '1');
  location.search = next.toString();
});

// ---------- Optional simulated sensors (desktop testing and automated tests) ----------
const sim = { alpha: 0, beta: 20, gamma: 0, accuracy: 6, north: 0, denyGps: false, compassOn: true };
const HOME = { lat: 59.8586, lon: 17.6389 };
window.geoKitSim = sim; // used by the automated browser test
if (setup.sim) installSimulation();

function installSimulation() {
  const panel = document.getElementById('sim-panel');
  panel.hidden = false;
  for (const input of panel.querySelectorAll('input[type=range]')) {
    sim[input.name] = Number(input.value);
    input.addEventListener('input', () => { sim[input.name] = Number(input.value); });
  }
  document.getElementById('sim-deny-gps').onclick = () => { sim.denyGps = true; };
  document.getElementById('sim-stop-compass').onclick = () => { sim.compassOn = false; };
  const position = () => ({
    coords: { latitude: HOME.lat + sim.north / 111195, longitude: HOME.lon, accuracy: sim.accuracy, speed: 0, heading: null, altitude: null },
    timestamp: Date.now(),
  });
  const denied = { code: 1, message: 'denied' };
  let nextId = 1;
  const watches = new Map();
  const fake = {
    getCurrentPosition(ok, fail) { setTimeout(() => sim.denyGps ? fail?.(denied) : ok(position()), 300); },
    watchPosition(ok, fail) {
      const id = nextId++;
      watches.set(id, setInterval(() => sim.denyGps ? fail?.(denied) : ok(position()), 1000));
      return id;
    },
    clearWatch(id) { clearInterval(watches.get(id)); watches.delete(id); },
  };
  Object.defineProperty(navigator, 'geolocation', { configurable: true, get: () => fake });
  setInterval(() => {
    if (!sim.compassOn) return;
    let event;
    try { event = new DeviceOrientationEvent('deviceorientationabsolute', { alpha: sim.alpha, beta: sim.beta, gamma: sim.gamma, absolute: true }); }
    catch { event = Object.assign(new Event('deviceorientationabsolute'), { alpha: sim.alpha, beta: sim.beta, gamma: sim.gamma, absolute: true }); }
    window.dispatchEvent(event);
  }, 100);
}

// ---------- The library ----------
const heading = setup.mode === 'none' ? false : setup.mode === 'map' ? 'map' : 'aim';
const kit = new GeoKit({ heading, pitch: setup.mode === 'aim-pitch', trueNorth: setup.north === 'true' });
const ui = mountGeoKitUI(kit, {
  lang: setup.lang,
  theme: themes[setup.theme] ?? {},
  requireCompass: setup.require,
  noGps: setup.nogps,
  texts: { app: setup.lang === 'sv' ? 'Testsidan' : 'This test page' },
});
document.body.dataset.theme = setup.theme;
window.geoKit = kit; // handy for debugging in the console

// ---------- Target test ----------
const TARGET_KEY = 'geo-kit-demo-target';
let target = JSON.parse(localStorage.getItem(TARGET_KEY) ?? 'null');
let zone = target ? new ZoneMonitor({ center: target }) : null;
let zoneInside = false;
function setTarget(point) {
  target = point; zone = point ? new ZoneMonitor({ center: point }) : null; zoneInside = false;
  if (point) localStorage.setItem(TARGET_KEY, JSON.stringify(point)); else localStorage.removeItem(TARGET_KEY);
  render();
}
function offset(from, bearing, metres) {
  const r = 6371008.8, d = metres / r, b = bearing * Math.PI / 180, p1 = from.lat * Math.PI / 180, l1 = from.lon * Math.PI / 180;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: p2 * 180 / Math.PI, lon: l2 * 180 / Math.PI };
}
document.getElementById('target-here').onclick = () => { const f = kit.getState().location?.fix; if (f) setTarget({ lat: f.lat, lon: f.lon }); };
document.getElementById('target-ahead').onclick = () => {
  const s = kit.getState(); const f = s.location?.fix;
  if (f) setTarget(offset(f, s.direction.heading ?? 0, 40));
};
document.getElementById('target-clear').onclick = () => setTarget(null);

// ---------- Tools ----------
document.getElementById('calibrate').onclick = () => ui.showCalibration();
document.getElementById('reset-align').onclick = () => kit.resetAlignment();
document.getElementById('report').onclick = () => kit.downloadReport();
const restart = document.getElementById('restart');
restart.onclick = () => {
  if (kit.getState().started) { kit.stop(); restart.textContent = 'Start'; }
  else { kit.start(); restart.textContent = 'Stop'; }
};
document.getElementById('preview').onchange = event => ui.show(event.target.value || null);

// ---------- Live view ----------
const rose = document.getElementById('rose');
const arrow = document.getElementById('target-arrow');
const pitchBox = document.getElementById('pitch-box');
const pitchMark = document.getElementById('pitch-mark');
const readout = document.getElementById('readout');
pitchBox.hidden = setup.mode !== 'aim-pitch';
// Unwrapped angles so the CSS transition always turns the short way.
let roseAngle = null, arrowAngle = null;
const fmt = (v, unit = '°') => v === null || v === undefined ? '—' : `${unit === '°' && v >= 0 ? Math.round(v) % 360 : Math.round(v)}${unit}`;

function render() {
  const s = kit.getState();
  const h = s.direction.heading;
  roseAngle = continuousAngle(roseAngle, -(h ?? 0));
  rose.style.transform = `rotate(${roseAngle}deg)`;
  rose.dataset.angle = String(roseAngle);
  const fix = s.location?.fix ?? null;
  let distance = null, rel = null;
  if (target && fix) {
    distance = distanceMeters(fix, target);
    rel = h === null ? null : relativeBearing(h, bearingDegrees(fix, target));
    const result = zone.update(fix);
    zoneInside = result.inside;
  }
  arrow.hidden = rel === null;
  if (rel !== null) { arrowAngle = continuousAngle(arrowAngle, rel); arrow.style.transform = `rotate(${arrowAngle}deg)`; }
  if (s.direction.pitch !== null) pitchMark.style.top = `${50 - (s.direction.pitch / 90) * 50}%`;
  const rows = [
    ['Location', s.location ? s.location.status : 'not used'],
    ['Accuracy', fix ? `±${Math.round(fix.accuracy)} m` : '—'],
    ['Compass', s.compass ? s.compass.status + (s.compass.hint ? ` (${s.compass.hint})` : '') : 'not used'],
    ['Heading', fmt(h) + (s.direction.source ? ` (${s.direction.source})` : '')],
  ];
  if (s.pitchEnabled) rows.push(['Up/down', fmt(s.direction.pitch)]);
  if (s.compass?.accuracy != null) rows.push(['Compass accuracy', fmt(s.compass.accuracy)]);
  if (s.direction.north) rows.push(['North', s.direction.north === 'true' && s.direction.declination !== null
    ? `true (declination ${s.direction.declination >= 0 ? '+' : ''}${s.direction.declination}°)` : s.direction.north]);
  if (s.compass?.aligned) rows.push(['Alignment', 'manual']);
  if (target) rows.push(['Target', distance === null ? 'waiting for GPS' : `${Math.round(distance)} m, ${rel === null ? '—' : (rel >= 0 ? `${Math.round(rel)}° right` : `${Math.round(-rel)}° left`)}`], ['At target', zoneInside ? 'yes' : 'no']);
  readout.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd data-key="${k}">${v}</dd></div>`).join('');
  restart.textContent = s.started ? 'Stop' : 'Start';
}
kit.subscribe(render);
render();
