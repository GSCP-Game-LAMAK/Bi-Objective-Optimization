# LAMAK Optimization Studio — Updated-workbook v4

**Purpose:** Explore the CO₂–EBIT trade-off in the Eco Chain Reaction game over Years 0–4. The static website is designed for GitHub Pages and runs client-side. It is a decision-support prototype, not the official game Digital Twin.

## Source integrity

Numerical backbone: `source/Eco_Chain_Reaction_Model_Updated.xlsx`. `build_model_data.py` imports the updated source workbook using `artifact_tool` and extracts **only** `Inputs`, `Assumptions`, `Routing`, `Suppliers`, `DC Locations`, `Energy`, `Transport`, `Stock Policies`, and `Actions`.

**Dashboard, Schedule, Audit and Sensitivity are deliberately excluded.** The latter contains historical portfolio snapshots. They are never read to generate candidates or optimum results. The static `data/workbook_model.json` and `data/model.js` store computed values from the above source sheets. Source cell ranges are associated with individual actions. The updated source workbook is included for auditing; edited formulas must be recalculated and saved in Excel before re-extraction. The bundled extracted data is ready to publish without rerunning artifact_tool locally.

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

The fixed team-25 baseline has an independent exact mixed-integer formulation, solved using `scipy.optimize.milp` with HiGHS. It searches 25 EBIT ε-bounds and records **13 unique non-dominated candidates** as of the packaged input model. Each solve is MILP-optimal at its ε-bound; **this is not a full Pareto enumeration**.

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
- PV default uses the revised workbook's average daily load cap and no credit for surplus. The new PV utilization slider permits 50–100% what-if scenarios, without changing the workbook's source values. The exact MILP reference applies only at the workbook's 100% assumption.
- The 50/50 preference is applied to normalized results on the generated set. It is not claimed to reproduce the professor's undisclosed grading function.

## Scope limitations

The expanded candidate universe is not a fully specified game solver: it excludes staged 33%→66%→100% increases over multiple years, interdependent stock valuation under supplier transitions, and uncertainty-aware OTIF. The goal is **transparent option screening and reproducible mathematical comparison**, not a claim of global or real-world operational optimality.

## Academic research

See `research/ACADEMIC_REPORT_DRAFT.md` and `research/LITERATURE_NOTES.md` for four verified journal publications and report-ready references. These inform the methods and later sensitivity-analysis work.

## November 17 update and compatibility

The updated `Energy` worksheet replaces the previous intraday solar calculation with **average-daily demand matching**. In particular, PV Large B now saves 540.20 tCO₂/year and provides approximately €356,090/year incremental EBIT benefit, versus 255.58 tCO₂/year and €143,314/year in v3. See `WORKBOOK_CHANGE_AUDIT.md` for every changed alternative and the remaining discrepancies.

Version 4 uses localStorage namespace `lamak-optimizer-v4` to prevent edited values saved by v3 from silently overriding the new workbook calculations. The optional **View exact MILP reference** button applies only to unedited 25-option inputs with 100% PV utilization and default constraints. If you change controls, use the interactive approximation and rerun the Python MILP offline for certified sampled bounds.
