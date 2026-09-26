/* A fundamental region in the covering geometry, one chamber per coset.
 * The finite quotient labels the chambers; the reflection matrices place the
 * actual triangles.  The tree only chooses representatives.  Every additional
 * pair of triangles already adjacent in the cover is joined before recording
 * the boundary.  Thus no artificial chords or interior cuts are displayed.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FundamentalRegion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function check(condition, message) {
    if (!condition) throw new Error('FundamentalRegion: ' + message);
  }
  function relativeDifference(a, b) {
    let error = 0, magnitude = 1;
    for (let i = 0; i < 9; i++) {
      error = Math.max(error, Math.abs(a[i] - b[i]));
      magnitude = Math.max(magnitude, Math.abs(a[i]), Math.abs(b[i]));
    }
    return error / magnitude;
  }
  function layout(data, geometry, math, net) {
    // A sphere cannot be flattened globally without a further cut/projection.
    // Its existing topological disk remains available to the caller.
    if (geometry.k === 1) return net;
    const F = data.faceVertices.length;
    check(net.faceCount === F, 'chamber count does not match the cut complex');
    const matrices = new Array(F), depth = new Int32Array(F);
    const tree = Array.from({length: F}, () => []);
    for (const [face, side, other] of data.dualSpanningTree) {
      check(data.neighbors[face][side] === other && data.neighbors[other][side] === face,
        'tree transition does not represent the quotient reflection');
      tree[face].push([other, side]); tree[other].push([face, side]);
    }
    matrices[0] = math.I();
    const queue = [0];
    for (let at = 0; at < queue.length; at++) {
      const face = queue[at];
      for (const [other, side] of tree[face]) {
        if (matrices[other]) continue;
        matrices[other] = math.mul(matrices[face], geometry.mirrors[side]);
        check(matrices[other].every(Number.isFinite), 'non-finite covering transformation');
        depth[other] = depth[face] + 1;
        check((depth[other] & 1) === (other & 1), 'representative has incorrect orientation');
        queue.push(other);
      }
    }
    check(queue.length === F, 'representatives do not reach every quotient chamber');

    const positions = new Array(3 * F);
    let cornerError = 0, maxRadius = 0, minArea = Infinity;
    for (let face = 0; face < F; face++) {
      for (let type = 0; type < 3; type++) {
        const v = math.mv(matrices[face], geometry.vertices[type]);
        check(v.every(Number.isFinite) && v[2] > 0, 'vertex left the covering chart');
        // Projective (Klein) coordinates send hyperbolic geodesics to straight
        // segments.  The same formula gives Cartesian Euclidean coordinates.
        const p = [v[0] / v[2], v[1] / v[2]], corner = net.corners[face][type];
        if (positions[corner]) {
          cornerError = Math.max(cornerError,
            Math.hypot(p[0] - positions[corner][0], p[1] - positions[corner][1]));
        } else positions[corner] = p;
      }
    }
    check(cornerError < 1e-9, 'tree-adjacent triangle vertices disagree');
    let center = [0, 0], scale = 1;
    if (geometry.k === 0) {
      let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
      for (const p of positions) if (p) for (let k = 0; k < 2; k++) {
        lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]);
      }
      center = lo.map((v, k) => (v + hi[k]) / 2);
      for (const p of positions) if (p) maxRadius = Math.max(maxRadius,
        Math.hypot(p[0] - center[0], p[1] - center[1]));
      scale = 1 / maxRadius;
      for (const p of positions) if (p) {
        p[0] = (p[0] - center[0]) * scale; p[1] = (p[1] - center[1]) * scale;
      }
    }
    maxRadius = 0;
    for (let face = 0; face < F; face++) {
      const [a, b, c] = net.corners[face].map(v => positions[v]);
      const area = ((b[0] - a[0]) * (c[1] - a[1]) -
        (b[1] - a[1]) * (c[0] - a[0])) * (face & 1 ? -0.5 : 0.5);
      check(area > 0, 'a projected chamber is reversed or collapsed');
      minArea = Math.min(minArea, area);
      for (const p of [a, b, c]) maxRadius = Math.max(maxRadius, Math.hypot(...p));
    }
    if (geometry.k === -1) check(maxRadius < 1, 'hyperbolic vertex is outside the Klein disk');

    // Merge all geometric adjacency, including cycles omitted by the tree.
    // Comparing full reflection frames avoids mistaking tiny, unrelated edges
    // near the boundary of the Klein disk for coincident edges.
    const parent = Int32Array.from({length: 3 * F}, (_, i) => i);
    function find(a) {
      while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; }
      return a;
    }
    function union(a, b) { parent[find(a)] = find(b); }
    const internalEdges = new Set();
    let maxJoinedFrameError = 0, minUnjoinedFrameDifference = Infinity;
    for (let face = 0; face < F; face++) for (let side = 0; side < 3; side++) {
      const other = data.neighbors[face][side];
      if (face > other) continue;
      const error = relativeDifference(math.mul(matrices[face], geometry.mirrors[side]),
        matrices[other]);
      if (error < 1e-10) {
        maxJoinedFrameError = Math.max(maxJoinedFrameError, error);
        internalEdges.add(data.faceEdges[face][side]);
        for (let type = 0; type < 3; type++) if (type !== side) {
          const a = net.corners[face][type], b = net.corners[other][type];
          check(Math.hypot(positions[a][0] - positions[b][0], positions[a][1] - positions[b][1]) < 1e-9,
            'joined covering frames have mismatched edge endpoints');
          union(a, b);
        }
      } else minUnjoinedFrameDifference = Math.min(minUnjoinedFrameDifference, error);
    }
    for (const edge of net.treeEdges) check(internalEdges.has(edge), 'tree edge was not joined');
    check(minUnjoinedFrameDifference > 1e-7, 'boundary-frame classification is numerically ambiguous');
    const corners = net.corners.map(triangle => triangle.map(find));
    const regionVertices = new Set(corners.flat()), outgoing = new Map(), incoming = new Map();
    const byEdge = new Map();
    for (let face = 0; face < F; face++) for (let side = 0; side < 3; side++) {
      const edge = data.faceEdges[face][side];
      if (internalEdges.has(edge)) continue;
      const firstType = face & 1 ? (side + 2) % 3 : (side + 1) % 3;
      const secondType = face & 1 ? (side + 1) % 3 : (side + 2) % 3;
      const segment = {face, side, edge, start: corners[face][firstType], end: corners[face][secondType]};
      check(!outgoing.has(segment.start) && !incoming.has(segment.end),
        'actual region boundary is not a simple cycle');
      outgoing.set(segment.start, segment); incoming.set(segment.end, segment);
      if (!byEdge.has(edge)) byEdge.set(edge, []);
      byEdge.get(edge).push(segment);
    }
    const boundary = [], visited = new Set();
    let segment = outgoing.values().next().value;
    const first = segment;
    for (let i = 0; i < outgoing.size; i++) {
      check(segment && !visited.has(segment.start), 'actual boundary is disconnected');
      visited.add(segment.start); boundary.push(segment); segment = outgoing.get(segment.end);
    }
    check(segment === first && boundary.length === outgoing.size, 'actual boundary does not close');
    const seams = [];
    for (const [edge, pair] of byEdge) {
      check(pair.length === 2, 'a region boundary edge lacks its paired copy');
      check(data.neighbors[pair[0].face][pair[0].side] === pair[1].face,
        'boundary pairing disagrees with the finite quotient');
      seams.push({edge, first: pair[0], second: pair[1]});
    }
    seams.sort((a, b) => a.edge - b.edge);
    const vertexCount = regionVertices.size, edgeCount = internalEdges.size + boundary.length;
    const euler = vertexCount - edgeCount + F;
    check(euler === 1, 'the actual region is not a disk');
    return {...net, positions, region: {
      projection: geometry.k === -1 ? 'Klein disk' : 'Euclidean plane',
      corners, boundary, seams, internalEdges,
      faceCount: F, vertexCount, edgeCount, boundaryCount: boundary.length, euler,
      center, scale,
      verification: {allRepresentativesReached: true, treeCornerError: cornerError,
        maxJoinedFrameError, minUnjoinedFrameDifference, minProjectedTriangleArea: minArea,
        maxRadius, maxWordLength: Math.max(...depth),
        explanation: 'Distinct finite-quotient chambers have distinct covering chambers. The faithful triangle reflection action therefore gives disjoint interiors. Every true covering adjacency is joined; the remaining boundary is one simple cycle and V−E+F=1.'}
    }};
  }
  return {layout};
});
