# Curves, motion and surfaces

Browser-based demonstrations by Jenia Tevelev, exploring polar curves, algebraic surfaces, moving frames, and Kepler’s laws. All run as static files served over HTTP; no installation or build is needed.

- [Polar curves](polar-curves/): trace signed-polar curves and inspect their analytic tangent vectors. The fixed curve library includes conics, roses, limacons, lemniscates, and spirals. Physical Kepler conics enforce positive radius, matching the Lecture 8 convention.
- [The shape of an equation](surfaces/): rotate quadric and classical algebraic surfaces and investigate plane sections. Formulas, plotting domains, and numerical rendering limitations are explained within the demonstration.

- [Professor JT’s rollercoaster](rollercoaster/): seven analytically differentiated curves; a circular helix is selected initially. World frame translates with the rider while keeping a fixed orientation. Ride with JT translates and turns with the local Frenet frame. Drag to rotate either view; the cart remains centered. The straight-line example explicitly leaves the principal normal, binormal, osculating plane, and osculating circle undefined.
- [The solar system](solar-system/): all eight planets and an approximate Halley comet orbit enabled initially, Earth selected. Fixed orbital elements define ideal two-body Kepler motion, and all bodies share one clock. Each complete colored sector represents the same fixed duration within the selected body’s orbit. The sidebar displays eccentricity, period, and semimajor axis. Force uses the selected body’s mass and is displayed in newtons; h = r × v is specific angular momentum. Halley’s force and velocity arrows show direction only, while numerical magnitudes remain available. Its force uses an explicitly assumed teaching mass of 10¹⁴ kg, not a precise measured mass. Perihelion/aphelion jumps and slow Encounter playback support comparisons along its eccentric, retrograde orbit.

Use pause, scrub, and fullscreen for teaching. On either canvas, arrow keys rotate, +/− zoom, and Space toggles playback. Reduced-motion preferences start the animations paused. Vector display scales and schematic body sizes are described on the pages. These are mathematical motion models, not dynamically simulated amusement rides or live planetary ephemerides.

## Local preview and checks

Serve the repository root with any static web server, then open `/math233h/`. No package installation or build is required. The rollercoaster uses browser-native JavaScript modules, so use a local server rather than opening its HTML as a file.

```
node math233h/rollercoaster/test-math.mjs
node math233h/solar-system/test-mechanics.cjs
node math233h/polar-curves/test-math.mjs
node math233h/surfaces/test-math.mjs
```

Checks cover analytic derivatives, orthonormal frames, acceleration decomposition, osculating-circle geometry, conserved angular momentum and energy, orbital planes, force units, independently triangulated equal-time swept areas, and the comet’s high-eccentricity solver, retrograde angular momentum, and perihelion/aphelion ratios.

## Sources

Planet elements and masses, and Halley’s approximate orbit, use NASA/JPL sources. Halley uses the sample JPL J863/77 elements at epoch MJD 49400, held fixed in J2000 axes; its mass is a teaching assumption.

- https://ssd.jpl.nasa.gov/planets/approx_pos.html
- https://ssd.jpl.nasa.gov/planets/phys_par.html
- https://ssd.jpl.nasa.gov/sb/elem_tables.html
- https://science.nasa.gov/solar-system/comets/1p-halley/
