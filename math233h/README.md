# Math 233H — Lecture 7

Two dependency-free, browser-based demonstrations by Jenia Tevelev, with a downloadable six-page lecture supplement.

- [Professor JT’s rollercoaster](rollercoaster/): seven analytically differentiated curves; the exact Lecture 6 helix is selected initially. World frame translates with the rider while keeping a fixed orientation. Ride with JT translates and turns with the local Frenet frame. Drag to rotate either view; the cart remains centered. The straight-line example explicitly leaves the principal normal, binormal, osculating plane, and osculating circle undefined.
- [The solar system](solar-system/): all eight planets enabled initially, Earth selected. Fixed J2000 orbital elements define ideal two-body Kepler motion. All planets share one clock. Each complete colored sector represents the same fixed duration within the selected planet’s orbit. Force uses the selected planet’s mass and is displayed in newtons; h = r × v is specific angular momentum.
- [Lecture 7 handout](lecture-7-notes.pdf) and [editable LaTeX](lecture-7-notes.tex): worked helix, all track derivatives, acceleration decomposition, osculating geometry, central forces, equal areas, and suggested classroom sequences.

Use pause, scrub, and fullscreen for teaching. On either canvas, arrow keys rotate, +/− zoom, and Space toggles playback. Reduced-motion preferences start the animations paused. Vector display scales and schematic body sizes are described on the pages. These are mathematical motion models, not dynamically simulated amusement rides or live planetary ephemerides.

## Local preview and checks

Serve the repository root with any static web server, then open `/math233h/`. No package installation or build is required. The rollercoaster uses browser-native JavaScript modules, so use a local server rather than opening its HTML as a file.

```
node math233h/rollercoaster/test-math.mjs
node math233h/solar-system/test-mechanics.cjs
```

Checks cover analytic derivatives, orthonormal frames, acceleration decomposition, osculating-circle geometry, conserved angular momentum and energy, orbital planes, force units, and independently triangulated equal-time swept areas.

## Sources

The helix and notation match the existing Math 233H Chapter 13 notes. Solar elements and masses come from NASA/JPL:

- https://ssd.jpl.nasa.gov/planets/approx_pos.html
- https://ssd.jpl.nasa.gov/planets/phys_par.html
