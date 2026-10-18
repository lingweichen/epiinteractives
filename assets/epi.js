/* Shared helpers for the epidemiology interactives.
   - Epi.init(dict, onChange): bilingual text (EN / 繁體中文), remembered per browser
   - Epi.dragToZones(el, opts): drag a card into a drop zone (mouse + touch + keyboard fallback)
   - Epi.scrub(input, onChange): number input you can drag left/right or type into
   - Epi.svgHandle(el, opts): draggable, keyboard-accessible handle inside an SVG */
window.Epi = (function () {
  const COMMON = {
    en: { loopAria: "Animated step-by-step explainer", tabWatch: "Watch", tabExplore: "Explore", tabChallenge: "Challenge", nextExplore: "Now try it yourself", nextChallenge: "Test yourself",
      loopPause: "Pause", loopPlay: "Play", loopScene: "Scene {n}", loopPrev: "Previous step", loopNext: "Next step", loopStep: "Step {i} of {n}", loopSlow: "Slow", loopNormal: "Normal", loopAuto: "Auto-advance",
      missionsH: "Missions", missionsAll: "All missions complete. Nicely done!", missionsReset: "Reset missions", missionDone: "Mission complete: {m}",
      ggLock: "Lock in my guess", ggNext: "Next round", ggYour: "your guess", ggAns: "answer", ggHit: "Within {tol}: nice!", ggMiss: "Off by {d}. Keep going!", ggScore: "Rounds: {r} · within range: {h} · streak: {s}",
      back: "All activities", notice: "What to notice", reset: "Reset", check: "Check my answers", dragHint: "Drag a number left or right, or click to type." },
    zh: { loopAria: "逐步動畫說明", tabWatch: "觀看", tabExplore: "動手探索", tabChallenge: "挑戰", nextExplore: "換你動手試試", nextChallenge: "測驗自己",
      loopPause: "暫停", loopPlay: "播放", loopScene: "第 {n} 幕", loopPrev: "上一步", loopNext: "下一步", loopStep: "第 {i}／{n} 步", loopSlow: "慢速", loopNormal: "正常", loopAuto: "自動前進",
      missionsH: "任務", missionsAll: "所有任務完成，做得好！", missionsReset: "重設任務", missionDone: "完成任務：{m}",
      ggLock: "確定我的猜測", ggNext: "下一回合", ggYour: "你的猜測", ggAns: "答案", ggHit: "誤差在 {tol} 以內，厲害！", ggMiss: "相差 {d}，再接再厲！", ggScore: "回合：{r}・猜中：{h}・連勝：{s}",
      back: "所有互動練習", notice: "觀察重點", reset: "重設", check: "檢查答案", dragHint: "左右拖曳數字即可調整，或點一下直接輸入。" }
  };
  let lang = "en";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const saved = (q === "en" || q === "zh") ? q : localStorage.getItem("epi-lang");
    lang = saved || ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
  } catch (e) { /* storage unavailable: default to English */ }
  let dict = { en: {}, zh: {} };
  const listeners = [];

  function t(key, vars) {
    let s = (dict[lang] && dict[lang][key]);
    if (s === undefined) s = (dict.en && dict.en[key]);
    if (s === undefined) s = key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, v) => (vars[v] !== undefined ? vars[v] : m));
    return s;
  }

  let langVer = 0;
  function apply() {
    langVer++;
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.querySelectorAll("[data-i18n]").forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    document.querySelectorAll(".lang-toggle button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    if (dict[lang] && dict[lang].pageTitle) document.title = t("pageTitle");
    listeners.forEach(f => f(lang));
    renderMissions();
  }

  /* Streamlined layout: Watch (animation) / Explore (tool) / Challenge (missions, games, quizzes). */
  function buildTabs() {
    const wrap = document.querySelector(".wrap"), loop = document.getElementById("loop");
    if (!wrap || !loop || wrap.querySelector(".tabs")) return;
    const lede = wrap.querySelector(".lede");
    const panes = ["watch", "explore", "challenge"].map(k => { const d = document.createElement("div"); d.className = "tab-pane"; d.dataset.pane = k; return d; });
    const rest = [];
    let n = lede.nextElementSibling;
    while (n) { rest.push(n); n = n.nextElementSibling; }
    rest.forEach(el => {
      if (el.id === "loop") panes[0].appendChild(el);
      else if (el.id === "missions" || el.hasAttribute("data-challenge")) panes[2].appendChild(el);
      else panes[1].appendChild(el);
    });
    wrap.querySelectorAll("[data-challenge]").forEach(el => panes[2].appendChild(el));
    const nav = document.createElement("nav");
    nav.className = "tabs"; nav.setAttribute("role", "tablist");
    nav.innerHTML = [["watch", "tabWatch", "&#9654;"], ["explore", "tabExplore", "&#9995;"], ["challenge", "tabChallenge", "&#9733;"]]
      .map(([k, key, ic], i) => `<button type="button" role="tab" data-tab="${k}"><span class="ic" aria-hidden="true">${ic}</span><span data-i18n="${key}"></span>${k === "challenge" ? `<span class="tab-badge num"></span>` : ""}</button>`).join("");
    lede.after(nav);
    let last = nav;
    panes.forEach(p => { last.after(p); last = p; });
    const nx = (key, to) => { const d = document.createElement("div"); d.className = "tab-next"; d.innerHTML = `<button class="btn" type="button" data-goto="${to}"><span data-i18n="${key}"></span> &#8250;</button>`; return d; };
    panes[0].appendChild(nx("nextExplore", "explore"));
    panes[1].appendChild(nx("nextChallenge", "challenge"));
    function show(k, scroll) {
      panes.forEach(p => { p.hidden = p.dataset.pane !== k; });
      nav.querySelectorAll("button").forEach(b => { b.setAttribute("aria-selected", String(b.dataset.tab === k)); });
      window.dispatchEvent(new Event("resize"));
      if (scroll) nav.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    }
    nav.querySelectorAll("button").forEach(b => { b.onclick = () => show(b.dataset.tab); });
    wrap.querySelectorAll("[data-goto]").forEach(b => { b.onclick = () => show(b.dataset.goto, true); });
    show("watch");
  }

  function init(pageDict, onChange) {
    buildTabs();
    dict = {
      en: Object.assign({}, COMMON.en, pageDict.en || {}),
      zh: Object.assign({}, COMMON.zh, pageDict.zh || {})
    };
    listeners.length = 0; // one page at a time (also lets a single-file bundle switch pages)
    if (onChange) listeners.push(onChange);
    document.querySelectorAll(".lang-toggle button").forEach(b => {
      b.addEventListener("click", () => setLang(b.dataset.lang));
    });
    apply();
  }

  function setLang(l) {
    lang = l;
    try { localStorage.setItem("epi-lang", l); } catch (e) { /* ignore */ }
    apply();
  }

  /* Drag a card element into any ancestor-independent element marked [data-zone]. */
  function dragToZones(el, opts) {
    let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, rect = null, active = false, lastZone = null;
    el.style.touchAction = "none";
    function zoneAt(x, y) {
      const stack = document.elementsFromPoint(x, y);
      for (const n of stack) {
        if (n === el || el.contains(n)) continue;
        const z = n.closest && n.closest("[data-zone]");
        if (z) return z;
      }
      return null;
    }
    el.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      active = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      rect = el.getBoundingClientRect();
      ox = sx - rect.left; oy = sy - rect.top;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", e => {
      if (!active) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 5) return;
      if (!moved) {
        moved = true;
        el.classList.add("dragging");
        el.style.width = rect.width + "px";
        el.style.position = "fixed";
        el.style.zIndex = 1000;
      }
      el.style.left = (e.clientX - ox) + "px";
      el.style.top = (e.clientY - oy) + "px";
      const z = zoneAt(e.clientX, e.clientY);
      if (z !== lastZone) {
        if (lastZone) lastZone.classList.remove("over");
        if (z) z.classList.add("over");
        lastZone = z;
      }
    });
    function finish(e, cancelled) {
      if (!active) return;
      active = false;
      if (lastZone) lastZone.classList.remove("over");
      lastZone = null;
      if (moved) {
        const z = cancelled ? null : zoneAt(e.clientX, e.clientY);
        el.classList.remove("dragging");
        el.style.position = ""; el.style.left = ""; el.style.top = ""; el.style.width = ""; el.style.zIndex = "";
        if (z && opts.onDrop) opts.onDrop(el, z.dataset.zone);
      } else if (!cancelled && opts.onTap) {
        opts.onTap(el);
      }
    }
    el.addEventListener("pointerup", e => finish(e, false));
    el.addEventListener("pointercancel", e => finish(e, true));
    // Keyboard users: Enter/Space fires click with detail 0
    el.addEventListener("click", e => { if (e.detail === 0 && opts.onTap) opts.onTap(el); });
  }

  /* Number input that changes when dragged horizontally; a plain click focuses it for typing. */
  function scrub(input, onChange, step) {
    step = step || 1;
    const min = input.min !== "" ? Number(input.min) : -Infinity;
    const max = input.max !== "" ? Number(input.max) : Infinity;
    let sx = 0, start = 0, scrubbing = false, down = false;
    const clamp = v => Math.max(min, Math.min(max, v));
    input.addEventListener("pointerdown", e => {
      if (document.activeElement === input) return; // already typing: let the caret work
      e.preventDefault();
      down = true; scrubbing = false;
      sx = e.clientX; start = Number(input.value) || 0;
      input.setPointerCapture(e.pointerId);
    });
    input.addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!scrubbing && Math.abs(dx) > 3) { scrubbing = true; input.classList.add("scrubbing"); }
      if (scrubbing) {
        const v = clamp(Math.round(start + (dx / 6) * step));
        if (String(v) !== input.value) { input.value = v; onChange(); }
      }
    });
    function up() {
      if (!down) return;
      down = false;
      input.classList.remove("scrubbing");
      if (!scrubbing) { input.focus(); input.select(); }
      scrubbing = false;
    }
    input.addEventListener("pointerup", up);
    input.addEventListener("pointercancel", up);
    input.addEventListener("input", () => {
      if (input.value === "") return;
      onChange();
    });
    input.addEventListener("change", () => {
      input.value = clamp(Math.round(Number(input.value) || 0));
      onChange();
    });
  }

  /* Horizontal draggable handle in an SVG. opts: {svg, toValue(px)->v, onChange(v), getValue()->v, step, min(), max(), label} */
  function svgHandle(g, opts) {
    g.classList.add("drag-handle");
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "slider");
    let down = false;
    function svgX(e) {
      const pt = opts.svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(opts.svg.getScreenCTM().inverse()).x;
    }
    g.addEventListener("pointerdown", e => { down = true; g.setPointerCapture(e.pointerId); e.preventDefault(); });
    g.addEventListener("pointermove", e => { if (down) opts.onChange(opts.toValue(svgX(e))); });
    g.addEventListener("pointerup", () => { down = false; });
    g.addEventListener("pointercancel", () => { down = false; });
    g.addEventListener("keydown", e => {
      const st = (e.shiftKey ? 5 : 1) * (opts.step || 1);
      let v = opts.getValue();
      if (e.key === "ArrowRight" || e.key === "ArrowUp") v += st;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v -= st;
      else return;
      e.preventDefault();
      opts.onChange(v);
    });
  }

  const fmt = (x, d) => (isFinite(x) ? Number(x).toFixed(d === undefined ? 2 : d) : "—");
  const pct = (x, d) => (isFinite(x) ? (x * 100).toFixed(d === undefined ? 1 : d) + "%" : "—");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* Seeded random numbers so the "random" examples are the same for every student. */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let r = Math.imul(s ^ (s >>> 15), 1 | s);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- fun layer: confetti, toast, missions, FLIP animation, guessing game ---------- */
  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function confetti(x, y) {
    if (reduced()) return;
    const c = document.createElement("canvas");
    c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2000";
    document.body.appendChild(c);
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    const cs = getComputedStyle(document.documentElement);
    const cols = ["--a", "--b", "--good", "--bad"].map(v => cs.getPropertyValue(v).trim());
    const P = [...Array(70)].map(() => ({ x, y, vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 9 - 3, s: 5 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[Math.floor(Math.random() * cols.length)] }));
    const t0 = performance.now();
    (function frame(tt) {
      const dt = tt - t0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach(p => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - dt / 1400);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore();
      });
      if (dt < 1400) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  let toastEl = null, toastTimer = 0;
  function toast(msg) {
    if (!toastEl || !toastEl.isConnected) {
      toastEl = document.createElement("div");
      toastEl.className = "epi-toast"; toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  /* Missions: items = [{id, en, zh, test: () => boolean}]. Progress is saved per page. */
  let M = null;
  function missions(page, el, items) {
    let done = [];
    try { done = (JSON.parse(localStorage.getItem("epi-m-" + page) || "{}").done) || []; } catch (e) { /* ignore */ }
    M = { page, el, items, done: new Set(done.filter(id => items.some(i => i.id === id))) };
    saveMissions(); renderMissions();
  }
  function saveMissions() {
    try { localStorage.setItem("epi-m-" + M.page, JSON.stringify({ done: [...M.done], total: M.items.length })); } catch (e) { /* ignore */ }
  }
  function renderMissions() {
    if (!M || !M.el.isConnected) return;
    const n = M.done.size, tot = M.items.length;
    const badge = document.querySelector(".tab-badge"); if (badge) badge.textContent = `${n}/${tot}`;
    M.el.innerHTML = `<div class="m-head"><h2>${t("missionsH")}</h2><span class="m-count num">${n} / ${tot}</span></div>
      <div class="m-prog" aria-hidden="true"><i style="width:${(n / tot) * 100}%"></i></div>
      <ol class="m-list">${M.items.map(i => `<li data-id="${i.id}" class="${M.done.has(i.id) ? "done" : ""}"><span class="m-box" aria-hidden="true"></span><span class="m-txt">${i[lang] || i.en}</span><span class="sr-only">${M.done.has(i.id) ? "✓" : ""}</span></li>`).join("")}</ol>
      ${n === tot ? `<p class="m-all">${t("missionsAll")}</p>` : ""}
      <button class="m-reset" type="button">${t("missionsReset")}</button>`;
    M.el.querySelector(".m-reset").onclick = () => { M.done.clear(); saveMissions(); renderMissions(); };
  }
  function check() {
    if (!M || !M.el.isConnected) return;
    const newly = [];
    M.items.forEach(i => {
      if (M.done.has(i.id)) return;
      let ok = false; try { ok = !!i.test(); } catch (e) { ok = false; }
      if (ok) { M.done.add(i.id); newly.push(i); }
    });
    if (!newly.length) return;
    saveMissions(); renderMissions();
    newly.forEach(i => {
      const li = M.el.querySelector(`[data-id="${i.id}"]`);
      if (li) { li.classList.add("just"); const r = li.getBoundingClientRect(); confetti(r.left + 18, r.top + r.height / 2); }
      toast(t("missionDone", { m: (i[lang] || i.en).replace(/<[^>]+>/g, "") }));
    });
  }

  /* FLIP: animate elements from where they were to where mutate() puts them. */
  function flip(els, mutate, opts) {
    opts = opts || {};
    const first = new Map();
    els.forEach(e => first.set(e, e.getBoundingClientRect()));
    mutate();
    if (reduced()) return;
    let k = 0;
    els.forEach(e => {
      const a = first.get(e), b = e.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: opts.duration || 550, easing: "cubic-bezier(.2,.7,.2,1)", delay: (opts.stagger || 0) * (k++), fill: "backwards" });
    });
  }

  /* Guessing game. o = {min, max, step, start, tol, fmt(v), round() -> {q(), answer, explain()}, label} */
  function guessGame(el, o) {
    const g = { hits: 0, rounds: 0, streak: 0, render: null };
    let cur = o.round(), guessed = false, val = o.start;
    const pos = v => ((v - o.min) / (o.max - o.min)) * 100;
    function render() {
      const diff = Math.abs(val - cur.answer), hit = diff <= o.tol + 1e-9;
      el.innerHTML = `<div class="gg-q">${cur.q()}</div>
        <div class="gg-row"><input type="range" min="${o.min}" max="${o.max}" step="${o.step}" value="${val}" aria-label="${o.label ? t(o.label) : ""}" ${guessed ? "disabled" : ""}><output class="gg-val num">${o.fmt(val)}</output></div>
        <div class="gg-track" aria-hidden="true">${guessed ? `<span class="gg-band" style="left:${pos(Math.max(o.min, cur.answer - o.tol))}%;width:${pos(Math.min(o.max, cur.answer + o.tol)) - pos(Math.max(o.min, cur.answer - o.tol))}%"></span>
          <span class="gg-mk ans" style="left:${pos(cur.answer)}%"><b>${t("ggAns")} ${o.fmt(cur.answer)}</b></span>
          <span class="gg-mk you" style="left:${pos(val)}%"><b>${t("ggYour")}</b></span>` : ""}</div>
        <div class="btn-row" style="margin-top:12px">${guessed ? `<button class="btn" data-a="next">${t("ggNext")}</button>` : `<button class="btn" data-a="lock">${t("ggLock")}</button>`}</div>
        ${guessed ? `<p class="gg-fb ${hit ? "good" : "bad"}">${hit ? t("ggHit", { tol: o.fmt(o.tol) }) : t("ggMiss", { d: o.fmt(diff) })}</p><div class="gg-ex">${cur.explain()}</div>` : ""}
        <p class="small">${t("ggScore", { r: g.rounds, h: g.hits, s: g.streak })}</p>`;
      const r = el.querySelector("input");
      r.addEventListener("input", () => { val = Number(r.value); el.querySelector(".gg-val").textContent = o.fmt(val); });
      const btn = el.querySelector("[data-a]");
      btn.onclick = () => {
        if (btn.dataset.a === "lock") {
          guessed = true; g.rounds++;
          if (Math.abs(val - cur.answer) <= o.tol + 1e-9) { g.hits++; g.streak++; const b = btn.getBoundingClientRect(); confetti(b.left + b.width / 2, b.top); }
          else g.streak = 0;
          render(); check();
          el.querySelector("[data-a]").focus();
        } else { cur = o.round(); guessed = false; render(); el.querySelector("input").focus(); }
      };
    }
    g.render = render;
    render();
    return g;
  }

  /* Step-by-step animated explainer.
     spec = { dur, h, scenes: [{ t, hold, en, zh, den, dzh }], build(svg, h) -> frame(time) }
     Each step animates from t to hold, then pauses (auto-advance after a reading pause, or wait for Next). */
  function loopAnim(host, spec) {
    const H = spec.h || 260, sc = spec.scenes, n = sc.length, DWELL = 6;
    host.innerHTML = `<div class="loop">
      <div class="loop-bar">
        <button class="loop-btn" type="button" data-a="prev">&#8249;</button>
        <button class="loop-pp" type="button" data-a="pp"></button>
        <button class="loop-btn" type="button" data-a="next">&#8250;</button>
        <span class="loop-step num"></span>
        <span class="loop-opts">
          <span class="loop-speed" role="group"><button type="button" data-r="0.45"></button><button type="button" data-r="1"></button></span>
          <label class="check"><input type="checkbox" class="loop-auto" checked> <span class="loop-autoL"></span></label>
        </span>
      </div>
      <div class="loop-body">
        <div class="loop-stage"><svg viewBox="0 0 640 ${H}" role="img"></svg><div class="loop-prog" aria-hidden="true"><i></i></div></div>
        <div class="loop-side"><ol class="loop-steps"></ol></div>
      </div></div>`;
    const svg = host.querySelector("svg"), stepsEl = host.querySelector(".loop-steps"), pp = host.querySelector("[data-a=pp]");
    const stepLbl = host.querySelector(".loop-step"), prog = host.querySelector(".loop-prog i"), autoEl = host.querySelector(".loop-auto");
    const labels = [];
    const h = {
      el(tag, a, p) { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; },
      person(p, fill) { const g = h.el("g", { fill }, p); h.el("circle", { cx: 0, cy: -9, r: 5 }, g); h.el("path", { d: "M-7,9 C-7,-2 7,-2 7,9 Z" }, g); return g; },
      at(g, x, y, s, o) { g.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s == null ? 1 : s})`); if (o != null) g.setAttribute("opacity", o); },
      seg: (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a))),
      ease: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
      lerp: (a, b, k) => a + (b - a) * k,
      L: (en, zh) => (lang === "zh" ? zh : en),
      label(p, x, y, en, zh, a) { const e = h.el("text", Object.assign({ x, y, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--ink)" }, a || {}), p); e._en = en; e._zh = zh; e.textContent = h.L(en, zh); labels.push(e); return e; },
      text(p, x, y, a) { return h.el("text", Object.assign({ x, y, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--ink)" }, a || {}), p); }
    };
    const frame = spec.build(svg, h);
    const RM = reduced();
    let idx = 0, tm = RM ? sc[0].hold : sc[0].t, state = RM ? "paused" : "playing", resume = "playing", dwell = 0, rate = 0.45, last = null, visible = true, shownVer = -1;

    function go(i) {
      idx = (i + n) % n; dwell = 0;
      tm = RM ? sc[idx].hold : sc[idx].t;
      state = RM ? "paused" : "playing";
      render(true);
    }
    function render(force) {
      frame(tm);
      if (force || langVer !== shownVer) {
        if (langVer !== shownVer) {
          labels.forEach(e => { e.textContent = h.L(e._en, e._zh); });
          host.querySelector("[data-a=prev]").setAttribute("aria-label", t("loopPrev"));
          host.querySelector("[data-a=next]").setAttribute("aria-label", t("loopNext"));
          host.querySelector("[data-r='0.45']").textContent = t("loopSlow");
          host.querySelector("[data-r='1']").textContent = t("loopNormal");
          host.querySelector(".loop-autoL").textContent = t("loopAuto");
        }
        stepsEl.innerHTML = sc.map((s, i) => `<li class="${i === idx ? "on" : i < idx ? "past" : ""}"><button type="button" data-i="${i}"><span class="n">${i + 1}</span><span class="tt">${s[lang] || s.en}</span></button>${i === idx ? `<p>${s["d" + lang] || s.den || ""}</p>` : ""}</li>`).join("");
        stepsEl.querySelectorAll("button").forEach(b => { b.onclick = () => go(+b.dataset.i); });
        stepLbl.textContent = t("loopStep", { i: idx + 1, n });
        svg.setAttribute("aria-label", (sc[idx][lang] || sc[idx].en) + " " + (sc[idx]["d" + lang] || ""));
        host.querySelectorAll(".loop-speed button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.r === rate)));
        shownVer = langVer;
        const on = stepsEl.querySelector("li.on");
        if (on && getComputedStyle(stepsEl).position === "absolute") stepsEl.scrollTop = Math.max(0, on.offsetTop - 8);
      }
      const playingNow = state === "playing" || state === "dwell";
      pp.innerHTML = playingNow ? "&#10074;&#10074;" : "&#9654;";
      pp.setAttribute("aria-label", t(playingNow ? "loopPause" : state === "waiting" ? "loopNext" : "loopPlay"));
      const s = sc[idx], within = state === "dwell" || state === "waiting" ? 1 : Math.max(0, Math.min(1, (tm - s.t) / (s.hold - s.t)));
      prog.style.width = ((idx + within) / n) * 100 + "%";
      host.classList.toggle("waiting", state === "waiting");
    }
    host.querySelector("[data-a=prev]").onclick = () => go(idx - 1);
    host.querySelector("[data-a=next]").onclick = () => go(idx + 1);
    pp.onclick = () => {
      if (state === "waiting") go(idx + 1);
      else if (state === "paused") { state = RM ? "paused" : (tm >= sc[idx].hold ? "dwell" : resume); if (RM) go(idx + 1); }
      else { resume = state; state = "paused"; }
      last = null; render();
    };
    host.querySelectorAll(".loop-speed button").forEach(b => { b.onclick = () => { rate = +b.dataset.r; render(true); }; });
    autoEl.onchange = () => { if (autoEl.checked && state === "waiting") { state = "dwell"; dwell = DWELL - 1.5; } render(); };
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);
    (function tick(now) {
      if (!host.isConnected) return;
      const dt = last == null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      if (visible) {
        if (state === "playing") {
          tm += dt * rate;
          if (tm >= sc[idx].hold) { tm = sc[idx].hold; state = autoEl.checked ? "dwell" : "waiting"; dwell = 0; render(true); }
          else render();
        } else if (state === "dwell") {
          dwell += dt;
          if (dwell >= DWELL) go(idx + 1); else render();
        } else if (langVer !== shownVer) render();
      }
      requestAnimationFrame(tick);
    })(performance.now());
    render(true);
  }

  return { confetti, toast, missions, check, flip, guessGame, reduced, loopAnim,
    init, setLang, t, get lang() { return lang; }, dragToZones, scrub, svgHandle, fmt, pct, clamp, rng };
})();
