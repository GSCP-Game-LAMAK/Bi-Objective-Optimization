# LAMAK v6 — Financially bounded multi-objective optimizer

**Primary output:** an exact 50/50 CO₂–EBIT optimizer over the defined 30-option workbook-backed core, with a **five-year cumulative EBIT floor of −€8,384,875.34**. The alternative unrestricted mathematical payoff table remains available *for comparison*, not as the new default. Preset portfolios from the source workbook's `Dashboard` and `Schedule` sheets are never used to construct or calibrate solutions.

## Why v6?

The unrestricted carbon maximum saves about 5,984.25 t but loses €16.67m in EBIT over five years. Restricting cumulative EBIT losses to a clearly stated **€8.385m** changes the *carbon-optimal feasible strategy* and the two payoff-table anchors together:

| Value | Financially bounded **default** | Original unrestricted **reference** |
|---|---:|---:|
| Carbon reduction at EBIT maximum, R_Emax | 2,701.00 t | 2,701.00 t |
| Maximum five-year CO₂ saving, R_max | **5,890.19687965 t** | 5,984.25236154 t |
| EBIT at carbon maximum, E_Rmax | **−€8,384,875.34** | −€16,666,409.48 |
| Maximum five-year EBIT improvement, E_max | +€1,780,451.61 | +€1,780,451.61 |

The bounded normalization is:

\[
S(w) = w\frac{R-2701}{5890.19687965-2701} + (1-w)\frac{E+8384875.33777}{1780451.60870+8384875.33777},\quad E\ge -8384875.34.
\]

The cap is an **explicit economic preference** (an admissible-feasible-region boundary), NOT a 95% statistical confidence interval and NOT a confirmed instructor grading rule. The carbon maximum is the exact MILP optimum **subject to that financial cap**; the physical unrestricted extreme has not disappeared.

## v6 default result (50/50)

| Year | New implementation | Tokens that year |
|---|---|---:|
| 0 | Large PV at Plant B | 3 |
| 1 | 100% Lactose sourced from Europe | 3 |
| 2 | 100% redesigned spray bottles | 3 |
| 3 | Verona DC → Southern region by HVO | 1 |
| 4 | No new action | 0 |

- **Cumulative CO₂ avoided:** 3,887.81854 tonnes / **19.09%** of the five-year 20,370 t baseline.
- **Cumulative Δ EBIT:** +€1,116,959.91; final-year Δ EBIT approximately +€198,563.
- **Net five-year Δ cash:** +€681,959.91, after implementation outlays.
- **Bounded 50/50 score:** **65.34335%**.
- **Annual tokens:** 3–3–3–1–0; **10/10** total.

This is exactly optimal for the declared bounded weighted objective and 30-action core, based on the deterministic workbook inputs. The *full* workbook 516-action scenario search remains heuristic; service-level effects have not been verified.

### What remains unchanged from validated v5

- Updated `Eco_Chain_Reaction_Model_Updated.xlsx` calculation sheets are the only numerical source. `Dashboard`, `Schedule`, `Audit`, `Sensitivity` excluded.
- Supplier adoption can select 33% / 66% / 100%; packaging may ramp progressively in 33%-equivalent tiers with incremental tokens (the token-upgrade rule is a documented modeling assumption); max one energy installation; 10 tokens total, max 3 in each of five years; DC relocation only in Year 0.
- Financial accounting separates annual operating costs, depreciation, setup, and cash CapEx. Source workbook assumptions and unknown OTIF are explicitly disclosed.
- The local browser is static and needs no runtime server; the exact 30-option weight-slider results were solved offline by SciPy/HiGHS.
- Browser edits and extended scenarios are **not certified**; changing inputs requires regenerating the exact results using the Python solver.

## Run locally — Windows VS Code

Copy the ZIP **contents** into the repository root, including the hidden `.github` folder, then:

```powershell
py -m pip install numpy scipy
py scripts/solve_exact_v6.py
py scripts/independent_crosscheck_v6.py
node --test tests/v6.test.cjs
py -m http.server 8000
```

Visit `http://localhost:8000` in the browser. Choose **Financially bounded** (default) or **Unrestricted** under "Normalization / feasible region". The 50% slider gives the appropriate exactly solved strategy in each mode. "Inspect" opens its five-year plan.

## Publish via GitHub Actions

```powershell
git add -A
git commit -m "LAMAK v6 - financially bounded normalization"
git push origin main
```

At GitHub **Settings → Pages**, set **Source: GitHub Actions**. The workflow tests the v6 scripts, regenerates both payoff tables and all certified scores, cross-checks with a second 130-binary-variable MILP formulation, runs 18 Node tests, then deploys. If validation fails, deployment fails instead of publishing inconsistent results.

Website: `https://gscp-game-lamak.github.io/Bi-Objective-Optimization/`

## Files

- `scripts/solve_exact_v6.py`: 170-column MILP, 55 progressive bottle paths, 126 certified weighted portfolios and sampled ε-constraint frontiers.
- `scripts/independent_crosscheck_v6.py`: separately formulated 130-variable MILP, validates all 126 portfolios and both payoff tables.
- `data/exact_v6.json`, `.js`, `_frontier.csv`: exact reference output.
- `data/workbook_model.json`, `data/model.js`: workbook-derived 516 action records and traced source rows.
- `source/Eco_Chain_Reaction_Model_Updated.xlsx`: source workbook frozen at the originally validated SHA-256.
- `validation/VALIDATION_REPORT_V6.md`: details of the revised anchors, method, results and limits.
- `research/ACADEMIC_REPORT_DRAFT_V6.md`: updated reporting draft for your team's report.

**Do not interpret the fixed €8.385m financial boundary as a 90–95% confidence interval**: there is no statistical uncertainty sample here. This is a business-oriented deterministic feasible-set restriction. It must be justified independently in the eventual academic report to avoid selecting a threshold solely to favor one strategy.
