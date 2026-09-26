# Triangle groups II: finite quotients and glued surfaces

Open `index.html`, choose a quotient, and press **Animate quotient**. The assembly has three stages: the covering tessellation, the exact cut-open quotient triangles, and the glued three-dimensional surface where available.

The Klein quartic ends with all **336 original chambers** on the Schulte–Wills embedded genus-3 polyhedron. Its 56 larger triangles are each subdivided into six chambers. A side-labelled chamber isomorphism preserves the original quotient vertex, edge, and chamber IDs, so existing word walks and neighbor buttons remain valid. Exact rational intersection tests found no unintended contacts between any of the 56,280 pairs of small triangles.

The A4, S4, and A5 examples glue to spheres. The C6 quotient glues its original 12 curved chambers into a torus via the exact primitive translation lattice. A6, PSL(2,8), and M11 are explicitly labelled as cut-open diagrams; three-dimensional models for these are not included.

Drag a glued surface to rotate it, shift-drag to pan, scroll to zoom, and click a triangle to select its original chamber. The **Turn 30°**, **Reset view**, and **Full screen** controls are available for classroom use. The identification slider lets users stop during gluing and watch the two copies of a selected cut edge merge. Add `?view=surface#klein` to open directly at the glued Klein surface.

The model preserves topology and the exact triangulation. Its Euclidean lengths and angles are not the intrinsic hyperbolic metric. The assembly interpolation may pass through itself; the final Klein model is a verified embedding. Its four passage mouths connect two sheets, giving three independent handles.

`surface-models.zip` contains sources, citations, exact coordinates, all quotient certificates, and portable verification scripts. `quotient-data.zip` contains the original group enumeration and chamber-gluing certificates. Both applications work offline in a modern browser with WebGL and DecompressionStream support.

The rendering uses a depth buffer, including for original chamber edges and gallery paths. Extra curved-patch rendering samples on spheres and the torus do not add labelled chambers or change the cell counts.
