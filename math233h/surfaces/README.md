# The shape of an equation

Dependency-free static native-module WebGL explorer for Math 233H. Serve the website root and open `/math233h/surfaces/`. A `?surface=barth` (or any registry ID) URL selects a preset. Nothing is fetched externally.

Eighteen presets include twelve standard quadric/type-transition examples plus a pair of planes, Cayley and Clebsch cubics, a Kummer quartic, a Chebyshev sextic, and Barth's sextic. The registry in `math.mjs` contains fixed polynomial evaluators, analytic gradients, descriptions, and certified finite node coordinates. User input is numeric/select-only; there is no formula parser or `eval`.

`mesh.mjs` uses consistent marching tetrahedra with safeguarded edge root refinement; `worker.mjs` keeps meshes off the main thread. `app.mjs` owns native WebGL rendering, camera input, slice plots, and accessible controls. Node markers are independent of the mesh and visible through it. The view is clipped to the displayed cube; no numerical mesh can certify singularities or topology.

`sources.html` documents exact equations, affine/projective distinctions, coordinate lists, primary sources, and numerical limits. In particular, Barth's 65 projective nodes comprise 50 finite nodes and 15 at infinity.

Run `node math233h/surfaces/test-math.mjs` from the website root. This checks analytic gradients, all 106 gallery node coordinates, Chebyshev identities, exact point/double-line slices, sphere area and volume, normals, orientation, and gallery mesh residuals. Parent validation adds independent symbolic checks and real-browser interaction/screenshots.

Controls: drag or arrows rotate; wheel/pinch or +/− zoom; Home resets view; Space toggles the turntable when the canvas has focus. Animation is opt-in and stops when the tab becomes hidden. Use the detail selector for slower devices. Fine/High are useful for classical singular surfaces; narrow branches can remain unresolved at any finite grid.

The translated-hyperboloid preset uses (x−1)²/4+(y+1)²−(z−2)²/4=1, centered at (1,−1,2); it opens with the waist slice z=2 and view bound4. Quadric classification is lecture exploration outside Midterm1.

## Lecture 9 limits

The `#limits` section presents all six computed examples from Lecture 9 (October 6, 2026), in order of difficulty:

1. Polynomial continuity and substitution at (1,2): −63.
2. A radial infinite limit: +∞, with no finite limit.
3. Radial sine quotient and one-variable substitution: 1.
4. A uniform squeeze estimate: 0.
5. Two incompatible axis limits: does not exist.
6. Every line agrees, but a curved path disagrees: does not exist.

The polynomial opens by default. The numbered selector and Previous/Next buttons expose the sequence; existing `?limit=curved-path#limits` links still work. These are lecture examples, not homework solutions.

`limits-math.mjs` contains original-domain function evaluators, exact approach paths, and worked calculations. `limits-mesh.mjs` builds approximately 30,000 triangles per graph with analytic unit normals corrected for the horizontal/vertical display scales. The hardest graph uses x=tan(α)y² to resolve both narrow ±1/2 ridges even at radius 0.01. Its y>0 and y<0 patches meet only on the actual x-axis graph, never across the excluded origin. Infinite-limit clipping circles are exact; other clipping intersections are solved on the original graph. There are no false horizontal caps.

`limits-renderer.mjs` uses antialiased native WebGL, depth testing, analytic smooth normals, and a glossy blue/turquoise material with broad and sharp highlights. Both sides share the palette to avoid front/back color flicker in thin regions. Surface mesh lines are drawn inside the surface shader with screen-space antialiasing, so they do not fight with the surface depth. A line-ribbon fallback supports devices without standard derivatives. The clearly labeled Surface mesh switch is on by default. Height contours and colored 3D approach paths remain independently switchable. Pointer/keyboard orbit, wheel/pinch/button zoom, reset, and fullscreen help reveal the geometry. The graph appears immediately after its equation on phones. No external dependencies are used.

The horizontal disk expands to fill the view as it shrinks. Finite examples retain fixed, labeled vertical ranges, so collapse toward a finite limit remains visible. For the infinite example, the vertical window is automatically 0 ≤ z ≤ H/r², with H=32 by default. Its height-ceiling control varies H from 8 to 128. The window therefore follows the unbounded rise without losing the graph; all axis labels and the caption give actual, untransformed function heights. Raising the ceiling reveals a smaller inner circle, not a cap. The mathematical evaluator and numerical table never use display-normalized heights.

A tiny disk of radius 0.001r is omitted from each punctured mesh; exact paths and numerical values still approach the target. The five excluded origins remain undefined. The polynomial's center is included; its solid marker is distinguished from hollow missing-limit markers. Markers remain visible through the mesh as annotations. Original-function clipping is open and introduces no horizontal caps. The curved-path sampler preserves the exact ±1/2 ridges and merges only near-coincident angular samples; winding is checked using the Float32 coordinates actually uploaded to WebGL.

The table evaluates actual function values at t=r/2, r/10, r/100 independently of clipping. Proofs distinguish path counterexamples from uniform bounds and continuity. A numerical mesh or agreement on sampled paths does not establish a limit.

Run `node math233h/surfaces/test-limits.mjs` and `node math233h/surfaces/test-limits-mesh.mjs` alongside the original `test-math.mjs`. The mesh tests check all six graphs at four radii, graph residuals, 4,241 independent finite-difference normal comparisons, upward winding, excluded origins, polynomial center, exact ridge extrema, absence of false walls, clipping without caps, 51 intermediate curved-path radii, and 12 dynamically rescaled infinity windows. Browser validation covers all six graphs, ordered navigation, rendering/zoom controls, direct links, desktop/mobile layouts, and regression checks on the original surface gallery.
