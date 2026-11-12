/**
 * Magnetic declination (difference between magnetic and true north) from the
 * World Magnetic Model WMM2025, produced by NOAA NCEI and the British Geological Survey.
 * The coefficients are public-domain data from https://www.ncei.noaa.gov/products/world-magnetic-model
 * (WMM.COF, epoch 2025.0, valid 2025.0–2030.0). Replace the table with WMM2030 when it is released.
 */
export declare const WMM_MODEL = "WMM2025";
export declare const WMM_VALID_UNTIL = 2030;
/** Decimal year, e.g. 2026.86 for mid-November 2026. */
export declare function decimalYear(date?: Date): number;
/**
 * Magnetic declination in degrees (positive = magnetic north is east of true north).
 * Add it to a magnetic heading to get a true heading.
 * @param altitudeKm height above the WGS84 ellipsoid in km (0 is fine for games)
 */
export declare function magneticDeclination(lat: number, lon: number, year?: number, altitudeKm?: number): number;
