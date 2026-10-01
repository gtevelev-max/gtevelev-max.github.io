#!/usr/bin/env python3
"""Independent checks for stored quantum-spectrum animation data (stdlib only).

This does not import the generator or its numerical engine. Core polynomials
1--3 are independently transcribed from the manuscript. For larger cores,
moment, symmetry, endpoint and counting checks are necessary checks, not a
certificate that every stored point solves the defining equations.
"""
import argparse
from collections import Counter, defaultdict
import cmath
from fractions import Fraction
import json
import math
from pathlib import Path


def terminal_value(g, k):
    return 4*(-1)**k*(2*g-1-2*k)


def terminal_count(g, k):
    return sum((k-j+1)*math.comb(2*g+1, j) for j in range(k+1))


def wall_list(g, b=1.0):
    n = 2*g+1
    groups = {}
    for d in range(1, g//2+1):
        for gamma in range(g-2*d+1):
            a = Fraction(2*d, n-2*gamma)
            nu = n-4*d-2*gamma
            row = groups.setdefault(a, {"a": str(a), "rho": math.exp(-b*nu/d),
                                         "types": [], "rank_change": 0})
            row["types"].append([d, gamma])
            row["rank_change"] += math.comb(n, gamma)*nu
    return [groups[a] for a in sorted(groups)]


def wall_checks():
    expected = {
        2: [("2/5", 1.0, 1)],
        3: [("2/7", 3.0, 3), ("2/5", 1.0, 7)],
        4: [("2/9", 5.0, 5), ("2/7", 3.0, 27),
            ("2/5", 1.0, 36), ("4/9", 0.5, 1)],
    }
    for g, rows in expected.items():
        got = wall_list(g)
        assert len(got) == len(rows)
        for row, (a, exponent, count) in zip(got, rows):
            assert row["a"] == a and row["rank_change"] == count
            assert abs(row["rho"]-math.exp(-exponent)) < 1e-15
            reconstructed = 2/(4-math.log(row["rho"]))
            assert abs(reconstructed-float(Fraction(a))) < 1e-15
    # Simultaneous walls must be merged, not dropped or shown twice.
    row = next(x for x in wall_list(7) if x["a"] == "2/5")
    assert row["types"] == [[1, 5], [3, 0]] and row["rank_change"] == 3006
    return {str(g): wall_list(g) for g in expected}


def csum(values):
    values = list(values)
    return complex(math.fsum(z.real for z in values), math.fsum(z.imag for z in values))


def core_moments(k, rho):
    eta = (-1)**(k-1)
    e = eta*((k+1)//2)
    first = 2*k+1+eta*rho**e
    S = Fraction(8, 3)*k*(k+1)*(2*k*k+2*k-1)
    second = (rho**(2*e) + float((S-1-eta*(2*k+1))/2)*rho
              + float((S-1+eta*(2*k+1))/2))
    return first, second


def total_moments(g, rho):
    n, m = 2*g+1, g-1
    exponents = [(1+(-1)**(m+j)*(n-2*j))//4 for j in range(g+1)]
    phi = math.fsum(math.comb(n, j)*rho**e for j, e in enumerate(exponents))
    phi2 = math.fsum(math.comb(n, j)*rho**(2*e) for j, e in enumerate(exponents))
    return (-1)**m*phi, phi2+n*(2*g-1)*2**(2*g-1)*(1+rho)


def coefficients(k, r):
    """Descending monic coefficients P_k, independently from manuscript."""
    if k == 1:
        return [1.0, -3-r]
    if k == 2:
        return [1.0, 1/r-5, -45*r-30-5/r,
                -27*r*r-115*r-25-25/r]
    if k == 3:
        return [1.0, -r*r-7, 7*r*r-182*r-161,
                175*r**3+168*r*r+126*r+784+27/r,
                -77*r**3+5572*r*r+7074*r+5796-189/r,
                -(5250*r**4+10126*r**3+24052*r*r+49084*r+25578+2646/r),
                3125*r**5+16954*r**4+16947*r**3+31948*r*r+87563*r+18522+9261/r]
    raise ValueError(k)


def from_roots(roots):
    coeff = [1+0j]
    for z in roots:
        nxt = [0j]*(len(coeff)+1)
        for j, c in enumerate(coeff):
            nxt[j] += c
            nxt[j+1] -= z*c
        coeff = nxt
    return coeff


def polynomial_residual(coeff, z):
    p, scale = 0j, 0.0
    for c in coeff:
        p = p*z+c
        scale = scale*abs(z)+abs(c)
    return abs(p)/(1+scale)


def conjugacy_error(roots):
    # A bijection checks multiplicities as well as nearest-neighbor distances.
    remaining = list(roots)
    error = 0.0
    for z in roots:
        j = min(range(len(remaining)), key=lambda j: abs(remaining[j]-z.conjugate()))
        mate = remaining.pop(j)
        error = max(error, abs(mate-z.conjugate())/(1+abs(z)))
    return error


def primitive_count(n):
    """Odd exact-order count from the divisor decomposition, without Moebius."""
    return (n*n-1)//8-sum(primitive_count(d) for d in range(3, n, 2) if n%d == 0)


def check_file(path, tolerance=1e-7):
    data = json.loads(path.read_text())
    g = int(data["g"])
    n = 2*g+1
    N = g*4**(g-1)
    failures, warnings = [], []
    maxima = defaultdict(float)

    def require(ok, message):
        if not ok and len(failures) < 60:
            failures.append(message)

    require(data["n"] == n and data["N"] == N, "wrong n or total rank N")
    frames = data["frames"]
    branches = data["branches"]
    require(all(isinstance(r, (int, float)) and 0 < r <= 1 for r in frames),
            "frames must be in (0,1]; rho=0 has no regular spectrum")
    require(all(a < b for a, b in zip(frames, frames[1:])), "frames are not strictly increasing")
    require(len(branches) == g*(g+1)*(g+2)//6, "wrong unweighted branch count")
    by_core = defaultdict(list)
    terminal_hist = Counter()
    for index, branch in enumerate(branches):
        k, cluster = int(branch["core"]), int(branch["cluster"])
        mult = branch["multiplicity"]
        require(1 <= k <= g, f"branch {index}: invalid core")
        require(g-k <= cluster <= g-1, f"branch {index}: invalid terminal cluster")
        require(mult == math.comb(n, g-k), f"branch {index}: wrong multiplicity")
        require(len(branch["points"]) == len(frames), f"branch {index}: missing frame")
        require(all(len(p) == 2 and all(math.isfinite(x) for x in p)
                    for p in branch["points"]), f"branch {index}: nonfinite or malformed point")
        by_core[k].append(branch)
        terminal_hist[cluster] += mult
    require(sum(b["multiplicity"] for b in branches) == N, "weighted branch count is not N")
    for k in range(1, g+1):
        require(len(by_core[k]) == k*(k+1)//2, f"core {k}: wrong number of branches")
        counts = Counter(int(b["cluster"]) for b in by_core[k])
        require(counts == {g-k+ell: ell+1 for ell in range(k)},
                f"core {k}: wrong terminal local lengths")
        if all("primitiveOrder" in b for b in by_core[k]):
            orders = Counter(int(b["primitiveOrder"]) for b in by_core[k])
            expected = {d: primitive_count(d) for d in range(3, 2*k+2, 2)
                        if (2*k+1)%d == 0}
            require(orders == expected, f"core {k}: wrong exact-order decomposition")
    require(len(data["clusters"]) == g, "wrong cluster count")
    for cluster in data["clusters"]:
        k = int(cluster["k"])
        require(cluster["value"] == terminal_value(g, k), f"cluster {k}: wrong value")
        require(cluster["multiplicity"] == terminal_count(g, k), f"cluster {k}: wrong rank")
        require(terminal_hist[k] == terminal_count(g, k), f"cluster {k}: branch weights disagree")

    # Stop structural errors before indexing malformed arrays.
    if failures:
        return {"g": g, "file": str(path), "passed": False, "failures": failures}

    cancellation_cases = []
    for frame, rho in enumerate(frames):
        weighted = []
        for k in range(1, g+1):
            sign = (-1)**(g-k)
            roots = [sign*complex(*b["points"][frame]) for b in by_core[k]]
            conj = conjugacy_error(roots)
            maxima["conjugacy_relative_error"] = max(maxima["conjugacy_relative_error"], conj)
            require(conj <= tolerance, f"core {k}, rho {rho}: conjugacy error {conj:g}")
            # Conjugation along the real path must also preserve terminal color.
            for cluster in range(g-k, g):
                colored = [complex(*b["points"][frame]) for b in by_core[k]
                           if b["cluster"] == cluster]
                color_error = conjugacy_error(colored)
                maxima["colored_conjugacy_relative_error"] = max(
                    maxima["colored_conjugacy_relative_error"], color_error)
                require(color_error <= tolerance,
                        f"core {k}, cluster {cluster}, rho {rho}: conjugate colors disagree")
            for order, expected in enumerate(core_moments(k, rho), 1):
                terms = [z**order for z in roots]
                error = abs(csum(terms)-expected)
                scale = 1+abs(expected)
                roundoff = 5e-13*math.fsum(abs(z) for z in terms)
                maxima[f"core_moment_{order}_relative_error"] = max(
                    maxima[f"core_moment_{order}_relative_error"], error/scale)
                require(error <= tolerance*scale+roundoff,
                        f"core {k}, rho {rho}: moment {order} error {error/scale:g}")
                if roundoff > tolerance*scale:
                    cancellation_cases.append([k, rho, order])
            if k <= 3:
                coeff = coefficients(k, rho)
                residual = max(polynomial_residual(coeff, z) for z in roots)
                coeff_error = max(abs(a-b)/(1+abs(b))
                                  for a, b in zip(from_roots(roots), coeff))
                maxima["low_core_polynomial_residual"] = max(maxima["low_core_polynomial_residual"], residual)
                maxima["low_core_coefficient_error"] = max(maxima["low_core_coefficient_error"], coeff_error)
                require(residual <= tolerance, f"core {k}, rho {rho}: polynomial residual {residual:g}")
                require(coeff_error <= 10*tolerance, f"core {k}, rho {rho}: coefficient error {coeff_error:g}")
            weighted.extend((complex(*b["points"][frame]), b["multiplicity"]) for b in by_core[k])
        for order, expected in enumerate(total_moments(g, rho), 1):
            terms = [mult*z**order for z, mult in weighted]
            error = abs(csum(terms)-expected)/(1+abs(expected))
            maxima[f"global_moment_{order}_relative_error"] = max(
                maxima[f"global_moment_{order}_relative_error"], error)
            require(error <= 10*tolerance, f"rho {rho}: weighted moment {order} error {error:g}")
        if rho == 1:
            for index, branch in enumerate(branches):
                error = abs(complex(*branch["points"][frame])-terminal_value(g, branch["cluster"]))
                require(error <= tolerance, f"branch {index}: terminal position error {error:g}")
    if g > 3:
        warnings.append("Cores above 3 checked by counts, moments, conjugacy and endpoints only; no independent full-polynomial certificate.")
    if cancellation_cases:
        warnings.append("Some core-moment checks are limited by cancellation of floating-point input; inspect cancellation_cases.")
    return {"g": g, "file": str(path), "passed": not failures,
            "frame_count": len(frames), "branch_count": len(branches), "rank": N,
            "failures": failures, "warnings": warnings, "maxima": dict(maxima),
            "cancellation_cases": cancellation_cases[:40],
            "cancellation_case_count": len(cancellation_cases)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument("--tolerance", type=float, default=1e-7)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    directory = Path(__file__).parent/"site"/"data"
    paths = args.paths or sorted(directory.glob("g-*.json")) or sorted(directory.glob("g*.json"))
    report = {"scope": __doc__.split("\n\n")[1], "wall_tests": wall_checks(),
              "data": [check_file(p, args.tolerance) for p in paths]}
    report["passed"] = bool(paths) and all(row["passed"] for row in report["data"])
    if not paths:
        report["message"] = "No spectrum data files found; only wall formulas checked."
    out = json.dumps(report, indent=2)+"\n"
    if args.output:
        args.output.write_text(out)
    print(out)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
