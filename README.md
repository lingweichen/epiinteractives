# Interactive activities: RCTs, diagnostic tests and screening (Office hour 3)

Plain HTML/CSS/JS, no build step and no libraries. Each activity has three tabs: Watch (step-by-step animation), Explore (interactive tool) and Challenge (missions, games, quizzes). Bilingual (EN / 繁體中文); the
language toggle is remembered per browser.

| File | Concept |
|---|---|
| `index.html` | Hub page linking all activities |
| `randomization.html` | Hand allocation vs. simple and stratified randomization; unmeasured confounders; trial size |
| `concealment-blinding.html` | Allocation concealment vs. blinding sorter; single/double/triple blind; information bias quiz |
| `itt.html` | Intention-to-treat vs. as-treated (office hour numbers: 0.63 vs 0.55) |
| `diagnostic.html` | Cutoff trade-off, sensitivity, specificity, PPV/NPV and prevalence, 1,000-person icon array |
| `multiple-tests.html` | Sequential vs. simultaneous testing (office hour exercise: 85.5% / 99.5%) |
| `kappa.html` | Kappa, observed vs. chance agreement, patient-by-patient tiles (office hour example: 0.57) |
| `screening-bias.html` | Lead-time, length-time and over-diagnosis bias, screening quiz |
| `power.html` | Type I / II errors, power, sample size |
| `nnt.html` | Relative risk vs. risk difference, NNT / NNH (icon arrays) |
| `confounding-selection.html` | Confounding vs. selection bias (causal diagrams), sorting confounding / selection / information bias |
| `effect-modification.html` | Confounding vs. effect modification: stratified, crude and Mantel–Haenszel adjusted RRs; diagnosis game |
| `misclassification.html` | Non-differential vs. differential misclassification (office hour pesticide example) |
| `assets/epi.css`, `assets/epi.js` | Shared styles, language toggle, drag helpers, missions, games |
| `assets/loops.js` | The looping 10-second explainer animation at the top of each activity |

## Publish on GitHub Pages (step by step)
**Option A: its own repository**
1. Create a new repository on GitHub (e.g. `epi-interactives`).
2. Upload everything inside this folder (drag and drop on the repository page, or `git push`), keeping `assets/` next to the HTML files.
3. Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)` → Save.
4. After a minute the site is live at `https://<your-username>.github.io/epi-interactives/`.

**Option B: inside your existing teaching site**
1. Copy this folder into the site repository, e.g. `interactives/office-hour-3/`.
2. Commit and push. It is served at `https://<your-username>.github.io/<repo>/interactives/office-hour-3/`.
3. Link to `index.html` (add `?lang=zh` for the Chinese version) from your course pages.

The empty `.nojekyll` file tells GitHub Pages to serve the files as they are.

## Embed one activity in another page
```html
<iframe src="interactives/office-hour-3/kappa.html" width="100%" height="900"
        style="border:0" title="Kappa interactive"></iframe>
```

## Editing text
All wording lives in the `I18N` object near the bottom of each HTML file (`en` and `zh`).
Fonts load from Google Fonts with system fallbacks, so pages still work offline.

## Single-file version
`office-hour-3-interactives-single.html` (built by `build_single.py`) contains every activity in one
self-contained file. Use it for a quick preview, to email to students, or to host as one page.

## Language
Every page is bilingual: English and Traditional Chinese (Taiwan usage, e.g. 靈敏度, 特異度, 干擾, 選樣偏差, 曝露).
Students switch with the English / 繁體中文 button; the choice is remembered in their browser.
To link straight to one language, add `?lang=zh` or `?lang=en` to the URL, e.g. `index.html?lang=zh`.
