# The Mathieu groups — Math 611

An interactive companion to Jenia Tevelev's October 6, 2026 graduate algebra lecture. It compares all five Mathieu groups through their permutations, Witt designs, stabilizer chains, Sylow subgroups, triangle quotients, representations, and Golay codes.

- [Open the presentation](https://gtevelev-max.github.io/mathieu/)
- [Lecture notes](notes/math611_lecture_9_m11_ver2.pdf)
- [Editable LaTeX](notes/math611_lecture_9_m11_ver2.tex)

Open `index.html` directly, even offline. There are no runtime dependencies or build step. Choose a group at the top; use **Present** for projection and the arrow keys to change chapters. Chapter links in the notes open the corresponding computation. Links in the demonstration return to named destinations in the PDF.

## A classroom route

The notes give a 75-minute route centered on M11: history and permutations (8 minutes), residue and Witt designs (15), stabilizer chains (10), simplicity (12), Sylow geometry (10), triangle quotients (8), and decoding (12). The large-group comparisons and representations are extensions. A chapter may require scrolling; Present hides the navigation rather than compressing the mathematics.

## What runs where

| Computation | Algorithm | Where |
| --- | --- | --- |
| Products and orders | Permutation arrays; cycle decomposition and lcm | Browser |
| Block orbits | Breadth-first search with a set of visited blocks | Browser and SageMath |
| Steiner property | Dictionary of every defining subset and its incidence count | Browser and SageMath |
| Full M11 design automorphism group | Test the 6! candidates fixing a forced pentad | Browser and SageMath |
| Order and membership | Stabilizer chains, orbit transversals, Schreier generators, sifting | GAP build; browser checks the exported Schreier relations |
| Sylow subgroups and normalizers | GAP permutation-group algorithms | Build; browser enumerates the small Sylow subgroup, at most 1,024 elements |
| Triangle quotients | Seeded candidate search, then exact generated-subgroup order | GAP build; browser checks orders and membership |
| Codewords and decoding | Finite-field row reduction, all q^k combinations, nearest-word search | Browser and SageMath |
| M24 as a code automorphism group | Partition refinement and backtracking | SageMath |
| Characters | Conjugacy classes, fixed-point counts, weighted inner product | GAP classes; browser arithmetic |

The build does not enumerate the 244,823,040 elements of M24. It uses its binary Golay code to compute coordinate automorphisms. Stabilizer chains describe the large groups compactly. The browser's small closures are used only for Sylow subgroups and the optional M11 generation witness.

## Regenerate and verify

Tested with SageMath 10.9 and GAP 4.15.1:

```sh
sage -python scripts/generate_mathieu.py
node tests/verify_data.cjs
```

The script writes `data/mathieu.json`, its offline JavaScript wrapper, and `data/verification.json`. It verifies the actual permutation generators, all five Steiner systems, point-stabilizer chains, Sylow normalizers, class equations, exact generation by each triangle pair, and the four code constructions. Further checks certify the PSL2(11) hexad construction, M11 rigidity, the twelve-biplane action, signed lifts and module orbits, and the simplicity witness. GAP and SageMath choices of generators may change between versions; the mathematical checks must still pass.

`tests/verify_data.cjs` is an independent JavaScript check of the exported data: block preservation and full block orbits, every design incidence, all Schreier relations, Sylow closure and centers, character inner products, triangle orders and Euler characteristics, code minimum distances and supports, decoding within and beyond the guaranteed radius, and generation of M11 by two eleven-cycles. It does not independently recompute large-group normalizers or certify generation by large-group triangle pairs; those exact calculations are in the SageMath/GAP build.

Optional browser checks, including every group/chapter combination, live computations, keyboard navigation, and desktop/mobile layouts:

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
# Also accepts a published URL:
node tests/browser.cjs https://gtevelev-max.github.io/mathieu/
```

Set `CHROME_PATH` to use an installed Chrome, and `SCREENSHOT_DIR` to retain screenshots. `data/node-verification.json` and `data/browser-verification.json` record the release checks. No npm packages are needed to use the demonstration.

## Conventions and proof responsibilities

Arrays store images of 0-based points; `compose(a,b)[i] = a[b[i]]`. Products act from right to left, as in the notes. In the small family, the labels are residues modulo 11, with infinity at array index 11. In the large family, the first 23 code coordinates are 0–22; the parity point at index 23 is infinity. M23 fixes infinity; M22 also fixes 22. These are compatible coordinates within each family, not ATLAS labels. The input names `r,i,j` stand for the homework's rho, iota, jmath.

The notes prove simplicity for M11 and M12 and the representation and perfect-code arguments. Simplicity of the large groups and their classical identifications are cited. Exact triangle orders and generation establish an epimorphism from an infinite hyperbolic triangle group; they do not constitute a finite presentation of the image. The torsion-free kernel and surface interpretation also use the triangle-group torsion theorem. No minimal-genus assertion is made. A unique nearest codeword beyond the guaranteed radius need not be the transmitted word.

Primary mathematical references and algorithm documentation are linked in the **Algorithms & evidence** chapter and the lecture bibliography. Computations are reproducible from the included sources; pictures are diagrams of these finite data, not a separate geometric model or a Miracle Octad Generator.

## Files

- `index.html`, `style.css`, `app.js`: presentation and interface.
- `core.js`: dependency-free exact browser algorithms, also used by Node verification.
- `data/`: computed permutations, designs, code bases, witnesses, and verification reports.
- `scripts/generate_mathieu.py`: complete exact build.
- `tests/`: independent data and browser checks.
- `notes/`: the linked lecture PDF and its matching editable source.
- `source.zip`: a portable copy of this folder, excluding the archive itself.
