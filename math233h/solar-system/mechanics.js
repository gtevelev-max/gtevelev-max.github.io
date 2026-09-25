/* Fixed J2000 elements from NASA/JPL SSD Table 1. Units: AU and Julian years.
   The idealized model holds all elements fixed and uses mu = 4 pi^2. */
(function (root) {
  'use strict';
  const TAU = 2 * Math.PI, MU = TAU * TAU, DAYS = 365.25;
  const AU_METERS = 149597870700, YEAR_SECONDS = DAYS * 86400;
  // Planet-only masses in kg, NASA/JPL SSD Planetary Physical Parameters.
  const masses = [.330103, 4.86731, 5.97217, .641691, 1898.125, 568.317, 86.8099, 102.4092].map(x => x * 1e24);
  const raw = [
    ['Mercury', .38709927, .20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, '#bcb9b1', 4],
    ['Venus', .72333566, .00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, '#e6bd7c', 6],
    ['Earth', 1.00000261, .01671123, -.00001531, 100.46457166, 102.93768193, 0, '#57cae3', 6],
    ['Mars', 1.52371034, .09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, '#f28a65', 5],
    ['Jupiter', 5.20288700, .04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, '#e1bc95', 10],
    ['Saturn', 9.53667594, .05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, '#ead7a2', 8],
    ['Uranus', 19.18916464, .04725744, .77263783, 313.23810451, 170.95427630, 74.01692503, '#88d3d5', 7],
    ['Neptune', 30.06992276, .00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, '#7d9cf5', 7]
  ];
  const planets = raw.map(([name, a, e, inc, L, peri, node, color, size], j) => ({ name, a, e, inc: inc * Math.PI / 180, omega: (peri - node) * Math.PI / 180, node: node * Math.PI / 180, M0: (L - peri) * Math.PI / 180, color, size, period: a ** 1.5, mass: masses[j] }));
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const scale = (a, k) => a.map(x => x * k);
  const norm = a => Math.hypot(...a);
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const mod = (a, b) => ((a % b) + b) % b;
  function eccentricAnomaly(M, e) {
    const reduced = mod(M + Math.PI, TAU) - Math.PI;
    let E = reduced;
    for (let n = 0; n < 20; n++) {
      const d = (E - e * Math.sin(E) - reduced) / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-14) break;
    }
    return E;
  }
  function rotate(p, v) {
    const c = Math.cos(p.omega), s = Math.sin(p.omega), C = Math.cos(p.node), S = Math.sin(p.node), ci = Math.cos(p.inc), si = Math.sin(p.inc);
    return [
      (c*C-s*S*ci)*v[0] + (-s*C-c*S*ci)*v[1] + S*si*v[2],
      (c*S+s*C*ci)*v[0] + (-s*S+c*C*ci)*v[1] - C*si*v[2],
      s*si*v[0] + c*si*v[1] + ci*v[2]
    ];
  }
  function stateAtMean(p, M) {
    const E = eccentricAnomaly(M, p.e), n = Math.sqrt(MU / p.a ** 3), Eprime = n / (1 - p.e * Math.cos(E)), b = p.a * Math.sqrt(1 - p.e ** 2);
    const r = rotate(p, [p.a * (Math.cos(E) - p.e), b * Math.sin(E), 0]);
    const v = rotate(p, [-p.a * Math.sin(E) * Eprime, b * Math.cos(E) * Eprime, 0]);
    const radius = norm(r), acc = scale(r, -MU / radius ** 3), h = cross(r, v);
    const force = scale(acc, p.mass * AU_METERS / YEAR_SECONDS ** 2);
    return { r, v, acc, force, h, radius, speed: norm(v), E, M, areaRate: norm(h) / 2 };
  }
  function state(p, years) { return stateAtMean(p, p.M0 + TAU * years / p.period); }
  function orbit(p, segments = 240) { return Array.from({length: segments + 1}, (_, j) => stateAtMean(p, TAU*j/segments).r); }
  function sector(p, fromM, toM, segments = 36) {
    return [[0,0,0], ...Array.from({length: segments + 1}, (_, j) => stateAtMean(p, fromM + (toM-fromM)*j/segments).r), [0,0,0]];
  }
  const api = { TAU, MU, DAYS, AU_METERS, YEAR_SECONDS, planets, add, scale, norm, dot, cross, mod, rotate, eccentricAnomaly, stateAtMean, state, orbit, sector };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Orbits = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
