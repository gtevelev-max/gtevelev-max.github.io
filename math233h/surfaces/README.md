# The shape of an equation

Dependency-free static native-module WebGL explorer for Math 233H. Serve the website root and open `/math233h/surfaces/`. A `?surface=barth` (or any registry ID) URL selects a preset. Nothing is fetched externally.

Eighteen presets include twelve standard quadric/type-transition examples plus a pair of planes, Cayley and Clebsch cubics, a Kummer quartic, a Chebyshev sextic, and Barth's sextic. The registry in `math.mjs` contains fixed polynomial evaluators, analytic gradients, descriptions, and certified finite node coordinates. User input is numeric/select-only; there is no formula parser or `eval`.

`mesh.mjs` uses consistent marching tetrahedra with safeguarded edge root refinement; `worker.mjs` keeps meshes off the main thread. `app.mjs` owns native WebGL rendering, camera input, slice plots, and accessible controls. Node markers are independent of the mesh and visible through it. The view is clipped to the displayed cube; no numerical mesh can certify singularities or topology.

`sources.html` documents exact equations, affine/projective distinctions, coordinate lists, primary sources, and numerical limits. In particular, Barth's 65 projective nodes comprise 50 finite nodes and 15 at infinity.

Run `node math233h/surfaces/test-math.mjs` from the website root. This checks analytic gradients, all 106 gallery node coordinates, Chebyshev identities, exact point/double-line slices, sphere area and volume, normals, orientation, and gallery mesh residuals. Parent validation adds independent symbolic checks and real-browser interaction/screenshots.

Controls: drag or arrows rotate; wheel/pinch or +/− zoom; Home resets view; Space toggles the turntable when the canvas has focus. Animation is opt-in and stops when the tab becomes hidden. Use the detail selector for slower devices. Fine/High are useful for classical singular surfaces; narrow branches can remain unresolved at any finite grid.

The translated-hyperboloid preset uses (x−1)²/4+(y+1)²−(z−2)²/4=1, centered at (1,−1,2); it opens with the waist slice z=2 and view bound4. Quadric classification is lecture exploration outside Midterm1.
