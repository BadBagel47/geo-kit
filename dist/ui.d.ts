/**
 * Ready-made, themable screens for permissions, waiting, problems and calibration.
 * Plain DOM, no framework. Style it with CSS variables (see `Theme`) or your own CSS
 * targeting the `gk-` classes. Projects with fully custom UI can skip this file and
 * use getGuidance() + getTexts() instead.
 */
import type { GeoKit } from './kit.js';
import { type Guidance, type ScreenId } from './guidance.js';
import { type TextOverrides } from './texts.js';
export type Theme = {
    font: string;
    titleFont: string;
    titleTransform: string;
    titleSpacing: string;
    backdrop: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
    accentText: string;
    buttonText: string;
    ok: string;
    warn: string;
    error: string;
    off: string;
    radius: string;
    buttonRadius: string;
    shadow: string;
    barBackground: string;
    barText: string;
    z: string;
};
/** Ready-made looks. Use one as-is or spread it and change a few values. */
export declare const themes: Record<'light' | 'dark' | 'terminal' | 'parchment', Partial<Theme>>;
export type UIOptions = {
    /** "en" (default) or "sv", or any language added through `texts`. */
    lang?: string;
    /** Override any text, e.g. { app: 'Ghost Hunt', introBody: 'Find the ghosts around the park.' }. */
    texts?: TextOverrides;
    theme?: Partial<Theme>;
    /** Extra class on the root element, for project CSS. */
    className?: string;
    container?: HTMLElement;
    requireCompass?: boolean;
    waitForFix?: boolean;
    /** Show the small status bar while playing. Default true. */
    showBar?: boolean;
    barPosition?: 'top' | 'bottom';
    /** Offer "This is north" on the calibration screen. Default true when the compass is used. */
    offerAlignNorth?: boolean;
    /** Called the first time the game becomes playable (no blocking screen). */
    onReady?: () => void;
    /** Called whenever the blocking screen changes (null = playable). */
    onScreen?: (screen: ScreenId | null) => void;
};
export type GeoKitUI = {
    element: HTMLElement;
    /** Open the calibration screen (e.g. from a game button). */
    showCalibration(): void;
    /** Open any screen on purpose; null closes it. Useful for previews. */
    show(screen: ScreenId | null): void;
    /** Current guidance (what is shown). */
    guidance(): Guidance;
    destroy(): void;
};
export declare const CSS = "\n.gk-root{--gk-font:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;--gk-title-font:var(--gk-font);--gk-title-transform:none;--gk-title-spacing:normal;\n--gk-backdrop:rgba(15,18,24,.55);--gk-surface:#fff;--gk-text:#1b1f24;--gk-muted:#5b6470;--gk-border:rgba(0,0,0,.12);\n--gk-accent:#2563eb;--gk-accent-text:#fff;--gk-button-text:var(--gk-text);--gk-ok:#16a34a;--gk-warn:#d97706;--gk-error:#dc2626;--gk-off:#9ca3af;\n--gk-radius:16px;--gk-button-radius:999px;--gk-shadow:0 18px 50px rgba(0,0,0,.25);--gk-bar-background:rgba(255,255,255,.95);--gk-bar-text:#1b1f24;--gk-z:2147483000;\nposition:fixed;inset:0;z-index:var(--gk-z);pointer-events:none;font-family:var(--gk-font);color:var(--gk-text);line-height:1.45;-webkit-text-size-adjust:100%}\n.gk-root *{box-sizing:border-box}\n.gk-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));background:var(--gk-backdrop);pointer-events:auto;overflow:auto}\n.gk-card{width:100%;max-width:400px;max-height:100%;overflow:auto;background:var(--gk-surface);color:var(--gk-text);border:1px solid var(--gk-border);border-radius:var(--gk-radius);box-shadow:var(--gk-shadow);padding:22px 20px 18px}\n.gk-title{margin:0 0 8px;font-family:var(--gk-title-font);font-size:1.3rem;line-height:1.25;text-transform:var(--gk-title-transform);letter-spacing:var(--gk-title-spacing)}\n.gk-text{margin:0 0 12px;font-size:1rem}\n.gk-muted{color:var(--gk-muted);font-size:.92rem}\n.gk-list{margin:0 0 14px;padding:0;list-style:none;display:grid;gap:8px}\n.gk-list li{display:flex;gap:10px;align-items:flex-start}\n.gk-icon{flex:none;width:22px;height:22px;color:var(--gk-accent)}\n.gk-steps{margin:0 0 14px;padding-left:1.3em;display:grid;gap:6px}\n.gk-lamps{display:flex;flex-wrap:wrap;gap:8px 16px;margin:4px 0 14px;font-size:.9rem}\n.gk-lamp{display:inline-flex;align-items:center;gap:7px}\n.gk-lamp::before{content:\"\";width:10px;height:10px;border-radius:50%;background:var(--gk-off);box-shadow:0 0 0 2px color-mix(in srgb,var(--gk-off) 25%,transparent)}\n.gk-lamp[data-state=ok]::before{background:var(--gk-ok);box-shadow:0 0 8px var(--gk-ok)}\n.gk-lamp[data-state=warn]::before{background:var(--gk-warn)}\n.gk-lamp[data-state=error]::before{background:var(--gk-error)}\n.gk-lamp[data-state=busy]::before{background:var(--gk-warn);animation:gk-blink 1s ease-in-out infinite}\n.gk-lamp-label{color:var(--gk-muted)}\n.gk-actions{display:flex;flex-direction:column;gap:8px;margin-top:6px}\n.gk-btn{appearance:none;font:inherit;font-weight:600;min-height:46px;padding:10px 18px;border-radius:var(--gk-button-radius);border:1px solid var(--gk-border);background:transparent;color:var(--gk-button-text);cursor:pointer;text-transform:var(--gk-title-transform);letter-spacing:var(--gk-title-spacing)}\n.gk-btn--primary{background:var(--gk-accent);border-color:var(--gk-accent);color:var(--gk-accent-text)}\n.gk-btn:focus-visible{outline:3px solid var(--gk-accent);outline-offset:2px}\n.gk-spinner{width:42px;height:42px;margin:4px auto 14px;border-radius:50%;border:4px solid var(--gk-border);border-top-color:var(--gk-accent);animation:gk-spin 1s linear infinite}\n.gk-figure{display:block;width:150px;height:80px;margin:0 auto 12px;position:relative}\n.gk-figure svg{width:100%;height:100%;color:var(--gk-muted)}\n.gk-dot{position:absolute;left:0;top:0;width:14px;height:22px;margin:-11px 0 0 -7px;border-radius:3px;background:var(--gk-accent);offset-path:path(\"M75 40 C 105 5, 140 5, 140 40 S 105 75, 75 40 S 45 5, 10 40 S 45 75, 75 40\");animation:gk-eight 3.2s linear infinite}\n.gk-divider{height:1px;background:var(--gk-border);margin:14px 0}\n.gk-bar{position:absolute;left:50%;transform:translateX(-50%);max-width:calc(100% - 24px);display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:var(--gk-button-radius);background:var(--gk-bar-background);color:var(--gk-bar-text);border:1px solid var(--gk-border);box-shadow:0 6px 20px rgba(0,0,0,.18);font-size:.9rem;pointer-events:auto}\n.gk-bar--top{top:max(10px,env(safe-area-inset-top))}\n.gk-bar--bottom{bottom:max(10px,env(safe-area-inset-bottom))}\n.gk-bar[role=button]{cursor:pointer}\n.gk-bar .gk-lamp::before{flex:none}\n@keyframes gk-spin{to{transform:rotate(360deg)}}\n@keyframes gk-blink{50%{opacity:.35}}\n@keyframes gk-eight{from{offset-distance:0%}to{offset-distance:100%}}\n@media (prefers-reduced-motion:reduce){.gk-spinner,.gk-lamp[data-state=busy]::before,.gk-dot{animation:none}.gk-dot{offset-distance:20%}}\n";
/** Apply a theme to any element (also usable on your own containers). */
export declare function applyTheme(element: HTMLElement, theme: Partial<Theme>): void;
export declare function mountGeoKitUI(kit: GeoKit, options?: UIOptions): GeoKitUI;
