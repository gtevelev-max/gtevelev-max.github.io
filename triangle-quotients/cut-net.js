/* Exact disk obtained by gluing a dual spanning tree of triangle chambers.
 * The cyclic boundary is placed on a circle. Its chords give a topological
 * triangulation, not an isometric drawing of the curved chambers.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuotientNet = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function requireCondition(condition, message) {
    if (!condition) throw new Error('QuotientNet: ' + message);
  }

  function build(data) {
    const F = data.faceVertices.length;
    requireCondition(F > 0 && data.faceEdges.length === F, 'inconsistent face data');
    const parent = new Int32Array(3 * F);
    const rank = new Uint8Array(3 * F);
    for (let i = 0; i < parent.length; i++) parent[i] = i;
    function find(a) {
      let r = a;
      while (parent[r] !== r) r = parent[r];
      while (a !== r) { const next = parent[a]; parent[a] = r; a = next; }
      return r;
    }
    function union(a, b) {
      a = find(a); b = find(b);
      if (a === b) return;
      if (rank[a] < rank[b]) { const tmp = a; a = b; b = tmp; }
      parent[b] = a;
      if (rank[a] === rank[b]) rank[a]++;
    }

    const treeEdges = new Set();
    requireCondition(data.dualSpanningTree.length === F - 1, 'dual tree must have F-1 edges');
    for (const [face, side, other] of data.dualSpanningTree) {
      requireCondition(data.neighbors[face][side] === other &&
        data.neighbors[other][side] === face, 'invalid dual-tree adjacency');
      const edge = data.faceEdges[face][side];
      requireCondition(data.faceEdges[other][side] === edge, 'tree-edge IDs disagree');
      requireCondition(!treeEdges.has(edge), 'repeated dual-tree edge');
      treeEdges.add(edge);
      for (let type = 0; type < 3; type++) {
        if (type === side) continue;
        requireCondition(data.faceVertices[face][type] === data.faceVertices[other][type],
          'tree edge has incompatible vertex types');
        union(3 * face + type, 3 * other + type);
      }
    }

    const corners = Array.from({length: F}, (_, face) =>
      [find(3 * face), find(3 * face + 1), find(3 * face + 2)]);
    const cutRoots = new Set(corners.flat());
    const boundaryUnordered = [];
    const outgoing = new Map();
    const incoming = new Map();
    for (let face = 0; face < F; face++) {
      requireCondition(new Set(corners[face]).size === 3, 'collapsed chamber');
      for (let side = 0; side < 3; side++) {
        const edge = data.faceEdges[face][side];
        if (treeEdges.has(edge)) continue;
        // Opposite-side boundary orientation induced by the chamber orientation.
        const firstType = face % 2 ? (side + 2) % 3 : (side + 1) % 3;
        const secondType = face % 2 ? (side + 1) % 3 : (side + 2) % 3;
        const segment = {face, side, edge,
          start: corners[face][firstType], end: corners[face][secondType]};
        requireCondition(!outgoing.has(segment.start) && !incoming.has(segment.end),
          'cut boundary is not a simple oriented cycle');
        outgoing.set(segment.start, segment);
        incoming.set(segment.end, segment);
        boundaryUnordered.push(segment);
      }
    }
    const B = boundaryUnordered.length;
    requireCondition(B === F + 2, 'disk must have F+2 boundary edges');
    requireCondition(cutRoots.size === B, 'unexpected interior or identified cut vertex');
    const boundary = [];
    const visited = new Set();
    let segment = boundaryUnordered[0];
    for (let i = 0; i < B; i++) {
      requireCondition(segment && !visited.has(segment.start), 'disconnected boundary');
      visited.add(segment.start);
      boundary.push(segment);
      segment = outgoing.get(segment.end);
    }
    requireCondition(segment === boundary[0] && visited.size === cutRoots.size,
      'boundary is not one complete cycle');

    const positions = new Array(3 * F);
    const boundaryIndex = new Map();
    for (let i = 0; i < B; i++) {
      const root = boundary[i].start;
      const angle = 2 * Math.PI * i / B;
      positions[root] = [Math.cos(angle), Math.sin(angle)];
      boundaryIndex.set(root, i);
    }
    const byEdge = new Map();
    for (const segment of boundary) {
      if (!byEdge.has(segment.edge)) byEdge.set(segment.edge, []);
      byEdge.get(segment.edge).push(segment);
    }
    const seams = [];
    for (const [edge, pair] of byEdge) {
      requireCondition(pair.length === 2, 'cut edge does not have two boundary copies');
      requireCondition(data.neighbors[pair[0].face][pair[0].side] === pair[1].face,
        'paired boundary edges do not share a quotient edge');
      seams.push({edge, first: pair[0], second: pair[1]});
    }
    seams.sort((a, b) => a.edge - b.edge);

    // Exact integer check that the internal polygon diagonals are nested or
    // disjoint. This avoids unreliable floating-point intersection tests for
    // the 15,840 very thin chambers in the M11 example.
    const diagonals = [];
    for (const [face, side] of data.dualSpanningTree) {
      const a = boundaryIndex.get(corners[face][(side + 1) % 3]);
      const b = boundaryIndex.get(corners[face][(side + 2) % 3]);
      const left = Math.min(a, b), right = Math.max(a, b);
      requireCondition(right - left > 1 && !(left === 0 && right === B - 1),
        'a tree edge became a boundary segment');
      diagonals.push([left, right]);
    }
    diagonals.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const stack = [];
    for (const [left, right] of diagonals) {
      while (stack.length && stack[stack.length - 1] <= left) stack.pop();
      requireCondition(!stack.length || right <= stack[stack.length - 1],
        'crossing diagonals in the cut polygon');
      stack.push(right);
    }
    const cutEdgeCount = treeEdges.size + B;
    requireCondition(cutRoots.size - cutEdgeCount + F === 1,
      'cut complex has the wrong Euler characteristic');
    requireCondition(seams.length * 2 === B, 'unpaired boundary segment');

    return {corners, positions, boundary, seams, treeEdges,
      boundaryCount: B, cutVertexCount: cutRoots.size, cutEdgeCount,
      faceCount: F, euler: 1};
  }

  return {build};
});
