# Compact symmetric models for three triangle quotients

Prepared September 27, 2026 for Math 611.

The comparison displays embedded topological models. Their conformal structures come from the original triangle-group gluing, not from the Euclidean metric of the drawings. Throughout, D_n has order 2n.

| Curve | Genus | Full holomorphic group | Maximal visible proper rotations | Original chambers on displayed model |
| --- | ---: | --- | --- | --- |
| Klein quartic | 3 | PSL(2,7), order 168 | A4, order 12 | All 336 |
| Smooth Wiman sextic | 10 | A6, order 360 | D5, order 10 | Transport of 720 pending |
| Fricke–Macbeath curve | 7 | PSL(2,8), order 504 | D7, order 14 | Transport of 1,008 pending |

“Maximal” refers to rotations of ordinary three-space realizing the orientation-preserving intrinsic action on an embedded marked surface. It does not count accidental mirror symmetries of an unmarked target. A surface with the right genus alone would not suffice: the restricted group action must also match. Klein and Macbeath maximality follow from Goerner's classification and constructions. The Wiman argument below is a new derivation for this project.

## Klein: a rounded tetrahedral model

The model starts with the Schulte–Wills embedding, whose tetrahedral rotation group A4 has order 12. Goerner proves this is maximal for an embedded Klein surface. An octahedral action of order 24 is possible for an immersion, which has self-intersections, but not for an embedding. See Goerner §2.12.3 and §2.13, and Scholl–Schürmann–Wills.

Two damped subdivision steps round the existing 336 chamber charts, keeping their source barycentric coordinates and side-labelled adjacency. All twelve rotations act exactly on the exported dyadic coordinates. The output has 2,684 vertices and 5,376 drawing patches; the toggle draws only the boundaries of the 336 original chambers.

The finite mesh passes all 14,448,000 exact rational triangle-pair checks, with no unintended intersections. A separate audit checks every original chamber as a disk, source-chart area and continuity, neighboring chamber edges, and all twelve symmetries. The archive includes the coordinates, checks and reconstruction scripts. This certifies the finite model, not an infinite smoothing limit.

## Wiman: two pentagonal rings of holes

This is the smooth genus-10 Wiman sextic with group A6, not the genus-6 normalization of the singular Wiman–Edge sextic. Its regular map R10.6 has type {4,5} and 720 barycentric chambers. The target is a rounded double of a disk with ten holes, arranged in two pentagonal rings. It admits fivefold rotations and horizontal half-turns, forming D5.

The A6 action has signature (2,4,5). Nonidentity elements of orders 2, 3, 4, 5 have respectively 6, 0, 2, 2 fixed points. An order-four spatial rotation and its square have the same fixed axis, whereas the corresponding curve automorphisms have different fixed sets. Thus no such order-four rotation is possible.

For an A5 subgroup, the quotient has signature (0;2,2,2,5). In the icosahedral quotient of three-space, the singular edges of orders 2, 3, 5 run from the origin to infinity. An embedded separating surface must meet all three with the same parity. The signature requires odd, even, odd intersections, an obstruction. For A4 the quotient signature is (1;2,2,2); the tetrahedral singular edges have types (2,3,3) and required parities odd, even, even, again impossible. The finite rotation-group classification, together with the element orders in A6, now bounds the order by 10.

To check that this bound is attained by the correct Wiman action, use the sextic equation

    27X^6 + 9X(Y^5+Z^5) -135X^4YZ -45X^2Y^2Z^2 +10Y^3Z^3 = 0.

The transformations r(Y,Z)=(ζY,ζ^-1Z) and s(Y,Z)=(Z,Y), with ζ^5=1, generate D5. Put u=YZ and v=Y^5-Z^5 in the chart X=1. Its cyclic quotient is

    v^2=P(u)^2-4u^5,   P(u)=(-27+135u+45u^2-10u^3)/9.

The full D5 quotient is the u-sphere, with six order-two branch points and one order-five branch point, matching the geometric target. A finite monodromy calculation verifies the match beyond the signature: all 3,125 tuples of six reflections with prescribed nontrivial rotation product lie in one Hurwitz orbit. The archive contains the enumeration. The algebraic r has local fixed-point rotation angles ±144°; r² or r³ matches the 72° geometric generator, depending on orientation.

The exported target has 42,342 vertices and 84,720 drawing triangles, Euler characteristic −18, circular vertex links, consistent orientation, and the explicit D5 action. Its upper and lower sheets are height graphs over a nonoverlapping planar domain, meeting only along their intended boundary. These triangles are not the original 720 chambers: their transport remains unfinished.

## Macbeath: a compact seven-hole model

Goerner constructs the D7-equivariant embedding from a sphere of signature (0;2,2,2,2,7), first passing to a torus with two order-seven branch points and then taking a sevenfold cover. His necessary-condition table excludes larger candidate rotational subgroups. See §2.12.3, printed pp.147–149, and §2.13.

Our concrete target follows that construction. With w=(x+iy)^7 it is

    (|w-2|-2)^2 + (z/0.36)^2 = 0.6^2.

The offset torus in (Re w, Im w, z) meets the branch axis twice. Riemann–Hurwitz gives Euler characteristic 7·0−2(7−1)=−12, hence genus 7. Rotation by 2π/7 about z and the half-turn (x,y,z)→(x,−y,−z) generate D7.

The exported mesh has 12,532 vertices and 25,088 drawing triangles. It is closed, connected and oriented, with Euler characteristic −12. Its two graph sheets meet along eight disjoint boundary cycles; projected triangle orientation is checked exactly. The explicit symmetry permutations preserve oriented faces and satisfy the D7 relations. The 1,008 original chambers have not yet been transported onto this target.

## Reproduction and archive

The download contains generated coordinates and allowlisted construction and verification sources. It contains no copies of research articles or private teaching documents. From its extracted root:

    python3 course-update-20260927-symmetric/prototype-klein-rounded.py 2 1/4
    python3 course-update-20260927-symmetric/verify-klein-rounded-charts.py
    python3 course-update-20260927-symmetric/wiman/build_symmetric_target.py
    python3 course-update-20260927-symmetric/macbeath/build_d7_target.py

These commands use Python's standard library. Additional notes under each curve's directory explain the calculations and limits. The existing gluing presentation is unchanged: the two targets without original chamber maps are offered for comparison, not as completed triangulation animations.

## Primary references

- Matthias Goerner, [Visualizing Regular Tessellations, Chapter 2](https://math.berkeley.edu/~matthias/research/matthias_goerner_thesis_print.pdf).
- Scholl, Schürmann and Wills, [Polyhedral models of Felix Klein's quartic](https://math.ucr.edu/home/baez/klein_quartic_scholl.pdf).
- Schulte and Wills, [A Polyhedral Realization of Felix Klein's Map {3,7}8 on a Riemann Surface of Genus 3](https://doi.org/10.1112/jlms/s2-32.3.539).
- David McCooey, [Schulte–Wills polyhedron coordinates](https://dmccooey.com/polyhedra/KleinDual.html).
- Badr and Bars, [The stratification by automorphism groups of smooth plane sextic curves](https://link.springer.com/article/10.1007/s10231-025-01558-z).
- Marston Conder, [Regular orientable maps census](https://www.math.auckland.ac.nz/~conder/RegularOrientableMaps101.txt).
- Jarke J. van Wijk, [Visualization of Regular Maps: The Chase Continues](https://doi.org/10.1109/TVCG.2014.2352952).
