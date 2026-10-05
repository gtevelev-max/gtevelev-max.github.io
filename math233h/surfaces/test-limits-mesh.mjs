import assert from 'node:assert/strict';
import {limitExamples, limitById} from './limits-math.mjs';
import {buildLimitMesh} from './limits-mesh.mjs';

const radii = [1, .5, .1, .01];
let worstVertexError = 0, worstRidgeInteriorError = 0;
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
      if (example.id === 'infinite') {
        assert.ok(!(p[i + 2] === 1 && p[i + 5] === 1 && p[i + 8] === 1), 'Clipping must not create a horizontal cap.');
      }
      if (example.id === 'curved-path') {
        // Check triangle interiors too: exact vertices alone would not catch a
        // coarse triangle inventing a large wall across the curved narrow ridge.
        const u = (p[i] + p[i + 3] + p[i + 6]) / 3;
        const v = (p[i + 1] + p[i + 4] + p[i + 7]) / 3;
        const w = (p[i + 2] + p[i + 5] + p[i + 8]) / 3;
        const actual = example.evaluate(radius * u, radius * v) / example.zScale;
        const error = Math.abs(actual - w);
        worstRidgeInteriorError = Math.max(worstRidgeInteriorError, error);
        assert.ok(error < .01, `${context}: curved ridge remains resolved inside triangles`);
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
assert.throws(() => buildLimitMesh(limitById.squeeze, 0), RangeError);
assert.throws(() => buildLimitMesh(limitById.squeeze, NaN), RangeError);
console.log(`PASS: six meshes at four radii; graph residual ≤ ${worstVertexError.toExponential(2)}; ridge triangle error ≤ ${worstRidgeInteriorError.toExponential(2)}; ${normalChecks} independent normal checks; correct winding, punctures, center inclusion, ridge extrema, and clipping.`);
