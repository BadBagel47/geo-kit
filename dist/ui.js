import { getGuidance } from './guidance.js';
import { fill, getTexts } from './texts.js';
/** Ready-made looks. Use one as-is or spread it and change a few values. */
export const themes = {
    light: {},
    dark: {
        backdrop: 'rgba(0,0,0,.6)', surface: '#161a20', text: '#eef1f5', muted: '#a3acb9', border: 'rgba(255,255,255,.12)',
        accent: '#5b9dff', accentText: '#06101f', buttonText: '#eef1f5', barBackground: 'rgba(22,26,32,.92)', barText: '#eef1f5',
    },
    terminal: {
        font: '"Courier New", ui-monospace, monospace', titleTransform: 'uppercase', titleSpacing: '.08em',
        backdrop: 'rgba(0,10,0,.75)', surface: '#030a03', text: '#7dff8a', muted: '#4fbf5b', border: '#2f8f3a',
        accent: '#7dff8a', accentText: '#021402', buttonText: '#7dff8a', ok: '#7dff8a', warn: '#ffd166', error: '#ff5c5c',
        radius: '2px', buttonRadius: '2px', shadow: '0 0 0 1px #2f8f3a, 0 0 24px rgba(125,255,138,.25)',
        barBackground: '#030a03', barText: '#7dff8a',
    },
    parchment: {
        font: 'Georgia, "Times New Roman", serif', titleFont: '"Palatino Linotype", Palatino, Georgia, serif',
        backdrop: 'rgba(30,18,6,.55)', surface: '#f4e9d0', text: '#3b2a17', muted: '#6e5a3f', border: '#c9b48a',
        accent: '#7a2e1d', accentText: '#f8efdc', buttonText: '#3b2a17', radius: '6px', buttonRadius: '4px',
        barBackground: 'rgba(244,233,208,.95)', barText: '#3b2a17',
    },
};
const STYLE_ID = 'geo-kit-style';
export const CSS = `
.gk-root{--gk-font:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--gk-title-font:var(--gk-font);--gk-title-transform:none;--gk-title-spacing:normal;
--gk-backdrop:rgba(15,18,24,.55);--gk-surface:#fff;--gk-text:#1b1f24;--gk-muted:#5b6470;--gk-border:rgba(0,0,0,.12);
--gk-accent:#2563eb;--gk-accent-text:#fff;--gk-button-text:var(--gk-text);--gk-ok:#16a34a;--gk-warn:#d97706;--gk-error:#dc2626;--gk-off:#9ca3af;
--gk-radius:16px;--gk-button-radius:999px;--gk-shadow:0 18px 50px rgba(0,0,0,.25);--gk-bar-background:rgba(255,255,255,.95);--gk-bar-text:#1b1f24;--gk-z:2147483000;
position:fixed;inset:0;z-index:var(--gk-z);pointer-events:none;font-family:var(--gk-font);color:var(--gk-text);line-height:1.45;-webkit-text-size-adjust:100%}
.gk-root *{box-sizing:border-box}
.gk-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));background:var(--gk-backdrop);pointer-events:auto;overflow:auto}
.gk-card{width:100%;max-width:400px;max-height:100%;overflow:auto;background:var(--gk-surface);color:var(--gk-text);border:1px solid var(--gk-border);border-radius:var(--gk-radius);box-shadow:var(--gk-shadow);padding:22px 20px 18px}
.gk-title{margin:0 0 8px;font-family:var(--gk-title-font);font-size:1.3rem;line-height:1.25;text-transform:var(--gk-title-transform);letter-spacing:var(--gk-title-spacing)}
.gk-text{margin:0 0 12px;font-size:1rem}
.gk-muted{color:var(--gk-muted);font-size:.92rem}
.gk-list{margin:0 0 14px;padding:0;list-style:none;display:grid;gap:8px}
.gk-list li{display:flex;gap:10px;align-items:flex-start}
.gk-icon{flex:none;width:22px;height:22px;color:var(--gk-accent)}
.gk-steps{margin:0 0 14px;padding-left:1.3em;display:grid;gap:6px}
.gk-lamps{display:flex;flex-wrap:wrap;gap:8px 16px;margin:4px 0 14px;font-size:.9rem}
.gk-lamp{display:inline-flex;align-items:center;gap:7px}
.gk-lamp::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--gk-off);box-shadow:0 0 0 2px color-mix(in srgb,var(--gk-off) 25%,transparent)}
.gk-lamp[data-state=ok]::before{background:var(--gk-ok);box-shadow:0 0 8px var(--gk-ok)}
.gk-lamp[data-state=warn]::before{background:var(--gk-warn)}
.gk-lamp[data-state=error]::before{background:var(--gk-error)}
.gk-lamp[data-state=busy]::before{background:var(--gk-warn);animation:gk-blink 1s ease-in-out infinite}
.gk-lamp-label{color:var(--gk-muted)}
.gk-actions{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.gk-btn{appearance:none;font:inherit;font-weight:600;min-height:46px;padding:10px 18px;border-radius:var(--gk-button-radius);border:1px solid var(--gk-border);background:transparent;color:var(--gk-button-text);cursor:pointer;text-transform:var(--gk-title-transform);letter-spacing:var(--gk-title-spacing)}
.gk-btn--primary{background:var(--gk-accent);border-color:var(--gk-accent);color:var(--gk-accent-text)}
.gk-btn:focus-visible{outline:3px solid var(--gk-accent);outline-offset:2px}
.gk-spinner{width:42px;height:42px;margin:4px auto 14px;border-radius:50%;border:4px solid var(--gk-border);border-top-color:var(--gk-accent);animation:gk-spin 1s linear infinite}
.gk-figure{display:block;width:150px;height:80px;margin:0 auto 12px;position:relative}
.gk-figure svg{width:100%;height:100%;color:var(--gk-muted)}
.gk-dot{position:absolute;left:0;top:0;width:14px;height:22px;margin:-11px 0 0 -7px;border-radius:3px;background:var(--gk-accent);offset-path:path("M75 40 C 105 5, 140 5, 140 40 S 105 75, 75 40 S 45 5, 10 40 S 45 75, 75 40");animation:gk-eight 3.2s linear infinite}
.gk-divider{height:1px;background:var(--gk-border);margin:14px 0}
.gk-bar{position:absolute;left:50%;transform:translateX(-50%);max-width:calc(100% - 24px);display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:var(--gk-button-radius);background:var(--gk-bar-background);color:var(--gk-bar-text);border:1px solid var(--gk-border);box-shadow:0 6px 20px rgba(0,0,0,.18);font-size:.9rem;pointer-events:auto}
.gk-bar--top{top:max(10px,env(safe-area-inset-top))}
.gk-bar--bottom{bottom:max(10px,env(safe-area-inset-bottom))}
.gk-bar[role=button]{cursor:pointer}
.gk-bar .gk-lamp::before{flex:none}
@keyframes gk-spin{to{transform:rotate(360deg)}}
@keyframes gk-blink{50%{opacity:.35}}
@keyframes gk-eight{from{offset-distance:0%}to{offset-distance:100%}}
@media (prefers-reduced-motion:reduce){.gk-spinner,.gk-lamp[data-state=busy]::before,.gk-dot{animation:none}.gk-dot{offset-distance:20%}}
`;
const ICONS = {
    pin: '<svg class="gk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    compass: '<svg class="gk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    eight: '<svg viewBox="0 0 150 80" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5" aria-hidden="true"><path d="M75 40 C 105 5, 140 5, 140 40 S 105 75, 75 40 S 45 5, 10 40 S 45 75, 75 40"/></svg>',
};
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kebab = (key) => key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
/** Apply a theme to any element (also usable on your own containers). */
export function applyTheme(element, theme) {
    for (const [key, value] of Object.entries(theme))
        if (value)
            element.style.setProperty(`--gk-${kebab(key)}`, value);
}
export function mountGeoKitUI(kit, options = {}) {
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.prepend(style); // Prepended so project CSS wins on equal specificity.
    }
    const texts = getTexts(options.lang, options.texts);
    const root = document.createElement('div');
    root.className = 'gk-root' + (options.className ? ' ' + options.className : '');
    root.lang = options.lang ?? 'en';
    applyTheme(root, options.theme ?? {});
    (options.container ?? document.body).appendChild(root);
    const dismissed = new Set();
    let forced = null;
    let lastSignature = '';
    let lastScreen;
    let ready = false;
    const t = (s) => esc(fill(s, { app: texts.app, accuracy: current().values.accuracy ?? '?' }));
    const current = () => getGuidance(kit.getState(), { requireCompass: options.requireCompass, waitForFix: options.waitForFix, dismissed, forced });
    const lampsHtml = (g) => {
        const lamp = (label, state) => state === null ? '' :
            `<span class="gk-lamp" data-state="${state}">${esc(label)} <span class="gk-lamp-label">${esc(texts.lamp[state])}</span></span>`;
        return `<div class="gk-lamps" aria-live="polite">${lamp(texts.locationLabel, g.lamps.location)}${lamp(texts.compassLabel, g.lamps.compass)}</div>`;
    };
    const button = (label, action, primary = false) => `<button type="button" class="gk-btn${primary ? ' gk-btn--primary' : ''}" data-gk-action="${action}">${esc(label)}</button>`;
    const steps = (list) => `<ol class="gk-steps">${list.map(s => `<li>${t(s)}</li>`).join('')}</ol>`;
    const platformSteps = (kind) => {
        const d = kit.getState().device;
        const key = `steps${kind}${d.ios ? 'Ios' : d.android ? 'Android' : 'Other'}`;
        return steps(texts[key]);
    };
    function screenHtml(screen, g) {
        const s = kit.getState();
        const card = (title, body) => `<div class="gk-card" role="dialog" aria-modal="true" aria-labelledby="gk-title"><h2 class="gk-title" id="gk-title" tabindex="-1">${t(title)}</h2>${body}</div>`;
        const p = (text, muted = false) => text ? `<p class="gk-text${muted ? ' gk-muted' : ''}">${t(text)}</p>` : '';
        const compassLine = s.mode === 'aim' ? (s.pitchEnabled ? texts.introCompassPitch : texts.introCompassAim) : texts.introCompassMap;
        const withoutCompass = options.requireCompass ? '' : button(texts.continueWithoutCompass, `dismiss:${screen}`);
        switch (screen) {
            case 'intro':
                return card(texts.introTitle, p(texts.introBody)
                    + `<ul class="gk-list">${s.location ? `<li>${ICONS.pin}<span>${t(texts.introLocation)}</span></li>` : ''}${s.compass ? `<li>${ICONS.compass}<span>${t(compassLine)}</span></li>` : ''}</ul>`
                    + p(texts.introPrivacy, true) + `<div class="gk-actions">${button(texts.introButton, 'start', true)}</div>`);
            case 'compass-tap':
                return card(texts.compassTapTitle, p(texts.compassTapBody) + lampsHtml(g) + `<div class="gk-actions">${button(texts.compassTapButton, 'retry-compass', true)}${withoutCompass}</div>`);
            case 'requesting':
                return card(texts.requestingTitle, p(texts.requestingBody) + lampsHtml(g));
            case 'waiting':
                return card(texts.waitingTitle, '<div class="gk-spinner" aria-hidden="true"></div>' + p(texts.waitingBody) + lampsHtml(g));
            case 'desktop':
                return card(texts.desktopTitle, p(texts.desktopBody) + `<div class="gk-actions">${button(texts.continueAnyway, 'dismiss:desktop')}</div>`);
            case 'insecure':
                return card(texts.insecureTitle, p(texts.insecureBody));
            case 'unsupported':
                return card(texts.unsupportedTitle, p(texts.unsupportedBody));
            case 'location-blocked':
                return card(texts.locationBlockedTitle, p(texts.locationBlockedBody));
            case 'location-denied':
                return card(texts.locationDeniedTitle, p(texts.locationDeniedBody) + platformSteps('Location') + `<div class="gk-actions">${button(texts.tryAgain, 'retry-location', true)}</div>`);
            case 'compass-denied':
                return card(texts.compassDeniedTitle, p(texts.compassDeniedBody) + platformSteps('Compass') + `<div class="gk-actions">${button(texts.tryAgain, 'retry-compass', true)}${withoutCompass}</div>`);
            case 'compass-missing':
                return card(texts.compassMissingTitle, p(texts.compassMissingBody) + platformSteps('Compass') + `<div class="gk-actions">${button(texts.tryAgain, 'retry-compass', true)}${withoutCompass}</div>`);
            case 'compass-no-north':
                return card(texts.compassNoNorthTitle, p(texts.compassNoNorthBody) + platformSteps('Compass') + `<div class="gk-actions">${button(texts.tryAgain, 'retry-compass', true)}${withoutCompass}</div>`);
            case 'calibrate': {
                const align = (options.offerAlignNorth ?? true) && s.compass?.status === 'ok';
                return card(texts.calibrateTitle, `<div class="gk-figure"><span class="gk-dot"></span>${ICONS.eight}</div>` + p(texts.calibrateBody)
                    + (align ? `<div class="gk-divider"></div><h3 class="gk-title" style="font-size:1.05rem">${t(texts.alignTitle)}</h3>${p(texts.alignBody, true)}` : '')
                    + `<div class="gk-actions">${button(texts.done, 'close', true)}${align ? button(texts.alignButton, 'align') : ''}</div>`);
            }
        }
    }
    const barText = {
        searching: 'barSearching', weak: 'barWeak', stale: 'barStale', flatter: 'barFlatter', 'hold-up': 'barHoldUp',
        'hold-lower': 'barHoldLower', 'compass-stale': 'barCompassStale', calibrate: 'barCalibrate', course: 'barCourse', 'no-compass': 'barNoCompass',
    };
    function render() {
        const g = current();
        const showBar = options.showBar !== false && !g.screen && g.bar;
        // Only rebuild when something visible changed, so focus and animations are kept.
        const signature = JSON.stringify([g.screen, showBar ? g.bar : null, g.lamps, g.screen === 'calibrate' ? kit.getState().compass?.status === 'ok' : 0, showBar && g.bar === 'weak' ? g.values.accuracy : 0, kit.getState().device.ios]);
        if (signature === lastSignature)
            return;
        lastSignature = signature;
        const screenChanged = g.screen !== lastScreen;
        let html = '';
        if (g.screen)
            html += `<div class="gk-overlay">${screenHtml(g.screen, g)}</div>`;
        if (showBar && g.bar) {
            const action = g.barAction ? ` role="button" tabindex="0" data-gk-action="${g.barAction}"` : ' role="status"';
            const lamp = g.bar === 'searching' || g.bar === 'calibrate' || g.bar === 'course' ? 'busy' : g.bar === 'no-compass' ? 'off' : 'warn';
            html += `<div class="gk-bar gk-bar--${options.barPosition ?? 'top'}"${action}><span class="gk-lamp" data-state="${lamp}" aria-hidden="true"></span><span>${t(texts[barText[g.bar]])}</span></div>`;
        }
        root.innerHTML = html;
        if (screenChanged) {
            lastScreen = g.screen;
            if (g.screen)
                (root.querySelector('.gk-btn--primary') ?? root.querySelector('#gk-title'))?.focus({ preventScroll: true });
            options.onScreen?.(g.screen);
            if (!g.screen && !ready && kit.getState().started) {
                ready = true;
                options.onReady?.();
            }
        }
    }
    const onClick = (event) => {
        const target = event.target.closest('[data-gk-action]');
        if (!target)
            return;
        if (event instanceof KeyboardEvent && (target.tagName === 'BUTTON' || (event.key !== 'Enter' && event.key !== ' ')))
            return;
        const action = target.getAttribute('data-gk-action');
        // Permission requests run synchronously here, inside the tap (required by iOS).
        if (action === 'start')
            kit.start();
        else if (action === 'retry-location')
            kit.retryLocation();
        else if (action === 'retry-compass') {
            dismissed.delete('compass-denied');
            kit.retryCompass();
        }
        else if (action === 'calibrate')
            forced = 'calibrate';
        else if (action === 'close')
            forced = null;
        else if (action === 'align') {
            kit.alignNorth();
            forced = null;
        }
        else if (action.startsWith('dismiss:'))
            dismissed.add(action.slice(8));
        render();
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onClick);
    const unsubscribe = kit.subscribe(render);
    render();
    return {
        element: root,
        showCalibration() { forced = 'calibrate'; render(); },
        show(screen) { forced = screen; lastSignature = ''; render(); },
        guidance: current,
        destroy() { unsubscribe(); root.removeEventListener('click', onClick); root.removeEventListener('keydown', onClick); root.remove(); },
    };
}
