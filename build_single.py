"""Bundle every activity into one self-contained HTML file.

Run from this folder:  python3 build_single.py
Each page becomes a <template>; its script becomes a function that runs when the
page is shown. Links between pages turn into #hash links, so the bundle works as a
single page (preview, email, or one-page hosting).
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
PAGES = ["index", "randomization", "concealment-blinding", "itt", "power", "nnt",
         "diagnostic", "multiple-tests", "kappa", "screening-bias", "confounding-selection", "effect-modification", "misclassification"]
OUT = ROOT / "office-hour-3-interactives-single.html"

css = (ROOT / "assets/epi.css").read_text(encoding="utf-8")
js = (ROOT / "assets/epi.js").read_text(encoding="utf-8") + "\n" + (ROOT / "assets/loops.js").read_text(encoding="utf-8")

templates, runners = [], []
for name in PAGES:
    html = (ROOT / f"{name}.html").read_text(encoding="utf-8")
    head = html.split("<body>", 1)[0]
    style = "".join(re.findall(r"<style>.*?</style>", head, re.S))
    body = html.split("<body>", 1)[1].split('<script src="assets/epi.js"></script>', 1)[0]
    script = re.findall(r"<script>(.*?)</script>", html, re.S)[-1]
    body = re.sub(r'href="([a-z0-9-]+)\.html"', r'href="#\1"', body)
    templates.append(f'<template id="tpl-{name}">{style}{body}</template>')
    runners.append(f'PAGES["{name}"] = function () {{\n{script}\n}};')

out = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Trials, diagnostic tests and screening: interactive practice</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
{chr(10).join(templates)}
<script>
{js}
</script>
<script>
const PAGES = {{}};
{chr(10).join(runners)}
function show() {{
  let name = decodeURIComponent(location.hash.slice(1)) || "index";
  if (!PAGES[name]) name = "index";
  const app = document.getElementById("app");
  app.replaceChildren(document.getElementById("tpl-" + name).content.cloneNode(true));
  window.scrollTo(0, 0);
  PAGES[name]();
}}
window.addEventListener("hashchange", show);
show();
</script>
</body>
</html>
"""
OUT.write_text(out, encoding="utf-8")
print(f"wrote {OUT.name} ({len(out) // 1024} KB)")
