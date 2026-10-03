# Jenia Tevelev — mathematical demonstrations

A static personal homepage, triangle-group explorer, Navier–Stokes demonstration, and braid animations for GitHub Pages.

The homepage links to the [personal website](https://websites.umass.edu/tevelev/).

## Contents

- `index.html`, `style.css`, `assets/`: personal homepage.
- [Mathieu groups](mathieu/): all five groups through exact permutation, design, Sylow, triangle-quotient, representation, and Golay-code computations, with linked Math 611 lecture notes and reproducible sources.
- [Parabolic Bundles: Quantum Spectrum](parabolic-bundles/): animated spectra for genera 2–10, terminal-cluster filters, scalable complex-plane and evolution views, and calibrated wall guides.
- [Curves, motion and surfaces](math233h/): interactive Math233H demonstrations.
- [Polar curves](math233h/polar-curves/): signed radii, analytic tangents, tracing intervals, and physical Kepler conics.
- [The shape of an equation](math233h/surfaces/): quadrics and verified classical algebraic surfaces with plane sections.
- [Professor JT’s rollercoaster](math233h/rollercoaster/): analytic space curves, Frenet frames, acceleration components, and osculating geometry.
- [The solar system](math233h/solar-system/): Keplerian motion of eight planets and an approximate Halley comet orbit, central force and angular momentum vectors, and equal-time swept areas. Halley’s force and velocity arrows show direction only; its force calculation uses an explicitly assumed teaching mass.
- `triangle-group/index.html`: self-contained explorer, starting with (2,3,6).
- `navier-stokes/index.html`: self-contained spiraling-vortex demonstration, restored from the September 10 version. This illustrates a prescribed velocity field; it is not the later inner-core numerical model.
- `animations/`: three video pages linking to the existing public UMass movies.

No build tools, paid services, or server are required. Publish the root of the `main` branch using GitHub Pages. For a user homepage, the public repository name is `<github-username>.github.io`.

The [portrait](https://websites.umass.edu/tevelev/files/2025/08/photo_jenia-1024x924.jpg) comes from Jenia Tevelev's official UMass website. Braid and Phantom, D-Critical Transmutation of Atomic Decompositions, Fl(2,3;5), and Fl(2,3;6) link to existing public UMass movies.

## Publication

Website: https://gtevelev-max.github.io/

Repository: https://github.com/gtevelev-max/gtevelev-max.github.io

GitHub Pages publishes the root of the `main` branch. Update the HTML or assets and commit to `main` to publish changes.

All internal links are relative. Video files remain hosted on the UMass website; this repository contains the pages, portrait, and interactive demonstrations.

## Triangle groups II

`triangle-quotients/` is an interactive presentation with eight verified finite quotients. It animates the geometric tiling into exact cut-open triangulated surfaces with paired boundary sides. `quotient-data.zip` contains explicit generators, full chamber data, and independent verification scripts.

## Parabolic bundles: quantum spectrum

The demonstration displays the spectrum of quantum multiplication by the first Chern class, normalized by `q`, as the positive real coefficient `rho` approaches 1. The initial scale gives the final spectrum 90% of the horizontal plotting width. Users can zoom, pan, fit all sampled paths, isolate final clusters, display multiplicities, and compare stability-wall guides with spectral crossings.

The included range is `2 <= g <= 10`. Each dataset contains 295 parameter frames, starting at `rho = 0.0001` and ending with the exact terminal spectrum. The value `rho = 0` is a singular limit with escaping eigenvalues, so the interface explicitly labels its near-zero preview. Animation interpolates between verified samples. Stability-wall positions depend on the displayed calibration; they do not change the dimension of the fixed quantum algebra being plotted.

The [algorithm and mathematical conventions](parabolic-bundles/computation/ALGORITHM.txt), [numerical checks](parabolic-bundles/computation/verification.json), and [cluster-tracking checks](parabolic-bundles/computation/tracking-verification.json) accompany the data. Exact elliptic division polynomials and arbitrary-precision Arb root isolation generate the trajectories; every sampled point is checked against the original determinantal pencil. Independent tests check the low-genus polynomials, multiplicities, moments, conjugation, terminal values, and wall formulas.

To regenerate with SageMath, run from the repository root:

```sh
sage -python parabolic-bundles/computation/generate_spectrum.py --max-g 10
sage -python parabolic-bundles/computation/verify_tracking.py 10
python3 parabolic-bundles/computation/publish_data.py
python3 parabolic-bundles/computation/verify_data.py
```

The site itself has no runtime dependencies or build step. Homepage cards are stored alphabetically by title.
