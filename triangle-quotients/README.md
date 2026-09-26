# Triangle groups II: finite quotients and glued surfaces

Open `index.html` and choose a quotient. Every example has a closed three-dimensional surface. The animation begins with the surrounding tessellation, fades away chambers outside the chosen gluing region, then glues its paired boundary sides. Retained triangles remain in the same positions during the first transition. Hyperbolic examples use the Klein disc, where geodesics are straight line segments; Euclidean examples use the plane. Spherical examples begin with the complete tessellated sphere and open a topological cut chart before gluing. Original chamber labels are preserved throughout.

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

The four hyperbolic examples use broad-handle topological embeddings computed from their exact quotient triangulations. The construction cuts along g disjoint nonseparating curves, redraws the resulting sphere with 2g holes to redistribute area toward those holes, and rejoins the original collars as separated three-dimensional handles. Hole caps receive 80% of the planar target area. Handle radii depend on local spacing; disjoint routes share height, keeping the model compact.

Every rendering patch retains its original chamber number and barycentric source coordinates. The original chamber counts stay **336**, **720**, **1,008**, and **15,840** for Klein, A6, Macbeath, and M11. Original triangles may have bent boundaries and interiors in three dimensions. Independent checks verify that each original chamber remains a disk, both copies of every original edge agree, all quotient neighbors match, and the completed handles do not intersect.

The earlier Schulte–Wills Klein and Bokowski–CodeParade Macbeath polyhedra remain in the source archive as alternative mathematical models, with exact rational intersection checks and chamber correspondences.

Sphere models use their original chamber identifications. The torus uses its exact primitive translation lattice and 12 curved chambers. In all eight examples, lengths and angles in the display are distorted; the intrinsic spherical, Euclidean, or hyperbolic metric is specified by the original triangles and gluing data.

Drag a glued surface to rotate it, shift-drag to pan, scroll to zoom, and click a chamber to select it. **Turn 30°**, **Reset view**, and **Full screen** support classroom presentation. Chamber 0 is initially available in the chamber explorer without a gold fill. Click a chamber, cross to a neighbor, or enable **Highlight selected chamber in gold** to emphasize it; uncheck the option to return to the surface colors.

For the four hyperbolic surfaces, **Color by → Handles and base** distinguishes the pale upper sheet, slate underside, and colored handles. These colors describe parts of the embedding. **Chambers** restores the two colors for positive and negative chambers. The underside's three large drawing facets all belong to original chamber 0; they do not add three chambers to the quotient. The upper sheet and underside together form the perforated base surface to which the handles attach.

Choose a handle number and use **Both attachments** to frame its connecting tube and two exact polygonal rims, labeled with that number and **A** or **B**. Each rim is the shared boundary of the handle collar and base surface. A rim can meet the upper sheet or underside. Repeated colors help locate handles; the numbers identify the actual pairs. **Attachment A** and **Attachment B** inspect each mouth, **Inspect handle** zooms along the tube, and **Along handle** moves the close-up from A toward B.

Inspection enables **Isolate handle · cutaway**, which keeps the chosen handle and base while hiding the other handles and their chamber-edge segments. Their attachment mouths remain open in this cutaway. Turn the option off to inspect the handle among its neighbors. **Whole surface** restores the overview and clears both cutaway options.

**Open underside · cutaway** hides the three underside facets at the glued endpoint so the attachments can be inspected through the opening. This is an explicitly open cutaway of the same model; turn off both cutaway options to restore the closed surface. Word galleries follow the piecewise-linear chamber charts, including across tube subdivisions. Tracing a word restores the complete surface; if a cutaway is subsequently enabled, gallery segments on the hidden parts are hidden too.

The Klein region contains all 336 original triangles and has 88 exposed sides, paired into 44 seams. The A6, Macbeath, M11, and torus regions have 240, 244, 8,930, and 8 exposed sides, respectively. Already-adjacent sides are joined in the region before its boundary is glued. Assembly frames are explanatory and may pass through themselves; the verified glued endpoint is embedded. Add `?view=surface#klein`, `?view=surface#macbeath`, `?view=surface#a6`, or `?view=surface#m11` to open at a glued endpoint.

`surface-models.zip` contains numerical source data, builders, original-chamber correspondence, model hashes, primary-source citations, licenses, and portable verification instructions for all eight examples. The large generated A6/M11 intermediate JSON files are regenerated from the included quotient inputs. Their packed final web assets are distributed alongside the application in `surface-data/`; the archive provides a hash-checked download helper. `quotient-data.zip` contains the group enumeration and chamber-gluing certificates.

Both applications work offline when their complete folders, including `surface-data/`, are copied locally, using a modern browser with WebGL and DecompressionStream support. The depth buffer is used for chamber edges and galleries as well as filled triangles.

## Rendering and animation update

The animation begins with the visible tessellation of the covering plane (or the complete sphere). Only chambers outside the chosen gluing region fade away. The retained region stays fixed, then its paired sides assemble into the closed surface.

Camera framing uses each model’s actual bounding sphere. Refined models use a monotone depth map written from interpolated view depth, so zoom no longer clips remote pieces; a full-model depth bound is used when fragment-depth support is unavailable. Surface shading follows the actual intermediate mesh, and edge depth bias is limited to two 24-bit depth units. Picking uses the same depth format as drawing.

The geometry now assigns substantially more area to the handles and their attachment collars. This is a change to the embedding itself. At a fixed 500-pixel model diameter, the Klein handles are about 42–50 pixels wide, A6 about 11–32 pixels, and Macbeath about 30–33 pixels. M11’s median handle width increases from about 0.006 pixels to 2.36 pixels at the same scale, roughly 379 times wider. With 631 handles, it still benefits from close-up inspection. Close-ups use the original double-precision coordinates; **Both attachments**, **Attachment A**, **Attachment B**, and **Along handle** make the connection explicit.

See `AREA-REDISTRIBUTION.md`, `BALANCED-TUBES.md`, and the `*-balanced-tubes-area-audit.json` reports in `surface-models.zip` for the area redistribution, geometry checks, and measurements. Model asset URLs carry content versions to prevent stale geometry from being reused after an update.

For the dense M11 overview, ordinary chamber edges use a finer stroke so they do not obscure the handles. Their full stroke width returns when zooming or inspecting a handle; selected chambers, seams, and word galleries remain emphasized.

The source archive includes `test-attachments.cjs`, which checks every displayed rim against the packed mesh: closed simple cycles, exactly one incident base patch and one handle patch, complete coverage of all base/handle interfaces, and identical source coordinates on both sides. After fetching the packed web assets as described in the archive README, run:

```sh
node course-update-20260925/all-surfaces/test-attachments.cjs klein a6 macbeath m11
```
