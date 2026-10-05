# The shape of an equation

Dependency-free static native-module WebGL explorer for Math 233H. Serve the website root and open `/math233h/surfaces/`. A `?surface=barth` (or any registry ID) URL selects a preset. Nothing is fetched externally.

Eighteen presets include twelve standard quadric/type-transition examples plus a pair of planes, Cayley and Clebsch cubics, a Kummer quartic, a Chebyshev sextic, and Barth's sextic. The registry in `math.mjs` contains fixed polynomial evaluators, analytic gradients, descriptions, and certified finite node coordinates. User input is numeric/select-only; there is no formula parser or `eval`.

`mesh.mjs` uses consistent marching tetrahedra with safeguarded edge root refinement; `worker.mjs` keeps meshes off the main thread. `app.mjs` owns native WebGL rendering, camera input, slice plots, and accessible controls. Node markers are independent of the mesh and visible through it. The view is clipped to the displayed cube; no numerical mesh can certify singularities or topology.

`sources.html` documents exact equations, affine/projective distinctions, coordinate lists, primary sources, and numerical limits. In particular, Barth's 65 projective nodes comprise 50 finite nodes and 15 at infinity.

Run `node math233h/surfaces/test-math.mjs` from the website root. This checks analytic gradients, all 106 gallery node coordinates, Chebyshev identities, exact point/double-line slices, sphere area and volume, normals, orientation, and gallery mesh residuals. Parent validation adds independent symbolic checks and real-browser interaction/screenshots.

Controls: drag or arrows rotate; wheel/pinch or +/− zoom; Home resets view; Space toggles the turntable when the canvas has focus. Animation is opt-in and stops when the tab becomes hidden. Use the detail selector for slower devices. Fine/High are useful for classical singular surfaces; narrow branches can remain unresolved at any finite grid.

The translated-hyperboloid preset uses (x−1)²/4+(y+1)²−(z−2)²/4=1, centered at (1,−1,2); it opens with the waist slice z=2 and view bound4. Quadric classification is lecture exploration outside Midterm1.

## Lecture 9 limits

The `#limits` section adds all six computed examples from Lecture 9 (October 6, 2026): two different axis limits, agreement along every line but failure along a parabola, an infinite limit, a squeeze estimate, a radial sine quotient, and a polynomial limit at (1,2). A `?limit=curved-path#limits` URL selects an example; all IDs are in `limits-math.mjs`. These are lecture examples, not homework solutions.

`limits-math.mjs` contains the original-domain function evaluators, exact approach paths, worked calculations, and graph sampler. `limits.mjs` draws their graphs on a shrinking disk using a native Canvas 2D projection with pointer/keyboard rotation. The horizontal disk is rescaled but each example's vertical range remains fixed and labeled. Out-of-range values are omitted, never clamped into a false plateau. The five excluded origins stay undefined; the polynomial's center is included and marked. Curved paths are evaluated directly so the parabola remains visible even when its narrow ridge escapes the sampled mesh.

The data table evaluates actual function values at t=r/2, r/10, r/100, independently of graph clipping. Proofs distinguish path counterexamples from uniform bounds and continuity arguments. A numerical mesh or agreement on sampled paths does not establish a limit.

Run `node math233h/surfaces/test-limits.mjs` alongside the original `test-math.mjs`. It checks all six examples, excluded domains, exact path identities, uniform bounds, disk containment, fixed scales, and omission of the graph when the infinite-limit example rises wholly above its z=20 window. The addition has no runtime dependencies.
