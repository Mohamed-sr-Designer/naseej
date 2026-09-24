/* =========================================================================
   NASIJ dashboard charts — hand-rolled SVG (ported from the NUDJ dashboard).
   Smooth area line + dashed previous period + hover crosshair, sparklines,
   donuts, horizontal bars. C.slot(type, cfg) returns a placeholder; C.mount(scope) draws.
   ========================================================================= */
window.NZC = (function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const rtl = () => document.documentElement.dir === "rtl";
  const reg = {}; let seq = 0;
  const PALETTE = ["#2F5BEA", "#0B0B0D", "#1F8A70", "#E7A33E", "#C8321E", "#8C6FD1", "#9AA3AB", "#D24C7B"];

  function slot(type, cfg, cls) { const id = "ch" + (++seq); reg[id] = { type, cfg }; return `<div class="ch ch--${type}${cls ? " " + cls : ""}" data-ch="${id}"></div>`; }

  /* smooth path (Catmull-Rom → Bézier) that passes through every point without big overshoot */
  function smooth(pts) {
    if (!pts.length) return "";
    if (pts.length < 3) return "M" + pts.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L");
    let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, k = .18;
      const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
      const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);
      c1[1] = Math.max(lo - 6, Math.min(hi + 6, c1[1])); c2[1] = Math.max(lo - 6, Math.min(hi + 6, c2[1]));
      d += "C" + [c1, c2, p2].map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(",");
    }
    return d;
  }
  /* a "nice" axis ceiling: 1, 2, 2.5, 5 × 10^n */
  function nice(v) {
    if (v <= 0) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(k => n.setAttribute(k, attrs[k])); return n; };
  const short = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k" : String(Math.round(v));
  function animate(path, ms, delay) {
    try { const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len; path.getBoundingClientRect();
      path.style.transition = `stroke-dashoffset ${ms || 1100}ms cubic-bezier(.2,.7,.2,1) ${delay || 0}ms`; requestAnimationFrame(() => { path.style.strokeDashoffset = 0; }); setTimeout(() => { path.style.transition = ''; path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; }, (ms || 1100) + (delay || 0) + 150); } catch (e) { }
  }

  /* ---------- main area chart ----------
     cfg: { values, prev?, labels (timestamps), h, fmt(v), fmtX(t), color, names:[current, previous] } */
  function area(host, cfg) {
    const w = Math.max(280, host.clientWidth), h = cfg.h || 260, R = rtl();
    const pad = { t: 14, b: 30, s: 46, e: 12 }; /* s = axis side */
    const vals = cfg.values || [], prev = cfg.prev || null, n = vals.length;
    const max = nice(Math.max.apply(null, vals.concat(prev || []).concat([0])) * 1.08);
    const x0 = R ? w - pad.s : pad.s, x1 = R ? pad.e : w - pad.e;
    const X = i => n < 2 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1);
    const Y = v => pad.t + (h - pad.t - pad.b) * (1 - v / max);
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: "ch__svg" });
    const gid = "g" + Math.random().toString(36).slice(2, 7), color = cfg.color || PALETTE[0];
    const defs = el("defs"); const lg = el("linearGradient", { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 });
    lg.appendChild(el("stop", { offset: "0", "stop-color": color, "stop-opacity": ".26" })); lg.appendChild(el("stop", { offset: "1", "stop-color": color, "stop-opacity": "0" }));
    defs.appendChild(lg); svg.appendChild(defs);
    /* grid + axis */
    for (let g = 0; g <= 4; g++) {
      const v = max * g / 4, y = Y(v);
      svg.appendChild(el("line", { x1: Math.min(x0, x1), x2: Math.max(x0, x1), y1: y, y2: y, class: "ch__grid" + (g ? "" : " is-base") }));
      const t = el("text", { x: R ? w - 4 : 4, y: y + 4, class: "ch__ax", "text-anchor": R ? "end" : "start" }); t.textContent = (cfg.fmtAxis || short)(v); svg.appendChild(t);
    }
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 90))));
    (cfg.labels || []).forEach((lb, i) => { if (i % every && i !== n - 1) return; const t = el("text", { x: X(i), y: h - 8, class: "ch__ax", "text-anchor": "middle" }); t.textContent = (cfg.fmtX || String)(lb); svg.appendChild(t); });
    /* previous period */
    if (prev && prev.length) { const pp = el("path", { d: smooth(prev.map((v, i) => [X(i), Y(v)])), class: "ch__prev" }); svg.appendChild(pp); }
    /* current period */
    const pts = vals.map((v, i) => [X(i), Y(v)]), d = smooth(pts);
    if (pts.length) {
      const fill = el("path", { d: d + `L${pts[pts.length - 1][0].toFixed(1)} ${Y(0)}L${pts[0][0].toFixed(1)} ${Y(0)}Z`, fill: `url(#${gid})`, class: "ch__area" });
      svg.appendChild(fill);
      const line = el("path", { d, class: "ch__line", stroke: color }); svg.appendChild(line); animate(line, 1300);
    }
    /* hover crosshair */
    const cross = el("line", { y1: pad.t, y2: h - pad.b, class: "ch__cross" }), dot = el("circle", { r: 5, class: "ch__dot", fill: color }), dotP = el("circle", { r: 4, class: "ch__dot ch__dot--p" });
    [cross, dotP, dot].forEach(x => { x.style.opacity = 0; svg.appendChild(x); });
    host.innerHTML = ""; host.appendChild(svg);
    const tip = document.createElement("div"); tip.className = "ch__tip"; host.appendChild(tip);
    const hit = el("rect", { x: 0, y: 0, width: w, height: h, fill: "transparent" }); svg.appendChild(hit);
    const show = i => {
      const x = X(i); cross.setAttribute("x1", x); cross.setAttribute("x2", x); dot.setAttribute("cx", x); dot.setAttribute("cy", Y(vals[i]));
      [cross, dot].forEach(z => { z.style.opacity = 1; });
      if (prev && prev[i] != null) { dotP.setAttribute("cx", x); dotP.setAttribute("cy", Y(prev[i])); dotP.style.opacity = 1; }
      const f = cfg.fmt || short, nm = cfg.names || [];
      tip.innerHTML = `<b>${(cfg.fmtTip || cfg.fmtX || String)(cfg.labels[i])}</b><span><i style="background:${color}"></i>${nm[0] ? nm[0] + ": " : ""}<strong>${f(vals[i])}</strong></span>${prev && prev[i] != null ? `<span class="is-p"><i></i>${nm[1] ? nm[1] + ": " : ""}${f(prev[i])}</span>` : ""}`;
      tip.classList.add("on");
      const tw = tip.offsetWidth, left = Math.max(4, Math.min(w - tw - 4, x - tw / 2));
      tip.style.left = left + "px"; tip.style.top = Math.max(0, Y(vals[i]) - tip.offsetHeight - 14) + "px";
    };
    const hide = () => { [cross, dot, dotP].forEach(z => { z.style.opacity = 0; }); tip.classList.remove("on"); };
    const at = e => { const r = svg.getBoundingClientRect(), px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; if (n < 2) return 0; return Math.max(0, Math.min(n - 1, Math.round((px - x0) / (x1 - x0) * (n - 1)))); };
    hit.addEventListener("mousemove", e => show(at(e)));
    hit.addEventListener("touchstart", e => show(at(e)), { passive: true });
    hit.addEventListener("touchmove", e => show(at(e)), { passive: true });
    hit.addEventListener("mouseleave", hide);
  }

  /* ---------- sparkline for KPI cards ---------- */
  function spark(host, cfg) {
    const w = Math.max(60, host.clientWidth), h = cfg.h || 40, vals = cfg.values || [], n = vals.length, R = rtl();
    const max = Math.max.apply(null, vals.concat([1])), X = i => { const x = n < 2 ? w / 2 : 2 + (w - 4) * i / (n - 1); return R ? w - x : x; }, Y = v => 3 + (h - 6) * (1 - v / max);
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: "ch__svg" });
    const pts = vals.map((v, i) => [X(i), Y(v)]), d = smooth(pts), color = cfg.color || PALETTE[0], gid = "s" + Math.random().toString(36).slice(2, 7);
    const defs = el("defs"), lg = el("linearGradient", { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 });
    lg.appendChild(el("stop", { offset: "0", "stop-color": color, "stop-opacity": ".22" })); lg.appendChild(el("stop", { offset: "1", "stop-color": color, "stop-opacity": "0" })); defs.appendChild(lg); svg.appendChild(defs);
    if (pts.length > 1) {
      svg.appendChild(el("path", { d: d + `L${pts[n - 1][0]} ${h}L${pts[0][0]} ${h}Z`, fill: `url(#${gid})` }));
      const line = el("path", { d, class: "ch__line ch__line--thin", stroke: color }); svg.appendChild(line); animate(line, 900, 150);
    }
    host.innerHTML = ""; host.appendChild(svg);
  }

  /* ---------- donut ----------
     cfg: { parts:[{label, value, color}], center, sub, size } */
  function donut(host, cfg) {
    const size = cfg.size || 170, r = size / 2 - 14, c = 2 * Math.PI * r, total = (cfg.parts || []).reduce((t, p) => t + p.value, 0) || 1;
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: "ch__svg ch__donut" });
    svg.appendChild(el("circle", { cx: size / 2, cy: size / 2, r, class: "ch__ring" }));
    let acc = 0;
    (cfg.parts || []).forEach((p, i) => {
      const len = c * p.value / total, gap = (cfg.parts.length > 1 && len > 4) ? 2 : 0;
      const seg = el("circle", { cx: size / 2, cy: size / 2, r, class: "ch__seg", stroke: p.color || PALETTE[i % PALETTE.length], "stroke-dasharray": `0 ${c}`, "stroke-dashoffset": -acc, transform: `rotate(-90 ${size / 2} ${size / 2})` });
      svg.appendChild(seg);
      const final = `${Math.max(0, len - gap)} ${c}`;
      setTimeout(() => { seg.style.transition = "stroke-dasharray 1s cubic-bezier(.2,.7,.2,1)"; seg.setAttribute("stroke-dasharray", final); }, 60 + i * 90);
      acc += len;
    });
    const t = el("text", { x: size / 2, y: size / 2 - 2, class: "ch__dc", "text-anchor": "middle" }); t.textContent = cfg.center || ""; svg.appendChild(t);
    const s = el("text", { x: size / 2, y: size / 2 + 18, class: "ch__ds", "text-anchor": "middle" }); s.textContent = cfg.sub || ""; svg.appendChild(s);
    host.innerHTML = ""; host.appendChild(svg);
  }

  /* ---------- horizontal bars ----------
     cfg: { rows:[{label, value, sub?}], fmt(v), color } */
  function bars(host, cfg) {
    const rows = cfg.rows || [], max = Math.max.apply(null, rows.map(r => r.value).concat([1])), f = cfg.fmt || short;
    host.innerHTML = rows.length ? rows.map((r, i) => `<div class="bar"><div class="bar__l"><span>${r.label}</span><b>${f(r.value)}${r.sub ? ` <small>${r.sub}</small>` : ''}</b></div><div class="bar__t"><i style="width:0;background:${r.color || cfg.color || PALETTE[0]}" data-w="${Math.max(2, r.value / max * 100)}"></i></div></div>`).join('') : '<p class="muted small">—</p>';
    requestAnimationFrame(() => host.querySelectorAll('i[data-w]').forEach((b, i) => { b.style.transition = 'width .9s cubic-bezier(.2,.7,.2,1) ' + (i * 40) + 'ms'; b.style.width = b.dataset.w + '%'; }));
  }

  const DRAW = { area, spark, donut, bars };
  function draw(node) { const r = reg[node.dataset.ch]; if (!r) return; try { DRAW[r.type](node, r.cfg); } catch (e) { console.error(e); } }
  let ro = null;
  function mount(scope) {
    const list = Array.prototype.slice.call((scope || document).querySelectorAll("[data-ch]"));
    list.forEach(draw);
    if ("ResizeObserver" in window) {
      if (!ro) ro = new ResizeObserver(es => es.forEach(e => { const n = e.target; const w = Math.round(e.contentRect.width); if (n._w && Math.abs(n._w - w) > 8) draw(n); n._w = w; }));
      list.filter(n => reg[n.dataset.ch] && reg[n.dataset.ch].type !== "donut" && reg[n.dataset.ch].type !== "bars").forEach(n => { n._w = Math.round(n.clientWidth); ro.observe(n); });
    }
  }
  return { slot, mount, PALETTE, short };
})();
