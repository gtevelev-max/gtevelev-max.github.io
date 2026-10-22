/** Pure mathematical engine for a bead on a circular constraint.
 * Landscape f=x^4+y^4-4xy+1. Constraint (x-a)^2+(y-b)^2=c=r^2.
 * Angles are radians, in [0,2pi). lambda uses grad f=lambda grad g.
 * The centered case is analytically enumerated. Shifted cases are numerical:
 * their reported global extrema are comparisons of the numerical candidate set.
 */
const TAU = 2 * Math.PI;
const EPS = Number.EPSILON;
const angle = t => ((t % TAU) + TAU) % TAU;
const distance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function f(x, y) { return x ** 4 + y ** 4 - 4 * x * y + 1; }
export function gradient(x, y) { return { x: 4 * x ** 3 - 4 * y, y: 4 * y ** 3 - 4 * x }; }

function parameters({ a = 0, b = 0, r = 1 } = {}) {
  if (![a, b, r].every(Number.isFinite) || !(r > 0)) {
    throw new RangeError('The center must be finite and the radius must be finite and positive.');
  }
  return { a, b, r };
}

/** dF and d2F are derivatives with respect to theta; tangentResidual is
 * the norm of the tangent projection of grad f (derivative per unit arc length).
 */
export function evaluate(theta, options = {}) {
  if (!Number.isFinite(theta)) throw new RangeError('theta must be finite.');
  const { a, b, r } = parameters(options);
  const cosine = Math.cos(theta), sine = Math.sin(theta);
  const x = a + r * cosine, y = b + r * sine;
  const grad = gradient(x, y);
  const vx = -r * sine, vy = r * cosine;
  const dF = grad.x * vx + grad.y * vy;
  const d2F = 12 * x * x * vx * vx - 8 * vx * vy + 12 * y * y * vy * vy
    - r * (grad.x * cosine + grad.y * sine);
  const lambda = (grad.x * cosine + grad.y * sine) / (2 * r);
  const tangentGradient = { x: grad.x - 2 * r * lambda * cosine, y: grad.y - 2 * r * lambda * sine };
  return {
    theta: angle(theta), point: { x, y }, x, y, value: f(x, y), gradient: grad,
    constraintGradient: { x: 2 * r * cosine, y: 2 * r * sine },
    tangent: { x: -sine, y: cosine }, dF, d2F, secondDerivative: d2F, lambda,
    tangentResidual: Math.abs(dF) / r, tangentGradient,
  };
}

function threshold(c) { return Math.abs(c - 2) <= 16 * EPS * Math.max(2, c); }

/** Analytic branches as functions of c=r^2, for a=b=0.
 * At c=2 the new-max branch coincides with the opposite-diagonal branch;
 * it is listed as active but merged, not as four additional points.
 */
export function centeredBranches(c) {
  if (!Number.isFinite(c) || !(c > 0)) throw new RangeError('c must be finite and positive.');
  const atThreshold = threshold(c);
  const effectiveC = atThreshold ? 2 : c;
  return [
    { id: 'positive-diagonal', label: 'Same-sign diagonal', active: true, merged: false, count: 2,
      value: effectiveC ** 2 / 2 - 2 * effectiveC + 1, lambda: effectiveC - 2,
      classification: 'min', extremumType: 'min', degenerate: false, globalMin: true, globalMax: false },
    { id: 'negative-diagonal', label: 'Opposite-sign diagonal', active: true, merged: false, count: 2,
      value: effectiveC ** 2 / 2 + 2 * effectiveC + 1, lambda: effectiveC + 2,
      classification: atThreshold ? 'degenerate' : effectiveC < 2 ? 'max' : 'min',
      extremumType: effectiveC <= 2 ? 'max' : 'min', degenerate: atThreshold,
      globalMin: false, globalMax: effectiveC <= 2 },
    { id: 'off-diagonal-max', label: 'New maxima: xy = -1', active: effectiveC >= 2,
      merged: atThreshold, count: effectiveC > 2 ? 4 : 0,
      value: effectiveC ** 2 + 3, lambda: 2 * effectiveC,
      classification: atThreshold ? 'degenerate' : 'max', extremumType: 'max',
      degenerate: atThreshold, globalMin: false, globalMax: effectiveC >= 2 },
  ];
}
export const analyticCenteredBranches = centeredBranches;

function centeredPoints(options) {
  const { r } = options, c = r * r;
  const branches = centeredBranches(c);
  const points = [];
  const add = (theta, branch) => points.push({ ...evaluate(theta, options), ...branch, theta: angle(theta), branch: branch.id,
    localMin: branch.extremumType === 'min', localMax: branch.extremumType === 'max' });
  for (const theta of [Math.PI / 4, 5 * Math.PI / 4]) add(theta, branches[0]);
  for (const theta of [3 * Math.PI / 4, 7 * Math.PI / 4]) add(theta, branches[1]);
  if (c > 2 && !threshold(c)) {
    const beta = Math.asin(2 / c);
    for (const theta of [Math.PI / 2 + beta / 2, Math.PI - beta / 2,
      3 * Math.PI / 2 + beta / 2, TAU - beta / 2]) add(theta, branches[2]);
  }
  points.sort((a, b) => a.theta - b.theta);
  return { points, count: points.length, method: 'analytic-centered', certified: true,
    warnings: [], branches, atThreshold: threshold(c), globalComparison: 'analytic' };
}

// Polynomial coefficients are stored in ascending order. Four tan-half-angle
// charts keep |t|<=tan(pi/8); no root can hide at t=infinity.
const addPoly = (a, b) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] || 0) + (b[i] || 0));
const scalePoly = (a, k) => a.map(x => x * k);
function multiply(a, b) {
  const c = Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) c[i + j] += a[i] * b[j];
  return c;
}
function polyValue(p, x) {
  let value = 0;
  for (let i = p.length - 1; i >= 0; i--) value = value * x + p[i];
  return value;
}
function normalized(p) {
  const scale = Math.max(...p.map(Math.abs));
  if (!scale) return [0];
  p = p.map(x => x / scale);
  while (p.length > 1 && Math.abs(p.at(-1)) < 8 * EPS) p.pop();
  return p;
}
function dedupNumbers(xs, tolerance = 2e-12) {
  xs.sort((a, b) => a - b);
  return xs.filter((x, i) => !i || x - xs[i - 1] > tolerance);
}
function bisect(p, a, b) {
  let fa = polyValue(p, a);
  for (let i = 0; i < 90 && b - a > 8e-15; i++) {
    const m = (a + b) / 2, fm = polyValue(p, m);
    if (fm === 0) return m;
    if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

/** Recursively partition by derivative roots, so simple roots and even
 * multiplicities can both be found. This is floating-point root isolation,
 * not interval-arithmetic certification. */
function rootsOnInterval(coefficients, lo, hi) {
  const p = normalized(coefficients), degree = p.length - 1;
  if (degree < 1) return [];
  if (degree === 1) {
    const root = -p[0] / p[1];
    return root >= lo - 1e-13 && root <= hi + 1e-13 ? [Math.max(lo, Math.min(hi, root))] : [];
  }
  const critical = rootsOnInterval(p.slice(1).map((v, i) => v * (i + 1)), lo, hi);
  const cuts = dedupNumbers([lo, ...critical, hi]);
  const values = cuts.map(x => polyValue(p, x));
  const roots = [];
  const bracketed = Array(cuts.length - 1).fill(false);
  for (let i = 0; i + 1 < cuts.length; i++) {
    if (values[i] * values[i + 1] < 0) {
      roots.push(bisect(p, cuts[i], cuts[i + 1]));
      bracketed[i] = true;
    }
  }
  for (let i = 0; i < cuts.length; i++) {
    if (Math.abs(values[i]) <= 2e-13 && !bracketed[i - 1] && !bracketed[i]) roots.push(cuts[i]);
  }
  return dedupNumbers(roots);
}

function chartPolynomial({ a, b, r }, cosine, sine) {
  const d = [1, 0, 1], d2 = multiply(d, d);
  const X = [a + r * cosine, -2 * r * sine, a - r * cosine];
  const Y = [b + r * sine, 2 * r * cosine, b - r * sine];
  const VX = [-r * sine, -2 * r * cosine, r * sine];
  const VY = [r * cosine, -2 * r * sine, -r * cosine];
  const gx = addPoly(multiply(multiply(X, X), X), scalePoly(multiply(Y, d2), -1));
  const gy = addPoly(multiply(multiply(Y, Y), Y), scalePoly(multiply(X, d2), -1));
  return scalePoly(addPoly(multiply(gx, VX), multiply(gy, VY)), 4);
}

function classify(theta, options) {
  const item = evaluate(theta, options);
  const { r } = options;
  const scale = 1 + 12 * r * r * (item.x * item.x + item.y * item.y) + 8 * r * r
    + r * Math.hypot(item.gradient.x, item.gradient.y);
  const degenerate = Math.abs(item.d2F) <= 2e-8 * scale;
  let extremumType = item.d2F > 0 ? 'min' : 'max';
  if (degenerate) {
    const left = evaluate(theta - 1e-3, options).dF, right = evaluate(theta + 1e-3, options).dF;
    extremumType = left < 0 && right > 0 ? 'min' : left > 0 && right < 0 ? 'max' : null;
  }
  return { ...item, classification: degenerate ? 'degenerate' : extremumType, extremumType,
    degenerate, localMin: extremumType === 'min', localMax: extremumType === 'max' };
}

/** Returns {points,count,method,certified,warnings,globalComparison}.
 * For shifted circles, nearly multiple roots can be unresolved/merged; the
 * caller must display warnings and avoid presenting this as a proof.
 */
export function stationaryPoints(options = {}) {
  options = parameters(options);
  if (options.a === 0 && options.b === 0) return centeredPoints(options);
  const q = Math.tan(Math.PI / 8);
  const candidates = [];
  const charts = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let i = 0; i < charts.length; i++) {
    const p = chartPolynomial(options, ...charts[i]);
    for (const t of rootsOnInterval(p, -q, q)) candidates.push(angle(i * Math.PI / 2 + 2 * Math.atan(t)));
  }
  candidates.sort((a, b) => a - b);
  const angles = [];
  for (const theta of candidates) if (!angles.some(x => distance(x, theta) < 2e-8)) angles.push(theta);
  const points = angles.map(theta => classify(theta, options)).filter(item => {
    const scale = 1 + options.r * Math.hypot(item.gradient.x, item.gradient.y);
    return Math.abs(item.dF) <= 2e-9 * scale;
  });
  const warnings = ['Shifted-circle roots are numerical, not certified; nearly multiple roots may be unresolved or merged.'];
  if (points.length < 2 || points.length > 8) warnings.push('The root count is unexpected for this trigonometric polynomial; do not trust the candidate list.');
  if (points.some(p => p.degenerate)) warnings.push('A stationary point is nearly degenerate; its local type and nearby root count are numerically sensitive.');
  if (points.length) {
    const min = Math.min(...points.map(p => p.value)), max = Math.max(...points.map(p => p.value));
    const tolerance = 2e-10 * (1 + Math.max(Math.abs(min), Math.abs(max)));
    for (const point of points) {
      point.globalMin = Math.abs(point.value - min) <= tolerance;
      point.globalMax = Math.abs(point.value - max) <= tolerance;
      point.globalComparisonTolerance = tolerance;
    }
  }
  return { points, count: points.length, method: 'four-chart-polynomial-isolation', certified: false,
    warnings, globalComparison: 'numerical-candidate-comparison' };
}
