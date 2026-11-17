# V6 academic-report update — financially bounded Pareto normalization

**Key research decision:** distinguish the physical maximum-carbon point from an economically admissible maximum. Add the following subsection to the final paper and update all previously reported v5 normalized scores to identify which payoff table was used.

## Economically bounded payoff-table method

To reduce the distortion of a high-cost carbon-extreme solution, a predetermined cumulative five-year EBIT-loss limit of €8,384,875.34 was imposed in addition to the resource and implementation constraints. This bound is a **normative business preference**, not an empirical confidence interval and not a constraint documented by the course instructor. The payoff table was recalculated using two separate MILPs over the revised feasible region, retaining an unrestricted benchmark for comparison. In the bounded region, the maximum achievable carbon reduction is 5,890.1969 t CO₂e, associated with a cumulative EBIT change of −€8,384,875.34; the EBIT-maximizing solution improves EBIT by €1,780,451.61 and avoids 2,701.00 t. The unrestricted carbon maximum remains 5,984.2524 t, associated with a €16.666m EBIT decrease.

The revised score is

\[
S_B(w,x)=w\frac{R(x)-2701}{5890.19687965-2701}+(1-w)\frac{E(x)+8384875.33777}{1780451.60870+8384875.33777},\quad E(x)\ge -8384875.34.
\]

At \(w=0.5\), exact MILP yields the portfolio: Year 0 large PV at Plant B; Year 1 100% European lactose; Year 2 100% redesigned spray bottles; Year 3 South-region HVO deliveries. This uses all ten tokens as 3–3–3–1–0 and avoids 3,887.81854 t CO₂e (19.09% of the five-year baseline), increases cumulative EBIT by €1,116,959.91, and improves indicative cash flow by €681,959.91. Its normalized bounded score is 65.34%.

**Methodological caution:** Do not call the €8.385m cap a “90–95% confidence interval” or a statistically detected knee. It is a user-defined admissible financial loss level motivated by steep high-abatement trade-offs. The reported optimum is mathematically certified for the specified **30-option core**; inventory/OTIF uncertainty and alternative selection of the cap are beyond this certificate. A stronger academic version should systematically sweep loss budgets and identify curvature or finite-difference abatement costs before declaring any knee point.

---

# Balancing Carbon Footprint and Operating Profit in a Five-Year Pharmaceutical Supply Chain: A Multi-Objective MILP Case Study

*LAMAK · Politecnico di Milano · Global Supply Chain Planning · Draft, 17 November 2026*

**Status:** Working academic report. Solver and workbook results below have been reproduced. Operational service levels, score-rule interpretation and case assumptions still require validation before final academic submission.

## Abstract (draft)

This study investigates a five-year supply-chain decarbonization problem with two competing objectives: cumulative CO₂e avoidance and cumulative change in EBIT. The classroom case allocates ten implementation tokens across five years, with at most three tokens annually. Using nine calculation sheets from the team's updated Excel workbook, a mixed-integer linear program (MILP) evaluates a certified 30-action core, including 55 progressively adoptable packaging paths. Independently optimized payoff tables reveal a sharp high-abatement trade-off: the unrestricted maximum avoids 5,984.25 tonnes but incurs a €16.67m EBIT reduction. To investigate an economically admissible choice set, this study transparently imposes a five-year EBIT loss limit of €8.385m and recalculates both endpoints within that region. At 50/50 normalized preference, the exact bounded optimum avoids 3,887.82 tonnes (19.09% of baseline) while improving five-year EBIT by €1.117m and net cash flow by €0.682m. A second, independently encoded MILP reproduces the bounded and unrestricted score optima at 21 weight values and three financial guards. The loss tolerance is an illustrative business preference, not a confidence interval or instructor-imposed constraint; service-level effects remain unverified.

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

The certified core is implemented in `scripts/solve_exact_v6.py`, using SciPy's `milp` interface to the HiGHS solver. There are 170 binary columns: one-time action–year combinations and 55 packaging adoption paths. The solver independently finds the financial and environmental extremes, performs lexicographic tie-breaking, then solves for 21 weights (0 to 1 in 0.05 steps) under three EBIT guardrail settings in **each of two normalization regions**. An additional ε-constrained sweep samples the Pareto frontier. **261 MILPs** are solved and each report of an exact optimum requires an optimal solver return status. The static webpage reads precomputed exact choices; custom workbook edits and the full 516-action scope use a plainly identified approximate browser search.

The graphical Pareto sample is not an exhaustive enumeration. The weighted score optimum at each tested weight is, however, certified for the specified core and guardrail. Mathematical solver exactness does not confer real-world certainty on source input assumptions.

## 6. Results

Baseline cumulative emissions are \(5\times4,074=20,370\) tonnes CO₂e. The exact EBIT-maximizing intervention is Large PV at Plant B in Year 0: 2,701.00 tonnes avoided and +€1,780,451.61 cumulative EBIT. The unrestricted carbon maximum is 5,984.2524 tonnes at −€16,666,409.48. Within the **explicit EBIT floor of −€8,384,875.34**, the bounded carbon maximum instead is **5,890.19688 tonnes**, associated with **−€8,384,875.34** EBIT. These values are used together as a recalculated payoff table; the unrestricted maximum remains the benchmark.

| Mode and 50/50 scenario | Cumulative CO₂ avoided (t) | Change in five-year EBIT (€) | Score within that mode | Interpretation |
|---|---:|---:|---:|---|
| **Financially bounded default optimum** | **3,887.82** | **+1,116,960** | **65.34%** | Same four-action plan as teammate |
| Bounded: additional EBIT loss ≤ €1m | 3,887.82 | +1,116,960 | 65.34% | Added guard does not change optimum |
| Bounded: nonnegative five-year EBIT | 3,887.82 | +1,116,960 | 65.34% | Added guard does not change optimum |
| Unrestricted reference optimum | 5,834.30 | −6,165,539 | 76.18% | Different feasible region and payoff anchors |
| Unrestricted: no five-year EBIT loss | 4,049.03 | +553,058 | 67.20% | Comparison with different score normalization |

**Do not compare 65.34% with 76.18% as the same scoring metric**: the two models use different payoff denominators and different admissible sets. The financially bounded optimum implements Large PV at Plant B in Year 0, Lactose 100% European sourcing in Year 1, full redesign of spray bottles in Year 2 and South HVO in Year 3. All ten tokens are used in a 3–3–3–1–0 schedule. Reconstructed from the workbook, this plan avoids 3,887.81854 tonnes, increases EBIT by €1,116,959.91 and net cash by €681,959.91 over five years.

The reference pure-carbon extreme is retained to document the very high cost of the last 94.06 tonnes saved beyond the bounded carbon maximum. This supports investigating a high-cost knee but is not by itself a statistical 95th-percentile threshold or proof of an exponential cost curve.

## 7. Discussion and limitations

The central result is not a universally preferred strategy; it is the dependence of the preferred decision on the explicit objective scale and financial restrictions. By re-optimizing both payoff anchors within the selected financially admissible region, the analysis avoids anchoring the default score to an economically extreme alternative. The chosen financial limit remains a subjective business preference and should be sensitivity-tested. The distinct EBIT safeguard scenarios reveal the trade-off between environmental ambition and economic tolerance.

Important validity limits remain. The updated PV calculation employs average-daily electricity matching, not a verified hourly dispatch simulation. The transportation calculations use representative geographies and calibrated effective masses rather than measured customer-by-customer tonne-kilometres. Supplier sourcing cost changes may interact with inventory valuation. Holding-cost assumptions and OTIF impacts are not supported sufficiently to treat stock-policy choices as certified. The case does not publish a 50/50 scoring equation or a mandatory EBIT loss cap. Therefore none of the reported scores is an official expected grade, and the portfolios should be verified in the course simulator before implementation or submission.

## 8. Conclusion (provisional)

A mathematically certified weighted optimum is possible for a restricted, auditable 30-option supply-chain model while explicitly distinguishing economic preference constraints from case rules. The 10-token cap and annual sequencing materially affect which carbon and financial measures can be combined. Progressive packaging can be implemented without double-counting past adoption, setup expenses or tokens. Before recommending a final plan, the team should confirm the official score aggregation, service feasibility, and the energy and routing assumptions that dominate the calculated outcomes.

## References

1. Naeeni, H. S., & Sabbaghi, N. (2022). Sustainable supply chain network design: A case of the glass manufacturer in Asia. *International Journal of Production Economics*, 248, 108483. https://doi.org/10.1016/j.ijpe.2022.108483
2. Mohebalizadehgashti, F., Zolfagharinia, H., & Amin, S. H. (2020). Designing a green meat supply chain network: A multi-objective approach. *International Journal of Production Economics*, 219, 312–327. https://doi.org/10.1016/j.ijpe.2019.07.007
3. Ameknassi, L., Aït-Kadi, D., & Rezg, N. (2016). Integration of logistics outsourcing decisions in a green supply chain design: A stochastic multi-objective multi-period multi-product programming model. *International Journal of Production Economics*, 182, 165–184. https://doi.org/10.1016/j.ijpe.2016.08.031
4. Sepehri, A., Tirkolaee, E. B., Simic, V., & Ali, S. S. (2024). Designing a reliable-sustainable supply chain network: adaptive m-objective ε-constraint method. *Annals of Operations Research*, 359(1), 921–952. https://doi.org/10.1007/s10479-024-05961-2

*All numeric data are drawn from the team's revised workbook and the publicly supplied case requirements; references provide methodological context only.*


## Appendix — independent replication and financial horizon sensitivity (17 November 2026)

An independently encoded 130-variable mixed-integer linear optimization model, using annual packaging-tier thresholds rather than pre-enumerated ramp columns, reproduced the v6 bounded and unrestricted payoff-table anchors and all 126 combinations of weight and financial guardrails. All 516 workbook `Actions` rows were reconciled to the source Excel workbook and 126 supporting Energy, Supplier, and Transport calculations checked. The v6 payoff anchors, exact calculations and independent replication are documented in `validation/VALIDATION_REPORT_V6.md`. The profitability time horizon matters: cumulative nonnegative EBIT selects a portfolio with a −€390,824 Year-4 EBIT impact, whereas requiring **Year-4 ΔEBIT ≥ 0**, while retaining the same 50/50 cumulative objective, selects the four-action teammate benchmark (3,887.82 tonnes saved, +€1,116,960 cumulative EBIT). The instructor has not specified either guardrail, and these are alternative business scenarios, not an authoritative grading function.
