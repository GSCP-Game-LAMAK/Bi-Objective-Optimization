# Model specification, provenance and review notes

## Objective functions

- Carbon footprint: `min Σ_{t=0}^4 [4074 − Σ_a r_a · z_{a,t}]` t CO₂eq.
- Profit: `max Σ_{t=0}^4 [EBIT_base − Σ_a c_a · z_{a,t} − Σ_a setup_a · x_{a,t}]`.
- `x_{a,t} ∈ {0,1}` starts action `a` in year `t`; `z_{a,t} = Σ_{τ≤t} x_{a,τ}` keeps it active in following years.
- `r_a` is annual reduction in tonnes (negative indicates an emissions increase); `c_a` is annual EBIT cost change (positive is worse), with team energy entries already net of depreciation.
- The 50/50 score is an illustrative normalized ranking of observed Pareto solutions. The official scoring normalization has not been verified.

## Hard constraints (confirmed project description)

1. `Σ_{a,t} token_a · x_{a,t} ≤ 10` (slide 19).
2. `Σ_a token_a · x_{a,t} ≤ 3` for each year (slide 19).
3. `Σ_t x_{a,t} ≤ 1` for each action.
4. For energy actions `A_energy` across **both Plant A and Plant B**, `Σ_{a∈A_energy,t} x_{a,t} ≤ 1`. Project slide 32 describes selecting photovoltaic **or** trigeneration at **one** of the two factories. User explicitly confirmed a single energy plant.
5. For distribution relocation, `x_{dc,t}=0` for `t≠0`, `Σ_{dc,t} x_{dc,t}≤1`, `token_dc=2`, `setup_dc=€90,000` (slide 26). The setup cost is modeled as an expense in Year 0; its exact EBIT capitalization treatment should be confirmed.
6. The same North-West delivery activity cannot use both HVO and electric options.
7. API Beta inventory Q alternatives (10/20/30%) are mutually exclusive.

## Partial and unmodeled rules

- The PDF allows sourcing and packaging in tiers `≤33%`, `>33–66%`, and `>66%` with costs 1, 2, and 3 tokens respectively (slides 23–25). This group input contains **only the 33% tier** for each material and packaging; adding full tiers is a next step.
- Inventory Q/R adjustments cost 1 token per 10% band and can change both parameters simultaneously at the same token charge (slide 29). Only the five submitted inventory alternatives are in this action register.
- Last-mile electricity is allowed for areas bordering the DC macroregion (slide 30), a rule whose geographic adjacency must be checked when DC relocation is chosen. The optimizer conservatively blocks relocation with all Verona-based transportation estimates by default.
- The slide 35 emission baseline is rounded (4,074 t/year). Quantitative effects are team estimates not official Digital Twin outputs.
- OTIF is required for performance and affects actual sales/EBIT (slide 11), but the team has not supplied an OTIF response model. No official feasibility proof for service levels is possible yet.
- The 5-year cash and EBIT functions are not interchangeable. A reduction in inventory working capital may not cause the same amount of EBIT improvement.
- Naples is an allowed relocation city on slide 26 but absent from the user's final 25-row comparison, so its option is omitted pending numerical inputs.

## UI fixes in v2

- The Inspect button (and every clickable Pareto point) navigates to the strategy details and scrolls the selected plan into view, then focuses the heading for keyboard users.
- The entire energy portfolio is one exclusive choice; the previous two-site combination is no longer feasible.
- DC relocation is always charged €90k once in Year 0.

## Solver guarantee

The browser algorithm is a **bounded multi-objective beam search**, producing an approximate non-dominated set among retained states. It is not a globally certified mixed-integer program; no exact optimality gap is claimed. Use the university simulator to validate shortlisted schedules.
