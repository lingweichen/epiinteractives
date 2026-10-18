/* GIF-like looping explainers, one per activity. Each spec: { dur, scenes, build(svg, h) -> frame(t) }.
   Colours follow the site: cobalt = treatment / diseased, ochre = control / healthy, red = risk or event. */
window.EpiLoops = (function () {
  const L = {};
  const box = (h, x, y, w, ht, stroke, dash) => h.el("rect", { x, y, width: w, height: ht, rx: 10, fill: "none", stroke, "stroke-width": 2, "stroke-dasharray": dash || "" });
  /* causal-diagram helpers: node(), arrow() whose drawing can be animated with k in [0,1] */
  function dagDefs(h, id) {
    const d = h.el("defs", {});
    const m = h.el("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, d);
    h.el("path", { d: "M0,0 L10,5 L0,10 z", fill: "context-stroke" }, m);
  }
  function node(h, p, x, y, en, zh, o) {
    o = o || {};
    const g = h.el("g", {}, p);
    const w = o.w || 92, ht = 30;
    const r = h.el("rect", { x: x - w / 2, y: y - ht / 2, width: w, height: ht, rx: o.box ? 2 : 15, fill: "var(--surface)", stroke: o.color || "var(--ink)", "stroke-width": o.box ? 3 : 2 }, g);
    if (o.box) h.el("rect", { x: x - w / 2 - 5, y: y - ht / 2 - 5, width: w + 10, height: ht + 10, rx: 4, fill: "none", stroke: o.color || "var(--ink)", "stroke-width": 1.5 }, g);
    h.label(g, x, y + 5, en, zh, { "font-size": 13, fill: o.color || "var(--ink)" });
    g._x = x; g._y = y; g._w = w; g._r = r;
    return g;
  }
  function arrow(h, p, a, b, o) {
    o = o || {};
    const dx = b._x - a._x, dy = b._y - a._y, len = Math.hypot(dx, dy);
    const shrink = (n) => { const rx = n._w / 2 + 4, ry = 19; const t = Math.min(rx / Math.abs(dx || 1e-9), ry / Math.abs(dy || 1e-9)); return Math.min(t, 0.45); };
    const sa = shrink(a), sb = shrink(b);
    const x1 = a._x + dx * sa, y1 = a._y + dy * sa, x2 = b._x - dx * sb, y2 = b._y - dy * sb;
    const L = Math.hypot(x2 - x1, y2 - y1);
    const line = h.el("line", { x1, y1, x2, y2, stroke: o.color || "var(--ink)", "stroke-width": o.w || 2.5, "marker-end": `url(#${o.marker})`, "stroke-dasharray": o.dash ? o.dash : `${L} ${L}`, "stroke-dashoffset": o.dash ? 0 : L }, p);
    line._L = L; line._dash = !!o.dash;
    line.draw = k => { if (!line._dash) line.setAttribute("stroke-dashoffset", (L * (1 - k)).toFixed(1)); line.setAttribute("opacity", k > 0 ? 1 : 0); };
    line.mid = [(x1 + x2) / 2, (y1 + y2) / 2];
    return line;
  }
  const diamond = (h, g) => h.el("rect", { x: 3, y: -21, width: 7, height: 7, fill: "var(--bad)", transform: "rotate(45 6.5 -17.5)" }, g);

  /* 1. Randomization */
  L.randomization = {
    dur: 18.5,
    scenes: [
      { t: 0, hold: 6, en: "A coin toss decides each patient's group.", zh: "擲硬幣決定每位病人的組別。",
        den: "Each patient has a 50:50 chance of either arm. Neither the doctor nor the patient chooses, so nothing about the patient can influence which group they join.",
        dzh: "每位病人進入任一組的機會都是 50:50。醫師和病人都無法選擇，因此病人的任何特徵都不會影響他進入哪一組。" },
      { t: 6.2, hold: 8.4, en: "Hidden risk factors get shared out too.", zh: "隱藏的風險因子也被平均分配。",
        den: "Red diamonds mark a risk factor nobody measured. Because allocation was left to chance, it ends up balanced (3 vs 3), just like the factors we can see.",
        dzh: "紅色菱形代表沒有人測量的風險因子。因為分派交給機遇，它也會像看得到的因子一樣達到平衡（3 比 3）。" },
      { t: 8.6, hold: 13.9, en: "Without randomization: the doctor hand-picks.", zh: "沒有隨機分派：醫師自行挑選。",
        den: "Now the doctor decides who gets the new treatment and, often without meaning to, picks patients who look healthier. All 6 high-risk patients end up in the control group.",
        dzh: "現在由醫師決定誰接受新治療，而且常常不自覺地挑選看起來較健康的病人。6 位高風險病人全部落在對照組。" },
      { t: 14.1, hold: 17.8, en: "Consequence: selection bias.", zh: "後果：選樣偏差。",
        den: "High-risk patients do worse whatever they receive. With all of them in the control group, there are 6 poor outcomes in control and 0 with treatment. A useless drug looks effective. The difference comes from who was selected into which group, not from the drug: selection bias. Randomization stops investigators from influencing treatment assignment, and balances even unmeasured confounders.",
        dzh: "高風險病人無論接受什麼治療，結果都比較差。他們全在對照組，於是對照組有 6 個不良結果、治療組 0 個。無效的藥物看起來有效。差異來自誰被選進哪一組，而不是藥物：這是選樣偏差。隨機分派讓研究者無法影響治療分派，也能平衡未測量的干擾因子。" }
    ],
    build(svg, h) {
      const red = [1, 4, 6, 9, 12, 14];
      const coinArm = [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1];        // 1 = treatment
      const pickT = [0, 2, 3, 5, 7, 8, 10, 13];                                  // doctor's choice for treatment
      const topX = i => 40 + i * 37.3, TOPY = 62;
      box(h, 25, 118, 285, 132, "var(--a)"); box(h, 330, 118, 285, 132, "var(--b)");
      h.label(svg, 167, 110, "Treatment", "治療組", { fill: "var(--a)" });
      h.label(svg, 472, 110, "Control", "對照組", { fill: "var(--b)" });
      const cT = h.text(svg, 290, 140, { "text-anchor": "end", fill: "var(--bad)" }), cC = h.text(svg, 595, 140, { "text-anchor": "end", fill: "var(--bad)" });
      const slot = (arm, j) => [(arm ? 25 : 330) + 50 + (j % 4) * 62, 175 + Math.floor(j / 4) * 52];
      const coinSlots = [], pickSlots = [];
      let a = 0, b = 0; coinArm.forEach((arm, i) => { coinSlots[i] = arm ? slot(1, a++) : slot(0, b++); });
      a = 0; b = 0; for (let i = 0; i < 16; i++) { const arm = pickT.includes(i); pickSlots[i] = arm ? slot(1, a++) : slot(0, b++); }
      const P = [...Array(16)].map((_, i) => { const g = h.person(svg, "var(--muted)"); const d = diamond(h, g); return { g, d }; });
      const verdict = h.text(svg, 320, 40, { "font-size": 18, fill: "var(--bad)" });
      const coin = h.el("g", {}); h.el("ellipse", { cx: 0, cy: 0, rx: 11, ry: 11, fill: "var(--b)", stroke: "var(--ink)", "stroke-width": 1.5 }, coin);
      return t => {
        let redOp = t < 6.2 ? 0 : h.seg(t, 6.3, 7);
        const cur = Math.floor((t - 0.3) / 0.33);
        coin.setAttribute("opacity", t > 0.3 && t < 5.6 ? 1 : 0);
        if (cur >= 0 && cur < 16) {
          coin.setAttribute("transform", `translate(${topX(cur)},28) scale(${Math.abs(Math.cos(t * 18)).toFixed(2)},1)`);
          coin.firstChild.setAttribute("fill", coinArm[cur] ? "var(--a)" : "var(--b)");
        }
        P.forEach((p, i) => {
          let x, y, inArm = null;
          if (t < 8.6) {
            const k = h.ease(h.seg(t, 0.3 + i * 0.33, 0.75 + i * 0.33));
            x = h.lerp(topX(i), coinSlots[i][0], k); y = h.lerp(TOPY, coinSlots[i][1], k); if (k > 0.5) inArm = coinArm[i];
          } else {
            const back = h.ease(h.seg(t, 8.7, 9.4)), go = h.ease(h.seg(t, 9.6 + i * 0.25, 10.05 + i * 0.25));
            const bx = h.lerp(coinSlots[i][0], topX(i), back), by = h.lerp(coinSlots[i][1], TOPY, back);
            x = h.lerp(bx, pickSlots[i][0], go); y = h.lerp(by, pickSlots[i][1], go);
            inArm = go > 0.5 ? (pickT.includes(i) ? 1 : 0) : back < 0.5 ? coinArm[i] : null;
          }
          h.at(p.g, x, y, 1.15);
          p.g.setAttribute("fill", inArm === null ? "var(--muted)" : inArm ? "var(--a)" : "var(--b)");
          p.d.setAttribute("opacity", red.includes(i) ? redOp : 0);
        });
        const showCount = (t > 6.4 && t < 8.6) || (t > 13.6 && t < 14.1);
        const nT = t > 13.6 ? 0 : 3, nC = t > 13.6 ? 6 : 3;
        cT.textContent = showCount ? h.L(`at risk: ${nT}`, `高風險：${nT}`) : "";
        cC.textContent = showCount ? h.L(`at risk: ${nC}`, `高風險：${nC}`) : "";
        if (t >= 14.1) {
          let bad = 0;
          P.forEach((p, i) => { if (red.includes(i)) { const k = h.seg(t, 14.4 + red.indexOf(i) * 0.4, 14.7 + red.indexOf(i) * 0.4); if (k > 0.5) { p.g.setAttribute("fill", "var(--bad)"); bad++; } } });
          cT.textContent = h.L("poor outcomes: 0 of 8", "不良結果：0／8");
          cC.textContent = h.L(`poor outcomes: ${bad} of 8`, `不良結果：${bad}／8`);
          verdict.textContent = t > 16.9 ? h.L("The drug looks great, but this is selection bias", "藥物看起來很好，但這是選樣偏差") : "";
        } else verdict.textContent = "";
      };
    }
  };

  /* 2. Concealment vs blinding, done right and done wrong */
  L["concealment-blinding"] = {
    dur: 37,
    scenes: [
      { t: 0, hold: 2.2, en: "Allocation concealment: the next assignment is sealed.", zh: "分派隱匿：下一個分派是密封的。",
        den: "Assignments come in sealed, opaque envelopes (or from a central computer). The recruiter cannot know what the next patient will get, so cannot influence who is enrolled.",
        dzh: "分派結果裝在密封、不透光的信封裡（或由中央電腦產生）。招募者無法得知下一位病人會分到什麼，因此無法影響誰被納入。" },
      { t: 2.6, hold: 5.6, en: "The envelope is opened only after enrolment.", zh: "病人納入後才打開信封。",
        den: "The patient is enrolled first; only then is the envelope opened and the treatment revealed. Enrolment decisions cannot depend on the assignment.",
        dzh: "先納入病人，之後才打開信封揭曉治療。是否納入的決定不可能受分派結果影響。" },
      { t: 6.2, hold: 8.8, en: "Concealment fails: the recruiter can see what's next.", zh: "分派隱匿失敗：招募者看得到下一個分派。",
        den: "Now the allocation list is visible (or the envelopes are see-through). The recruiter knows whether the next slot is the new drug (A) or the old one (B).",
        dzh: "現在分派清單看得到（或信封是透明的）。招募者知道下一個名額是新藥（A）還是舊藥（B）。" },
      { t: 9, hold: 18.6, en: "Frail patients are steered away from the new drug.", zh: "虛弱的病人被引導避開新藥。",
        den: "Watch the frail patients (red diamonds). When the next slot is A, the recruiter tells them to come back later, then enrols them when a B slot comes up. Healthy-looking patients get A.",
        dzh: "注意虛弱的病人（紅色菱形）。當下一個名額是 A 時，招募者請他們晚點再來，等到 B 的名額才納入。看起來健康的病人則拿到 A。" },
      { t: 18.8, hold: 23.6, en: "Consequence: selection bias.", zh: "後果：選樣偏差。",
        den: "The new-drug group started out healthier, so even a useless drug looks better (75% vs 25% recovered). Because the recruiter could influence who received which drug, the groups are no longer comparable in prognosis. Allocation concealment prevents this selection bias.",
        dzh: "新藥組一開始就比較健康，即使藥物無效也看起來比較好（康復 75% 對 25%）。因為招募者能影響誰拿到哪種藥，兩組的預後不再可比較。分派隱匿就是用來預防這種選樣偏差。" },
      { t: 23.8, hold: 26.6, en: "Blinding: identical pills, nobody knows.", zh: "盲性作業：藥丸相同，沒有人知道。",
        den: "After randomization, the pills look identical. Patients, doctors and outcome assessors cannot tell who is taking the new drug, so their expectations cannot affect the results.",
        dzh: "隨機分派後，藥丸外觀完全相同。病人、醫師和結果評估者都分不出誰在吃新藥，他們的期待就不會影響結果。" },
      { t: 26.9, hold: 29.6, en: "Blinding fails: everyone knows who got what.", zh: "盲性作業失敗：每個人都知道誰拿到什麼。",
        den: "Here the pills are labelled. The patients and the assessor know who is on the new drug (A) and who is on the old one (B).",
        dzh: "這裡藥丸有標示。病人和評估者都知道誰吃新藥（A）、誰吃舊藥（B）。" },
      { t: 29.8, hold: 32.9, en: "Patients know: biased self-reports.", zh: "病人知道：自我回報出現偏差。",
        den: "The dashed outlines are everyone's true score, identical in both groups. Patients who know they got the new drug expect to improve and report feeling better; those on the old drug report feeling worse. The information gathered now depends on the group.",
        dzh: "虛線框是每個人的真實分數，兩組完全相同。知道自己吃新藥的病人期待改善，回報感覺較好；吃舊藥的人則回報感覺較差。收集到的資訊開始因組別而異。" },
      { t: 33.1, hold: 36.6, en: "The assessor knows: observation (ascertainment) bias.", zh: "評估者知道：觀察（確認）偏差。",
        den: "The assessor rates the new-drug group more generously and the old-drug group more harshly. This is observation bias, also called ascertainment bias. Together with the biased self-reports, it is information bias: how the outcome is measured differs by group, although the true difference is 0.",
        dzh: "評估者給新藥組較寬鬆的分數、舊藥組較嚴格的分數。這是觀察偏差，又稱確認偏差。連同偏差的自我回報，都屬於訊息偏差：結果的測量方式因組別而異，但真實差異是 0。" }
    ],
    build(svg, h) {
      const s1 = h.el("g", {}), s3 = h.el("g", {}), s2 = h.el("g", {}), s4 = h.el("g", {});
      /* --- 1. proper concealment --- */
      const env = [0, 1, 2].map(() => { const g = h.el("g", {}, s1); h.el("rect", { x: -34, y: -22, width: 68, height: 44, rx: 4, fill: "var(--surface)", stroke: "var(--ink)", "stroke-width": 2 }, g); return g; });
      const top = env[2];
      const flap = h.el("path", { d: "M-34,-22 L0,4 L34,-22", fill: "none", stroke: "var(--ink)", "stroke-width": 2 }, top);
      const letter = h.text(top, 0, 12, { "font-size": 22, fill: "var(--a)", opacity: 0 }); letter.textContent = "A";
      env.forEach((g, k) => h.at(g, 110 + k * 6, 140 - k * 6));
      h.label(s1, 116, 185, "sealed envelopes", "密封信封", { "font-size": 13, fill: "var(--muted)" });
      const rec = h.person(s1, "var(--ink)"); h.at(rec, 300, 150, 1.6);
      h.label(s1, 300, 200, "Recruiter", "招募者", { "font-size": 13 });
      const q = h.text(s1, 300, 105, { "font-size": 26, fill: "var(--bad)" }); q.textContent = "?";
      const pat = h.person(s1, "var(--muted)");
      s1.appendChild(box(h, 450, 70, 160, 150, "var(--a)"));
      h.label(s1, 530, 62, "Treatment", "治療組", { fill: "var(--a)" });

      /* --- 3-5. broken concealment --- */
      const REC = [330, 128], WAIT = [215, 128];
      s3.appendChild(box(h, 430, 22, 196, 100, "var(--a)")); s3.appendChild(box(h, 430, 140, 196, 100, "var(--b)"));
      h.label(s3, 528, 44, "A: new drug", "A：新藥", { fill: "var(--a)", "font-size": 14 });
      h.label(s3, 528, 162, "B: old drug", "B：舊藥", { fill: "var(--b)", "font-size": 14 });
      const rec3 = h.person(s3, "var(--ink)"); h.at(rec3, REC[0], REC[1], 1.6);
      h.label(s3, REC[0], 172, "Recruiter", "招募者", { "font-size": 13 });
      const card = h.el("g", {}, s3);
      h.el("rect", { x: -32, y: -24, width: 64, height: 44, rx: 6, fill: "var(--surface)", stroke: "var(--bad)", "stroke-width": 2, "stroke-dasharray": "5 3" }, card);
      const cardL = h.text(card, 0, 10, { "font-size": 26 });
      h.at(card, REC[0], 52);
      card.appendChild(h.label(s3, 0, -32, "next slot (visible!)", "下一個名額（看得到！）", { "font-size": 12, fill: "var(--bad)" }));
      const waitL = h.label(s3, WAIT[0], 98, "“come back later”", "「晚點再來」", { "font-size": 12, fill: "var(--bad)" });
      const nope = h.text(s3, REC[0] + 34, REC[1] - 18, { "font-size": 26, fill: "var(--bad)" }); nope.textContent = "✗";
      const frail = [0, 3, 4, 6];
      const Q = [...Array(8)].map((_, i) => { const g = h.person(s3, "var(--muted)"); const d = diamond(h, g); d.setAttribute("opacity", frail.includes(i) ? 1 : 0); const ok = h.text(g, 0, -26, { "font-size": 16, fill: "var(--good)" }); return { g, ok }; });
      const qpos = i => [40 + i * 30, 228];
      const E = [[0, "W", "A"], [1, "A", "A"], [0, "B", "B"], [2, "A", "A"], [3, "B", "B"], [4, "W", "A"], [5, "A", "A"], [4, "B", "B"], [6, "W", "A"], [7, "A", "A"], [6, "B", "B"]];
      const T0 = 9.1, ED = 0.85;
      let na = 0, nb = 0; const dest = E.map(([p, d]) => d === "A" ? [470 + (na++) * 42, 102] : d === "B" ? [470 + (nb++) * 42, 220] : WAIT);
      const recovered = [1, 2, 5, 3];
      const bars = h.el("g", {}, s3);
      const barA = h.el("rect", { x: 40, y: 50, height: 22, rx: 4, fill: "var(--a)" }, bars), barB = h.el("rect", { x: 40, y: 100, height: 22, rx: 4, fill: "var(--b)" }, bars);
      h.label(bars, 40, 42, "Recovered: new drug", "康復：新藥", { "text-anchor": "start", "font-size": 13 });
      h.label(bars, 40, 92, "Recovered: old drug", "康復：舊藥", { "text-anchor": "start", "font-size": 13 });
      const pA = h.text(bars, 0, 67, { "text-anchor": "start", "font-size": 16 }), pB = h.text(bars, 0, 117, { "text-anchor": "start", "font-size": 16 });
      const selB = h.text(s3, 150, 158, { "font-size": 15, fill: "var(--bad)" });
      dagDefs(h, "mkC");
      const dg = h.el("g", {}, s3);
      const nP = node(h, dg, 160, 185, "Prognosis", "預後", { w: 96 }), nT = node(h, dg, 72, 243, "Drug received", "接受的藥物", { w: 112 }), nY = node(h, dg, 258, 243, "Recovery", "康復", { w: 84 });
      const aPT = arrow(h, dg, nP, nT, { marker: "mkC", color: "var(--bad)" }), aPY = arrow(h, dg, nP, nY, { marker: "mkC" });
      const aTY = arrow(h, dg, nT, nY, { marker: "mkC", color: "var(--muted)", dash: "5 5", w: 2 });

      /* --- 6. proper blinding --- */
      const bottle = h.el("g", {}, s2);
      h.el("rect", { x: -26, y: -40, width: 52, height: 70, rx: 8, fill: "var(--paper)", stroke: "var(--ink)", "stroke-width": 2 }, bottle);
      h.label(bottle, 0, 2, "A or B?", "A 或 B？", { "font-size": 12 });
      h.at(bottle, 90, 150);
      const pills = [0, 1].map(() => { const g = h.el("g", {}, s2); h.el("rect", { x: -14, y: -6, width: 28, height: 12, rx: 6, fill: "var(--muted)" }, g); return g; });
      const who = [["Patient", "病人", 300], ["Doctor", "醫師", 430], ["Assessor", "評估者", 560]];
      const qs = who.map(([en, zh, x]) => { const g = h.person(s2, "var(--ink)"); h.at(g, x, 160, 1.6); h.label(s2, x, 210, en, zh, { "font-size": 13 }); const qq = h.text(s2, x, 112, { "font-size": 26, fill: "var(--bad)" }); qq.textContent = "?"; return qq; });

      /* --- 7-8. broken blinding --- */
      const arms = ["A", "A", "B", "B"], PX = [100, 200, 300, 400], BASE = 196, TRUE = 70;
      const pts = arms.map((arm, i) => {
        const g = h.person(s4, arm === "A" ? "var(--a)" : "var(--b)"); h.at(g, PX[i], 225, 1.4);
        const pl = h.el("g", {}, s4); h.el("rect", { x: -14, y: -9, width: 28, height: 18, rx: 9, fill: arm === "A" ? "var(--a)" : "var(--b)" }, pl);
        const tl = h.text(pl, 0, 5, { "font-size": 12, fill: "#fff" }); tl.textContent = arm; tl.setAttribute("style", "stroke:none");
        h.at(pl, PX[i] + 26, 232);
        const out = h.el("rect", { x: PX[i] - 18, width: 36, y: BASE - TRUE, height: TRUE, fill: "none", stroke: "var(--ink)", "stroke-width": 1.5, "stroke-dasharray": "4 3" }, s4);
        const fill = h.el("rect", { x: PX[i] - 16, width: 32, rx: 3, fill: arm === "A" ? "var(--a)" : "var(--b)", opacity: 0.85 }, s4);
        const val = h.text(s4, PX[i], 0, { "font-size": 13 });
        return { out, fill, val, arm };
      });
      const ass = h.person(s4, "var(--ink)"); h.at(ass, 560, 200, 1.6);
      h.label(s4, 560, 245, "Assessor", "評估者", { "font-size": 13 });
      const bub = h.label(s4, 560, 150, "“A is the new drug!”", "「A 是新藥！」", { "font-size": 13, fill: "var(--bad)" });
      const legend = h.label(s4, 250, 24, "dashed = true score   filled = recorded score", "虛線 = 真實分數　實心 = 記錄分數", { "font-size": 12, fill: "var(--muted)" });
      const perfL = h.text(s4, 150, 48, { "font-size": 13, fill: "var(--a)" }), detL = h.label(s4, 560, 150, "“I'll score generously…”", "「分數給寬鬆一點……」", { "font-size": 12, fill: "var(--bad)" });
      const infoB = h.text(s4, 540, 52, { "font-size": 15, fill: "var(--bad)" });
      const infoB2 = h.text(s4, 540, 74, { "font-size": 14, fill: "var(--bad)" });
      const infoB3 = h.text(s4, 540, 94, { "font-size": 13, fill: "var(--muted)" });

      function posOf(p, t) {
        let cur = qpos(p);
        for (let k = 0; k < E.length; k++) {
          if (E[k][0] !== p) continue;
          const s0 = T0 + k * ED;
          if (t < s0) return cur;
          const f = (t - s0) / ED;
          if (f < 1) {
            if (f < 0.45) { const e = h.ease(f / 0.45); return [h.lerp(cur[0], REC[0] - 30, e), h.lerp(cur[1], REC[1], e)]; }
            const e = h.ease((f - 0.45) / 0.55); return [h.lerp(REC[0] - 30, dest[k][0], e), h.lerp(REC[1], dest[k][1], e)];
          }
          cur = dest[k];
        }
        return cur;
      }
      return t => {
        s1.setAttribute("opacity", t < 6.2 ? 1 - h.seg(t, 5.8, 6.2) : 0);
        s3.setAttribute("opacity", t >= 6.2 && t < 23.8 ? Math.min(h.seg(t, 6.2, 6.6), 1 - h.seg(t, 23.6, 23.8)) : 0);
        s2.setAttribute("opacity", t >= 23.8 && t < 26.9 ? Math.min(h.seg(t, 23.8, 24.1), 1 - h.seg(t, 26.6, 26.9)) : 0);
        s4.setAttribute("opacity", t >= 26.9 ? h.seg(t, 26.9, 27.3) : 0);
        if (t < 6.2) {
          const walk = h.ease(h.seg(t, 0.2, 1.6));
          h.at(pat, h.lerp(-20, 240, walk), 150, 1.6);
          q.setAttribute("opacity", t < 2.6 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 3)) : 0);
          const slide = h.ease(h.seg(t, 2.6, 3.3));
          h.at(top, h.lerp(122, 300, slide), h.lerp(128, 60, slide));
          const open = h.seg(t, 3.4, 3.9);
          flap.setAttribute("d", `M-34,-22 L0,${(4 - 52 * open).toFixed(1)} L34,-22`);
          letter.setAttribute("opacity", h.seg(t, 3.7, 4.0));
          const go = h.ease(h.seg(t, 4.2, 5.2));
          h.at(pat, h.lerp(240, 530, go), h.lerp(150, 160, go), 1.6);
          pat.setAttribute("fill", go > 0.3 ? "var(--a)" : "var(--muted)");
        } else if (t < 23.8) {
          const k = Math.max(0, Math.min(E.length - 1, Math.floor((t - T0) / ED)));
          const slot = t < T0 ? "A" : E[k][2];
          cardL.textContent = t > 18.6 ? "" : slot; cardL.setAttribute("fill", slot === "A" ? "var(--a)" : "var(--b)");
          const turning = t >= T0 && t < T0 + E.length * ED && E[k][1] === "W" && (t - T0 - k * ED) / ED > 0.35;
          nope.setAttribute("opacity", turning ? 1 : 0);
          waitL.setAttribute("opacity", turning ? 1 : 0);
          const res = t >= 18.8;
          Q.forEach((o, i) => {
            const [x, y] = posOf(i, t); h.at(o.g, x, y, 1.2);
            const placed = E.some(([p, d], j) => p === i && d !== "W" && t >= T0 + (j + 0.6) * ED);
            o.g.setAttribute("fill", placed ? (E.find(([p, d]) => p === i && d !== "W")[1] === "A" ? "var(--a)" : "var(--b)") : "var(--muted)");
            o.ok.textContent = res && t > 19.2 + recovered.indexOf(i) * 0.35 && recovered.includes(i) ? "✓" : "";
          });
          rec3.setAttribute("opacity", res ? 0.25 : 1); card.setAttribute("opacity", res ? 0 : 1);
          bars.setAttribute("opacity", res ? 1 : 0);
          const ka = h.ease(h.seg(t, 20.4, 21.4));
          barA.setAttribute("width", 200 * 0.75 * ka); barB.setAttribute("width", 200 * 0.25 * ka);
          pA.setAttribute("x", 46 + 200 * 0.75 * ka); pB.setAttribute("x", 46 + 200 * 0.25 * ka);
          pA.textContent = ka > 0.9 ? "75%" : ""; pB.textContent = ka > 0.9 ? "25%" : "";
          selB.textContent = t > 22.9 ? h.L("selection bias", "選樣偏差") : "";
          dg.setAttribute("opacity", t > 21.4 ? 1 : 0);
          aPT.draw(h.seg(t, 21.6, 22.2)); aPY.draw(h.seg(t, 22.2, 22.8)); aTY.draw(t > 21.4 ? 1 : 0);
          aTY.setAttribute("opacity", t > 21.4 ? 0.6 : 0);
        } else if (t < 26.9) {
          pills.forEach((g, k) => { const m = h.ease(h.seg(t, 24.1 + k * 0.5, 25.1 + k * 0.5)); h.at(g, h.lerp(90, k ? 345 : 255, m), 150 - Math.sin(m * Math.PI) * 60, 1.3); });
          qs.forEach((qq, k) => { qq.setAttribute("opacity", h.seg(t, 25.4 + k * 0.3, 25.7 + k * 0.3)); qq.setAttribute("transform", `translate(0,${(-6 * Math.abs(Math.sin(t * 4 + k))).toFixed(1)})`); });
        } else {
          bub.setAttribute("opacity", h.seg(t, 27.8, 28.4) * (t < 33.1 ? 1 : 0));
          detL.setAttribute("opacity", t > 33.3 ? 1 : 0);
          legend.setAttribute("opacity", t > 29.8 ? 1 : 0);
          const kOut = h.seg(t, 30, 30.6), kFill = h.ease(h.seg(t, 30.6, 31.3)), kP = h.ease(h.seg(t, 31.6, 32.7)), kD = h.ease(h.seg(t, 33.6, 35));
          pts.forEach(o => {
            const a = o.arm === "A";
            const hh = TRUE * kFill + (a ? 14 : -8) * kP + (a ? 16 : -10) * kD;
            o.out.setAttribute("opacity", kOut);
            o.fill.setAttribute("y", BASE - hh); o.fill.setAttribute("height", Math.max(0, hh));
            o.val.setAttribute("y", BASE - Math.max(hh, TRUE) - 6);
            const d = Math.round((a ? 14 : -8) * kP + (a ? 16 : -10) * kD);
            o.val.textContent = kP > 0.95 ? (d > 0 ? "+" + d : "−" + Math.abs(d)) : "";
            o.val.setAttribute("fill", a ? "var(--a)" : "var(--b)");
          });
          perfL.textContent = t > 32.2 ? h.L("patients report feeling better / worse", "病人回報感覺較好／較差") : "";
          perfL.setAttribute("x", 250);
          infoB.textContent = t > 32.4 && t < 33.1 ? h.L("biased self-reports", "自我回報偏差") : t > 35.2 ? h.L("+ observation bias", "+ 觀察偏差") : "";
          infoB2.textContent = t > 35.6 ? h.L("= information bias", "= 訊息偏差") : "";
          infoB3.textContent = t > 35.9 ? h.L("true difference: 0", "真實差異：0") : "";
        }
      };
    }
  };

  /* 3. ITT vs as-treated */
  L.itt = {
    dur: 22.5,
    scenes: [
      { t: 0, hold: 2.3, en: "Patients are randomized.", zh: "病人被隨機分派。",
        den: "Left: randomized to Drug A (blue). Right: randomized to current treatment (ochre). Because allocation was random, the two groups are comparable.",
        dzh: "左邊：隨機分派到藥物 A（藍色）。右邊：隨機分派到現行治療（黃褐色）。因為是隨機分派，兩組具可比較性。" },
      { t: 2.5, hold: 5.3, en: "Some switch treatment, often the sicker ones.", zh: "有些人換了治療，常常是比較虛弱的人。",
        den: "Three frail patients (red diamonds) cannot tolerate Drug A and switch to current treatment; one patient on the right gets Drug A instead. Switchers are not a random subset.",
        dzh: "三位虛弱的病人（紅色菱形）無法耐受藥物 A，改用現行治療；右邊有一位病人反而拿到藥物 A。換組的人並不是隨機的一群。" },
      { t: 5.6, hold: 8.8, en: "Intention-to-treat: analyse as randomized.", zh: "治療意向分析：依隨機分派的組別分析。",
        den: "ITT compares patients according to the original assignment, whatever they actually took. It preserves randomization and the comparability of the groups' prognostic profiles. The estimate may be diluted towards 1 (more conservative).",
        dzh: "ITT 依原始分派比較病人，不論他們實際接受什麼治療。它保留了隨機分派以及兩組預後特徵的可比較性；估計值可能被稀釋而趨向 1（較保守）。" },
      { t: 9, hold: 14.8, en: "As-treated: regroup by treatment received.", zh: "依實際治療分析：按實際接受的治療重新分組。",
        den: "As-treated compares patients according to the treatment they actually received. The frail switchers now sit in the current-treatment group: the analysis breaks and loses the benefits of randomization, and the groups are no longer comparable in prognosis.",
        dzh: "依實際治療分析依病人實際接受的治療比較。換組的虛弱病人現在都在現行治療組：這種分析破壞並失去隨機分派的好處，兩組的預後不再可比較。" },
      { t: 15, hold: 18.3, en: "Per-protocol: drop everyone who switched.", zh: "依計畫書分析：剔除所有換組的人。",
        den: "A per-protocol analysis keeps only patients who took the treatment they were assigned. Dropping people because of something that happened after randomization (here, frailty-related switching) changes who is retained in the analysis: selection bias, which is about how we select or retain participants.",
        dzh: "依計畫書分析只保留確實接受被分派治療的病人。因為隨機分派之後發生的事（此處為與虛弱有關的換組）而剔除病人，改變了誰被保留在分析中：這是選樣偏差，關乎我們如何選擇或保留受試者。" },
      { t: 18.5, hold: 22, en: "Three analyses, three answers.", zh: "三種分析，三種答案。",
        den: "The drug truly has no effect. ITT preserves randomization (RR 1.00). As-treated breaks randomization, so the groups differ in prognosis (RR 0.50). Per-protocol changes who is retained, introducing selection bias (RR 0.60).",
        dzh: "藥物其實沒有效果。ITT 保留隨機分派（RR 1.00）。依實際治療分析破壞隨機分派，兩組預後不同（RR 0.50）。依計畫書分析改變了誰被保留，造成選樣偏差（RR 0.60）。" }
    ],
    build(svg, h) {
      const fl = box(h, 25, 50, 285, 195, "var(--ink)", "6 5"), fr = box(h, 330, 50, 285, 195, "var(--ink)", "6 5");
      const lL = h.text(svg, 167, 40, {}), lR = h.text(svg, 472, 40, {});
      const slot = (side, j) => [(side ? 330 : 25) + 52 + (j % 5) * 46, 100 + Math.floor(j / 5) * 58];
      const sw = { 2: 1, 6: 1, 9: 1, 14: 0 };   // index -> side it moves to
      const P = [...Array(20)].map((_, i) => { const g = h.person(svg, i < 10 ? "var(--a)" : "var(--b)"); const d = diamond(h, g); return { g, d, side: i < 10 ? 0 : 1, j: i % 10 }; });
      const extra = { 2: 10, 6: 11, 9: 12, 14: 10 };
      const ov = h.el("g", {});
      h.el("rect", { x: 50, y: 70, width: 540, height: 130, rx: 12, fill: "var(--surface)", stroke: "var(--ink)", "stroke-width": 2 }, ov);
      const o1 = h.text(ov, 320, 108, { "font-size": 18 }), o2 = h.text(ov, 320, 143, { "font-size": 18, fill: "var(--bad)" }), o3 = h.text(ov, 320, 178, { "font-size": 18, fill: "var(--bad)" });
      return t => {
        const ok = h.seg(t, 18.6, 19);
        ov.setAttribute("opacity", t >= 18.5 ? ok : 0);
        o1.textContent = h.L("Intention-to-treat: RR 1.00 (unbiased)", "治療意向分析：RR 1.00（無偏差）");
        o2.textContent = t > 19.5 ? h.L("As-treated: RR 0.50 (randomization broken)", "依實際治療分析：RR 0.50（隨機分派被破壞）") : "";
        o3.textContent = t > 20.4 ? h.L("Per-protocol: RR 0.60 (selection bias)", "依計畫書分析：RR 0.60（選樣偏差）") : "";

        const ittFrame = t >= 5.6 && t < 9, atFrame = t >= 9;
        fl.setAttribute("stroke-width", ittFrame ? 3 + Math.sin(t * 6) : 2); fr.setAttribute("stroke-width", ittFrame ? 3 + Math.sin(t * 6) : 2);
        fl.setAttribute("stroke", atFrame ? "var(--a)" : "var(--ink)"); fr.setAttribute("stroke", atFrame ? "var(--b)" : "var(--ink)");
        if (t >= 15) { fl.setAttribute("stroke", "var(--a)"); fr.setAttribute("stroke", "var(--b)"); }
        lL.textContent = atFrame ? h.L("Received Drug A", "實際接受藥物 A") : h.L("Randomized to Drug A", "隨機分派至藥物 A");
        lR.textContent = atFrame ? h.L("Received current", "實際接受現行治療") : h.L("Randomized to current", "隨機分派至現行治療");
        lL.setAttribute("fill", atFrame ? "var(--a)" : "var(--ink)"); lR.setAttribute("fill", atFrame ? "var(--b)" : "var(--ink)");
        if (t >= 15) { lL.textContent = h.L("Took Drug A as assigned", "依分派接受藥物 A"); lR.textContent = h.L("Took current as assigned", "依分派接受現行治療"); }
        P.forEach((p, i) => {
          const appear = h.seg(t, 0.2 + i * 0.05, 0.6 + i * 0.05);
          let [x, y] = slot(p.side, p.j);
          const switcher = i in sw;
          const flipC = switcher ? h.seg(t, 2.8 + (i % 3) * 0.4, 3.2 + (i % 3) * 0.4) : 0;
          if (switcher) {
            p.g.setAttribute("fill", flipC > 0.5 ? (p.side === 0 ? "var(--b)" : "var(--a)") : (p.side === 0 ? "var(--a)" : "var(--b)"));
            p.d.setAttribute("opacity", p.side === 0 ? flipC : 0);
            const mv = t < 15 ? h.ease(h.seg(t, 9.4 + (i % 4) * 0.35, 10.6 + (i % 4) * 0.35)) : 1 - h.ease(h.seg(t, 15.2, 15.9));
            const [x2, y2] = slot(sw[i], extra[i]);
            x = h.lerp(x, x2, mv); y = h.lerp(y, y2, mv) - Math.sin(mv * Math.PI) * 40;
            if (t >= 15) { const out = h.ease(h.seg(t, 16.1 + (i % 4) * 0.3, 16.9 + (i % 4) * 0.3)); y += out * 120; }
          } else p.d.setAttribute("opacity", 0);
          const pulse = switcher && t > 2.8 && t < 5 ? 1 + 0.15 * Math.abs(Math.sin(t * 5)) : 1;
          const gone = switcher && t >= 15 ? 1 - h.seg(t, 16.3 + (i % 4) * 0.3, 16.9 + (i % 4) * 0.3) : 1;
          h.at(p.g, x, y, 1.25 * pulse * (0.4 + 0.6 * appear), appear * gone);
        });
      };
    }
  };

  /* 4. Power */
  L.power = {
    dur: 13,
    scenes: [
      { t: 0, hold: 5, en: "Small trial: wide, overlapping curves.", zh: "小型試驗：曲線寬且大幅重疊。",
        den: "Grey shows the results expected if the drug does nothing; blue, if it truly works. Each dot is one trial. Dots right of the dashed line are “significant”. Only 6 of 12 small trials detect the real effect; the other 6 are type II errors (false negatives).",
        dzh: "灰色是藥物無效時預期的結果；藍色是藥物真的有效時的結果。每個點代表一次試驗，落在虛線右邊為「顯著」。12 次小型試驗中只有 6 次偵測到真實效果，其餘 6 次是第二型錯誤（偽陰性）。" },
      { t: 5.2, hold: 6.7, en: "Add more participants.", zh: "增加受試者。",
        den: "A bigger sample estimates the effect more precisely, so both curves become narrower and overlap less. The significance line moves closer to zero.",
        dzh: "樣本越大，效果的估計越精確，兩條曲線都變窄、重疊減少，顯著線也更靠近 0。" },
      { t: 6.9, hold: 12.8, en: "Bigger trial: the effect is detected almost every time.", zh: "大型試驗：幾乎每次都偵測到效果。",
        den: "Now all 12 trials detect the effect. The probability of detecting a real effect is the power (1 − β). Power rises with sample size and with the size of the true effect.",
        dzh: "現在 12 次試驗全部偵測到效果。偵測到真實效果的機率就是檢定力（1 − β），它隨樣本數與真實效果大小增加而上升。" }
    ],
    build(svg, h) {
      const X = v => 40 + ((v + 3) / 9) * 560, YB = 215, D = 2.0;
      const Z = [-1.2, 0.4, -0.3, 1.1, -0.8, 0.2, 1.6, -1.6, 0.7, -0.1, 0.9, -0.5];
      h.el("line", { x1: 40, x2: 600, y1: YB, y2: YB, stroke: "var(--muted)" });
      const c0 = h.el("path", { fill: "var(--rule)", opacity: 0.6, stroke: "var(--muted)", "stroke-width": 2 });
      const c1 = h.el("path", { fill: "var(--a-soft)", opacity: 0.8, stroke: "var(--a)", "stroke-width": 2 });
      const crit = h.el("line", { y1: 30, y2: YB, stroke: "var(--ink)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      const critT = h.text(svg, 0, 24, { "text-anchor": "start", "font-size": 13 });
      h.label(svg, X(0), YB + 22, "no effect", "沒有效果", { "font-size": 13, fill: "var(--muted)" });
      h.label(svg, X(D), YB + 22, "true effect", "真實效果", { "font-size": 13, fill: "var(--a)" });
      const cnt = h.text(svg, 600, 52, { "text-anchor": "end", "font-size": 18 });
      const dots = Z.map(() => h.el("circle", { r: 7 }));
      const path = (m, se) => { const pk = 105 / Math.pow(se, 0.75); let d = `M40,${YB}`; for (let v = -3; v <= 6; v += 0.08) d += `L${X(v).toFixed(1)},${(YB - pk * Math.exp(-0.5 * ((v - m) / se) ** 2)).toFixed(1)}`; return d + `L600,${YB}Z`; };
      return t => {
        const se = t < 5.2 ? 1 : h.lerp(1, 0.5, h.ease(h.seg(t, 5.2, 6.7)));
        c0.setAttribute("d", path(0, se)); c1.setAttribute("d", path(D, se));
        const cx = X(1.96 * se);
        crit.setAttribute("x1", cx); crit.setAttribute("x2", cx);
        critT.setAttribute("x", cx + 6); critT.textContent = h.L("significant →", "顯著 →");
        const big = t >= 6.9, t0 = big ? 7.1 : 0.4;
        const bins = {}; let hits = 0, n = 0;
        dots.forEach((c, i) => {
          const obs = D + Z[i] * (big ? 0.5 : 1), px = X(obs), b = Math.round(px / 15);
          bins[b] = (bins[b] || 0) + 1;
          const y = YB - 8 - (bins[b] - 1) * 15;
          const k = h.seg(t, t0 + i * 0.38, t0 + i * 0.38 + 0.35);
          const hide = (!big && t > 5.2) ? 1 - h.seg(t, 5.2, 5.6) : 1;
          c.setAttribute("cx", (b * 15).toFixed(1)); c.setAttribute("cy", h.lerp(20, y, h.ease(k)).toFixed(1));
          c.setAttribute("opacity", (k > 0 ? 1 : 0) * hide);
          const hit = obs > 1.96 * (big ? 0.5 : 1);
          c.setAttribute("fill", hit ? "var(--a)" : "var(--b)");
          if (k >= 1 && hide > 0.5) { n++; if (hit) hits++; }
        });
        cnt.textContent = n ? h.L(`detected ${hits} of ${n}`, `偵測到 ${hits}／${n}`) : "";
      };
    }
  };

  /* 5. NNT */
  L.nnt = {
    dur: 14,
    scenes: [
      { t: 0, hold: 3.1, en: "Without treatment: 20 in 100 have a stroke.", zh: "沒有治療：每 100 人有 20 人中風。",
        den: "Each figure is one person in the untreated (control) group. The risk of stroke is 20 in 100 = 20%.",
        dzh: "每個人形代表未治療（對照）組的一個人。中風風險為 20／100 = 20%。" },
      { t: 3.3, hold: 5.9, en: "With treatment: 15 in 100.", zh: "接受治療：每 100 人有 15 人。",
        den: "In the treated group the risk is 15%. Relative risk = 15% ÷ 20% = 0.75: treatment lowers the risk by a quarter.",
        dzh: "治療組的風險是 15%。相對危險性 = 15% ÷ 20% = 0.75：治療讓風險降低四分之一。" },
      { t: 6.1, hold: 8.4, en: "Treatment spares 5 in every 100.", zh: "治療讓每 100 人中有 5 人免於中風。",
        den: "The green figures would have had a stroke without treatment. The absolute risk reduction is 20% − 15% = 5 percentage points.",
        dzh: "綠色的人若沒有治療就會中風。絕對風險降低 = 20% − 15% = 5 個百分點。" },
      { t: 8.6, hold: 13.8, en: "Treat 20 people to spare one: NNT = 20.", zh: "治療 20 人才能讓 1 人免於中風：NNT = 20。",
        den: "NNT = 1 ÷ absolute risk reduction = 1 ÷ 0.05 = 20. On average, 19 of every 20 treated people gain nothing from the treatment: they would have been fine anyway, or have a stroke regardless.",
        dzh: "NNT = 1 ÷ 絕對風險降低 = 1 ÷ 0.05 = 20。平均每治療 20 人，有 19 人沒有從治療中獲益：他們本來就不會中風，或治療了仍然中風。" }
    ],
    build(svg, h) {
      h.label(svg, 152, 30, "Untreated", "未治療", { fill: "var(--b)" });
      h.label(svg, 487, 30, "Treated", "治療組", { fill: "var(--a)" });
      const grid = x0 => [...Array(100)].map((_, i) => { const g = h.person(svg, "var(--rule)"); h.at(g, x0 + (i % 10) * 25, 58 + Math.floor(i / 10) * 17.5, 0.55); return g; });
      const A = grid(40), B = grid(375);
      const row = [...Array(20)].map((_, i) => { const g = h.person(svg, "var(--rule)"); return g; });
      const nntT = h.text(svg, 320, 238, { "font-size": 24 });
      return t => {
        const fade = t > 8.6 ? 1 - 0.8 * h.seg(t, 8.6, 9.1) : 1;
        A.forEach((g, i) => { g.setAttribute("fill", i < 20 && t > 0.3 + i * 0.13 ? "var(--bad)" : "var(--rule)"); g.setAttribute("opacity", fade); });
        B.forEach((g, i) => {
          let f = "var(--rule)", s = 0.55;
          if (i < 15 && t > 3.4 + i * 0.15) f = "var(--bad)";
          if (i >= 15 && i < 20 && t > 6.2 + (i - 15) * 0.3) { f = "var(--good)"; s = 0.55 * (1 + 0.35 * Math.max(0, Math.sin((t - 6.2 - (i - 15) * 0.3) * 6)) * (t < 8.4 ? 1 : 0)); }
          g.setAttribute("fill", f); g.setAttribute("transform", `translate(${375 + (i % 10) * 25},${58 + Math.floor(i / 10) * 17.5}) scale(${s.toFixed(2)})`); g.setAttribute("opacity", fade);
        });
        row.forEach((g, i) => {
          const on = h.seg(t, 9 + i * 0.16, 9.2 + i * 0.16);
          const last = i === 19, pop = last && t > 12.4 ? 1.6 + 0.2 * Math.sin(t * 7) : 1.3;
          h.at(g, 54 + i * 28, 140, pop * (0.5 + 0.5 * on), t > 8.8 ? 1 : 0);
          g.setAttribute("fill", last && t > 12.4 ? "var(--good)" : on > 0.5 ? "var(--muted)" : "var(--rule)");
        });
        nntT.textContent = t > 12.4 ? "NNT = 20" : "";
        nntT.setAttribute("fill", "var(--good)");
      };
    }
  };

  /* 6. Diagnostic test / PPV */
  L.diagnostic = {
    dur: 14,
    scenes: [
      { t: 0, hold: 2.6, en: "100 people are tested; 5 have the disease.", zh: "100 人接受檢測，其中 5 人有病。",
        den: "Prevalence is 5%. Blue = has the disease, ochre = healthy. The test has 80% sensitivity and about 90% specificity, which sounds good.",
        dzh: "盛行率為 5%。藍色 = 有病，黃褐色 = 健康。檢測的靈敏度 80%、特異度約 90%，聽起來不錯。" },
      { t: 2.8, hold: 6.3, en: "The test flags positives.", zh: "檢測標出陽性者。",
        den: "It correctly flags 4 of the 5 sick people (true positives) and misses one (false negative). It also flags 10 of the 95 healthy people (false positives): 10% of a big group is a lot of people.",
        dzh: "它正確標出 5 位病人中的 4 位（真陽性），漏掉 1 位（偽陰性）。它也標出 95 位健康者中的 10 位（偽陽性）：一大群人的 10% 是很多人。" },
      { t: 6.5, hold: 9.3, en: "Gather everyone who tested positive.", zh: "把所有檢測陽性的人集合起來。",
        den: "From the patient's point of view the question is: I tested positive, so how likely is it that I am really sick?",
        dzh: "從病人的角度，問題是：我檢測陽性，那我真的有病的機率是多少？" },
      { t: 9.5, hold: 13.8, en: "Only 4 of 14 positives are sick: PPV ≈ 29%.", zh: "14 位陽性者中只有 4 位有病：陽性預測值約 29%。",
        den: "Positive predictive value = true positives ÷ all positives = 4 ÷ 14. When a disease is rare, false positives can outnumber true positives even with a good test.",
        dzh: "陽性預測值 = 真陽性 ÷ 所有陽性 = 4 ÷ 14。當疾病罕見時，即使檢測很好，偽陽性也可能多於真陽性。" }
    ],
    build(svg, h) {
      const sick = [7, 23, 48, 66, 91], tp = [7, 23, 48, 91], fp = [3, 15, 31, 40, 52, 59, 74, 80, 88, 97];
      const pos = tp.concat(fp);
      const xy = i => [52 + (i % 20) * 28, 52 + Math.floor(i / 20) * 30];
      const scan = h.el("rect", { y: 30, width: 6, height: 150, fill: "var(--ink)", opacity: 0.25, rx: 3 });
      const P = [...Array(100)].map((_, i) => { const g = h.el("g", {}); const ring = h.el("circle", { cx: 0, cy: -2, r: 13, fill: "none", stroke: "var(--ink)", "stroke-width": 2.5, opacity: 0 }, g); const p = h.person(g, "var(--rule)"); return { g, ring, p }; });
      const big = h.text(svg, 320, 205, { "font-size": 22 });
      return t => {
        const sx = h.lerp(30, 610, h.seg(t, 2.9, 5.6));
        scan.setAttribute("x", sx); scan.setAttribute("opacity", t > 2.9 && t < 5.8 ? 0.25 : 0);
        let k = 0;
        P.forEach((o, i) => {
          const [x0, y0] = xy(i), isSick = sick.includes(i), pi = pos.indexOf(i), isPos = pi >= 0;
          o.p.setAttribute("fill", isSick && t > 1.2 ? "var(--a)" : t > 1.2 || isSick ? "var(--b-soft)" : "var(--rule)");
          if (isSick && t > 1.2) o.p.setAttribute("fill", "var(--a)"); else o.p.setAttribute("fill", "var(--b)");
          o.p.setAttribute("opacity", t > 1.2 ? 1 : 0.55);
          if (t <= 1.2) o.p.setAttribute("fill", "var(--muted)");
          o.ring.setAttribute("opacity", isPos && sx > x0 ? 1 : 0);
          const mv = isPos ? h.ease(h.seg(t, 6.6 + pi * 0.1, 7.6 + pi * 0.1)) : 0;
          const x1 = 115 + pi * 30, y1 = 240;
          const dim = !isPos && t > 6.6 ? 1 - 0.7 * h.seg(t, 6.6, 7.2) : 1;
          h.at(o.g, h.lerp(x0, x1, mv), h.lerp(y0, y1, mv), 0.85 * h.seg(t, i * 0.008, i * 0.008 + 0.4), dim);
          k++;
        });
        big.textContent = t > 9.6 ? h.L("4 truly sick ÷ 14 positive ≈ 29%", "4 位真的有病 ÷ 14 位陽性 ≈ 29%") : "";
      };
    }
  };

  /* 7. Sequential vs simultaneous testing */
  L["multiple-tests"] = {
    dur: 18,
    scenes: [
      { t: 0, hold: 8.1, en: "Sequential: only people positive on A take test B.", zh: "序列檢測：只有 A 陽性者才做 B。",
        den: "20 people, 4 of them sick (blue). Anyone negative on test A stops and is called negative. Only A-positives go on to test B, and you must be positive on both to be called positive.",
        dzh: "20 人中有 4 人有病（藍色）。A 陰性者就停止並判為陰性；只有 A 陽性者接著做 B，兩項都陽性才判為陽性。" },
      { t: 8.2, hold: 8.6, en: "Result: 1 false alarm, but 1 case missed.", zh: "結果：1 個假警報，但漏掉 1 位病人。",
        den: "Requiring two positives removes most false positives (net specificity rises), but a sick person who fails either test is missed (net sensitivity falls). It also saves tests, because B is only given to A-positives.",
        dzh: "要求兩項都陽性可去除大部分偽陽性（淨特異度上升），但只要任一項沒抓到，病人就會被漏掉（淨靈敏度下降）。由於只有 A 陽性者才做 B，也能節省檢測。" },
      { t: 9, hold: 15.6, en: "Simultaneous: everyone takes both tests.", zh: "同時檢測：每個人都做兩項檢測。",
        den: "Now anyone positive on A or B is called positive. A sick person only needs to be caught by one of the two tests.",
        dzh: "現在 A 或 B 任一項陽性即判為陽性，病人只要被其中一項抓到就好。" },
      { t: 16, hold: 17.9, en: "Result: every case caught, but 6 false alarms.", zh: "結果：所有病人都被抓到，但有 6 個假警報。",
        den: "Net sensitivity rises and net specificity falls. Useful when missing a case is dangerous, for example in emergency settings.",
        dzh: "淨靈敏度上升、淨特異度下降。適用於漏掉病例很危險的情境，例如急診。" }
    ],
    build(svg, h) {
      const sick = [2, 7, 12, 17];
      const aPos = [2, 7, 12, 17, 0, 9, 15, 19], bPosSeq = [2, 7, 17, 9];
      const eitherPos = [2, 7, 12, 17, 0, 9, 15, 19, 5, 14];
      const LANE = 120;
      const gates = h.el("g", {});
      const gate = (x, lab, en, zh) => { const g = h.el("g", {}, gates); h.el("rect", { x: x - 5, y: LANE - 45, width: 10, height: 90, rx: 4, fill: "var(--ink)" }, g); const tt = h.label(g, x, LANE - 52, en, zh, { "font-size": 14 }); return g; };
      const gA = gate(230, "A", "Test A", "檢測 A"), gB = gate(420, "B", "Test B", "檢測 B"), gAB = gate(320, "AB", "A and B", "A 與 B");
      h.label(svg, 570, 40, "Positive", "陽性", { fill: "var(--ink)" });
      h.label(svg, 120, 205, "Negative", "陰性", { fill: "var(--muted)", "text-anchor": "start" });
      h.el("line", { x1: 500, x2: 640, y1: 50, y2: 50, stroke: "var(--rule)", "stroke-width": 2 });
      const res = h.text(svg, 632, 190, { "font-size": 15, "text-anchor": "end" });
      const P = [...Array(20)].map((_, i) => h.person(svg, sick.includes(i) ? "var(--a)" : "var(--b)"));
      function path(i, t, seq) {
        const s = (seq ? 0.3 : 9.3) + i * 0.27;
        const pts = seq ? (aPos.includes(i) ? (bPosSeq.includes(i) ? ["A", "B", "P"] : ["A", "B", "N"]) : ["A", "N"]) : (eitherPos.includes(i) ? ["AB", "P"] : ["AB", "N"]);
        const xs = { A: 230, B: 420, AB: 320 };
        const posOrder = (seq ? [2, 7, 9, 17] : eitherPos).indexOf(i), negList = [...Array(20).keys()].filter(j => seq ? !bPosSeq.includes(j) : !eitherPos.includes(j)), negOrder = negList.indexOf(i);
        const target = k => k === "P" ? [520 + (posOrder % 4) * 28, 78 + Math.floor(posOrder / 4) * 30] : k === "N" ? [130 + (negOrder % 16) * 26, 232 + Math.floor(negOrder / 16) * 0] : [xs[k], LANE];
        let x = 20, y = LANE, tt = s;
        const legs = [[20, LANE]].concat(pts.map(target));
        const durs = pts.map(k => (k === "P" || k === "N" ? 0.6 : 1.0));
        if (t < s) return [20, LANE, 0];
        for (let k = 0; k < pts.length; k++) {
          const e = h.ease(h.seg(t, tt, tt + durs[k]));
          if (t < tt + durs[k]) return [h.lerp(legs[k][0], legs[k + 1][0], e), h.lerp(legs[k][1], legs[k + 1][1], e), 1];
          tt += durs[k];
        }
        const end = legs[legs.length - 1]; return [end[0], end[1], 1];
      }
      return t => {
        const seq = t < 9;
        gA.setAttribute("opacity", seq ? 1 : 0); gB.setAttribute("opacity", seq ? 1 : 0); gAB.setAttribute("opacity", seq ? 0 : 1);
        P.forEach((g, i) => { const [x, y, o] = path(i, t, seq); h.at(g, x, y, 1.1, o * (seq && t > 8.75 ? 1 - h.seg(t, 8.75, 9) : 1)); });
        res.textContent = (t > 7 && t < 9) ? h.L("3 sick + 1 healthy", "3 位有病 + 1 位健康") : t > 16 ? h.L("4 sick + 6 healthy", "4 位有病 + 6 位健康") : "";
      };
    }
  };

  /* 8. Kappa */
  L.kappa = {
    dur: 15,
    scenes: [
      { t: 0, hold: 3.4, en: "Two doctors rate the same 10 knees.", zh: "兩位醫師評估同樣 10 個膝蓋。",
        den: "Each doctor examines all 10 patients and records swollen (✓) or not swollen (✗), without seeing the other's rating.",
        dzh: "每位醫師各自檢查 10 位病人，記錄腫脹（✓）或不腫脹（✗），看不到對方的評估。" },
      { t: 3.6, hold: 6, en: "They agree on 8 of 10.", zh: "他們有 8／10 一致。",
        den: "Shaded columns are agreements. Observed agreement = 8 ÷ 10 = 0.80. But is 0.80 impressive?",
        dzh: "底色的欄位是一致的結果。觀察一致性 = 8 ÷ 10 = 0.80。但 0.80 真的很厲害嗎？" },
      { t: 6.2, hold: 9.6, en: "Coin-flippers would agree on about 5 by chance.", zh: "擲硬幣也會因機遇而有約 5 個一致。",
        den: "Each doctor said “swollen” half the time. Two people guessing at random with those rates agree half the time: expected agreement = 0.5 × 0.5 + 0.5 × 0.5 = 0.50.",
        dzh: "每位醫師都有一半的時候說「腫脹」。兩個人以相同比例亂猜，有一半時間會一致：期望一致性 = 0.5 × 0.5 + 0.5 × 0.5 = 0.50。" },
      { t: 9.8, hold: 14.8, en: "Kappa: agreement beyond chance.", zh: "Kappa：超越機遇的一致性。",
        den: "Of the 5 agreements that chance cannot explain (10 − 5), the doctors achieved 3 (8 − 5). κ = 3 ÷ 5 = 0.6, an intermediate-to-good level of agreement.",
        dzh: "在機遇無法解釋的 5 個一致中（10 − 5），醫師做到了 3 個（8 − 5）。κ = 3 ÷ 5 = 0.6，屬於中等至良好的一致性。" }
    ],
    build(svg, h) {
      const A = [1, 1, 0, 1, 0, 0, 1, 0, 1, 0], B = [1, 1, 0, 0, 0, 1, 1, 0, 1, 0];
      const cA = [1, 0, 0, 1, 1, 0, 1, 0, 0, 1], cB = [1, 1, 0, 0, 1, 0, 0, 1, 0, 1];
      const X = i => 100 + i * 46;
      h.label(svg, 20, 56, "Dr A", "醫師 A", { "text-anchor": "start", "font-size": 14 });
      h.label(svg, 20, 166, "Dr B", "醫師 B", { "text-anchor": "start", "font-size": 14 });
      const hl = [...Array(10)].map((_, i) => h.el("rect", { x: X(i) - 19, y: 28, width: 38, height: 152, rx: 8, fill: "var(--good)", opacity: 0 }));
      [...Array(10)].forEach((_, i) => h.at(h.person(svg, "var(--muted)"), X(i), 112, 1.1));
      const mk = y => [...Array(10)].map((_, i) => h.text(svg, X(i), y, { "font-size": 24 }));
      const mA = mk(60), mB = mk(170);
      const bar = h.el("g", {});
      const bx = 100, bw = 414, by = 205;
      h.el("rect", { x: bx, y: by, width: bw, height: 18, rx: 4, fill: "var(--paper)", stroke: "var(--rule)" }, bar);
      const r1 = h.el("rect", { x: bx, y: by, height: 18, rx: 4, fill: "var(--muted)" }, bar);
      const r2 = h.el("rect", { y: by, height: 18, fill: "var(--a)" }, bar);
      const bl = h.text(bar, bx + bw + 8, by + 15, { "text-anchor": "start", "font-size": 16 });
      const lc = h.text(bar, bx, by + 38, { "text-anchor": "start", "font-size": 12, fill: "var(--muted)" });
      const cnt = h.text(svg, 307, 230, { "font-size": 20 });
      return t => {
        const coins = t >= 6.2 && t < 9.8;
        const flipK = coins ? Math.abs(Math.cos(Math.min(1, (t - 6.2) / 0.6) * Math.PI)) : 1;
        let agree = 0;
        for (let i = 0; i < 10; i++) {
          const a = coins ? cA[i] : A[i], b = coins ? cB[i] : B[i];
          const showA = t > 0.3 + i * 0.15, showB = t > 1.9 + i * 0.15;
          mA[i].textContent = showA ? (a ? "✓" : "✗") : ""; mB[i].textContent = showB ? (b ? "✓" : "✗") : "";
          mA[i].setAttribute("fill", a ? "var(--a)" : "var(--muted)"); mB[i].setAttribute("fill", b ? "var(--a)" : "var(--muted)");
          mA[i].setAttribute("transform", `translate(${X(i)},0) scale(${coins ? flipK.toFixed(2) : 1},1) translate(${-X(i)},0)`);
          mB[i].setAttribute("transform", mA[i].getAttribute("transform"));
          const on = a === b && ((t > 3.7 + i * 0.12 && t < 6.1) || (t > 6.9 + i * 0.12 && t < 9.7) || t > 9.9);
          hl[i].setAttribute("opacity", on ? 0.18 : 0);
          if (a === b) agree++;
        }
        cnt.textContent = (t > 4.9 && t < 6.1) ? h.L("8 of 10 agree", "8／10 一致") : t > 8.3 && t < 9.7 ? h.L("5 of 10 agree by chance", "機遇造成 5／10 一致") : "";
        const k = h.ease(h.seg(t, 10, 11.5)), k2 = h.ease(h.seg(t, 11.6, 12.8));
        bar.setAttribute("opacity", t > 9.9 ? 1 : 0);
        r1.setAttribute("width", bw * 0.5 * k); r2.setAttribute("x", bx + bw * 0.5); r2.setAttribute("width", bw * 0.3 * k2);
        bl.textContent = t > 12.8 ? "κ = 0.6" : "";
        lc.textContent = t > 11.5 ? h.L("grey: chance (5)   blue: beyond chance (3)   empty: still possible (2)", "灰：機遇（5）  藍：超越機遇（3）  空白：尚可達到（2）") : "";
      };
    }
  };

  /* 9. Lead-time bias */
  L["screening-bias"] = {
    dur: 13,
    scenes: [
      { t: 0, hold: 2.6, en: "Same patient, same cancer, two scenarios.", zh: "同一位病人、同一種癌症、兩種情境。",
        den: "Top row: this patient is screened. Bottom row: not screened. The red line is the calendar, starting when the cancer biologically begins.",
        dzh: "上排：這位病人有接受篩檢；下排：沒有篩檢。紅線代表日曆時間，從癌症在生物學上開始時起算。" },
      { t: 2.8, hold: 5.4, en: "Screening finds the cancer 3 years earlier.", zh: "篩檢提早 3 年發現癌症。",
        den: "In year 3 a screening test detects the cancer before any symptoms. From this moment the “survival after diagnosis” clock starts running.",
        dzh: "第 3 年篩檢在症狀出現前就發現癌症。「診斷後存活」的時鐘從這一刻開始計時。" },
      { t: 5.6, hold: 8.6, en: "Without screening, it is found at symptoms.", zh: "沒有篩檢時，症狀出現才發現。",
        den: "In year 6 symptoms appear and the cancer is diagnosed. Only now does this patient's survival clock start.",
        dzh: "第 6 年出現症狀並被診斷。直到現在，這位病人的存活時鐘才開始計時。" },
      { t: 8.8, hold: 12.9, en: "Both die in year 9.", zh: "兩者都在第 9 年死亡。",
        den: "Survival after diagnosis looks like 6 years with screening and 3 without, yet the patient dies on the same day. The extra 3 years are lead time: screening moved the diagnosis earlier without delaying death.",
        dzh: "診斷後存活看起來是有篩檢 6 年、沒篩檢 3 年，但病人在同一天死亡。多出的 3 年就是領先時間：篩檢只是把診斷提前，並沒有延後死亡。" }
    ],
    build(svg, h) {
      const X = y => 120 + (y / 10) * 470, R1 = 80, R2 = 175, SCR = 3, SYM = 6, DIE = 9;
      [[R1, "Screened", "有篩檢"], [R2, "Not screened", "未篩檢"]].forEach(([y, en, zh]) => { h.el("line", { x1: X(0), x2: X(10), y1: y, y2: y, stroke: "var(--rule)", "stroke-width": 3 }); h.label(svg, 10, y + 5, en, zh, { "text-anchor": "start", "font-size": 14 }); });
      for (let y = 0; y <= 10; y += 2) h.text(svg, X(y), 240, { "font-size": 12, fill: "var(--muted)" }).textContent = y;
      h.label(svg, X(5), 258, "years", "年", { "font-size": 12, fill: "var(--muted)" });
      const defs = h.el("defs", {});
      const pat = h.el("pattern", { id: "ltHatch", width: 8, height: 8, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
      h.el("rect", { width: 4, height: 8, fill: "var(--b)" }, pat);
      const b1 = h.el("rect", { y: R1 - 9, height: 18, fill: "var(--a)", rx: 3 }), b2 = h.el("rect", { y: R2 - 9, height: 18, fill: "var(--a)", rx: 3 });
      const hatch = h.el("rect", { y: R1 - 9, height: 18, fill: "url(#ltHatch)", rx: 3 });
      const leadT = h.text(svg, (X(SCR) + X(SYM)) / 2, R1 - 16, { "font-size": 13, fill: "var(--b)" });
      const t1 = h.text(svg, 0, R1 + 34, { "font-size": 18, "text-anchor": "start" }), t2 = h.text(svg, 0, R2 + 34, { "font-size": 18, "text-anchor": "start" });
      const d1 = h.text(svg, X(DIE), R1 + 7, { "font-size": 22 }), d2 = h.text(svg, X(DIE), R2 + 7, { "font-size": 22 });
      const cur = h.el("line", { y1: 40, y2: 220, stroke: "var(--bad)", "stroke-width": 2.5 });
      const curT = h.text(svg, 0, 34, { "font-size": 14, fill: "var(--bad)" });
      return t => {
        const y = Math.min(10, t * 10 / 9.2);
        cur.setAttribute("x1", X(y)); cur.setAttribute("x2", X(y)); curT.setAttribute("x", X(y)); curT.textContent = h.L(`year ${y.toFixed(1)}`, `第 ${y.toFixed(1)} 年`);
        const e1 = Math.min(y, DIE), e2 = Math.min(y, DIE);
        b1.setAttribute("x", X(SCR)); b1.setAttribute("width", Math.max(0, X(e1) - X(SCR)));
        b2.setAttribute("x", X(SYM)); b2.setAttribute("width", Math.max(0, X(e2) - X(SYM)));
        hatch.setAttribute("x", X(SCR)); hatch.setAttribute("width", y > SYM ? X(SYM) - X(SCR) : 0);
        leadT.textContent = y > SYM ? h.L("lead time", "領先時間") : "";
        const s1 = Math.max(0, e1 - SCR), s2 = Math.max(0, e2 - SYM);
        t1.setAttribute("x", X(SCR)); t2.setAttribute("x", X(SYM));
        t1.textContent = y > SCR ? h.L(`survival ${s1.toFixed(1)} y`, `存活 ${s1.toFixed(1)} 年`) : "";
        t2.textContent = y > SYM ? h.L(`survival ${s2.toFixed(1)} y`, `存活 ${s2.toFixed(1)} 年`) : "";
        d1.textContent = y >= DIE ? "✝" : ""; d2.textContent = y >= DIE ? "✝" : "";
      };
    }
  };

  /* 10. Misclassification */
  L.misclassification = {
    dur: 15,
    scenes: [
      { t: 0, hold: 3.3, en: "The truth: OR = 2.25.", zh: "真相：OR = 2.25。",
        den: "Dark figures were exposed to pesticides: 12 of 20 cases and 8 of 20 controls. True odds ratio = (12/8) ÷ (8/12) = 2.25.",
        dzh: "深色的人曾曝露於農藥：20 位病例中 12 位、20 位對照中 8 位。真實勝算比 = (12/8) ÷ (8/12) = 2.25。" },
      { t: 3.5, hold: 7.8, en: "Non-differential: some exposed people are missed in both groups.", zh: "非差異性：兩組都有曝露者被漏掉。",
        den: "The same error rate (1 in 4 exposed people missed) applies to cases and controls. The groups now look more alike, so the observed OR shrinks towards 1 (1.91): the real association is underestimated.",
        dzh: "病例與對照的錯誤率相同（每 4 位曝露者漏掉 1 位）。兩組看起來更相似，觀察 OR 縮向 1（1.91）：真實關聯被低估。" },
      { t: 8, hold: 8.8, en: "Back to the truth.", zh: "回到真相。",
        den: "Reset to the true exposures before trying a different kind of error.",
        dzh: "先回到真實的曝露狀態，再試另一種錯誤。" },
      { t: 9, hold: 14.8, en: "Differential: cases “remember” exposures they never had.", zh: "差異性：病例「記得」從未有過的曝露。",
        den: "Recall bias: people with breast cancer search their memory harder and over-report pesticide use; controls do not. The error differs by disease status, and here it pushes the OR away from 1 (4.50), exaggerating the association.",
        dzh: "回憶偏差：乳癌病人更努力回想，因而多報農藥使用；對照組則不會。錯誤因疾病狀態而異，這裡把 OR 推離 1（4.50），誇大了關聯。" }
    ],
    build(svg, h) {
      h.label(svg, 165, 26, "Cases", "病例組", { fill: "var(--bad)" });
      h.label(svg, 475, 26, "Controls", "對照組");
      const grid = (x0, n) => [...Array(20)].map((_, i) => { const g = h.person(svg, i < n ? "var(--ink)" : "var(--rule)"); h.at(g, x0 + (i % 5) * 38, 55 + Math.floor(i / 5) * 33, 1.05); return g; });
      const C = grid(90, 12), K = grid(400, 8);
      const lgE = h.el("g", {}); h.at(h.person(lgE, "var(--ink)"), 300, 70, 0.9); h.label(lgE, 300, 104, "exposed", "曾曝露", { "font-size": 11 });
      h.at(h.person(lgE, "var(--rule)"), 340, 70, 0.9); h.label(lgE, 342, 104, "not", "未曝露", { "font-size": 11 });
      const X = or => 120 + (Math.log(or / 0.5) / Math.log(12)) * 460, Y = 218;
      h.el("line", { x1: 120, x2: 580, y1: Y, y2: Y, stroke: "var(--muted)" });
      [0.5, 1, 2, 4, 6].forEach(v => h.text(svg, X(v), Y + 20, { "font-size": 12, fill: "var(--muted)" }).textContent = v);
      h.el("line", { x1: X(1), x2: X(1), y1: Y - 22, y2: Y, stroke: "var(--ink)", "stroke-dasharray": "3 3" });
      const truth = h.el("circle", { cx: X(2.25), cy: Y, r: 7, fill: "var(--surface)", stroke: "var(--ink)", "stroke-width": 2.5 });
      const obs = h.el("circle", { cy: Y, r: 8, fill: "var(--bad)" });
      const obsT = h.text(svg, 0, Y - 14, { "font-size": 15, fill: "var(--bad)" });
      const missC = [2, 5, 9], missK = [1, 6], recall = [13, 16, 19];
      return t => {
        const nd = t >= 3.5 && t < 8, df = t >= 9;
        const kN = nd ? h.seg(t, 3.8, 5.2) : 0, kD = df ? h.seg(t, 9.3, 10.8) : 0;
        C.forEach((g, i) => {
          let ex = i < 12;
          if (missC.includes(i) && kN > (missC.indexOf(i) + 1) / 4) ex = false;
          if (recall.includes(i) && kD > (recall.indexOf(i) + 1) / 4) ex = true;
          g.setAttribute("fill", ex ? "var(--ink)" : "var(--rule)");
        });
        K.forEach((g, i) => { let ex = i < 8; if (missK.includes(i) && kN > (missK.indexOf(i) + 1) / 3) ex = false; g.setAttribute("fill", ex ? "var(--ink)" : "var(--rule)"); });
        const target = nd ? 1.91 : df ? 4.5 : 2.25, k = nd ? h.ease(h.seg(t, 5.2, 6.4)) : df ? h.ease(h.seg(t, 10.8, 12)) : 1;
        const or = Math.exp(h.lerp(Math.log(2.25), Math.log(target), k));
        obs.setAttribute("cx", X(or)); obsT.setAttribute("x", X(or));
        obsT.textContent = `OR ${or.toFixed(2)}`;
      };
    }
  };

  /* 11. Confounding vs selection bias */
  L["confounding-selection"] = {
    dur: 28.5, h: 280,
    scenes: [
      { t: 0, hold: 3.2, en: "Confounding: a common cause.", zh: "干擾：共同原因。",
        den: "Frailty affects which drug a patient receives (doctors favour the new drug for robust patients) and also affects the risk of death. The drug itself has no effect (dashed arrow). A common cause of the exposure and the outcome is a confounder.",
        dzh: "虛弱程度會影響病人拿到哪種藥（醫師傾向把新藥給較強健的病人），也會影響死亡風險。藥物本身沒有效果（虛線箭頭）。同時影響曝露與結果的共同原因就是干擾因子。" },
      { t: 3.4, hold: 9, en: "The crude comparison is confounded.", zh: "粗略比較受到干擾。",
        den: "Robust patients mostly get the new drug and frail patients the old one. Deaths are concentrated among the frail, so the new drug looks protective (1/10 vs 5/10 died, RR 0.20) even though it does nothing.",
        dzh: "強健的病人多半拿到新藥，虛弱的病人拿到舊藥。死亡集中在虛弱者，因此新藥看起來有保護效果（死亡 1/10 對 5/10，RR 0.20），但其實它毫無作用。" },
      { t: 9.2, hold: 14, en: "Remove the arrow into treatment: randomize.", zh: "切斷指向治療的箭頭：隨機分派。",
        den: "With randomization a coin, not frailty, decides treatment, so the arrow from frailty to treatment disappears. Frail patients are balanced (5 and 5) and the comparison is unbiased (3/10 vs 3/10, RR 1.00). In observational studies we instead stratify, match or adjust for measured confounders.",
        dzh: "隨機分派時由硬幣而不是虛弱程度決定治療，從虛弱指向治療的箭頭因此消失。虛弱者在兩組平衡（5 與 5），比較不再有偏差（3/10 對 3/10，RR 1.00）。觀察性研究則改用分層、配對或調整已測量的干擾因子。" },
      { t: 14.2, hold: 17.2, en: "Selection bias: who is retained in the study.", zh: "選樣偏差：誰被保留在研究中。",
        den: "Same randomized trial. The new drug causes side effects that make frail patients more likely to drop out. Whether a patient stays in the study now depends on both the treatment and frailty. Analysing only those who stayed (the boxed node) changes who is retained.",
        dzh: "同一個隨機試驗。新藥的副作用讓虛弱的病人較容易退出。病人是否留在研究中，同時取決於治療與虛弱程度。只分析留下來的人（加框的節點），改變了誰被保留。" },
      { t: 17.4, hold: 22.5, en: "Frail patients on the new drug drop out.", zh: "新藥組的虛弱病人退出了。",
        den: "Three frail patients leave the new-drug group, including two who would have died. Among completers the new drug looks protective (1/7 vs 3/10, RR 0.48). Randomization worked at baseline; the bias came from who remained in the analysis. This is loss-to-follow-up bias, a type of selection bias, and randomization cannot prevent it.",
        dzh: "三位虛弱病人離開新藥組，其中兩位原本會死亡。只看完成者，新藥看起來有保護效果（1/7 對 3/10，RR 0.48）。隨機分派在基線時是成功的，偏差來自誰留在分析中。這是失聯偏差，屬於選樣偏差的一種，隨機分派無法預防。" },
      { t: 22.7, hold: 28, en: "Confounding vs. selection bias.", zh: "干擾與選樣偏差的差別。",
        den: "Confounding: a third factor associated with both the exposure and the outcome mixes its effect with the exposure's; randomization balances even unmeasured confounders, and stratification, matching or adjustment control measured ones. Selection bias: how we select or retain participants (self-selection, control selection, loss to follow-up); prevent it with careful selection and complete follow-up.",
        dzh: "干擾：同時與曝露及結果有關的第三因子，把它的效果混進曝露的效果；隨機分派能平衡連未測量的干擾因子，分層、配對或調整則控制已測量者。選樣偏差：我們如何選擇或保留受試者（自我選擇、對照選擇、失聯）；以審慎的選樣與完整追蹤預防。" }
    ],
    build(svg, h) {
      dagDefs(h, "mkCS");
      const frail = [0, 1, 2, 3, 4, 10, 11, 12, 13, 14], died = [0, 1, 10, 11, 5, 15];
      const NEW1 = [5, 6, 7, 8, 16, 17, 18, 19, 2, 3], OLD1 = [0, 1, 4, 10, 11, 12, 13, 14, 9, 15];
      const NEW2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], OLD2 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], DROP = [0, 1, 2];
      const boxes = h.el("g", {});
      boxes.appendChild(box(h, 318, 40, 312, 92, "var(--a)")); boxes.appendChild(box(h, 318, 168, 312, 92, "var(--b)"));
      h.label(boxes, 330, 32, "New drug", "新藥", { fill: "var(--a)", "text-anchor": "start" });
      h.label(boxes, 330, 160, "Old drug", "舊藥", { fill: "var(--b)", "text-anchor": "start" });
      const cN = h.text(boxes, 626, 32, { "text-anchor": "end", fill: "var(--bad)", "font-size": 14 }), cO = h.text(boxes, 626, 160, { "text-anchor": "end", fill: "var(--bad)", "font-size": 14 });
      const popL = h.label(svg, 474, 60, "Patients (diamond = frail)", "病人（菱形 = 虛弱）", { "font-size": 13, fill: "var(--muted)" });
      const slot = (list, i, top) => [345 + list.indexOf(i) * 28.5, top ? 108 : 236];
      const pop = i => [345 + (i % 10) * 28.5, 120 + Math.floor(i / 10) * 60];
      const P = [...Array(20)].map((_, i) => { const g = h.person(svg, "var(--muted)"); const d = diamond(h, g); d.setAttribute("opacity", frail.includes(i) ? 1 : 0); return g; });
      const verdict = h.text(svg, 474, 276, { "font-size": 14, fill: "var(--bad)" });
      const excl = h.label(svg, 530, 156, "dropped out, excluded →", "退出並被排除 →", { "font-size": 12, fill: "var(--bad)", "text-anchor": "end" });
      /* DAG A */
      const gA = h.el("g", {});
      const F = node(h, gA, 150, 60, "Frailty", "虛弱", { color: "var(--bad)" }), T = node(h, gA, 62, 205, "Drug", "藥物"), D = node(h, gA, 238, 205, "Death", "死亡");
      const C = node(h, gA, 62, 60, "Coin", "硬幣", { w: 70 });
      const aFT = arrow(h, gA, F, T, { marker: "mkCS", color: "var(--bad)" }), aFD = arrow(h, gA, F, D, { marker: "mkCS", color: "var(--bad)" });
      const aTD = arrow(h, gA, T, D, { marker: "mkCS", color: "var(--muted)", dash: "6 5", w: 2 });
      const aCT = arrow(h, gA, C, T, { marker: "mkCS" });
      const noEff = h.label(gA, 150, 225, "no effect", "沒有效果", { "font-size": 12, fill: "var(--muted)" });
      const cut = h.text(gA, aFT.mid[0], aFT.mid[1] + 9, { "font-size": 30, fill: "var(--bad)" }); cut.textContent = "✗";
      const pathL = h.text(gA, 150, 140, { "font-size": 12, fill: "var(--bad)" });
      /* DAG B */
      const gB = h.el("g", {});
      const T2 = node(h, gB, 62, 70, "Drug", "藥物"), D2 = node(h, gB, 238, 70, "Death", "死亡"), F2 = node(h, gB, 238, 160, "Frailty", "虛弱", { color: "var(--bad)" });
      const S2 = node(h, gB, 110, 232, "Stayed in study", "留在研究中", { w: 130, box: true });
      const bTS = arrow(h, gB, T2, S2, { marker: "mkCS" }), bFS = arrow(h, gB, F2, S2, { marker: "mkCS", color: "var(--bad)" }), bFD = arrow(h, gB, F2, D2, { marker: "mkCS", color: "var(--bad)" });
      const bTD = arrow(h, gB, T2, D2, { marker: "mkCS", color: "var(--muted)", dash: "6 5", w: 2 });
      const condL = h.label(gB, 110, 268, "analysis restricted to this box", "分析只限於此框內的人", { "font-size": 12, fill: "var(--ink)" });
      /* summary */
      const sum = h.el("g", {});
      h.el("rect", { x: 6, y: 6, width: 628, height: 268, rx: 12, fill: "var(--surface)", stroke: "var(--rule)" }, sum);
      h.label(sum, 165, 40, "Confounding", "干擾", { "font-size": 20, fill: "var(--bad)" });
      h.label(sum, 475, 40, "Selection bias", "選樣偏差", { "font-size": 20, fill: "var(--ink)" });
      h.el("line", { x1: 320, x2: 320, y1: 25, y2: 255, stroke: "var(--rule)", "stroke-width": 2 }, sum);
      const lines = [
        [165, 82, "A third factor linked to", "與曝露及結果都有關的"], [165, 104, "both exposure and outcome", "第三因子"],
        [165, 146, "Groups differ in that factor", "兩組在該因子上"], [165, 168, "from the start", "一開始就不同"],
        [165, 210, "Fix: randomize, or stratify,", "對策：隨機分派，或分層、"], [165, 232, "match, adjust", "配對、調整"],
        [475, 82, "How we select or retain", "我們如何選擇或保留"], [475, 104, "participants", "受試者"],
        [475, 146, "Self-selection, control selection,", "自我選擇、對照選擇、"], [475, 168, "loss to follow-up", "失聯"],
        [475, 210, "Fix: careful selection,", "對策：審慎選樣、"], [475, 232, "complete follow-up", "完整追蹤"]
      ].map(([x, y, en, zh]) => h.label(sum, x, y, en, zh, { "font-size": 14, "font-weight": 600 }));
      return t => {
        const A = t < 14.2, Bv = t >= 14.2 && t < 22.7, S = t >= 22.7;
        gA.setAttribute("opacity", A ? 1 : 0); gB.setAttribute("opacity", Bv ? h.seg(t, 14.2, 14.5) : 0);
        sum.setAttribute("opacity", S ? h.seg(t, 22.7, 23.1) : 0);
        lines.forEach((l, i) => l.setAttribute("opacity", h.seg(t, 23.2 + Math.floor(i / 2) * 0.55, 23.5 + Math.floor(i / 2) * 0.55)));
        // DAG A
        aFT.draw(t < 9.4 ? h.seg(t, 0.8, 1.4) : 1 - h.seg(t, 10, 10.6)); aFD.draw(h.seg(t, 1.5, 2.1));
        aTD.draw(t > 2.3 ? 1 : 0); noEff.setAttribute("opacity", t > 2.3 ? 1 : 0);
        C.setAttribute("opacity", h.seg(t, 9.3, 9.7)); aCT.draw(h.seg(t, 10.3, 10.9));
        cut.setAttribute("opacity", t > 9.6 && t < 10.6 ? 1 : 0);
        pathL.textContent = t > 2.4 && t < 9.2 ? h.L("frailty is linked to both drug and death", "虛弱同時與藥物及死亡有關") : "";
        // DAG B
        bTS.draw(h.seg(t, 14.6, 15.2)); bFS.draw(h.seg(t, 15.2, 15.8)); bFD.draw(h.seg(t, 15.8, 16.4)); bTD.draw(Bv ? 1 : 0);
        condL.setAttribute("opacity", t > 16.4 ? 1 : 0);
        // people
        const showBoxes = t >= 3.4 && !S;
        boxes.setAttribute("opacity", showBoxes ? h.seg(t, 3.4, 3.8) : 0);
        popL.setAttribute("opacity", t < 3.4 ? h.seg(t, 0.2, 0.6) : 0);
        let dN = 0, dO = 0, nN = 0;
        P.forEach((g, i) => {
          let x, y, arm = null;
          const p0 = pop(i);
          if (t < 3.4) { [x, y] = p0; }
          else if (t < 10.6) {
            const k = h.ease(h.seg(t, 3.6 + i * 0.1, 4.6 + i * 0.1)); const top = NEW1.includes(i);
            const tg = slot(top ? NEW1 : OLD1, i, top); x = h.lerp(p0[0], tg[0], k); y = h.lerp(p0[1], tg[1], k); arm = k > 0.5 ? (top ? "N" : "O") : null;
          } else {
            const k = h.ease(h.seg(t, 10.6 + i * 0.08, 11.6 + i * 0.08)); const top1 = NEW1.includes(i), top2 = NEW2.includes(i);
            const a = slot(top1 ? NEW1 : OLD1, i, top1), b = slot(top2 ? NEW2 : OLD2, i, top2);
            x = h.lerp(a[0], b[0], k); y = h.lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * 18; arm = k > 0.5 ? (top2 ? "N" : "O") : (top1 ? "N" : "O");
          }
          let op = Math.min(1, h.seg(t, 0.1 + i * 0.03, 0.5 + i * 0.03));
          if (!S && DROP.includes(i) && t >= 17.4) { const k = h.ease(h.seg(t, 17.8 + DROP.indexOf(i) * 0.4, 18.8 + DROP.indexOf(i) * 0.4)); x = h.lerp(x, 545 + DROP.indexOf(i) * 26, k); y = h.lerp(y, 152, k) - Math.sin(k * Math.PI) * 30; op *= 1 - 0.6 * k; }
          if (S) op = 0;
          const dead = died.includes(i) && ((t > 6.6 + died.indexOf(i) * 0.25 && t < 10.6) || (t > 12.6 + died.indexOf(i) * 0.2 && t < 14.2) || (t > 19.8 && !DROP.includes(i)));
          g.setAttribute("fill", dead ? "var(--bad)" : arm === "N" ? "var(--a)" : arm === "O" ? "var(--b)" : "var(--muted)");
          h.at(g, x, y, 1.05, op);
        });
        const phase2 = t > 7.4 && t < 10.6, phase3 = t > 13.2 && t < 14.2, phase5 = t > 20.6 && t < 22.7;
        cN.textContent = phase2 ? h.L("died 1/10", "死亡 1/10") : phase3 ? h.L("died 3/10", "死亡 3/10") : phase5 ? h.L("completers died 1/7", "完成者死亡 1/7") : "";
        cO.textContent = phase2 ? h.L("died 5/10", "死亡 5/10") : phase3 ? h.L("died 3/10", "死亡 3/10") : phase5 ? h.L("died 3/10", "死亡 3/10") : "";
        verdict.textContent = t > 8 && t < 10.6 ? h.L("RR 0.20 — confounded", "RR 0.20：受干擾") : phase3 ? h.L("RR 1.00 — unbiased", "RR 1.00：無偏差") : t > 21.4 && t < 22.7 ? h.L("completers: RR 0.48 (selection bias)", "完成者：RR 0.48（選樣偏差）") : "";
        excl.setAttribute("opacity", t > 18.4 && t < 22.7 ? 1 : 0);
      };
    }
  };

  /* 12. Confounding vs effect modification */
  L["effect-modification"] = {
    dur: 30.5, h: 300,
    scenes: [
      { t: 0, hold: 3.9, en: "Crude comparison: coffee and heart attacks.", zh: "粗略比較：咖啡與心肌梗塞。",
        den: "Blue = coffee drinkers, ochre = non-drinkers; a red dot means a heart attack. 9 of 20 coffee drinkers vs 6 of 20 non-drinkers had one: crude RR = 1.5. Is coffee harmful?",
        dzh: "藍色 = 喝咖啡者，黃褐色 = 不喝者；紅點代表發生心肌梗塞。20 位喝咖啡者中 9 位、20 位不喝者中 6 位發生：粗 RR = 1.5。咖啡有害嗎？" },
      { t: 4.2, hold: 7.6, en: "Stratify: split everyone by smoking.", zh: "分層：依抽菸與否把所有人分開。",
        den: "The grey tag marks smokers. Stratified analysis looks at the exposure–outcome association separately within each level of the third factor.",
        dzh: "灰色標記代表抽菸者。分層分析是在第三因子的每一層內，分別觀察曝露與結果的關聯。" },
      { t: 7.8, hold: 10.5, en: "Within each stratum, RR = 1.0.", zh: "每一層內，RR 都是 1.0。",
        den: "Smokers: 8/16 vs 2/4 (RR 1.0). Non-smokers: 1/4 vs 4/16 (RR 1.0). The two stratum-specific RRs agree with each other, but both differ from the crude RR of 1.5.",
        dzh: "抽菸者：8/16 對 2/4（RR 1.0）。不抽菸者：1/4 對 4/16（RR 1.0）。兩層的 RR 彼此一致，但都與粗 RR 1.5 不同。" },
      { t: 10.7, hold: 13.5, en: "Verdict: confounding.", zh: "結論：干擾。",
        den: "Smoking is linked to coffee (most smokers drink coffee) and causes heart attacks. It distorted the crude RR. Confounding is a bias to remove: report the adjusted RR (1.0).",
        dzh: "抽菸與喝咖啡有關（多數抽菸者喝咖啡），也會導致心肌梗塞，因此扭曲了粗 RR。干擾是需要去除的偏差：應報告調整後的 RR（1.0）。" },
      { t: 13.8, hold: 17.5, en: "New question: asbestos and lung cancer.", zh: "新問題：石綿與肺癌。",
        den: "Blue = asbestos-exposed workers. 8 of 20 exposed vs 2 of 20 unexposed developed lung cancer: crude RR = 4.0.",
        dzh: "藍色 = 曝露石綿的工人。20 位曝露者中 8 位、20 位未曝露者中 2 位罹患肺癌：粗 RR = 4.0。" },
      { t: 17.7, hold: 21, en: "Stratify by smoking again.", zh: "再依抽菸分層。",
        den: "Smokers: 6/10 vs 1/10 (RR 6.0). Non-smokers: 2/10 vs 1/10 (RR 2.0). Smoking is equally common in both exposure groups, so it is not a confounder here.",
        dzh: "抽菸者：6/10 對 1/10（RR 6.0）。不抽菸者：2/10 對 1/10（RR 2.0）。抽菸在兩個曝露組一樣常見，所以這裡它不是干擾因子。" },
      { t: 21.2, hold: 24.5, en: "Verdict: effect modification.", zh: "結論：效應修飾。",
        den: "The stratum-specific RRs differ from each other (6.0 vs 2.0): the effect of asbestos depends on smoking. This is a real finding to describe, not a bias. Report each stratum separately; a single adjusted RR would hide it.",
        dzh: "各層的 RR 彼此不同（6.0 對 2.0）：石綿的效果取決於是否抽菸。這是需要描述的真實發現，不是偏差。應分層分別報告；單一的調整後 RR 會把它掩蓋。" },
      { t: 24.7, hold: 30, en: "How to tell them apart.", zh: "如何區分兩者。",
        den: "Stratify, then compare. Stratum RRs similar to each other but different from the crude RR: confounding. Stratum RRs different from each other: effect modification. Both can happen at once.",
        dzh: "先分層再比較。各層 RR 彼此相近但與粗 RR 不同：干擾。各層 RR 彼此不同：效應修飾。兩者也可能同時存在。" }
    ],
    build(svg, h) {
      dagDefs(h, "mkEM");
      const mk = (smk, exp, n, ev) => [...Array(n)].map((_, k) => ({ smk, exp, ev: k < ev }));
      const S1 = [].concat(mk(1, 1, 16, 8), mk(1, 0, 4, 2), mk(0, 1, 4, 1), mk(0, 0, 16, 4));
      const S2 = [].concat(mk(1, 1, 10, 6), mk(1, 0, 10, 1), mk(0, 1, 10, 2), mk(0, 0, 10, 1));
      const posCrude = (list, i) => { const p = list[i]; const same = list.slice(0, i).filter(q => q.exp === p.exp).length; return [(p.exp ? 52 : 352) + (same % 10) * 26, 98 + Math.floor(same / 10) * 46]; };
      const posStrat = (list, i) => { const p = list[i]; const same = list.slice(0, i).filter(q => q.smk === p.smk && q.exp === p.exp).length; return [(p.smk ? 44 : 344) + same * 16.5, p.exp ? 98 : 150]; };
      const bL = box(h, 25, 52, 290, 130, "var(--ink)"), bR = box(h, 325, 52, 290, 130, "var(--ink)");
      const lL = h.text(svg, 170, 44, {}), lR = h.text(svg, 470, 44, {});
      const cL = h.text(svg, 170, 200, { "font-size": 13 }), cR = h.text(svg, 470, 200, { "font-size": 13 });
      const verdict = h.text(svg, 320, 20, { "font-size": 17, fill: "var(--bad)" });
      const P = [...Array(40)].map(() => {
        const g = h.person(svg, "var(--muted)");
        const ev = h.el("circle", { cx: 6, cy: -16, r: 4.5, fill: "var(--bad)", stroke: "var(--surface)", "stroke-width": 1.5 }, g);
        const cig = h.el("rect", { x: 5, y: 3, width: 9, height: 3, rx: 1, fill: "var(--ink)" }, g);
        return { g, ev, cig };
      });
      /* forest strip */
      const fx = v => 360 + (Math.log(v / 0.5) / Math.log(16)) * 250, FY = 280;
      const forest = h.el("g", {});
      h.el("line", { x1: 360, x2: 610, y1: FY, y2: FY, stroke: "var(--muted)" }, forest);
      [0.5, 1, 2, 4, 8].forEach(v => { h.text(forest, fx(v), FY + 14, { "font-size": 11, fill: "var(--muted)", "font-weight": 600 }).textContent = v; });
      h.el("line", { x1: fx(1), x2: fx(1), y1: 222, y2: FY, stroke: "var(--ink)", "stroke-dasharray": "3 3" }, forest);
      h.label(forest, 352, 238, "crude", "粗", { "font-size": 12, "text-anchor": "end" });
      h.label(forest, 352, 262, "strata", "各層", { "font-size": 12, "text-anchor": "end" });
      const mC = h.el("rect", { y: 231, width: 12, height: 12, fill: "var(--bad)", transform: "" }, forest);
      const mS1 = h.el("circle", { cy: 258, r: 6, fill: "var(--ink)" }, forest), mS2 = h.el("circle", { cy: 258, r: 6, fill: "var(--surface)", stroke: "var(--ink)", "stroke-width": 2.5 }, forest);
      const lS1 = h.text(forest, 0, 253, { "font-size": 11, "text-anchor": "middle" }), lS2 = h.text(forest, 0, 253, { "font-size": 11, "text-anchor": "middle" });
      /* DAGs */
      const dA = h.el("g", {}), dB = h.el("g", {});
      const aZ = node(h, dA, 165, 228, "Smoking", "抽菸", { color: "var(--bad)", w: 84 }), aE = node(h, dA, 60, 280, "Coffee", "咖啡", { w: 76 }), aY = node(h, dA, 270, 280, "Heart attack", "心肌梗塞", { w: 104 });
      const aa1 = arrow(h, dA, aZ, aE, { marker: "mkEM", color: "var(--bad)" }), aa2 = arrow(h, dA, aZ, aY, { marker: "mkEM", color: "var(--bad)" }), aa3 = arrow(h, dA, aE, aY, { marker: "mkEM", color: "var(--muted)", dash: "5 5", w: 2 });
      const bE = node(h, dB, 60, 280, "Asbestos", "石綿", { w: 84 }), bY = node(h, dB, 270, 280, "Lung cancer", "肺癌", { w: 104 }), bZ = node(h, dB, 165, 226, "Smoking", "抽菸", { color: "var(--bad)", w: 84 });
      const ba1 = arrow(h, dB, bE, bY, { marker: "mkEM", w: 3 });
      const midPt = { _x: 165, _y: 280, _w: 0 };
      const ba2 = arrow(h, dB, bZ, midPt, { marker: "mkEM", color: "var(--bad)" });
      const modL = h.label(dB, 230, 252, "modifies the effect", "修飾效果", { "font-size": 11, fill: "var(--bad)", "text-anchor": "start" });
      /* summary */
      const sum = h.el("g", {});
      h.el("rect", { x: 6, y: 6, width: 628, height: 288, rx: 12, fill: "var(--surface)", stroke: "var(--rule)" }, sum);
      h.label(sum, 165, 40, "Confounding", "干擾", { "font-size": 20, fill: "var(--bad)" });
      h.label(sum, 475, 40, "Effect modification", "效應修飾", { "font-size": 20, fill: "var(--a)" });
      h.el("line", { x1: 320, x2: 320, y1: 25, y2: 280, stroke: "var(--rule)", "stroke-width": 2 }, sum);
      const lines = [
        [165, 78, "Third factor linked to", "第三因子同時與"], [165, 98, "exposure AND outcome", "曝露及結果有關"],
        [165, 134, "Stratum RRs similar;", "各層 RR 相近，"], [165, 154, "crude RR is different", "粗 RR 與之不同"],
        [165, 190, "A BIAS: remove it", "是偏差：要去除"], [165, 210, "(adjust, randomize)", "（調整、隨機分派）"],
        [165, 246, "Report: adjusted RR", "報告：調整後 RR"], [165, 266, "", ""],
        [475, 78, "The effect of exposure differs", "曝露的效果"], [475, 98, "across levels of a third factor", "在第三因子各層間不同"],
        [475, 134, "Stratum RRs differ", "各層 RR"], [475, 154, "from each other", "彼此不同"],
        [475, 190, "A FINDING: describe it", "是發現：要描述"], [475, 210, "(randomization won't remove it)", "（隨機分派不會消除它）"],
        [475, 246, "Report: each stratum's RR", "報告：各層各自的 RR"], [475, 266, "", ""]
      ].map(([x, y, en, zh]) => h.label(sum, x, y, en, zh, { "font-size": 14, "font-weight": 600 }));
      return t => {
        const sc2 = t >= 13.8, S = t >= 24.7;
        const list = sc2 ? S2 : S1, t0 = sc2 ? 13.8 : 0;
        const r = t - t0;              // time within scenario
        const strat = r >= 4.4;
        const kMove = h.ease(h.seg(r, 4.9, 6.9));
        const fadeIn = sc2 ? h.seg(t, 13.8, 14.3) : 1;
        P.forEach((o, i) => {
          const p = list[i];
          const a = posCrude(list, i), b = posStrat(list, i);
          const x = h.lerp(a[0], b[0], kMove), y = h.lerp(a[1], b[1], kMove);
          const appear = h.seg(r, 0.1 + i * 0.03, 0.5 + i * 0.03);
          h.at(o.g, x, y, strat ? 0.85 : 1, S ? 0 : appear * fadeIn);
          o.g.setAttribute("fill", p.exp ? "var(--a)" : "var(--b)");
          o.ev.setAttribute("opacity", p.ev && r > 2.1 + (i % 10) * 0.08 ? 1 : 0);
          o.cig.setAttribute("opacity", p.smk && r > 4.3 && r < 7 ? (r < 5 ? 0.4 + 0.6 * Math.abs(Math.sin(r * 8)) : 1 - h.seg(r, 6.6, 7)) : 0);
        });
        const exN = sc2 ? h.L("Asbestos", "曝露石綿") : h.L("Coffee drinkers", "喝咖啡"), unN = sc2 ? h.L("No asbestos", "未曝露石綿") : h.L("No coffee", "不喝咖啡");
        lL.textContent = strat ? h.L("Smokers", "抽菸者") : exN; lR.textContent = strat ? h.L("Non-smokers", "不抽菸者") : unN;
        lL.setAttribute("fill", strat ? "var(--ink)" : "var(--a)"); lR.setAttribute("fill", strat ? "var(--ink)" : "var(--b)");
        const outN = sc2 ? h.L("lung cancer", "肺癌") : h.L("heart attack", "心肌梗塞");
        if (!strat) {
          cL.textContent = r > 3 ? `${sc2 ? 8 : 9}/20 ${outN}` : ""; cR.textContent = r > 3 ? `${sc2 ? 2 : 6}/20 ${outN}` : "";
        } else {
          const showS = r > (sc2 ? 6.9 : 7.6);
          cL.textContent = showS ? (sc2 ? h.L("6/10 vs 1/10: RR 6.0", "6/10 對 1/10：RR 6.0") : h.L("8/16 vs 2/4: RR 1.0", "8/16 對 2/4：RR 1.0")) : "";
          cR.textContent = showS ? (sc2 ? h.L("2/10 vs 1/10: RR 2.0", "2/10 對 1/10：RR 2.0") : h.L("1/4 vs 4/16: RR 1.0", "1/4 對 4/16：RR 1.0")) : "";
        }
        [bL, bR, lL, lR, cL, cR].forEach(e => e.setAttribute("opacity", S ? 0 : fadeIn));
        // forest
        const crude = sc2 ? 4 : 1.5, s1 = sc2 ? 6 : 1, s2 = sc2 ? 2 : 1;
        const fShow = r > 3.2 && !S;
        forest.setAttribute("opacity", fShow ? 1 : 0);
        mC.setAttribute("x", fx(crude) - 6); mC.setAttribute("transform", `rotate(45 ${fx(crude)} 237)`);
        const showStr = r > (sc2 ? 7.0 : 7.8);
        mS1.setAttribute("cx", fx(s1)); mS2.setAttribute("cx", fx(s2)); mS1.setAttribute("opacity", showStr ? 1 : 0); mS2.setAttribute("opacity", showStr ? 1 : 0);
        lS1.setAttribute("x", fx(s1) + (sc2 ? 0 : -14)); lS2.setAttribute("x", fx(s2) + (sc2 ? 0 : 14));
        lS1.textContent = showStr ? h.L("smk", "菸") : ""; lS2.textContent = showStr ? h.L("non", "無") : "";
        // DAGs
        dA.setAttribute("opacity", !sc2 && r > 8.3 ? 1 : 0); dB.setAttribute("opacity", sc2 && !S && r > 7.6 ? 1 : 0);
        aa1.draw(h.seg(r, 8.5, 9.1)); aa2.draw(h.seg(r, 9.1, 9.7)); aa3.draw(r > 8.4 ? 1 : 0);
        ba1.draw(r > 7.6 ? 1 : 0); ba2.draw(h.seg(r, 7.9, 8.6)); modL.setAttribute("opacity", r > 8.6 ? 1 : 0);
        // verdicts
        verdict.textContent = (!sc2 && t > 11) ? h.L("Confounding: crude 1.5, strata 1.0 and 1.0", "干擾：粗 RR 1.5，各層 1.0 與 1.0")
          : (sc2 && !S && t > 21.5) ? h.L("Effect modification: strata 6.0 vs 2.0", "效應修飾：各層 6.0 對 2.0") : "";
        verdict.setAttribute("fill", sc2 ? "var(--a)" : "var(--bad)");
        sum.setAttribute("opacity", S ? h.seg(t, 24.7, 25.1) : 0);
        lines.forEach((l, i) => l.setAttribute("opacity", h.seg(t, 25.2 + (i % 8 >> 1) * 0.7 + (i >= 8 ? 0.35 : 0), 25.5 + (i % 8 >> 1) * 0.7 + (i >= 8 ? 0.35 : 0))));
      };
    }
  };

  return L;
})();
