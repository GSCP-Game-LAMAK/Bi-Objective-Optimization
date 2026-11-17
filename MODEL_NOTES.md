# LAMAK v6 mathematical model notes

## Feasible-set restriction and revised payoff table

Let `R(x)` be cumulative five-year CO₂e avoided (t) and `E(x)` the incremental cumulative five-year EBIT (€). Let `X` contain all feasible five-year implementation schedules satisfying the professor's token, annual capacity, exclusive action, DC, and energy constraints. The *bounded* set is

\[
X_B=\{x\in X:E(x)\ge -8,384,875.34\}.
\]

This numerical floor is **our economic choice**, not an empirical 95% confidence interval and not a published professor requirement. The unrestricted `X` remains accessible as a comparison.

For each selected region `X_m`, solve separate exact MILPs:

\[
\begin{aligned}
x_E &= \arg\max_{x\in X_m} E(x),\\
x_R &= \arg\max_{x\in X_m} R(x).
\end{aligned}
\]

For reproducibility, the independent and publication solvers use lexicographic tie-breaking to select the best secondary objective among essentially tied primary optima. Define `R_Emax=R(x_E)`, `E_max=E(x_E)`, `R_max=R(x_R)`, `E_Rmax=E(x_R)`.

Then

\[
S_m(w;x) = w\frac{R(x)-R_{Emax,m}}{R_{max,m}-R_{Emax,m}} +
(1-w)\frac{E(x)-E_{Rmax,m}}{E_{max,m}-E_{Rmax,m}}.
\]

**Bounded anchors:** `R_Emax=2701.00000 t`, `R_max=5890.19687965 t`, `E_Rmax=−€8,384,875.33777`, `E_max=+€1,780,451.60870`. Under 50/50 this implies an exchange rate of approximately **€3,187 per additional tonne of five-year CO₂ avoidance** (equal normalized score contribution). The original unrestricted payoff yields ≈€5,618/t and is kept as a benchmark.

The selected strategy is proven optimal for the specified weighted objective, the core scope and selected EBIT floor. The **plotted points are a sampled** non-dominated subset, not an exhaustive discrete integer Pareto frontier. Optional EBIT guardrails are stronger alternative assumptions nested within the selected mode, not extra grading constraints.

## v6 exact model scope and limitations

- 30 core action alternatives: 5 DC, 5 energy, 12 supplier tiers, 5 transport, 3 packaging tiers encoded as 55 progressive paths.
- 170 binary columns, 10 total tokens and 3/year, Year 0–4, 1 energy globally; mutually exclusive suppliers within each material; strict Verona-dependent transport/relocation compatibility; initial packaging setup once; additional packaging tiers charge incremental tokens by explicit interpretation.
- EBIT includes annual operating and depreciation changes and one-off setup in the implementation year; CapEx reduces cash, not EBIT twice.
- Source sheets imported: `Inputs`, `Assumptions`, `Routing`, `Suppliers`, `DC Locations`, `Energy`, `Transport`, `Stock Policies`, `Actions`; **not** `Dashboard`, `Schedule`, `Audit`, `Sensitivity`.
- Stock-policy CO₂ and OTIF unknown: stock choices excluded from certified core; 516-option browser screening labeled approximate.
- Energy PV use, routing masses, grid values and supplier freight are estimates from the team's updated workbook, not independently observed performance.
- No guarantee concerning exact professor grading method, real-world service risk, or objective trade-offs under uncertainty.

## Interpreting the high-abatement knee

The unconstrained maximum is `5,984.25236 t` with `−€16,666,409.48` EBIT; the bounded maximum is `5,890.19688 t` with `−€8,384,875.34` EBIT. About **94.06 additional tonnes** at the endpoint cost a further **€8.28m** in EBIT. This steep pairwise exchange provides a rationale to examine a financially constrained frontier. It does **not** establish that the frontier is mathematically exponential, nor does it statistically identify a 95th-percentile cutoff.

See `validation/VALIDATION_REPORT_V6.md` for the independent proof and comparisons.
