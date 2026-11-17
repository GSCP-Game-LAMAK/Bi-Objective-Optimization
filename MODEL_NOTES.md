# LAMAK v5 — Model specification and audit trail

## 1. Data lineage

Use `Eco_Chain_Reaction_Model_Updated.xlsx` *only through* `Inputs`, `Assumptions`, `Routing`, `Suppliers`, `DC Locations`, `Energy`, `Transport`, `Stock Policies` and `Actions`. No value from the preset `Dashboard`, `Schedule`, `Audit`, or `Sensitivity` worksheets enters the candidate or solver data. The extraction code is `build_model_data.py`; the 516 action records and source line ranges are stored in `data/workbook_model.json`.

The original teammate shortlist comprises five options in each of five areas (25). Version 5's **exact core** expands four supplier categories and packaging to all 33/66/100% allowed tiers while **excluding all five stock policies** because their CO₂ and OTIF data are unknown and estimated inventory carrying savings cannot automatically be treated as EBIT. Hence core alternatives: 5 DC + 5 energy + 12 suppliers + 5 transportation + 3 packaging = 30.

## 2. Mathematical structure

Years \(t=0,1,2,3,4\). For each one-time nonpackaging action \(a\), binary variable \(x_{a,t}\in\{0,1\}\) indicates adoption in year \(t\). Starting an action permanently activates its estimated annual cost/carbon effect for years \(t,\ldots,4\):

\[
R = \sum_{t=0}^{4}\left[\sum_a r_a \sum_{\tau\le t}x_{a,\tau}+r^{pack}(p_t)\right]
\]

\[
E = \sum_{t=0}^{4}\left[-\sum_a(opex_a+depreciation_a)\sum_{\tau\le t}x_{a,\tau} - (opex^{pack}_{p_t}+dep^{pack}_{p_t}) -setup^{pack}_t-\sum_a setup_a x_{a,t}\right]
\]

The packaging level \(p_t\in\{0,1,2,3\}\) represents 0/33/66/100% adoption, with \(p_{t}\ge p_{t-1}\) and \(p_{-1}=0\). The assumed token payment in year \(t\) for packaging is **\(p_t-p_{t-1}\)**, not \(p_t\) again. **The case explicitly permits progressive packaging, but does not specify token accounting for upgrades; the marginal-token interpretation requires instructor validation.** The fixed packaging setup €75,000 is charged just once at the first \(p_t>0\). The yearly emissions and EBIT contributions use the **full active tier** \(p_t\), rather than cumulatively adding multiple full-tier rows (which would double count).

For clarity and guaranteed consistency, the Python exact MILP enumerates all **55 nonzero monotone packaging level sequences across five years** as mutually exclusive optional binary columns. The remaining actions are one-off year-specific columns. There are **170 binary columns** in total.

Constraints: at most 10 tokens total; at most 3 tokens per year; one installation globally across energy technologies and factories; at most one DC relocation and only in Year 0 (€90,000 setup); one mode per transport route/region; one tier per European supplier material; DC-specific route compatibility. Each source-based decision is taken at most once (the packaging plan is the sole exception, expressed as its tier evolution).

## 3. Independent payoff-table normalization

Solve separately for \(E_{max}=\max E\) and \(R_{max}=\max R\). Lexicographic tie-breaking gives the other outcome at each extreme, \(R_{Emax}\) and \(E_{Rmax}\). Then for \(w\in\{0,.05,\ldots,1\}\), maximize

\[
S_w = w\frac{R-R_{Emax}}{R_{max}-R_{Emax}}+(1-w)\frac{E-E_{Rmax}}{E_{max}-E_{Rmax}}.
\]

The anchors are **fixed across EBIT-protected variants**, ensuring legitimate score comparison. Additional hard constraints \(E\ge -€1\mathrm{m}\) or \(E\ge0\) are optional analyst assumptions, not instructor rules. The solver performs 83 certified MILP optimizations (four endpoint/lexicographic, 63 weight×guardrail, 16 epsilon-sweep). Individual weight optima are exact for this model. The plotted frontier includes selected ε-sweep points but is **not an exhaustive discrete frontier enumeration**.

The normalized weighted preference is **not confirmed as the professor's scoring formula**. The wider 516-row candidate universe has different eligibility/OTIF assumptions and is **not included in the exact certificate**.

## 4. Yearly financial model

- Annual EBIT increment = minus the action's incremental operating cost, **minus annual depreciation**, plus/minus one-off implementation expenses in the implementation year.
- Five-year cash increment = minus annual incremental operating cash costs **minus capital investment** and setup when incurred. Depreciation is not a cash outflow.
- The workbook's `Actions` rows separate these fields; v5 does not double-subtract CapEx from EBIT.
- Unverified stock carrying-cost differences remain excluded from exact optimization.

## 5. Numeric regression landmarks, latest workbook

| Quantity | Recalculated reference |
|---|---:|
| Baseline five-year emissions | 20,370 t |
| PV Large Plant B annually | 540.20 t CO₂ saved; +€356,090.32 EBIT |
| Pure EBIT optimum | 2,701.00 t CO₂ saved; +€1,780,451.61 cumulative EBIT |
| Pure carbon optimum | 5,984.25 t CO₂ saved; −€16,666,409.48 cumulative EBIT |
| Unrestricted 50/50 exact | 5,834.30 t; −€6,165,539.42 EBIT |
| 50/50 with loss ≤ €1m | 4,417.96 t; −€679,863.39 EBIT |
| 50/50 with Δ EBIT ≥ €0 | 4,049.03 t; +€553,057.71 EBIT |
| Teammate benchmark | 3,887.82 t; +€1,116,959.91 EBIT; +€681,959.91 cash |

### Study limitations

The case supplies no official relationship mapping individual stock policy changes to OTIF. The routing calculations use modeled representatives and calibrated masses. The workbook's revised solar assumption uses mean-day electricity matching, not an hourly photovoltaic self-consumption dispatch. It is therefore improper to claim exact physical/operational carbon or service results, even when the combinatorial MILP solve is mathematically exact. Keep **solver optimality** separate from **input-model validity**.


## Independent validation finding — EBIT time horizon

The frozen source reconciliation and second MILP formulation passed. Crucially, a **five-year cumulative EBIT ≥ €0** guardrail does not guarantee *Year-4* EBIT ≥ €0. The v5 cumulative no-loss optimum has **+€553,058 cumulative EBIT** but **−€390,824 EBIT in Year 4**. An independently solved **Year-4 EBIT ≥ €0** guardrail (keeping the cumulative 50/50 objective) yields the teammate portfolio, **3,887.82 t CO₂ saved**, **+€1,116,960 cumulative EBIT**, **+€198,563 Year-4 EBIT**. See `VALIDATION_REPORT.md` and `validation/independent_validation.json`. Neither guardrail is an official case rule.
