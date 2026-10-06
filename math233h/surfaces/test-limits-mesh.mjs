import assert from 'node:assert/strict';
import {limitExamples, limitById, limitViewExample} from './limits-math.mjs';
import {buildLimitMesh} from './limits-mesh.mjs';

const radii = [1, .5, .1, .01];
let worstVertexError = 0, worstRidgeInteriorError = 0, worstDirectionalInteriorError = 0;
let normalChecks = 0;
for (const example of limitExamples) {
  for (const radius of radii) {
    const mesh = buildLimitMesh(example, radius);
    const p = mesh.positions, n = mesh.normals;
    const context = `${example.id} at radius ${radius}`;
    assert.ok(p instanceof Float32Array && n instanceof Float32Array, context);
    assert.equal(p.length, n.length, context);
    assert.equal(p.length, mesh.triangleCount * 9, context);
    assert.equal(p.length, mesh.vertexCount * 3, context);
    assert.equal(mesh.gridPositions.length % 6, 0, context);
    assert.equal(mesh.boundaryPositions.length % 6, 0, context);
    let maximumHeight = -Infinity, minimumHeight = Infinity, includesCenter = false;
    for (let i = 0; i < p.length; i += 3) {
      const u = p[i], v = p[i + 1], w = p[i + 2];
      assert.ok([u, v, w, n[i], n[i + 1], n[i + 2]].every(Number.isFinite), context);
      assert.ok(Math.hypot(u, v) <= 1 + 1e-7, context);
      assert.ok(w >= -1 && w <= 1, `${context}: height clipping`);
      assert.ok(Math.abs(Math.hypot(n[i], n[i + 1], n[i + 2]) - 1) < 1e-6, `${context}: unit normal`);
      assert.ok(n[i + 2] > 0, `${context}: upward normal`);
      includesCenter ||= u === 0 && v === 0;
      if (example.id !== 'polynomial') assert.ok(Math.hypot(u, v) > .00099, `${context}: original punctured domain`);
      const actual = (example.evaluate(example.target[0] + radius * u, example.target[1] + radius * v) - example.zCenter) / example.zScale;
      const error = Math.abs(actual - w);
      worstVertexError = Math.max(worstVertexError, error);
      assert.ok(error < 1e-5, `${context}: vertices must lie on the actual graph, including clipped edges`);
      maximumHeight = Math.max(maximumHeight, w);
      minimumHeight = Math.min(minimumHeight, w);

      // Independent finite-difference checks of normals in display coordinates.
      // Avoid the singular center and ridge extrema, where rounding Float32
      // positions can change the derivative of a very narrow peak substantially.
      if (i % 771 === 0 && Math.hypot(u, v) > .3 && n[i + 2] > .001) {
        const ridgeRatio = radius * v * v === 0 ? Infinity : Math.abs(u / (radius * v * v));
        if (example.id !== 'curved-path' || Math.abs(ridgeRatio - 1) > .08) {
          const h = example.id === 'curved-path' ? Math.min(1e-6, (Math.abs(u) + radius * v * v) * 1e-4) : 1e-6;
          const height = (x, y) => example.evaluate(example.target[0] + radius * x, example.target[1] + radius * y) / example.zScale;
          const nx = -(height(u + h, v) - height(u - h, v)) / (2 * h);
          const ny = -(height(u, v + h) - height(u, v - h)) / (2 * h);
          const length = Math.hypot(nx, ny, 1);
          assert.ok(Math.hypot(n[i] - nx / length, n[i + 1] - ny / length, n[i + 2] - 1 / length) < 1e-4, `${context}: analytic normal agrees with numerical gradient`);
          normalChecks++;
        }
      }
    }
    for (let i = 0; i < p.length; i += 9) {
      const area = (p[i + 3] - p[i]) * (p[i + 7] - p[i + 1]) - (p[i + 4] - p[i + 1]) * (p[i + 6] - p[i]);
      assert.ok(area > 0, `${context}: winding agrees with upward normals`);
      if (example.id === 'infinite' || example.id === 'polynomial') {
        for (const height of [-1, 1]) assert.ok(!(p[i + 2] === height && p[i + 5] === height && p[i + 8] === height), 'Clipping must not create a horizontal cap.');
      }
      if (example.id === 'curved-path' || example.id === 'two-paths') {
        // Check triangle interiors too: exact vertices alone would not catch a
        // coarse triangle inventing a large wall across the curved narrow ridge.
        const u = (p[i] + p[i + 3] + p[i + 6]) / 3;
        const v = (p[i + 1] + p[i + 4] + p[i + 7]) / 3;
        const w = (p[i + 2] + p[i + 5] + p[i + 8]) / 3;
        const actual = example.evaluate(radius * u, radius * v) / example.zScale;
        const error = Math.abs(actual - w);
        if (example.id === 'curved-path') worstRidgeInteriorError = Math.max(worstRidgeInteriorError, error);
        else worstDirectionalInteriorError = Math.max(worstDirectionalInteriorError, error);
        assert.ok(error < .01, `${context}: pathological graph remains resolved inside triangles`);
      }
    }
    if (example.id === 'curved-path') {
      assert.ok(Math.abs(maximumHeight * example.zScale - .5) < 1e-6, `${context}: positive ridge`);
      assert.ok(Math.abs(minimumHeight * example.zScale + .5) < 1e-6, `${context}: negative ridge`);
    }
    if (example.id === 'polynomial') assert.ok(includesCenter, 'The polynomial includes its value at (1,2).');
    if (example.id === 'infinite' && radius <= .1) assert.equal(mesh.triangleCount, 0, 'The entire graph lies above the fixed window.');
    else assert.ok(mesh.triangleCount > 20000 && mesh.triangleCount < 40000, `${context}: sufficient smooth mesh density`);
  }
}

// Reproduce intermediate slider radii, where the ridge-angle and circle-angle
// grids can almost coincide. The final uploaded triangles must stay well formed;
// checking only four round radii missed these radius-dependent slivers.
let worstRidgeCondition = 1;
for (let j = 0; j <= 50; j++) {
  const radius = 10 ** (-2 * j / 50);
  const mesh = buildLimitMesh(limitById['curved-path'], radius), p = mesh.positions;
  assert.ok(mesh.triangleCount < 40000, 'Resolve ridges without an excessive density increase.');
  for (let i = 0; i < p.length; i += 9) {
    const a = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]];
    const b = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
    const orientedArea = a[0] * b[1] - a[1] * b[0];
    assert.ok(orientedArea > 0, `Curved patch at ${radius}: Float32 winding`);
    const area = Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], orientedArea);
    const longestEdgeSquared = Math.max(a.reduce((s, x) => s + x * x, 0), b.reduce((s, x) => s + x * x, 0), a.reduce((s, x, k) => s + (x - b[k]) ** 2, 0));
    const condition = area / longestEdgeSquared;
    worstRidgeCondition = Math.min(worstRidgeCondition, condition);
    assert.ok(condition > .002, `Curved patch at ${radius}: avoid almost coincident angular columns`);
  }
  // Mesh rings must cover the large visible wings, not merely crowd the origin.
  for (const rho of [.2, .4, .6, .8, 1]) {
    let found = false;
    for (let i = 0; i < mesh.gridPositions.length; i += 6) {
      const first = Math.hypot(mesh.gridPositions[i], mesh.gridPositions[i + 1]);
      const second = Math.hypot(mesh.gridPositions[i + 3], mesh.gridPositions[i + 4]);
      if (Math.abs(first - rho) < 1e-6 && Math.abs(second - rho) < 1e-6) { found = true; break; }
    }
    assert.ok(found, `Curved patch at ${radius}: visible ring at ${rho}`);
  }
}

// The infinity window follows the disk radius. Every chosen window must reveal
// a genuine open funnel, including after zooming, with no invented height cap.
let dynamicWindowChecks = 0;
for (const multiplier of [8, 32, 128]) {
  let reference = null;
  for (const radius of radii) {
    const example = limitViewExample(limitById.infinite, radius, multiplier);
    const mesh = buildLimitMesh(example, radius), p = mesh.positions;
    assert.ok(mesh.triangleCount > 20000, `Dynamic infinity window ${multiplier}, radius ${radius}: visible graph`);
    assert.equal(p.length, reference?.length ?? p.length, 'Rescaling the infinite graph preserves its visible geometry.');
    const inner = 1 / Math.sqrt(multiplier);
    let reachesTop = false, reachesOuterCircle = false;
    for (let i = 0; i < p.length; i += 3) {
      const rho = Math.hypot(p[i], p[i + 1]), w = p[i + 2];
      assert.ok(rho >= inner - 1e-7 && rho <= 1 + 1e-7, 'Exact infinite clipping circle.');
      const actual = (example.evaluate(radius * p[i], radius * p[i + 1]) - example.zCenter) / example.zScale;
      assert.ok(Math.abs(actual - w) < 1e-6, 'Dynamic-window vertices are on 1/(x²+y²).');
      reachesTop ||= w === 1;
      reachesOuterCircle ||= Math.abs(rho - 1) < 1e-7;
      if (reference) for (let k = 0; k < 3; k++) assert.ok(Math.abs(p[i + k] - reference[i + k]) < 1e-6, 'The funnel stays visible and stable as actual heights grow.');
    }
    for (let i = 0; i < p.length; i += 9) assert.ok(!(p[i + 2] === 1 && p[i + 5] === 1 && p[i + 8] === 1), 'An infinite window has an open top, never a horizontal cap.');
    assert.ok(reachesTop && reachesOuterCircle, 'The displayed funnel reaches both true circular boundaries.');
    reference = p;
    dynamicWindowChecks++;
  }
}
assert.throws(() => buildLimitMesh(limitById.squeeze, 0), RangeError);
assert.throws(() => buildLimitMesh(limitById.squeeze, NaN), RangeError);
assert.throws(() => buildLimitMesh({...limitById.squeeze, zScale: 0}, 1), RangeError);
console.log(`PASS: six meshes at four radii; graph residual ≤ ${worstVertexError.toExponential(2)}; ridge/directional interior error ≤ ${worstRidgeInteriorError.toExponential(2)}/${worstDirectionalInteriorError.toExponential(2)}; ${normalChecks} independent normal checks; 51 intermediate ridge radii (conditioning ≥ ${worstRidgeCondition.toExponential(2)}); ${dynamicWindowChecks} dynamic infinity windows; correct winding, punctures, center inclusion, ridge extrema, and open clipping.`);
