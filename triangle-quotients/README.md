# Triangle groups II: finite quotients and glued surfaces

Open `index.html` and choose a quotient. Every example has a closed three-dimensional surface. For the torus and higher-genus examples, the gluing view starts with the actual developed fundamental region: adjacent triangles are already joined, and matching exposed boundary sides are identified to form the surface. The hyperbolic examples use the Klein disc, where geodesics are straight line segments. The spherical examples use a topological cut disk. The animation goes directly from its region to the glued surface, retaining the same original chamber labels.

| Quotient | Signature | Original triangles | Genus | Surface |
| --- | --- | ---: | ---: | --- |
| A4 | (2,3,3) | 24 | 0 | Riemann sphere |
| S4 | (2,3,4) | 48 | 0 | Riemann sphere |
| A5 | (2,3,5) | 120 | 0 | Riemann sphere |
| C6 | (2,3,6) | 12 | 1 | Hexagonal torus |
| PSL(2,7) | (2,3,7) | 336 | 3 | Klein quartic |
| A6 | (2,4,5) | 720 | 10 | Smooth Wiman sextic |
| PSL(2,8) | (2,3,7) | 1,008 | 7 | Fricke–Macbeath surface |
| M11 | (2,4,11) | 15,840 | 631 | No conventional name assigned |

The Klein model subdivides the 56 faces of the Schulte–Wills polyhedron into 336 original chambers. The Macbeath model subdivides the 168 faces of the Bokowski–CodeParade polyhedron into 1,008 chambers. Side-labelled chamber graph isomorphisms preserve every original vertex, edge, chamber, and neighbor relation. Exact rational intersection checks verify both source polyhedra; positive barycentric subdivision preserves their embeddings.

The A6 and M11 models are computed directly from their quotient triangulations. The construction cuts along 10 or 631 disjoint nonseparating curves, draws the remaining genus-zero surface in an integer grid, and reattaches each original collar as a separated three-dimensional tube. Every rendering patch carries its original chamber number and barycentric source coordinates. The subdivision changes the number of drawing triangles, while retaining exactly **720** and **15,840 original chambers**. The original triangles can have bent boundaries and interiors in three dimensions.

Sphere models use their original chamber identifications. The torus uses its exact primitive translation lattice and 12 curved chambers. In all eight examples, lengths and angles in the display are distorted; the intrinsic spherical, Euclidean, or hyperbolic metric is specified by the original triangles and gluing data.

Drag a glued surface to rotate it, shift-drag to pan, scroll to zoom, and click a chamber to select it. **Turn 30°**, **Reset view**, and **Full screen** support classroom presentation. For A6 and M11, choose a handle number and use **Inspect handle** or **Inspect attachment** to inspect a tube and its original chamber boundaries. Restore the whole-surface view to see all handles. Word galleries follow the piecewise-linear chamber charts, including across tube subdivisions.

The Klein region contains all 336 original triangles and has 88 exposed sides, paired into 44 seams. The A6, Macbeath, M11, and torus regions have 240, 244, 8,930, and 8 exposed sides, respectively. Already-adjacent sides are joined in the region before its boundary is glued. Assembly frames are explanatory and may pass through themselves; the verified glued endpoint is embedded. Add `?view=surface#klein`, `?view=surface#macbeath`, `?view=surface#a6`, or `?view=surface#m11` to open at a glued endpoint.

`surface-models.zip` contains numerical source data, builders, original-chamber correspondence, model hashes, primary-source citations, licenses, and portable verification instructions for all eight examples. The large generated A6/M11 intermediate JSON files are regenerated from the included quotient inputs. Their packed final web assets are distributed alongside the application in `surface-data/`; the archive provides a hash-checked download helper. `quotient-data.zip` contains the group enumeration and chamber-gluing certificates.

Both applications work offline when their complete folders, including `surface-data/`, are copied locally, using a modern browser with WebGL and DecompressionStream support. The depth buffer is used for chamber edges and galleries as well as filled triangles.

## Rendering and animation update

The animation begins with the visible tessellation of the covering plane (or the complete sphere). Only chambers outside the chosen gluing region fade away. The retained region stays fixed, then its paired sides assemble into the closed surface.

Camera framing uses each model’s actual bounding sphere. Refined models use a monotone depth map written from interpolated view depth, so zoom no longer clips remote pieces; a full-model depth bound is used when fragment-depth support is unavailable. Surface shading follows the actual intermediate mesh, and edge depth bias is limited to two 24-bit depth units. Picking uses the same depth format as drawing.

A6 and M11 have mathematically valid but very thin tube embeddings. Their global view is an overview; it cannot show every small chamber at screen resolution. Inspect handle magnifies a tube using the original double-precision coordinates. The Along handle slider follows it; Inspect attachment shows the endpoint collar. The source complex and final embedding are unchanged.
