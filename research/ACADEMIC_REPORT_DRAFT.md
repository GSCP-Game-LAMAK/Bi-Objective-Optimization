# Research manuscript draft — NOT FOR SUBMISSION YET

## Working title

**Bi-objective, multi-period decarbonization planning under implementation capacity constraints: A pharmaceutical supply-chain case study**

## Abstract (draft; replace bracketed results after validation)

This study examines the trade-off between financial and environmental performance in a five-year pharmaceutical supply-chain planning problem. A mathematical decision framework models changes in sourcing, network location, transport fuel, inventory management and factory energy systems. The framework considers annual carbon savings and incremental earnings before interest and taxes (EBIT), subject to a ten-token implementation budget, a three-token annual limit, technology exclusivity and location-dependent logistics eligibility. Baseline option parameters are derived from the provided case workbook's input and calculation sheets; pre-existing solution dashboards and schedules are excluded. We combine an exploratory browser-based multi-criteria search with a mixed-integer linear programming reference solved at sampled ε-constraint thresholds. Outcomes are evaluated using a Pareto trade-off visualization and sensitivity analysis for effective PV utilization, cost assumptions and service-level uncertainty. **[Insert validated case results and managerial conclusion after reviewing the final solver output.]**

## 1. Introduction

Decarbonizing a supply chain can require additional investment or operating expenditure. An economically attractive action can deliver limited emission reductions, while a high-impact action may impose substantial financial costs or operational risk. This motivates simultaneous consideration of economic and environmental objectives instead of optimizing each function independently. Multi-objective sustainable network design has been studied by Naeeni and Sabbaghi (2022), Mohebalizadehgashti et al. (2020), and Ameknassi et al. (2016); a complementary reliability-oriented approach is presented by Sepehri et al. (2024).

This case considers a pharmaceutical manufacturer with two factories, a distribution center, several supplier categories and national wholesalers. It asks: **Which sequence of feasible supply-chain interventions most improves carbon performance while preserving EBIT over five annual periods?**

## 2. Data and provenance

The supplied Excel workbook `Eco_Chain_Reaction_Model_Updated.xlsx` is used as the quantitative input. Only source and calculation sheets (`Inputs`, `Assumptions`, `Routing`, `Suppliers`, `DC Locations`, `Energy`, `Transport`, `Stock Policies`, `Actions`) feed the model. Existing `Dashboard`, `Schedule`, `Audit` and historically populated `Sensitivity` sheets were excluded from extraction and optimization to prevent solution leakage. A total of 516 action records and a 25-action team shortlist are maintained. The original course project supplies the official constraints and technologies.

Several input categories remain estimates: shipment weights inferred from calibrated network costs, representative distances rather than full shipment data, 20% annual inventory holding rate with zero ordering fee, and an average-daily PV-to-load matching rule with no surplus credit. These are explicitly distinguished from published case values. Stock-policy carbon and OTIF effects are not measured and must not be reported as zero impacts.

## 3. Formulation

Let \(x_{a,t}\in\{0,1\}\) indicate action \(a\) implemented in year \(t\in\{0,1,2,3,4\}\). Let \(r_a\) be saved tonnes of CO₂ per operating year, \(o_a\) be the incremental annual operating cost (EUR), \(d_a\) depreciation, \(s_a\) setup expense, and \(q_a\) implementation tokens.

Five-year carbon reduction: \(R(x)=\sum_{a,t}(5-t)r_a x_{a,t}\).

Five-year EBIT change: \(P(x)=\sum_{a,t}[-(5-t)(o_a+d_a)-s_a]x_{a,t}\).

Objectives: \(\max (R(x),P(x))\). The model enforces total-token and annual-token capacity, action implementation once, at most one energy plant, at most one Year-0 DC relocation, exclusive supplier share tiers, stock policy exclusivity, and selected-location transport compatibility. No additional official capital budget is assumed. Actual service level is unavailable; risk flags do not establish a numeric OTIF guarantee.

## 4. Method

A browser-accessible heuristic explores candidate five-year schedules and retains non-dominated solutions. For the unedited 25-option baseline, a separate exact MILP reference is solved using the ε-constraint method: maximize \(R(x)\) subject to \(P(x)\ge\epsilon\). Twenty-five ε levels are sampled between profit-oriented and carbon-oriented extremes, with independent optimization at each level. Each returned solution is optimal for its fixed ε-bound, but the sample does **not** certify the entire discrete Pareto frontier. Normalized 50/50 scores are shown as illustrative preference indices, not as the unknown course grading formula.

## 5. Results and sensitivity (to complete)

Current updated-workbook result: PV Large at Plant B saves 540.20 tCO₂/year and provides €356,090/year incremental EBIT benefit when installed at the beginning of the horizon. These figures are workbook scenarios, not verified Digital Twin outcomes. Place the reference MILP Pareto figure, implementation table, percentage CO₂ reduction, final-year EBIT change, yearly costs, capital expenditure and tokens here. Compare with the browser search. Run sensitivity cases: (a) the revised average-daily PV baseline versus reduced effective PV utilization (e.g., 80%); (b) 10%, 20%, 30% holding rate; (c) freight factor variations; (d) exclude actions with unquantified service risk. **Avoid presenting hypothetical scenarios as official Digital Twin outcomes.**

## 6. Limitations and further work

Progressive supplier share changes over multiple years are currently approximated by a single final share tier rather than an exact staged-ramp model. Supplier-stock inventory valuation requires dynamic price integration. Missing OTIF and stock-carbon response functions prevent rigorous service-constrained optimization. Individual route weights and actual energy load profiles should replace calibration proxies. The full expanded source universe of 516 actions is explored heuristically, while MILP reference is limited to the 25 shortlisted actions.

## 7. Conclusion (placeholder)

**[Complete after validation of the selected final portfolio, scenario robustness and the instructor's scoring method.]**

## References

See `LITERATURE_NOTES.md` for four verified bibliographic entries with DOIs, year and methodological interpretation.
