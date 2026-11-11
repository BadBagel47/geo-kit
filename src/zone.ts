/**
 * Noise-tolerant "am I at the target?" detection, based on rules field-tested in
 * blaster (enter at 15 m, stay unlocked to 35 m, 2 s grace for jumps) and
 * wacka (several fresh fixes within a short window).
 */
import { distanceMeters, type LatLon } from './math.js';
import type { Fix } from './location.js';

export type ZoneOptions = {
  center: LatLon;
  /** Distance (m) to count as arrived. Default 15. */
  radius?: number;
  /** Distance (m) to count as having left again. Must be >= radius. Default radius + 20. */
  exitRadius?: number;
  /** Fixes inside the radius needed to enter. Default 3. */
  requiredFixes?: number;
  /** Those fixes must arrive within this window. Default 3000 ms. */
  windowMs?: number;
  /** Ignore fixes less accurate than this (m). Default 30. */
  maxAccuracy?: number;
  /** Ignore fixes older than this (ms). Default 5000. */
  maxAgeMs?: number;
  /** Must stay beyond exitRadius this long to leave. Default 2000 ms. */
  exitGraceMs?: number;
};

export type ZoneResult = {
  inside: boolean;
  /** True on the update where the zone was entered / left. */
  entered: boolean;
  exited: boolean;
  /** Distance from the latest usable fix, or null. */
  distance: number | null;
};

export class ZoneMonitor {
  private readonly o: Required<ZoneOptions>;
  private hits: number[] = [];
  private inside = false;
  private outsideSince: number | null = null;
  private lastTimestamp = -Infinity;

  constructor(options: ZoneOptions) {
    const radius = options.radius ?? 15;
    this.o = {
      center: options.center, radius,
      exitRadius: Math.max(radius, options.exitRadius ?? radius + 20),
      requiredFixes: Math.max(1, options.requiredFixes ?? 3), windowMs: options.windowMs ?? 3000,
      maxAccuracy: options.maxAccuracy ?? 30, maxAgeMs: options.maxAgeMs ?? 5000, exitGraceMs: options.exitGraceMs ?? 2000,
    };
  }

  get isInside(): boolean { return this.inside; }

  reset(): void { this.hits = []; this.inside = false; this.outsideSince = null; this.lastTimestamp = -Infinity; }

  /** Feed every new fix (repeated fixes are ignored). `now` defaults to Date.now(). */
  update(fix: Fix | null, now = Date.now()): ZoneResult {
    const none = { inside: this.inside, entered: false, exited: false, distance: null };
    if (!fix || now - fix.timestamp > this.o.maxAgeMs) return none;
    const distance = distanceMeters(this.o.center, fix);
    if (fix.timestamp <= this.lastTimestamp || fix.accuracy > this.o.maxAccuracy) return { ...none, distance };
    this.lastTimestamp = fix.timestamp;
    if (!this.inside) {
      if (distance <= this.o.radius) this.hits.push(fix.timestamp); else this.hits = [];
      this.hits = this.hits.filter(t => fix.timestamp - t <= this.o.windowMs);
      if (this.hits.length >= this.o.requiredFixes) {
        this.inside = true; this.hits = []; this.outsideSince = null;
        return { inside: true, entered: true, exited: false, distance };
      }
      return { inside: false, entered: false, exited: false, distance };
    }
    if (distance <= this.o.exitRadius) { this.outsideSince = null; return { inside: true, entered: false, exited: false, distance }; }
    this.outsideSince ??= fix.timestamp;
    if (fix.timestamp - this.outsideSince >= this.o.exitGraceMs) {
      this.inside = false; this.outsideSince = null;
      return { inside: false, entered: false, exited: true, distance };
    }
    return { inside: true, entered: false, exited: false, distance };
  }
}
