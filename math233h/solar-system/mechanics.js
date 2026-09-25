/* Fixed planet elements from NASA/JPL SSD Table 1; JPL sample Halley elements.
   Reference axes: J2000 ecliptic. Units: AU and Julian years.
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
  // https://ssd.jpl.nasa.gov/sb/elem_tables.html — sample 1P/Halley, JPL J863/77.
  // Elements epoch MJD 49400; q/e/i/omega/node held fixed for an ideal two-body
  // teaching orbit. Perihelion time 1986-02-05.89532 gives its J2000 phase.
  // Mass is explicitly a teaching assumption, not a claimed precise measurement.
  const halleyA = .58597811 / (1 - .96714291);
  const comet = {name: 'Halley', menuName: 'Comet (Halley)', kind: 'comet', a: halleyA, e: .96714291, inc:162.26269*Math.PI/180, omega:111.33249*Math.PI/180, node:58.42008*Math.PI/180, period:halleyA**1.5, mass:1e14, assumedMass:true, color:'#b6e7df', size:5, epochMJD:49400};
  comet.M0 = TAU * 5077.60468 / DAYS / comet.period;
  const bodies = [...planets, comet];
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const scale = (a, k) => a.map(x => x * k);
  const norm = a => Math.hypot(...a);
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const mod = (a, b) => ((a % b) + b) % b;
  function eccentricAnomaly(M, e) {
    const reduced = mod(M + Math.PI, TAU) - Math.PI;
    // Safeguarded Newton iteration retains a bracket, including for high-e comets.
    let low = -Math.PI, high = Math.PI, E = e < .8 ? reduced : Math.sign(reduced) * Math.PI;
    for (let n = 0; n < 64; n++) {
      const residual = E - e * Math.sin(E) - reduced;
      if (Math.abs(residual) < 2e-15) break;
      if (residual > 0) high = E; else low = E;
      const trial = E - residual / (1 - e * Math.cos(E));
      E = trial > low && trial < high ? trial : (low + high) / 2;
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
  function positionAtE(p, E) { return rotate(p, [p.a*(Math.cos(E)-p.e),p.a*Math.sqrt(1-p.e*p.e)*Math.sin(E),0]); }
  function orbit(p, segments = 240) { return Array.from({length: segments + 1}, (_, j) => positionAtE(p, TAU*j/segments)); }
  function sector(p, fromM, toM, segments = 36) {
    // Endpoints are uniformly spaced in TIME (M), while the intervening ellipse
    // is sampled in E so the rapid perihelion turn is geometrically resolved.
    const continuousE = M => eccentricAnomaly(M,p.e) + TAU*Math.floor((M+Math.PI)/TAU);
    const fromE=continuousE(fromM),toE=continuousE(toM),span=toE-fromE;
    const count=Math.max(segments,Math.ceil(Math.abs(span)/.018));
    return [[0,0,0], ...Array.from({length: count + 1}, (_, j) => positionAtE(p,fromE+span*j/count)), [0,0,0]];
  }
  const api = { TAU, MU, DAYS, AU_METERS, YEAR_SECONDS, planets, comet, bodies, add, scale, norm, dot, cross, mod, rotate, eccentricAnomaly, positionAtE, stateAtMean, state, orbit, sector };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Orbits = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
