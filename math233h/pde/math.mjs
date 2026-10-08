/** Exact solutions of three PDEs, and their analytic derivatives.
 * The square [-π,π]² is a viewing window unless a boundary condition is
 * explicitly stated in the preset. Time for the heat equation is nonnegative.
 * Coordinates, derivatives, and residuals all use mathematical units.
 */

export const PDE_KINDS = Object.freeze(['wave', 'laplace', 'heat']);
export const DOMAIN = Object.freeze({
  x: Object.freeze([-Math.PI, Math.PI]),
  y: Object.freeze([-Math.PI, Math.PI]),
});
export const DEFAULT_PARAMS = Object.freeze({
  speed: 1, frequency: 1, diffusion: 0.25, sigma: 0.85,
});

const commonDomain = '−π ≤ x ≤ π, −π ≤ y ≤ π; a window into the exact solution.';

function preset(data) {
  return Object.freeze({ domain: commonDomain, domainBounds: DOMAIN, ...data,
    derivation: Object.freeze(data.derivation) });
}

export const PRESETS = Object.freeze({
  wave: Object.freeze([
    preset({
      id: 'traveling', title: 'Traveling wave', heightBound: 1,
      formula: 'u(x,y,t) = cos(k(x − ct))',
      boundary: 'An exact wave on the whole plane. For integer k, the square also has periodic boundary values.',
      lesson: 'The crests move to the right at speed c. The amplitude stays fixed; this wave does not depend on y.',
      derivation: [
        'Put θ = k(x − ct). Then uₜₜ = −k²c² cos θ.',
        'Also uₓₓ = −k² cos θ and uᵧᵧ = 0.',
        'Hence uₜₜ = c²(uₓₓ + uᵧᵧ). A crest satisfies x − ct = constant.',
      ],
    }),
    preset({
      id: 'standing', title: 'Standing wave', heightBound: 1,
      formula: 'u(x,y,t) = cos(kx) cos(kct)',
      boundary: 'An exact whole-plane wave. Integer k gives periodic boundary values on the displayed square.',
      lesson: 'Fixed nodes separate regions that oscillate in opposite phases. A standing wave is the sum of two equal waves moving in opposite directions.',
      derivation: [
        'uₜₜ = −k²c²u, uₓₓ = −k²u, and uᵧᵧ = 0.',
        'Therefore uₜₜ = c²(uₓₓ + uᵧᵧ).',
        'The identity cos(kx) cos(kct) = ½[cos(k(x − ct)) + cos(k(x + ct))] explains the stationary nodes.',
      ],
    }),
    preset({
      id: 'membrane', title: 'Vibrating membrane', heightBound: 1,
      formula: 'u(x,y,t) = cos(kx) cos(ky) cos(√2 kct)',
      boundary: 'Integer k gives a periodic membrane on the square, rather than a membrane with clamped edges. Half-integer k would instead make u = 0 on every edge.',
      lesson: 'Two spatial curvatures produce the factor √2 in the oscillation frequency. The nodal grid stays fixed while the cells rise and fall.',
      derivation: [
        'Each spatial second derivative is −k²u, so uₓₓ + uᵧᵧ = −2k²u.',
        'A time factor cos(ωt) has second derivative −ω² cos(ωt).',
        'Choose ω = √2 kc. Then −ω²u = c²(−2k²u).',
      ],
    }),
  ]),
  laplace: Object.freeze([
    preset({
      id: 'saddle', title: 'Balanced saddle', heightBound: 1,
      formula: 'u(x,y) = (x² − y²)/π²',
      boundary: 'A harmonic function throughout the plane. On the square its boundary values are exactly those given by this formula.',
      lesson: 'A harmonic surface need not be flat: its upward curvature in one direction cancels its downward curvature in the other.',
      derivation: [
        'uₓₓ = 2/π², while uᵧᵧ = −2/π².',
        'Their sum is zero at every point.',
        'Around any circle contained in the domain, the average height is the height at its center. Positive and negative contributions cancel.',
      ],
    }),
    preset({
      id: 'ripple', title: 'Harmonic boundary ripple', heightBound: 1,
      formula: 'u(x,y) = sin(kx) sinh(ky)/sinh(kπ)',
      boundary: 'For integer k, u = 0 on x = ±π and u(x,±π) = ±sin(kx). The formula solves this Dirichlet boundary-value problem exactly.',
      lesson: 'Oscillating boundary data relax toward the middle. The opposite spatial curvatures cancel, and interior values are local circle averages.',
      derivation: [
        'The x derivative twice contributes −k²u because (sin(kx))″ = −k² sin(kx).',
        'The y derivative twice contributes +k²u because (sinh(ky))″ = k² sinh(ky).',
        'Thus uₓₓ + uᵧᵧ = 0. Normalization by sinh(kπ) keeps |u| ≤ 1 throughout the square.',
      ],
    }),
    preset({
      id: 'cubic', title: 'Harmonic threefold saddle', heightBound: 2,
      formula: 'u(x,y) = (x³ − 3xy²)/π³ = Re((x + iy)³)/π³',
      boundary: 'A harmonic polynomial on the whole plane. Its formula supplies the square’s boundary data; there are no interior sources.',
      lesson: 'Three rising lobes alternate with three falling lobes. More complicated geometry can still have precisely balanced curvature.',
      derivation: [
        'uₓ = (3x² − 3y²)/π³ and uᵧ = −6xy/π³.',
        'Differentiate again: uₓₓ = 6x/π³ and uᵧᵧ = −6x/π³.',
        'Their sum is zero, including at the origin where the gradient also vanishes.',
      ],
    }),
  ]),
  heat: Object.freeze([
    preset({
      id: 'gaussian', title: 'Spreading heat pulse', heightBound: 1,
      formula: 'u(x,y,t) = σ²/D · exp(−(x² + y²)/D),  D = σ² + 4κt',
      boundary: 'An exact freely spreading solution on the whole plane, viewed through the square. No insulated or fixed-temperature condition is imposed at its edges.',
      lesson: 'The hot spot broadens and its peak falls. Total heat on the whole plane remains πσ²; heat inside the viewing square may escape across its boundary.',
      derivation: [
        'Let r² = x² + y² and D = σ² + 4κt. Then uₜ = 4κ(r²/D² − 1/D)u.',
        'Also uₓₓ + uᵧᵧ = (4r²/D² − 4/D)u.',
        'Consequently uₜ = κ(uₓₓ + uᵧᵧ). The integral over the whole plane is (σ²/D)·πD = πσ².',
      ],
    }),
    preset({
      id: 'fourier', title: 'Fine detail fades first', heightBound: 1,
      formula: 'u = 0.55 cos(kx) cos(ky)e^(−2κk²t) + 0.30 cos(2kx)e^(−4κk²t) + 0.15 sin(3ky)e^(−9κk²t)',
      boundary: 'For integer k, opposite edges of the square match periodically, including the derivatives. Heat is conserved on this periodic domain; its mean is zero.',
      lesson: 'High-frequency features disappear fastest: these three patterns decay at rates 2κk², 4κk², and 9κk². Negative u denotes a temperature deviation below the reference level.',
      derivation: [
        'For cos(ax) cos(by), the Laplacian is −(a² + b²) times the same function.',
        'Multiplying by e^(−κ(a²+b²)t) makes the time derivative equal κ times the Laplacian.',
        'Each of the three summands solves the heat equation. Linearity means their sum does too.',
      ],
    }),
    preset({
      id: 'single', title: 'One cooling Fourier mode', heightBound: 1,
      formula: 'u(x,y,t) = cos(kx) cos(ky)e^(−2κk²t)',
      boundary: 'For integer k this is an exact periodic-domain solution. Negative u is a deviation below the reference temperature, rather than an absolute temperature.',
      lesson: 'Compare this with the vibrating membrane: the same spatial pattern oscillates for the wave equation but decays for the heat equation.',
      derivation: [
        'uₓₓ + uᵧᵧ = −2k²u.',
        'The time derivative of e^(−2κk²t) is −2κk² times that factor.',
        'Therefore uₜ = −2κk²u = κ(uₓₓ + uᵧᵧ).',
      ],
    }),
  ]),
});
export const presets = PRESETS;

/** UI limits explicitly control scale and prevent an overflowing sinh.
 * The formulas remain valid for noninteger k, but only integer k matches the
 * periodic boundary conditions on a square of side 2π.
 */
export function normalizeParams(params = {}) {
  const number = (key, min, max) => {
    const value = Number(params[key] ?? DEFAULT_PARAMS[key]);
    if (!Number.isFinite(value)) throw new TypeError(`${key} must be finite`);
    return Math.min(max, Math.max(min, value));
  };
  return {
    speed: number('speed', 0.1, 4),
    frequency: number('frequency', 0.25, 4),
    diffusion: number('diffusion', 0.01, 2),
    sigma: number('sigma', 0.2, 2),
  };
}

export function getPreset(kind, id) {
  const group = PRESETS[kind];
  if (!group) throw new RangeError(`Unknown PDE family: ${kind}`);
  const value = typeof id === 'number' ? group[id] : group.find(p => p.id === id);
  if (!value) throw new RangeError(`Unknown ${kind} preset: ${id}`);
  return value;
}

/** All derivatives are analytic, not finite differences or a numerical solver.
 * flux is wave-energy flux (−c²uₜ∇u), potential flux (−∇u), or heat flux
 * (−κ∇u). gradient is supplied separately to avoid confusing these quantities.
 */
export function evaluate(kind, presetId, x, y, t = 0, params = {}) {
  const selected = getPreset(kind, typeof presetId === 'object' ? presetId.id : presetId);
  if (![x, y, t].every(Number.isFinite)) throw new TypeError('x, y, and t must be finite');
  if (kind === 'heat' && t < 0) throw new RangeError('Heat demonstrations require t ≥ 0');
  const { speed: c, frequency: k, diffusion: kap, sigma } = normalizeParams(params);
  const k2 = k * k;
  let u = 0, ux = 0, uy = 0, uxx = 0, uyy = 0, ut = 0, utt = 0;
  if (kind === 'wave') {
    if (selected.id === 'traveling') {
      const theta = k * (x - c * t), s = Math.sin(theta);
      u = Math.cos(theta); ux = -k * s; uxx = -k2 * u;
      ut = k * c * s; utt = -k2 * c * c * u;
    } else {
      const cx = Math.cos(k * x), sx = Math.sin(k * x);
      const cy = selected.id === 'membrane' ? Math.cos(k * y) : 1;
      const sy = selected.id === 'membrane' ? Math.sin(k * y) : 0;
      const omega = (selected.id === 'membrane' ? Math.SQRT2 : 1) * k * c;
      const ct = Math.cos(omega * t), st = Math.sin(omega * t);
      u = cx * cy * ct; ux = -k * sx * cy * ct;
      uy = -k * cx * sy * ct; uxx = -k2 * u;
      uyy = selected.id === 'membrane' ? -k2 * u : 0;
      ut = -omega * cx * cy * st; utt = -omega * omega * u;
    }
  } else if (kind === 'laplace') {
    if (selected.id === 'saddle') {
      const p2 = Math.PI * Math.PI;
      u = (x * x - y * y) / p2; ux = 2 * x / p2; uy = -2 * y / p2;
      uxx = 2 / p2; uyy = -2 / p2;
    } else if (selected.id === 'ripple') {
      const scale = Math.sinh(k * Math.PI), sx = Math.sin(k * x), cx = Math.cos(k * x);
      const shy = Math.sinh(k * y) / scale, chy = Math.cosh(k * y) / scale;
      u = sx * shy; ux = k * cx * shy; uy = k * sx * chy;
      uxx = -k2 * u; uyy = k2 * u;
    } else {
      const p3 = Math.PI ** 3;
      u = (x ** 3 - 3 * x * y * y) / p3;
      ux = (3 * x * x - 3 * y * y) / p3; uy = -6 * x * y / p3;
      uxx = 6 * x / p3; uyy = -6 * x / p3;
    }
  } else if (selected.id === 'gaussian') {
    const s2 = sigma * sigma, D = s2 + 4 * kap * t;
    const r2 = x * x + y * y;
    u = s2 / D * Math.exp(-r2 / D);
    ux = -2 * x / D * u; uy = -2 * y / D * u;
    uxx = (4 * x * x / (D * D) - 2 / D) * u;
    uyy = (4 * y * y / (D * D) - 2 / D) * u;
    ut = 4 * kap * (r2 / (D * D) - 1 / D) * u;
    utt = (4 * kap) ** 2 * (2 / (D * D) - 4 * r2 / D ** 3 + r2 * r2 / D ** 4) * u;
  } else {
    const cx = Math.cos(k * x), sx = Math.sin(k * x);
    const cy = Math.cos(k * y), sy = Math.sin(k * y);
    const rate = kap * k2;
    const a = (selected.id === 'fourier' ? 0.55 : 1) * Math.exp(-2 * rate * t);
    const termA = a * cx * cy;
    u = termA; ux = -a * k * sx * cy; uy = -a * k * cx * sy;
    uxx = -k2 * termA; uyy = -k2 * termA;
    ut = -2 * rate * termA; utt = 4 * rate * rate * termA;
    if (selected.id === 'fourier') {
      const b = 0.3 * Math.exp(-4 * rate * t), d = 0.15 * Math.exp(-9 * rate * t);
      const termB = b * Math.cos(2 * k * x), termD = d * Math.sin(3 * k * y);
      u += termB + termD; ux -= 2 * k * b * Math.sin(2 * k * x);
      uy += 3 * k * d * Math.cos(3 * k * y);
      uxx -= 4 * k2 * termB; uyy -= 9 * k2 * termD;
      ut -= rate * (4 * termB + 9 * termD);
      utt += rate * rate * (16 * termB + 81 * termD);
    }
  }
  const laplacian = uxx + uyy;
  const residual = kind === 'wave' ? utt - c * c * laplacian
    : kind === 'heat' ? ut - kap * laplacian : laplacian;
  const fluxScale = kind === 'wave' ? -c * c * ut : kind === 'heat' ? -kap : -1;
  return { u, ux, uy, uxx, uyy, ut, utt, laplacian, residual,
    gradient: { x: ux, y: uy }, flux: { x: fluxScale * ux, y: fluxScale * uy },
    energy: kind === 'wave' ? (ut * ut + c * c * (ux * ux + uy * uy)) / 2 : null,
  };
}

/** A rigorous bound over the viewing square (and all t ≥ 0 for heat).
 * Wave amplitude remains fixed. Heat bounds shrink on the actual physical
 * scale, so the renderer should not normalize them back to their initial peak.
 */
export function amplitudeBound(kind, presetId, t = 0, params = {}) {
  const selected = getPreset(kind, typeof presetId === 'object' ? presetId.id : presetId);
  if (kind !== 'heat') return selected.heightBound;
  if (t < 0) throw new RangeError('Heat demonstrations require t ≥ 0');
  const { frequency: k, diffusion: kap, sigma } = normalizeParams(params);
  if (selected.id === 'gaussian') return sigma * sigma / (sigma * sigma + 4 * kap * t);
  const rate = kap * k * k;
  return selected.id === 'single' ? Math.exp(-2 * rate * t)
    : 0.55 * Math.exp(-2 * rate * t) + 0.3 * Math.exp(-4 * rate * t) + 0.15 * Math.exp(-9 * rate * t);
}

/** Mean-value circle for harmonic-function demonstrations. All sampled points
 * must remain in the square if the viewer is interpreting its boundary data.
 * The mathematical mean-value property applies because all these examples
 * are harmonic on the whole plane, including the interior of every circle.
 */
export function circleAverage(presetId, x, y, radius, params = {}, count = 128) {
  if (!(radius >= 0) || !Number.isFinite(radius)) throw new RangeError('radius must be finite and nonnegative');
  if (!Number.isInteger(count) || count < 16) throw new RangeError('count must be an integer ≥ 16');
  let average = 0;
  for (let j = 0; j < count; j++) {
    const angle = 2 * Math.PI * j / count;
    average += evaluate('laplace', presetId, x + radius * Math.cos(angle),
      y + radius * Math.sin(angle), 0, params).u / count;
  }
  return average;
}
