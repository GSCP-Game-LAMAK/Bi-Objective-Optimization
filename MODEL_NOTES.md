# Formulation, accounting and status (v3)

This document is a companion to the interactive mathematical-model tab.

Define `x[a,t] = 1` when action `a` starts in year `t∈{0,…,4}`; `z[a,t] = Σ_{τ≤t} x[a,τ]` denotes continuing activity. Workbook source actions have annual carbon saving `r[a]` (t/year), operating-cost delta `o[a]` (EUR/year), depreciation `d[a]` (EUR/year), setup expense `s[a]` (EUR one-off), capital investment `k[a]`, and tokens `q[a]`. Positive `o` increases cost.

Five-year objectives:

- Maximize avoided carbon: `R = Σ_a Σ_t (5-t) r[a] x[a,t]`.
- Maximize incremental EBIT: `P = Σ_a Σ_t {-(5-t)(o[a]+d[a]) - s[a]} x[a,t]`.

Annual reported emissions `4074 - Σ r[a]z[a,t]`; annual incremental EBIT `−Σ(o[a]+d[a])z[a,t] − Σ s[a]x[a,t]`. Capital expenditure is excluded from EBIT but included in cash flow. Baseline annual EBIT approximately EUR 31.2 million is from a rounded slide.

Core constraints:

- `Σ q[a]x[a,t] ≤ 10` overall, `Σ_a q[a]x[a,t] ≤ 3` per year.
- `Σ_t x[a,t] ≤ 1` for each action; `Σ_{a∈G,t}x[a,t] ≤ 1` per exclusive action family.
- All energy options belong to **one global energy family**.
- DC relocation only in Year 0; at most one city; €90,000 one-off.
- For transport alternatives tied to DC city `d`, selection requires `DC=d` (or Verona baseline) and the same fuel-route group cannot be selected twice.
- Alternative DC-dependent cost and emissions are drawn from matching workbook transport rows, not added to the Verona baseline unconditionally.

The exact reference uses SciPy/HiGHS MILP with linear bounds `P ≥ ε` and maximizes `R`. It samples 25 ε values between profit-only and carbon-only extreme solutions. This samples the frontier, not every efficient point. The interactive browser explores modified constraints using a bounded beam search, which cannot claim exact optimality.

**Unverified drivers:** OTIF, stock CO₂, supplier-stock price valuation interactions, calibrated regional tonnes and solar self-consumption. The project permits progressive sourcing/packaging across periods; a single-tier-at-once model is an approximation, not an exact interpretation of staged token charging.
