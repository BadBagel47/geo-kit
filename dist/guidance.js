export function getGuidance(state, options = {}) {
    const { location: loc, compass, device } = state;
    const dismissed = options.dismissed ?? new Set();
    const requireCompass = options.requireCompass === true;
    const waitForFix = options.waitForFix !== false;
    const lamps = {
        location: loc ? locationLamp(loc.status) : null,
        compass: compass ? compassLamp(compass.status) : null,
    };
    const accuracy = loc?.fix ? Math.round(loc.fix.accuracy) : null;
    const result = (screen, bar = null) => ({ screen, bar, barAction: bar === 'calibrate' ? 'calibrate' : null, lamps, values: { accuracy } });
    if (options.forced)
        return result(options.forced);
    const block = (id) => !dismissed.has(id);
    if (!device.mobile && !state.started && block('desktop'))
        return result('desktop');
    if (!state.started)
        return result('intro');
    // Problems that stop everything.
    if (loc?.status === 'insecure' || compass?.status === 'insecure')
        return result('insecure');
    if (loc?.status === 'unsupported')
        return result('unsupported');
    if (loc?.status === 'blocked')
        return result('location-blocked');
    if (loc?.status === 'denied')
        return result('location-denied');
    // Compass problems: blocking when required, otherwise shown once and then dismissible.
    const compassScreen = !compass ? null
        : compass.needsGesture && compass.status === 'off' ? 'compass-tap'
            : compass.status === 'denied' ? 'compass-denied'
                : compass.status === 'missing' ? 'compass-missing'
                    : compass.status === 'no-north' ? 'compass-no-north'
                        : compass.status === 'unsupported' ? (requireCompass ? 'unsupported' : null)
                            : null;
    if (compassScreen && (requireCompass || block(compassScreen)))
        return result(compassScreen);
    if (loc?.status === 'requesting' || compass?.status === 'requesting')
        return result('requesting');
    if (loc && waitForFix && !loc.fix && block('waiting'))
        return result('waiting');
    return result(null, pickBar(state));
}
function pickBar(state) {
    const { location: loc, compass, direction } = state;
    if (loc) {
        if (loc.status === 'stale')
            return 'stale';
        if (!loc.fix && (loc.status === 'searching' || loc.status === 'requesting'))
            return 'searching';
    }
    if (compass) {
        if (compass.status === 'pose')
            return compass.hint === 'hold-up' ? 'hold-up' : compass.hint === 'hold-lower' ? 'hold-lower' : 'flatter';
        if (compass.needsCalibration && compass.status === 'ok')
            return 'calibrate';
        if (compass.status === 'stale')
            return direction.source === 'course' ? 'course' : 'compass-stale';
        if (['denied', 'missing', 'no-north', 'unsupported'].includes(compass.status))
            return direction.source === 'course' ? 'course' : 'no-compass';
    }
    if (loc?.status === 'weak')
        return 'weak';
    return null;
}
function locationLamp(status) {
    switch (status) {
        case 'ok': return 'ok';
        case 'weak':
        case 'stale': return 'warn';
        case 'requesting':
        case 'searching': return 'busy';
        case 'off': return 'off';
        default: return 'error';
    }
}
function compassLamp(status) {
    switch (status) {
        case 'ok': return 'ok';
        case 'pose':
        case 'stale': return 'warn';
        case 'requesting':
        case 'waiting': return 'busy';
        case 'off': return 'off';
        default: return 'error';
    }
}
