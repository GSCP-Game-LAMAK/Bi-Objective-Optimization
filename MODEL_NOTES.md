# LAMAK v4 — Revised workbook, numerical formulation and limitations

## Provenance

Source workbook: `source/Eco_Chain_Reaction_Model_Updated.xlsx`.  The extraction script explicitly reads only nine data/calculation worksheets: `Inputs`, `Assumptions`, `Routing`, `Suppliers`, `DC Locations`, `Energy`, `Transport`, `Stock Policies`, and `Actions`. It does **not** use the workbook's `Dashboard`, `Schedule`, `Audit`, or `Sensitivity` sheets to construct optimization alternatives. The excluded Sensitivity sheet contains historical portfolio snapshots.

Action universe: 516 extracted alternatives; 25 marked as the team's five selections in each of five categories. The default website uses the 25-action shortlist; broader mode is provided for screening only.

## Five-year objectives and accounting

Let \(x_{a,t}\in\{0,1\}\) mean action `a` starts in year `t` from 0 to 4, and \(z_{a,t}=\sum_{\tau\leq t} x_{a,\tau}\).  The workbook action's saved tonnes/year, operating-cost delta, depreciation, one-off expense, investment and tokens are \(r_a,o_a,d_a,s_a,k_a,q_a\).

- Five-year carbon saved: \(R=\sum_{a,t}(5-t)r_a x_{a,t}\).
- Five-year incremental EBIT: \(P=\sum_{a,t}[-(5-t)(o_a+d_a)-s_a]x_{a,t}\).
- Year-t CO₂: \(4074-\sum_a r_a z_{a,t}\).
- Year-t EBIT change: \(-\sum_a(o_a+d_a)z_{a,t}-\sum_a s_a x_{a,t}\).
- Investments \(k_a\) reduce cash flow in their implementation year, **not** EBIT. Operating costs exclude depreciation.

Constraints: 10 tokens in total; maximum 3 in each year; each action chosen once; at most one energy system across both plants; at most one DC relocation, in Year 0 only, with €90,000 one-off; one supplier sourcing tier per material, one stock policy per site/product and one fuel per route. Location-dependent transport must match the selected DC or the unchanged Verona baseline.

## Updated PV method

The revised workbook's `Energy` sheet applies an **average-daily demand cap**, not the previous sinusoidal intraday matching approximation:

- `M = annual plant electricity demand / 365` (kWh/day);
- `N = MIN(daily generation, M)`;
- `P = N × 365` (used kWh/year for PV);
- `L = daily generation × 365` (total generated kWh/year);
- `R = (P × GridEF − L × TechnologyEF) / 1000` (tCO₂ saved per year);
- `S = daily OpEx × 365 − P × electricity price` (annual incremental operating cost);
- `T = −S − annual depreciation` (annual incremental EBIT).

For **PV Large at Plant B**, the revised inputs give 1,460,000 kWh generated, 1,460,000 kWh credited, 540.20 tCO₂ avoided/year and +€356,090/year EBIT benefit. It requires three tokens, €870,000 capex and €87,000/year depreciation. The revised energy assumptions are recorded in `Assumptions!A36:C44`: the workbook labels the one-installation rule, average-daily PV credit and trigeneration heating interpretation as *professor confirmed*, whereas fixed annual loads, grid price/EF, technology OpEx treatment and energy OTIF neutrality remain *group assumptions*. These labels are workbook claims, not independently confirmed.

The website's default PV utilization slider is **100%**, reproducing the revised workbook. Lower percentages apply an explicitly hypothetical utilization reduction to the credited `Energy!P` kWh, with full `Energy!L` production emissions retained; the exact MILP reference is only valid at 100%.

## Solver status

Interactive browser = bounded multi-criteria beam search, an approximate frontier. The separately computed `scripts/solve_exact.py` uses SciPy/HiGHS to solve a MILP at 25 sampled EBIT lower bounds for the unchanged team shortlist. Each bound solve is optimal, but **this is not exhaustive discrete Pareto enumeration**. An illustrative 50/50 score normalizes avoided CO₂ and EBIT using the sampled frontier endpoints; the professor's actual grading function has not been verified.

## Unresolved issues

OTIF response and stock-policy carbon savings cannot be quantified; treating unknown stock carbon as zero in numeric screening does not mean zero true impact. Inventory valuations assume a 20% annual holding rate, zero replenishment fixed cost and do not automatically interact with new sourcing prices. Supplier shares are simplified to one tier rather than progressive ramps over years. Regional transport weights and DC relocation impacts remain calibrated estimates rather than actual 85-wholesaler shipment movements. Electricity price, grid EF and trigeneration fuel-inclusive OpEx are group assumptions.

The updated workbook's `Schedule` sheet has **not** recalculated its scenario, and `Sensitivity` records historical portfolio snapshots. Neither is used in this optimization.
