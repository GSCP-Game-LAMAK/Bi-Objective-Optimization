# Updated Excel versus previous version — numerical audit

**Sources:** `Eco_Chain_Reaction_Model.xlsx` (previous) and `Eco_Chain_Reaction_Model_Updated.xlsx` (new), compared at worksheet/cell and extracted-action level. No presets were used for optimization.

## Structural findings

Both contain 13 worksheets. **No content or cached-formula changes** were found in `Suppliers`, `DC Locations`, `Transport`, `Stock Policies`, `Inputs`, `Routing` or `Schedule`. The updated workbook changes PV calculations on `Energy` (100 changed cells plus one new note), the five affected PV action rows in `Actions` (25 changed formula-cache cells), and explanatory inputs in `Assumptions`. `Dashboard`, `Audit` and `Sensitivity` have documentation/snapshot changes; they are excluded from optimizer input extraction, with `Sensitivity` excluded to avoid its historical portfolio snapshots. The 25 team selections are unchanged in identity. The total universe remains 516 options.

## All six PV alternatives

Annual EBIT benefit is `−annual operating cost change − annual depreciation`.

| PV option | Previous CO₂ saved t/yr | Updated CO₂ saved t/yr | Previous EBIT benefit/yr | Updated EBIT benefit/yr |
|---|---:|---:|---:|---:|
| PV Small — Plant A | 72.41 | 162.06 | €35,398 | €102,416 |
| PV Small — Plant B | 162.06 | 162.06 | €102,416 | €102,416 |
| PV Medium — Plant A | 55.39 | 168.57 | €7,125 | €91,738 |
| PV Medium — Plant B | 252.79 | 337.62 | €154,695 | €218,118 |
| PV Large — Plant A | 30.31 | 141.20 | −€25,100 | €57,803 |
| PV Large — Plant B | 255.58 | 540.20 | €143,314 | €356,090 |

Trigeneration entries did not change. Under the updated assumptions, **PV Large B** beats **Trigeneration Large B** on both annual CO₂ saved (540.20 versus 291.82 t/y) and annual EBIT benefit (+€356,090 versus +€236,881), at the same three tokens and €870,000 capital investment. That is a conditional dominance claim for these two standalone energy choices, not a global optimality guarantee.

## Current calculation method

The workbook applies a cap at *average daily factory electricity demand* and assumes no sale of surplus. For PV in each plant, `P=365 × min(F, K/365)` where F = daily generation and K = annual site demand. Savings are `(P × EFgrid − L × EFtechnology)/1000`; EBIT benefit = `P × €grid/kWh − 365 × daily operating expense − annual depreciation`. Example PV Large B: daily generation 4,000 kWh, site demand 1,790,000 / 365 = 4,904.11 kWh/day, so P = L = 1,460,000 kWh/year. At 0.42 kg CO₂/kWh grid and 0.05 kg CO₂/kWh PV, that yields 540.20 t/year; electricity price of €0.31398652/kWh, €42/day OpEx and €87,000 annual depreciation yield +€356,090/year EBIT.

## Inconsistencies and limits to verify

1. The workbook identifies the one-installation limit, average-daily electricity offset and trigeneration heating factor as **professor confirmed**, but this review has only verified that those statements are in `Assumptions!A37:C39`, not the external communication itself.
2. Solar financial results rely on the team's assumed €0.31398652/kWh grid price and 0.42 kg CO₂/kWh grid factor, constant average annual factory loads, fixed operating expenses, and no export revenue. The `Energy` sheet credits consumed electricity using an *average* daily cap, not an hourly plant dispatch model.
3. `Schedule` is unchanged: its retained example is **not** recomputed optimal for the revised energy values. The `Sensitivity` sheet retains historical scenario snapshots; those were excluded from optimizer input extraction.
4. Carbon impacts of inventory changes and all action-level OTIF responses are unknown. 20% annual carrying rate and zero fixed ordering cost remain proxy assumptions. Current sourcing decisions do not update stock valuation. The optimizer should not label zero unknown carbon as a verified zero effect.
5. Regional transportation and DC calculations still use representative locations and calibrated effective weights, not observed shipment-level tonnes for all wholesalers.
6. The workbook `Audit` records a one-tonne difference between printed rounded carbon scope subtotals (4,075) and baseline total (4,074), plus a €1 transport reconciliation difference (€853,839 vs €853,840). These are small and consistent with source rounding; no spreadsheet error values were found in cached worksheet values.
7. The new `Energy` sheet source note says heating-related trigeneration effects are already reflected in supplied factors. This should not be double-counted separately in project calculations.

## Consequences for optimization

- Rebuilt `data/workbook_model.json` and `data/model.js` from updated Excel and recalculated the 25-option exact MILP reference with SciPy/HiGHS.
- `Dashboard`, `Schedule`, `Audit`, `Sensitivity` are **not** used to propose candidate actions or to seed optimal solutions.
- Browser scores remain normalized **illustrative** 50/50 weights; actual instructor scoring and OTIF remain unknown.
- A new PV-utilization sensitivity control allows explicit deviations from the workbook base value (100%).
