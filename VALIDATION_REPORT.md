# LAMAK v5 — Independent Validation and Model Freeze

**Prepared:** 17 November 2026  
**Audit outcome:** **PASS — conditional mathematical certification for the explicitly defined 30-alternative core.**  
**Not certified:** instructor's grading formula, OTIF, physical outcomes, or global optimality across all 516 action rows.

## 1. What exactly was verified

The source is the **updated** `Eco_Chain_Reaction_Model_Updated.xlsx`, SHA-256:

`67823502543875c14dde51e1b759b6602a9a0fbf92102714e0854ac0dccb7b1c`

The workbook source tables (`Inputs`, `Assumptions`, `Routing`, `Suppliers`, `DC Locations`, `Energy`, `Transport`, `Stock Policies`, and `Actions`) were reopened directly. **All 516 rows** in the extracted `Actions` register were reconciled against the workbook's native cell values on six numerical coefficients (tokens, annual CO₂ savings, annual operating cost, CapEx, depreciation, and one-off setup). **Zero differences** were found within numeric tolerance. Independent calculation checks compared **126 source rows** against the original Energy, Suppliers and Transport computations.

The nine source/calculation sheets contain **8,059 formula cells**, none referring directly to the excluded sheets `Dashboard`, `Schedule`, `Audit`, or `Sensitivity`. Those sheets were not used for optimizer inputs. The workbook itself remains the source of numerical assumptions; its input assumptions are **not necessarily measured facts**.

## 2. Independent mathematical formulation and certification

The original v5 model used pre-enumerated progressive packaging patterns. To avoid relying on the same mathematical encoding, this audit built a **second MILP formulation from the workbook** using **130 binary variables** and **43 linear constraints**: individual action–start-year variables plus cumulative annual packaging-tier thresholds.

Constraints independently encoded: 10 tokens total; 3 per year; one alternative per material; at most one energy installation globally; one first-year DC relocation; no Verona-specific transport mode when the DC has relocated; one transport technology for the same area; staged packaging cannot decrease; incremental packaging tokens and a single €75,000 setup expense.

The independent SciPy/HiGHS solver returned proven optimal statuses for both objective endpoints and all three 50/50 guardrail choices. The coefficients, objective endpoints, CO₂, EBIT, cash effects and action schedules **matched the original v5 results**.

The primary model is **five-year cumulative**. Define five-year emissions avoided as \(R\) (tonnes) and incremental EBIT as \(E\) (euros), with five-year baseline emissions \(5×4,074=20,370\) tonnes:

\[
S_{0.5} = 0.5rac{R-2,701.000}{5,984.252-2,701.000}
+0.5rac{E-(-16,666,409.48)}{1,780,451.61-(-16,666,409.48)}.
\]

The independently solved endpoints are: maximum EBIT **+€1,780,452**, at **2,701.00 tonnes** avoided; maximum CO₂ saving **5,984.25 tonnes**, with **−€16,666,409** incremental EBIT. These anchors are held constant when evaluating EBIT guardrails.

## 3. The certified 50/50 comparison

| Model / rule | Five-year CO₂ avoided | Five-year CO₂ reduction | Five-year ΔEBIT | Five-year Δcash | Normalized score |
|---|---:|---:|---:|---:|---:|
| Unrestricted 50/50 | 5,834.30 t | 28.64% | −€6,165,539 | −€6,600,539 | 76.18% |
| EBIT loss ≤ €1m | 4,417.96 t | 21.69% | −€679,863 | −€1,114,863 | 69.48% |
| EBIT nonnegative | 4,049.03 t | 19.88% | +€553,058 | +€118,058 | 67.20% |
| Teammate benchmark | 3,887.82 t | 19.09% | +€1,116,960 | +€681,960 | 66.28% |

**Correct interpretation:** the unconstrained 50/50 result is the exact optimum **under the fixed workbook coefficients and modeled constraints**. The guardrails are explicit alternative optimization problems, **not professor requirements**. The teammate plan is not dominated: it gives up carbon savings to improve EBIT, relative to the nonnegative-cumulative-EBIT optimum.

## 4. Critical finding: cumulative EBIT vs. final-year EBIT

The cumulative-EBIT nonnegative optimum has **+€553,058** five-year EBIT, but **−€390,824** *Year-4* EBIT. Its late Gamma sourcing move decreases Year-4 operating profit.

The audit therefore also solved the **same cumulative 50/50 objective** with an additional **Year-4 EBIT ≥ €0** constraint. The independently proven optimum is **exactly the teammate's plan**:

- Year 0: large PV at Plant B (3 tokens)
- Year 1: European lactose 100% (3)
- Year 2: redesigned spray bottles 100% (3)
- Year 3: South last-mile HVO (1)
- Year 4: no additional action (0)

Its five-year CO₂ savings are **3,887.82 tonnes**, five-year EBIT **+€1,116,960**, and Year-4 EBIT **+€198,563**. This *does not* mean the professor mandates a Year-4 EBIT floor or that the professor's 50/50 grading uses cumulative measures; the exact official scoring convention remains unknown. A final-year EBIT **objective** would be a different model from the final-year EBIT **floor** tested here.

## 5. Sensitivity analysis — re-optimization, not just rescore

The model was **re-optimized** under four explicit *analyst stress tests*. To preserve score comparability, the **baseline** normalization anchors were held constant. These parameter shocks are **not historical forecasts**:

- **solar80:** only 80% of modeled PV electricity is usable for grid offset; PV generation emissions and fixed operating expense persist
- **suppliers20:** 20% higher purchase-price *premium* for qualified alternative suppliers (not a 20% increase in whole-company purchasing costs)
- **freight20:** 20% higher incremental transportation cost premiums
- **combined:** all three changes simultaneously

| Scenario | EBIT policy | CO₂ avoided (t) | Five-year Δ EBIT | Fixed-anchor 50/50 score |
|---|---|---:|---:|---:|
| baseline | Unrestricted | 5,834.3 | −€6,165,539 | 76.2% |
| baseline | No cumulative EBIT loss | 4,049.0 | +€553,058 | 67.2% |
| solar80 | Unrestricted | 5,221.1 | −€6,623,960 | 65.6% |
| solar80 | No cumulative EBIT loss | 3,435.8 | +€94,637 | 56.6% |
| suppliers20 | Unrestricted | 5,472.0 | −€5,690,727 | 71.9% |
| suppliers20 | No cumulative EBIT loss | 4,049.0 | +€305,666 | 66.5% |
| freight20 | Unrestricted | 5,834.3 | −€6,165,539 | 76.2% |
| freight20 | No cumulative EBIT loss | 4,049.0 | +€553,058 | 67.2% |
| combined | Unrestricted | 4,858.8 | −€6,149,147 | 61.4% |
| combined | No cumulative EBIT loss | 3,274.6 | +€524,506 | 55.3% |

**Interpretation:** the unrestricted optimum remains financially unattractive under all scenarios. With a cumulative no-loss restriction, the baseline action mix is stable in the three individual stress tests, but changes to the teammate's mix in the combined downside scenario. This confirms that assumption uncertainty should accompany the final recommendation.

Weights of **40%, 45%, 50%, 55%, and 60% CO₂ preference** were also independently re-optimized. Detailed results are in `objective_weights.csv`.

## 6. Decision risks that mathematical optimality cannot eliminate

1. **Grading ambiguity:** the professor's template requests expected CO₂ and EBIT impact percentages, but the exact 50/50 score normalization and relevant EBIT horizon have not been independently verified. The workbook's statement about professor clarifications is a claim made in the workbook, not primary correspondence.
2. **OTIF/service:** the case does not supply enough evidence to assert service feasibility; no service changes were modeled for supplier and transport scenarios.
3. **Inventory:** its holding-cost savings use a 20% analyst rate; stock-policy effects were **excluded** from the certified MILP.
4. **Partial product/network coverage:** distribution and transport models use calibrated freight quantities and geographical representatives. The exact core forbids Verona-specific transport after DC relocation rather than fully recomputing those interactions.
5. **PV model:** average daily consumption and solar generation assumptions are team-derived. Utilization, carbon factors and grid tariffs are sensitivity-sensitive.
6. **Progressive packaging:** the case explicitly allows progression; treating a 33→100% upgrade as an additional two tokens and charging setup only once is a documented **interpretation**, not an externally confirmed rule.
7. **Decision set:** the exact 30-option model excludes some professor-permitted possibilities (including unselected suppliers/routes and stock policies). **516-option** website results are heuristic; the independent certification **does not** extend to that expanded universe.

## 7. Release decision

**PASS for mathematical reproducibility and source traceability in the frozen 30-choice model.** It is appropriate to report an exact, *conditional* optimum for that formalization. **Do not call it the objectively best strategy for the entire case** or claim a guaranteed OTIF outcome. If the team chooses a primary financial interpretation, record it explicitly.

**Recommendation for academic presentation:** show (i) the unrestricted weighted optimum as the formal score result, (ii) the financially protected cumulative-EBIT scenario, and (iii) the Year-4-EBIT-safe teammate scenario; explain why the scores and recommendations differ. Use the full record in `independent_validation.json` and the CSV outputs as reproducible supporting material.

## 8. Files, provenance and rerun

- `validation/coefficient_trace.csv`: 516 rows with worksheet/row pointers and all coefficients
- `validation/source_formula_dependency_scan.json`: formula dependency scan of the original workbook
- `validation/independent_validation.json`: independent proof-check results and sensitivities
- `validation/sensitivity.csv`, `validation/objective_weights.csv`: full numeric outputs
- `scripts/independent_crosscheck.py`: **portable** independently encoded MILP using the frozen workbook-derived source tables; runs in GitHub Actions with NumPy and SciPy
- `validation/independent_workbook_audit.py`: **direct Excel** verification variant used during this audit; requires `artifact_tool`, not required for ordinary VS Code / GitHub CI
- `scripts/solve_exact_v5.py`: original first MILP (83 solves) regenerates the website's reference dataset

For a portable independent check in the cloned repository:

```powershell
python -m pip install numpy scipy
python scripts/solve_exact_v5.py
python scripts/independent_crosscheck.py
node --test tests/v5.test.cjs
```

The GitHub Actions workflow now runs the portable independent check **after** rebuilding the exact reference and **before** deployment. Any mismatching coefficients, workbook hash, constraints, score optimum or key strategy will fail the workflow instead of publishing a falsely certified result.
