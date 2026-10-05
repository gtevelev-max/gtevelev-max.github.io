// Smooth triangle meshes for the six Lecture 9 graphs. Coordinates and normals
// are in the renderer's normalized space: (dx / radius, dy / radius,
// (f(x,y) - zCenter) / zScale). Normals therefore include both axis scales.
// The punctured graphs keep a small open inner boundary; no triangles bridge it.
const TAU = 2 * Math.PI;
const INNER_RADIUS = .001;

function gradient(id, x, y) {
  const r2 = x * x + y * y;
  switch (id) {
    case 'two-paths':
      return [4 * x * y * y / (r2 * r2), -4 * x * x * y / (r2 * r2)];
    case 'curved-path': {
      if (y === 0) return [0, 0];
      const y2 = y * y, d = x * x + y2 * y2;
      return [y2 * (y2 * y2 - x * x) / (d * d),
        2 * x * y * (x * x - y2 * y2) / (d * d)];
    }
    case 'infinite':
      return [-2 * x / (r2 * r2), -2 * y / (r2 * r2)];
    case 'squeeze':
      return [2 * x * y * y * y / (r2 * r2),
        x * x * (x * x - y * y) / (r2 * r2)];
    case 'radial-sinc': {
      // Avoid cancellation in u cos(u) - sin(u) near the missing point.
      const u = r2;
      const derivative = Math.abs(u) < .01
        ? -u / 3 + u ** 3 / 30 - u ** 5 / 840
        : (u * Math.cos(u) - Math.sin(u)) / (u * u);
      return [2 * x * derivative, 2 * y * derivative];
    }
    case 'polynomial':
      return [3 * x * x - 2 * x * y ** 6, -6 * x * x * y ** 5];
    default:
      throw new RangeError(`Unknown limit example: ${id}`);
  }
}

/**
 * Return non-indexed triangles plus optional sparse grid/boundary line segments.
 * positions/normals: Float32Array, three numbers per vertex, three vertices per
 * triangle. gridPositions/boundaryPositions: Float32Array, two vertices per line.
 * All normals point upward on the graph. Heights outside [-1,1] are removed;
 * intersections are evaluated on the actual function, never flattened into caps.
 */
export function buildLimitMesh(example, radius) {
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('Radius must be positive and finite.');
  if (!Number.isFinite(example.zScale) || example.zScale <= 0) throw new RangeError('Height scale must be positive and finite.');
  const positions = [], normals = [], gridPositions = [], boundaryPositions = [];
  const [a, b] = example.target;
  const normalScale = radius / example.zScale;
  const edgeIntersections = new Map();
  let nextId = 0;

  function vertex(u, v) {
    const x = a + radius * u, y = b + radius * v;
    let w = (example.evaluate(x, y) - example.zCenter) / example.zScale;
    // Correct only roundoff at exact clipping intersections.
    if (Math.abs(w - 1) < 1e-12) w = 1;
    if (Math.abs(w + 1) < 1e-12) w = -1;
    const [fx, fy] = gradient(example.id, x, y);
    const nx = -normalScale * fx, ny = -normalScale * fy;
    const length = Math.hypot(nx, ny, 1);
    return {id: nextId++, u, v, w, nx: nx / length, ny: ny / length, nz: 1 / length};
  }

  function intersection(p, q, height) {
    if (p.w === height) return p;
    if (q.w === height) return q;
    const key = `${Math.min(p.id, q.id)}:${Math.max(p.id, q.id)}:${height}`;
    if (edgeIntersections.has(key)) return edgeIntersections.get(key);
    // Solve on the original graph along this domain edge. Linear interpolation
    // of heights alone would move a nonlinear graph's clipping edge off-surface.
    let lo = 0, hi = 1;
    const lowSign = p.w < height;
    for (let i = 0; i < 42; i++) {
      const t = (lo + hi) / 2;
      const u = p.u + t * (q.u - p.u), v = p.v + t * (q.v - p.v);
      const w = (example.evaluate(a + radius * u, b + radius * v) - example.zCenter) / example.zScale;
      if ((w < height) === lowSign) lo = t;
      else hi = t;
    }
    const t = (lo + hi) / 2;
    const result = vertex(p.u + t * (q.u - p.u), p.v + t * (q.v - p.v));
    result.w = height;
    edgeIntersections.set(key, result);
    return result;
  }

  function clipPolygon(polygon, height, keepAbove) {
    const result = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length];
      const pin = keepAbove ? p.w >= height : p.w <= height;
      const qin = keepAbove ? q.w >= height : q.w <= height;
      if (pin) result.push(p);
      if (pin !== qin) result.push(intersection(p, q, height));
    }
    return result;
  }

  function addTriangle(p, q, r) {
    if (![p.w, q.w, r.w].every(Number.isFinite)) return;
    let polygon = [p, q, r];
    if (polygon.some(point => point.w < -1)) polygon = clipPolygon(polygon, -1, true);
    if (polygon.some(point => point.w > 1)) polygon = clipPolygon(polygon, 1, false);
    for (let i = 1; i + 1 < polygon.length; i++) {
      let left = polygon[i], right = polygon[i + 1];
      const first = polygon[0];
      const area = (left.u - first.u) * (right.v - first.v) - (left.v - first.v) * (right.u - first.u);
      if (Math.abs(area) < 1e-28) continue;
      if (area < 0) [left, right] = [right, left];
      for (const point of [first, left, right]) {
        positions.push(point.u, point.v, point.w);
        normals.push(point.nx, point.ny, point.nz);
      }
    }
  }

  function addLine(p, q, destination = gridPositions) {
    if (![p.w, q.w].every(Number.isFinite)) return;
    for (const height of [-1, 1]) {
      const pin = height === -1 ? p.w >= height : p.w <= height;
      const qin = height === -1 ? q.w >= height : q.w <= height;
      if (!pin && !qin) return;
      if (!pin) p = intersection(p, q, height);
      if (!qin) q = intersection(p, q, height);
    }
    destination.push(p.u, p.v, p.w, q.u, q.v, q.w);
  }

  function connectRings(rings, closed, gridStride = 12, includeInnerBoundary = true) {
    const count = rings[0].length, segments = closed ? count : count - 1;
    for (let j = 0; j < rings.length; j++) {
      const ring = rings[j];
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % count;
        if (j % 8 === 0 || j === rings.length - 1) addLine(ring[i], ring[next]);
        if ((j === 0 && includeInnerBoundary) || j === rings.length - 1) addLine(ring[i], ring[next], boundaryPositions);
        if (j + 1 < rings.length) {
          const outer = rings[j + 1];
          addTriangle(ring[i], outer[i], ring[next]);
          addTriangle(ring[next], outer[i], outer[next]);
          if (i % gridStride === 0) addLine(ring[i], outer[i]);
        }
      }
    }
  }

  function curvedPathMesh() {
    // alpha = atan(x / y²) turns the height into sin(alpha) cos(alpha).
    // Uniform alpha resolves both ±1/2 ridges at every radius. Extra samples
    // chosen by outer-circle angle keep the broad, nearly flat wings smooth.
    const values = [];
    for (let i = 0; i <= 96; i++) values.push(-Math.PI / 2 + Math.PI * i / 96);
    for (let i = 0; i <= 64; i++) {
      const theta = Math.PI * i / 64;
      values.push(Math.atan2(Math.cos(theta), radius * Math.sin(theta) ** 2));
    }
    values.sort((x, y) => x - y);
    const angles = values.filter((value, index) => index === 0 || value - values[index - 1] > 1e-12);
    // Two patches preserve the separation of y>0 and y<0. Their endpoints meet
    // only on the actual x-axis graph (height zero), never across the puncture.
    for (const sign of [1, -1]) {
      const rings = [];
      for (let j = 0; j <= 48; j++) {
        const rho = INNER_RADIUS ** (1 - j / 48), r = radius * rho;
        rings.push(angles.map(alpha => {
          if (Math.abs(Math.abs(alpha) - Math.PI / 2) < 1e-12) return vertex(Math.sign(alpha) * rho, 0);
          const s = Math.sin(alpha), c = Math.cos(alpha);
          // Stable solution of x = tan(alpha)y² and x²+y² = r².
          const denominator = c + Math.hypot(c, 2 * r * s);
          const x = 2 * r * r * s / denominator;
          const y = sign * Math.sqrt(2 * r * r * c / denominator);
          return vertex(x / radius, y / radius);
        }));
      }
      connectRings(rings, false);
    }
  }

  function polarMesh() {
    const angularCount = 192, radialCount = 80;
    let inner = example.id === 'polynomial' ? 0 : INNER_RADIUS;
    let outer = 1;
    if (example.id === 'infinite') {
      // Solve clipping circles exactly. The graph above the window is omitted,
      // leaving an open circular edge, rather than a false horizontal cap.
      const low = example.zCenter - example.zScale, high = example.zCenter + example.zScale;
      if (high <= 0) return;
      inner = Math.max(inner, 1 / (radius * Math.sqrt(high)));
      if (low > 0) outer = Math.min(outer, 1 / (radius * Math.sqrt(low)));
      if (inner >= outer) return;
    }
    const rings = [];
    for (let j = inner === 0 ? 1 : 0; j <= radialCount; j++) {
      const rho = inner + (outer - inner) * (j / radialCount) ** 1.4;
      rings.push(Array.from({length: angularCount}, (_, i) => {
        const theta = TAU * i / angularCount;
        return vertex(rho * Math.cos(theta), rho * Math.sin(theta));
      }));
    }
    connectRings(rings, true, 16, inner !== 0);
    if (inner === 0) {
      // The polynomial alone includes its target point in the original domain.
      const center = vertex(0, 0), ring = rings[0];
      for (let i = 0; i < angularCount; i++) {
        addTriangle(center, ring[i], ring[(i + 1) % angularCount]);
        if (i % 16 === 0) addLine(center, ring[i]);
      }
    }
  }

  if (example.id === 'curved-path') curvedPathMesh();
  else polarMesh();
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    gridPositions: new Float32Array(gridPositions),
    boundaryPositions: new Float32Array(boundaryPositions),
    vertexCount: positions.length / 3,
    triangleCount: positions.length / 9
  };
}
