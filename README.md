# LAMAK — Bi-Objective Optimization Dashboard (v2)

GitHub Pages-ready, entirely static dashboard for the Politecnico di Milano *Eco Chain Reaction* Global Supply Chain Planning challenge. It performs an **approximate**, browser-side Pareto search using the 25 candidate actions supplied by the group.

## Local launch from VS Code

1. Open this folder in VS Code.
2. From the integrated terminal, run `python3 -m http.server 8000`.
3. Open `http://localhost:8000/` (or use VS Code Live Server).
4. Select **Run optimization**. Use **Pareto Strategies → Inspect** to jump to the five-year plan.

No npm install, API keys, or backend is required to run the site.

## Publish with GitHub Actions

1. Copy the ZIP **contents** to the repository root: `GSCP-Game-LAMAK/Bi-Objective-Optimization`. Preserve `.github/workflows/deploy-pages.yml`.
2. In GitHub, open **Settings → Pages → Build and deployment → Source** and change the source from **Deploy from a branch** to **GitHub Actions**. This is important: the previous branch-based Pages configuration is a different deployment method.
3. Commit and push to `main`:

   ```bash
   git add .
   git commit -m "Add validated LAMAK optimizer and Pages deployment"
   git push origin main
   ```

4. Go to **Actions** and open **Test and deploy LAMAK dashboard**. The test job must pass before deployment.
5. The expected URL after a successful deployment is **https://gscp-game-lamak.github.io/Bi-Objective-Optimization/**.

If Actions are disabled at organization level, an organization admin must allow them. Check **Settings → Actions → General** and repository permissions. The workflow requests `pages: write` and `id-token: write` for Pages publishing.

### Test locally

```bash
node --check app.js
node --test tests/*.test.cjs
```

Uses Node 22 built-ins only; tests validate exclusivity, token limits, DC timing/setup accounting, and strategy inspection behavior.

## Case constraints implemented

- Five implementation periods: Year 0 to Year 4.
- 10 tokens available overall; no more than 3 tokens in any individual year (page 19).
- **Exactly one energy installation total across both plants**: choose *one* PV or trigeneration capacity and *one* site. This is the conservative interpretation of the singular energy choice on page 32 and the user's confirmed rule.
- DC relocation: only in Year 0, costs 2 tokens and **€90,000 once**, regardless of which listed city is chosen (page 26).
- At most one DC relocation location.
- North-West HVO and North-West electric are mutually exclusive.
- API Beta 10/20/30% stock-policy options are mutually exclusive; stock changes up to 30% with 1 token per 10% step (page 29).
- Alternative supplier options in the supplied 25-action dataset represent only one 33%-share tier each, charged 1 token. The PDF permits larger tiers, but they are **not yet modeled** here.
- Packaging 33% redesigned share charged 1 token plus €75,000 one-off (page 25).
- Electricity for last-mile routes is only allowed where the region is adjacent to the DC's region (page 30); this prototype includes one preselected North West electric action with eligibility flagged, not a complete adjacency model.

### Deliberate modeling limitations

The project Digital Twin is the evaluation authority. The website cannot certify OTIF or the official score and does not model all transport/sourcing/stock interactions. A strict mode avoids combining Verona-derived transportation estimates with DC relocation; disable it only for speculative scenarios. Stock CO₂ and actual EBIT effects are unknown; inventory proxies are excluded by default. Carbon/EBIT metrics assume persistence from implementation year to Year 4 and constant quantities. The bounded Pareto search is *heuristic* and not a proof of global optimality.

## Data audit

This release exposes and optionally applies three corrections to the team's spreadsheet:
- API Alpha 33% purchasing premium is +€75,900/year, not +€76.
- Spray bottle baseline spending on slide 34 is €303,600, implying around 5.5 million bottles/year and revised annual effects.
- South HVO cost is approximately +€14,490/year, not +€14.49.

The €90,000 DC setup is always charged even if audited corrections are turned off, since it is a specific project rule. Annual energy financial effects are treated as *already including depreciation*, so investments are not double-counted in EBIT. When showing cash changes, energy depreciation is added back.

## Files

- `index.html` — Dashboard layout and mathematical explanations
- `styles.css` — Responsive dark UI
- `app.js` — Heuristic optimization, interactive SVG charts, input editing and exports
- `.github/workflows/deploy-pages.yml` — Automated testing and deployment
- `tests/rules.test.cjs` — Constraint and interaction regression tests
- `MODEL_NOTES.md` — Model scope, equations and review checklist

The browser can save its input table to localStorage and export/import JSON; local saves are **not shared between browsers** and are **not pushed to the repository**.
