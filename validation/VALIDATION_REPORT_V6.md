# LAMAK v6 — independently verified bounded reference

**Dataset:** unchanged updated workbook, SHA-256 `67823502543875c14dde51e1b759b6602a9a0fbf92102714e0854ac0dccb7b1c`. Formula input sheets only, no workbook `Dashboard` / `Schedule` / `Audit` / `Sensitivity` leakage.

## Chosen economic boundary

Five-year EBIT change must satisfy `E ≥ −€8,384,875.34`. This is a user-specified financial cap, **not** a confidence interval; adding this constraint changes which portfolios are admissible. To compare meaningfully, all normalization endpoints are recomputed for this same restricted feasible set using exact MILP.

| Parameter | Bounded default | Unrestricted benchmark |
|---|---:|---:|
| `R_Emax` | 2,701.00000 t | 2,701.00000 t |
| `R_max` | 5,890.19687965 t | 5,984.25236154 t |
| `E_Rmax` | −€8,384,875.33777 | −€16,666,409.48220 |
| `E_max` | +€1,780,451.60870 | +€1,780,451.60870 |

At equal weights, the core MILP default optimal portfolio contains:

| Year | Action | Tokens |
|---:|---|---:|
| 0 | Plant B — Large PV | 3 |
| 1 | Lactose — 100% European sourcing | 3 |
| 2 | Spray-bottle redesign — 100% | 3 |
| 3 | Verona → South HVO | 1 |
| 4 | No action | 0 |

`R=3,887.818537833773 t`, `E=+€1,116,959.914601004`, `cash=+€681,959.914601004`, score `S(0.5)=0.65343351980067` or **65.34335%**. This is the same plan as the independently recomputed teammate benchmark.

The unrestricted reference model continues to yield `R=5,834.3039609 t`, `E=−€6,165,539.41915`, score **76.17895%** *under its different normalization*. Those percentage scores **must not** be compared as though both strategies used the same objective scale.

## Independent verification

- **Publication model:** 170 candidate schedule binaries (55 monotone packaging paths) using SciPy/HiGHS MILP.
- **Independent model:** 130 action-year and cumulative packaging threshold binaries, a fundamentally different encoding.
- Both independently solve and reconcile the unrestricted maximum-EBIT extreme, both carbon maxima, and their EBIT-at-carbon-max outcomes.
- All **126** published weighted MILP optima (2 normalization regions × 3 EBIT guards × 21 weights) reproduced numerically in the independent model, including bounded-feasibility checks.
- All **516** workbook action coefficients were previously source-reconciled; no source data, constraints or source workbook change in v6.
- 18 deterministic Node tests validate UI calculations, slider mode, 25-team/516-workbook screening separation, token schedules, adoption progression and Inspect navigation.

## Responsible interpretation

The exact certificate applies to **the defined core 30-alternative deterministic model**, *not* the 516-option heuristic screening search or actual professor simulator score. The bounded threshold is an explicitly chosen financially acceptable range, not inferred from a statistical 90–95% confidence interval. The fixed threshold should be justified ex ante or subjected to sensitivity analysis to avoid hindsight bias. The physical 5,984 t extremum remains recorded; it was not deleted or relabeled as infeasible under the original rules.

There are no verified stock-policy CO₂ or OTIF effects; the cash/EBIT data follow the workbook assumptions. Prefer reporting both normalized ranking **and** baseline-relative (20,370 t) five-year CO₂ change and actual EBIT changes.
