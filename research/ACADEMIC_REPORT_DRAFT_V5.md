# Balancing Carbon Footprint and Operating Profit in a Five-Year Pharmaceutical Supply Chain: A Multi-Objective MILP Case Study

*LAMAK · Politecnico di Milano · Global Supply Chain Planning · Draft, 17 November 2026*

**Status:** Working academic report. Solver and workbook results below have been reproduced. Operational service levels, score-rule interpretation and case assumptions still require validation before final academic submission.

## Abstract (draft)

This study considers a five-year sustainability planning problem for a pharmaceutical supply chain, examining trade-offs between cumulative carbon dioxide equivalent reductions and cumulative change in earnings before interest and taxes (EBIT). The available decisions include European supplier sourcing, distribution-centre relocation, transport fuel changes, packaging redesign, factory energy investments and inventory policies. The official game limits implementation to ten effort tokens across five years and three per year. The study develops a mixed-integer linear programming (MILP) model that separately optimizes environmental and financial objectives before constructing a normalized, equally weighted preference function. A workbook-backed certified core of 30 alternatives is modeled, including 55 progressive packaging adoption schedules. The exact unconstrained 50/50 score optimum avoids 5,834.30 tonnes of CO₂e across five years but reduces EBIT by €6.17 million. Requiring nonnegative five-year EBIT yields an alternative avoiding 4,049.03 tonnes and increasing EBIT by €0.553 million. The numerical comparison demonstrates the importance of independent normalization, explicit financial guardrails, and separating optimization certainty from uncertain inventory, routing and service assumptions. The result is a reproducible decision-support framework rather than a verified company-wide operational plan.

## 1. Introduction and research question

Decarbonization investments may reduce operational emissions but can require capital, raise supplier procurement costs, and alter distribution and inventory decisions. Firms must assess these trade-offs across multiple years, because annual intervention limits and persistent future effects make the timing of decisions consequential. This case addresses: **How should a pharmaceutical supply chain allocate a finite number of intervention tokens over five years to balance cumulative carbon abatement with cumulative EBIT effects?**

The Eco Chain Reaction classroom case provides a fixed 10-token portfolio budget, maximum three tokens per year, decision categories and cost/emission factors. The numerical implementation is anchored to the team's revised workbook `Eco_Chain_Reaction_Model_Updated.xlsx` (latest user-supplied version). No preset strategies from `Dashboard`, `Schedule`, `Audit` or `Sensitivity` are used as optimization inputs.

## 2. Literature and methodological basis

**Naeeni and Sabbaghi (2022)** study multi-objective supply-chain network design and apply normalized normal constraint methodology, supporting the use of structurally integrated decisions and a comparable objective scale [1]. **Mohebalizadehgashti et al. (2020)** use an augmented ε-constraint approach in a cost–emissions supply-chain setting [2], motivating our independently computed payoff anchors and discrete ε-sweep. **Ameknassi et al. (2016)** present a stochastic multi-period green supply-chain model [3], motivating sensitivity of routing, market costs and supplier decisions. **Sepehri et al. (2024)** explicitly consider reliability alongside emissions and cost [4], supporting our exclusion of unmeasured OTIF claims from certified feasibility. These publications inform methodology; none provides the pharmaceutical case's numerical action savings.

## 3. Input model and data provenance

Data are extracted exclusively from nine workbook sheets: Inputs, Assumptions, Routing, Suppliers, DC Locations, Energy, Transport, Stock Policies and Actions. All 516 available workbook actions are preserved for audit and approximate exploration, with their worksheet row references. The certified core consists of 30 source alternatives: five DC relocations, five energy investments, 12 European sourcing tiers, five transportation actions, and three packaging tiers.

Stock savings are excluded from this core: the workbook relies on assumed annual carrying charges and does not provide measured inventory-induced CO₂ or on-time-in-full (OTIF) effects. The official rules allow progressive redesigned-packaging adoption; the exact model includes 55 nonzero monotone five-year sequences covering 0%, 33%, 66% and 100%. Source material does not establish staged supplier conversion, so each material is represented by at most one discrete sourcing tier.

## 4. MILP formulation

Let \(x_{a,t}\) indicate implementation of non-packaging option \(a\) in year \(t\in\{0,\ldots,4\}\). Its effect persists from its implementation year onward. Packaging is represented by nondecreasing adoption levels \(p_t\in\{0,1,2,3\}\) (zero, 33%, 66%, 100%). Under our marginal-token accounting assumption, packaging implementation tokens in year \(t\) equal \(p_t-p_{t-1}\), with \(p_{-1}=0\). The original case explicitly permits staged packaging but does not spell out upgrade token accounting; this interpretation needs confirmation, and the fixed €75,000 setup is charged once at first positive adoption. Let \(r_a\) be annual avoided CO₂e, \(o_a\) the annual incremental operating cost, \(d_a\) annual depreciation and \(f_a\) one-off implementation cost.

The two objectives are

\[
\max R=\sum_{t=0}^4\Big(\sum_a r_a\sum_{\tau\le t}x_{a,\tau}+r^{pack}(p_t)\Big),
\]

\[
\max E=\sum_{t=0}^4\Big(-\sum_a(o_a+d_a)\sum_{\tau\le t}x_{a,\tau}-(o^{pack}_{p_t}+d^{pack}_{p_t})-F_t\Big),
\]

where \(F_t\) includes non-packaging implementation expenses in adoption year and the one-time packaging setup when applicable. CapEx is treated as a cash outflow, not an immediate EBIT expense; the model separately reports five-year cash consequences. Feasibility includes the 10-token total, three tokens/year, at most one energy installation across both plants, one first-year DC relocation with €90,000 setup, mutually exclusive fuel modes and sourcing tiers, and consistency of DC location with transport routes.

The normalization is built from independently solved payoff-table extremes: \((R_{Emax},E_{max})\) and \((R_{max},E_{Rmax})\). The analyst's assumed weighted score is

\[
S_w=w\frac{R-R_{Emax}}{R_{max}-R_{Emax}}+(1-w)\frac{E-E_{Rmax}}{E_{max}-E_{Rmax}}.
\]

This formulation is linear in the MILP decision variables, after the four anchor values have been calculated. The 50/50 ratio is **an analytical modeling choice, not a verified instructor grading formula**.

## 5. Optimization methods and reproducibility

The certified core is implemented in `scripts/solve_exact_v5.py`, using SciPy's `milp` interface to the HiGHS solver. There are 170 binary columns: one-time action–year combinations and 55 packaging adoption paths. The solver independently finds the financial and environmental extremes, performs lexicographic tie-breaking, then solves for 21 weights (0 to 1 in 0.05 steps) under each of three EBIT guardrail settings. A further 16 ε-constrained solves provide a sampled Pareto display. **83 separate MILPs** are solved and each report of an exact optimum requires an optimal solver return status. The static webpage reads precomputed exact choices; custom workbook edits and the full 516-action scope use a plainly identified approximate browser search.

The graphical Pareto sample is not an exhaustive enumeration. The weighted score optimum at each tested weight is, however, certified for the specified core and guardrail. Mathematical solver exactness does not confer real-world certainty on source input assumptions.

## 6. Results

Baseline cumulative emissions for comparison are \(5\times4,074=20,370\) tonnes CO₂e. The model's exact financial optimum is to install large PV at Plant B in Year 0, yielding 2,701.00 tonnes avoided and €1,780,451.61 cumulative EBIT improvement. The exact maximum-carbon endpoint is 5,984.25 tonnes avoided, but it reduces EBIT by €16,666,409.48. These are the normalization anchors; the teammate's earlier carbon endpoint of 5,890 tonnes and −€8.38 million EBIT is not the maximum under the present 30-action scope.

| Scenario at w = 0.5 | Cumulative CO₂ avoided (t) | Change in five-year EBIT (€) | Normalized score | Decision interpretation |
|---|---:|---:|---:|---|
| Unrestricted optimum | 5,834.30 | −6,165,539 | 76.18% | Highest normalized score, major operating-profit sacrifice |
| At most €1m five-year EBIT loss | 4,417.96 | −679,863 | 69.48% | Explicit compromise preference |
| Nonnegative five-year Δ EBIT | 4,049.03 | +553,058 | 67.20% | Profit-protected strategy |
| Teammate's benchmark | 3,887.82 | +1,116,960 | 66.28% | Higher EBIT gain with slightly less carbon abatement |

The unrestricted exact strategy implements PV Large at Plant B (Year 0), Gamma 100% European sourcing (Year 1), Lactose 100% sourcing (Year 2), and 33% redesigned bottles (Year 3). Its token schedule is 3–3–3–1–0. The nonnegative-EBIT strategy implements PV Large B (Year 0), Lactose 100% (Year 1), redesigned bottles 100% (Year 2), and Gamma 33% (Year 4), also using ten tokens.

The teammate benchmark comprises PV Large B (Year 0), Lactose 100% (Year 1), 100% redesigned bottles (Year 2), and South HVO (Year 3). Reconstructing it from the workbook yields 3,887.82 tonnes of CO₂e avoided, €1,116,959.91 in cumulative EBIT improvement, and €681,959.91 in net cash improvement, after one-time investment and setup expenditures. Its normalized score of 66.28% is lower than the profit-protected exact alternative's 67.20% under the new, fixed source-backed anchors, despite its higher absolute EBIT.

## 7. Discussion and limitations

The central result is not a universally preferred strategy; it is the dependence of the preferred decision on the explicit objective scale and financial restrictions. By choosing independently optimized anchors, the analysis avoids anchoring a score to an incomplete, heuristically generated frontier. The distinct EBIT safeguard scenarios reveal the trade-off between environmental ambition and economic tolerance.

Important validity limits remain. The updated PV calculation employs average-daily electricity matching, not a verified hourly dispatch simulation. The transportation calculations use representative geographies and calibrated effective masses rather than measured customer-by-customer tonne-kilometres. Supplier sourcing cost changes may interact with inventory valuation. Holding-cost assumptions and OTIF impacts are not supported sufficiently to treat stock-policy choices as certified. The case does not publish a 50/50 scoring equation or a mandatory EBIT loss cap. Therefore none of the reported scores is an official expected grade, and the portfolios should be verified in the course simulator before implementation or submission.

## 8. Conclusion (provisional)

A mathematically certified weighted optimum is possible for a restricted, auditable 30-option supply-chain model while explicitly distinguishing economic preference constraints from case rules. The 10-token cap and annual sequencing materially affect which carbon and financial measures can be combined. Progressive packaging can be implemented without double-counting past adoption, setup expenses or tokens. Before recommending a final plan, the team should confirm the official score aggregation, service feasibility, and the energy and routing assumptions that dominate the calculated outcomes.

## References

1. Naeeni, H. S., & Sabbaghi, N. (2022). Sustainable supply chain network design: A case of the glass manufacturer in Asia. *International Journal of Production Economics*, 248, 108483. https://doi.org/10.1016/j.ijpe.2022.108483
2. Mohebalizadehgashti, F., Zolfagharinia, H., & Amin, S. H. (2020). Designing a green meat supply chain network: A multi-objective approach. *International Journal of Production Economics*, 219, 312–327. https://doi.org/10.1016/j.ijpe.2019.07.007
3. Ameknassi, L., Aït-Kadi, D., & Rezg, N. (2016). Integration of logistics outsourcing decisions in a green supply chain design: A stochastic multi-objective multi-period multi-product programming model. *International Journal of Production Economics*, 182, 165–184. https://doi.org/10.1016/j.ijpe.2016.08.031
4. Sepehri, A., Tirkolaee, E. B., Simic, V., & Ali, S. S. (2024). Designing a reliable-sustainable supply chain network: adaptive m-objective ε-constraint method. *Annals of Operations Research*, 359(1), 921–952. https://doi.org/10.1007/s10479-024-05961-2

*All numeric data are drawn from the team's revised workbook and the publicly supplied case requirements; references provide methodological context only.*
