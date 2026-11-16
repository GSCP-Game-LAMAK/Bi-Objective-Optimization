# LAMAK Optimization Studio — Workbook-backed v3

**Purpose:** Explore the CO₂–EBIT trade-off in the Eco Chain Reaction game over Years 0–4. The static website is designed for GitHub Pages and runs client-side. It is a decision-support prototype, not the official game Digital Twin.

## Source integrity

Numerical backbone: `source/Eco_Chain_Reaction_Model.xlsx`. `build_model_data.py` imports the source workbook using `artifact_tool` and extracts **only** `Inputs`, `Assumptions`, `Routing`, `Suppliers`, `DC Locations`, `Energy`, `Transport`, `Stock Policies`, `Actions`, and `Sensitivity`.

**Dashboard, Schedule and Audit are deliberately excluded.** They are never read to generate candidates or optimum results. The static `data/workbook_model.json` and `data/model.js` store computed values from the above source sheets. Source cell ranges are associated with individual actions. The source workbook is included for auditing, but it must be recalculated and saved in Excel before re-extraction if inputs change.

25 actions correspond to the five options submitted by each group member; the expanded register includes 516 candidate actions across allowable categories, many requiring uncertainty screening.

## Run locally

Open `index.html` in Chrome/Edge or use:

```powershell
python -m http.server 8000
```

Open http://localhost:8000/. Run interactive search for custom settings. Click **View exact MILP reference** for the separately computed, unmodified team-25 scenario only. Use **Pareto Strategies → Inspect** to inspect a full schedule.

## Test

```powershell
node --check app.js
node --test tests/*.test.cjs
```

## Exact MILP baseline (Python, optional)

The fixed team-25 baseline has an independent exact mixed-integer formulation, solved using `scipy.optimize.milp` with HiGHS. It searches 25 EBIT ε-bounds and records **15 unique non-dominated candidates** as of the packaged input model. Each solve is MILP-optimal at its ε-bound; **this is not a full Pareto enumeration**.

```powershell
python -m pip install scipy numpy
python scripts/solve_exact.py
```

This regenerates `data/exact_team_frontier.json` and `data/exact_team.js`. The browser can display this precomputed reference but cannot rerun the Python MILP from GitHub Pages: GitHub Pages is static. For modified settings/inputs, the browser uses an explicitly labeled approximate multi-criteria beam search.

## Republish after Excel changes

In an environment with `artifact_tool` installed:

```powershell
python build_model_data.py
python scripts/solve_exact.py
```

`build_model_data.py` regenerates both `data/workbook_model.json` and `data/model.js`. On platforms without `artifact_tool`, update source Excel and supply the workbook for regeneration. Do not hand-edit or cherry-pick entries from the workbook Dashboard or Schedule.

## GitHub Actions deployment

Commit/push the complete folder (including hidden `.github/workflows/deploy-pages.yml`) to `main`; choose **Settings → Pages → Source: GitHub Actions** in `GSCP-Game-LAMAK/Bi-Objective-Optimization`. This workflow runs JavaScript unit tests and Python reference MILP calculations and publishes only website assets, not the source workbook.

## Constraints and meaning

- 10 tokens in total, 3 in each year; all actions start in Year 0–4 and their effects persist.
- At most one energy installation across both plants. At most one relocation, only in Year 0, €90,000 one-off.
- Exactly one selectable supplier share tier per product for this simplified formulation (33%/66%/100%, not a staged ramp); one fuel per eligible route/region; one inventory policy per product/facility.
- Routes are evaluated for the **selected DC location** using location-specific workbook rows. The 25-option team shortlist contains only Verona transport alternatives; the expanded scope includes other DC scenarios.
- The published workbook cost field is **annual OpEx**, separate from depreciation; annual EBIT impact = −OpEx delta − depreciation. One-off expenses affect the implementation year; capital expenditure affects cash, not EBIT.
- No official extra CapEx budget is given; the optional financial caps are user-selected scenarios.
- Unknown stock-related CO₂ is treated as **zero for numeric screening but not asserted to be zero in reality**. OTIF changes are unquantified; there is no certified service-level feasibility.
- Regional routing uses representative destinations and calibrated effective masses, not measured shipments to all 85 wholesalers.
- PV default uses the workbook's sinusoidal 12-hour self-consumption model; the annual matching switch is an analyst sensitivity model, not an official game interpretation.
- The 50/50 preference is applied to normalized results on the generated set. It is not claimed to reproduce the professor's undisclosed grading function.

## Scope limitations

The expanded candidate universe is not a fully specified game solver: it excludes staged 33%→66%→100% increases over multiple years, interdependent stock valuation under supplier transitions, and uncertainty-aware OTIF. The goal is **transparent option screening and reproducible mathematical comparison**, not a claim of global or real-world operational optimality.

## Academic research

See `research/ACADEMIC_REPORT_DRAFT.md` and `research/LITERATURE_NOTES.md` for four verified journal publications and report-ready references. These inform the methods and later sensitivity-analysis work.
