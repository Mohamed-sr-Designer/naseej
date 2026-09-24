/* =========================================================================
   NASIJ dashboard numbers (Shopify-style analytics).
   Sources:
   · orders   : nz_orders (this device) + nz_demo_orders (separate demo set)
   · visits   : nz_track (real sessions from track.js) + nz_demo_traffic (daily demo aggregates)
   · costs    : nz_adm_costs (admin-only, never published)
   Every function takes a period from range(): today, yesterday, 7/30/90 days,
   12 months — each with the matching previous period for comparison.
   ========================================================================= */
window.NZS = (function () {
  'use strict';
  const N = window.NZ;
  const K = { demo: 'nz_demo_orders', traffic: 'nz_demo_traffic', track: 'nz_track', cost: 'nz_adm_costs', demoReq: 'nz_demo_requests' };
  const read = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const AR = () => (localStorage.getItem('nz_adm_lang') || 'ar') === 'ar';
  const A = (ar, en) => (AR() ? ar : en);
  const HOUR = 36e5, DAY = 864e5;
  const day0 = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const inc = (m, k, v) => { m[k] = (m[k] || 0) + (v == null ? 1 : v); };
  const valid = o => o.status !== 'cancelled';
  const r2 = n => Math.round(n * 100) / 100;

  /* ─────────────── periods ─────────────── */
  const RANGES = () => ({ today: A('اليوم', 'Today'), yesterday: A('أمس', 'Yesterday'), '7': A('آخر 7 أيام', 'Last 7 days'), '30': A('آخر 30 يوم', 'Last 30 days'), '90': A('آخر 90 يوم', 'Last 90 days'), '365': A('آخر 12 شهر', 'Last 12 months') });
  function range(key) {
    key = RANGES()[key] ? String(key) : '30';
    const t0 = day0(Date.now());
    let start, end, gran;
    if (key === 'today') { start = t0; end = t0 + DAY; gran = 'hour'; }
    else if (key === 'yesterday') { start = t0 - DAY; end = t0; gran = 'hour'; }
    else { const n = +key; end = t0 + DAY; start = end - n * DAY; gran = n > 120 ? 'week' : 'day'; }
    const len = end - start;
    // today compares with yesterday up to the same hour (like Shopify)
    const prev = key === 'today' ? { start: start - DAY, end: Date.now() - DAY } : { start: start - len, end: start };
    return { key, start, end, len, gran, label: RANGES()[key], prev };
  }
  const inP = (t, p) => t >= p.start && t < p.end;
  function buckets(p) {
    const step = p.gran === 'hour' ? HOUR : p.gran === 'week' ? 7 * DAY : DAY;
    const n = Math.ceil((p.end - p.start) / step);
    return { step, n, at: t => Math.floor((t - p.start) / step), labels: Array.from({ length: n }, (_, i) => p.start + i * step) };
  }

  /* ─────────────── orders ─────────────── */
  function orders() {
    const real = N.orders.list().map(o => Object.assign({}, o, { demo: false }));
    const demo = read(K.demo, []).map(o => Object.assign({}, o, { demo: true }));
    return real.concat(demo).sort((a, b) => b.date - a.date);
  }
  const hasDemo = () => read(K.demo, []).length > 0;
  const get = id => orders().find(o => o.id === id);
  function mutate(id, fn) {
    const d = read(K.demo, []), o = d.find(x => x.id === id);
    if (o) { fn(o); write(K.demo, d); return true; }
    const r = N.orders.list(), q = r.find(x => x.id === id);
    if (q) { fn(q); N.orders.save(r); return true; }
    return false;
  }
  const setStatus = (id, s) => mutate(id, o => { o.status = s; o.log = (o.log || []).concat([{ s, t: Date.now() }]); });
  const addNote = (id, text) => mutate(id, o => { o.notes = (o.notes || []).concat([{ text, t: Date.now() }]); });
  function remove(id) { const d = read(K.demo, []); if (d.some(x => x.id === id)) { write(K.demo, d.filter(x => x.id !== id)); return; } N.orders.remove(id); }

  /* ─────────────── cost & profit (admin-only) ─────────────── */
  const costs = () => Object.assign({ byId: {} }, read(K.cost, {}));
  const setCost = (id, v) => { const c = costs(); if (v === '' || v == null) delete c.byId[id]; else c.byId[id] = +v; write(K.cost, c); };
  function metrics(o, c) {
    c = c || costs();
    const t = o.totals || {};
    let cogs = 0, known = true;
    (o.items || []).forEach(i => { const v = c.byId[i.pid]; if (v == null) known = false; else cogs += v * i.qty; });
    return { gross: t.total || 0, discount: t.discount || 0, delivery: t.delivery || 0, cogs: known ? cogs : null, profit: known ? r2((t.total || 0) - (t.delivery || 0) - cogs) : null };
  }

  /* ─────────────── visits ─────────────── */
  function realSessions() { const d = read(K.track, null); return d && d.sessions ? d.sessions : []; }
  /* one row per day: { d, s, dev:{}, src:{}, v, c, k, b, land:{} } */
  function trafficDays(p) {
    const byDay = {};
    const row = t => { const k = day0(t); return byDay[k] || (byDay[k] = { d: k, s: 0, dev: {}, src: {}, v: 0, c: 0, k: 0, b: 0, land: {} }); };
    read(K.traffic, []).forEach(x => { if (!inP(x.d, p) && !inP(x.d + DAY - 1, p)) return; const r = row(x.d); r.s += x.s; r.v += x.v; r.c += x.c; r.k += x.k; r.b += x.b; Object.keys(x.dev).forEach(k => inc(r.dev, k, x.dev[k])); Object.keys(x.src).forEach(k => inc(r.src, k, x.src[k])); Object.keys(x.land || {}).forEach(k => inc(r.land, k, x.land[k])); });
    realSessions().forEach(s => { if (!inP(s.t, p)) return; const r = row(s.t); r.s++; inc(r.dev, s.dev); inc(r.src, s.src); inc(r.land, s.land || '/'); if (s.views && s.views.length) r.v++; if (s.cart) r.c++; if (s.co) r.k++; if (s.buy) r.b++; });
    return Object.values(byDay).sort((a, b) => a.d - b.d);
  }
  function sessionsIn(p) { return trafficDays(p).reduce((n, r) => n + r.s, 0); }

  /* ─────────────── KPIs ─────────────── */
  function kpiRaw(p) {
    const os = orders().filter(o => inP(o.date, p) && valid(o));
    const sales = os.reduce((s, o) => s + (o.totals.total || 0), 0);
    const units = os.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0);
    const pre = os.filter(o => o.preorder);
    const deposits = pre.reduce((s, o) => s + (o.totals.dueNow || 0), 0);
    const balance = pre.reduce((s, o) => s + (o.totals.balance || 0), 0);
    const reservations = pre.reduce((s, o) => s + o.items.filter(i => i.pre).reduce((n, i) => n + i.qty, 0), 0);
    const sessions = sessionsIn(p);
    const phones = {}; orders().filter(valid).forEach(o => { const k = o.customer.phone; (phones[k] = phones[k] || []).push(o.date); });
    const returning = os.filter(o => (phones[o.customer.phone] || []).some(t => t < o.date)).length;
    return { sales, orders: os.length, aov: os.length ? sales / os.length : 0, units, sessions, conv: sessions ? Math.min(100, os.length / sessions * 100) : 0, returning: os.length ? returning / os.length * 100 : 0, deposits, balance, reservations, discount: os.reduce((s, o) => s + (o.totals.discount || 0), 0) };
  }
  function kpis(p) { const cur = kpiRaw(p), prev = kpiRaw(p.prev); const delta = k => (prev[k] ? (cur[k] - prev[k]) / prev[k] * 100 : null); return { cur, prev, delta }; }

  /* ─────────────── series ─────────────── */
  function series(metric, p) {
    const b = buckets(p), vals = new Array(b.n).fill(0), prv = new Array(b.n).fill(0);
    const pp = { start: p.prev.start, end: p.prev.start + p.len };
    const at = (t, per) => Math.floor((t - per.start) / b.step);
    const addO = (arr, per, fn) => orders().filter(o => inP(o.date, per) && valid(o)).forEach(o => { const i = at(o.date, per); if (i >= 0 && i < b.n) arr[i] += fn(o); });
    if (metric === 'sales') { addO(vals, p, o => o.totals.total); addO(prv, pp, o => o.totals.total); }
    else if (metric === 'orders') { addO(vals, p, () => 1); addO(prv, pp, () => 1); }
    else if (metric === 'units') { addO(vals, p, o => o.items.reduce((n, i) => n + i.qty, 0)); addO(prv, pp, o => o.items.reduce((n, i) => n + i.qty, 0)); }
    else if (metric === 'sessions' || metric === 'conv') {
      const fill = (arr, per) => { if (b.step < DAY) { realSessions().filter(s => inP(s.t, per)).forEach(s => { const i = at(s.t, per); if (i >= 0 && i < b.n) arr[i]++; }); return; } trafficDays(per).forEach(r => { const i = at(r.d, per); if (i >= 0 && i < b.n) arr[i] += r.s; }); };
      fill(vals, p); fill(prv, pp);
      if (metric === 'conv') {
        const ov = new Array(b.n).fill(0), op = new Array(b.n).fill(0); addO(ov, p, () => 1); addO(op, pp, () => 1);
        for (let i = 0; i < b.n; i++) { vals[i] = vals[i] ? ov[i] / vals[i] * 100 : 0; prv[i] = prv[i] ? op[i] / prv[i] * 100 : 0; }
      }
    } else if (metric === 'aov') {
      const s1 = new Array(b.n).fill(0), n1 = new Array(b.n).fill(0), s2 = new Array(b.n).fill(0), n2 = new Array(b.n).fill(0);
      addO(s1, p, o => o.totals.total); addO(n1, p, () => 1); addO(s2, pp, o => o.totals.total); addO(n2, pp, () => 1);
      for (let i = 0; i < b.n; i++) { vals[i] = n1[i] ? s1[i] / n1[i] : 0; prv[i] = n2[i] ? s2[i] / n2[i] : 0; }
    }
    return { labels: b.labels, values: vals.map(r2), prev: prv.map(r2), gran: p.gran };
  }

  /* ─────────────── breakdowns ─────────────── */
  const zoneName = id => { const z = (N.C.settings.shipping.zones || []).find(x => x.id === id); return z ? (AR() ? z.ar : z.en) : id; };
  const distName = (zid, id) => { for (const z of (N.C.settings.shipping.zones || [])) { const d = (z.districts || []).find(x => x.id === id); if (d) return AR() ? d.ar : d.en; } return id; };
  const payName = k => { const p = (N.C.settings.payments || {})[k]; return p ? (AR() ? p.ar : p.en) : k; };
  const prodName = (id, it) => { const p = N.product(id); return p ? (AR() ? p.title_ar : p.title_en) : (it ? (AR() ? it.title_ar : it.title_en) : id); };
  const colName = it => (AR() ? (it.color_ar || it.color_en) : (it.color_en || it.color_ar));
  const colName2 = (pid, vid) => { const p = N.product(pid), v = p && p.variants.find(x => x.id === vid); return v ? (AR() ? v.color_ar || v.color_en : v.color_en) : vid; };
  const STATUS = () => ({ reserved: A('محجوز', 'Reserved'), pending: A('جديد', 'New'), confirmed: A('مؤكَّد', 'Confirmed'), shipped: A('في الطريق', 'Shipped'), delivered: A('اتسلّم', 'Delivered'), cancelled: A('ملغي', 'Cancelled') });
  function breakdown(dim, p, opts) {
    opts = opts || {};
    const m = {};
    const add = (k, label, v, n) => { const r = m[k] || (m[k] = { k, label, value: 0, count: 0, units: 0 }); r.value += v; r.count += n || 1; };
    orders().filter(o => inP(o.date, p) && (dim === 'status' || valid(o))).forEach(o => {
      if (dim === 'zone') return add(o.address.zone, zoneName(o.address.zone), o.totals.total);
      if (dim === 'district') return add(o.address.district, zoneName(o.address.zone) + ' · ' + distName(o.address.zone, o.address.district), o.totals.total);
      if (dim === 'payment') return add(o.payment, payName(o.payment), o.totals.total);
      if (dim === 'status') return add(o.status, STATUS()[o.status] || o.status, o.totals.total);
      if (dim === 'promo') { if (o.promo) add(o.promo, o.promo, o.totals.discount || 0); return; }
      if (dim === 'kind') return add(o.preorder ? 'pre' : 'buy', o.preorder ? A('حجز', 'Pre-order') : A('شراء مباشر', 'Direct'), o.totals.total);
      o.items.forEach(i => {
        if (opts.preOnly && !i.pre) return;
        const v = i.price * i.qty;
        let k, label;
        if (dim === 'product') { k = i.pid; label = prodName(i.pid, i); }
        else if (dim === 'variant') { k = i.vid; label = prodName(i.pid, i) + ' — ' + colName(i); }
        else if (dim === 'colour') { const p2 = N.product(i.pid), vv = p2 && p2.variants.find(x => x.id === i.vid); k = vv ? vv.color : i.color_en; label = colName(i); }
        else if (dim === 'size') { k = i.size; label = i.size; }
        else if (dim === 'collection') { const c = N.collection(i.collection); k = i.collection; label = c ? (AR() ? c.title_ar : c.title_en) : i.collection; }
        else if (dim === 'sign') { const p2 = N.product(i.pid); if (!p2 || !p2.sign) return; const sg = N.sign(p2.sign); k = p2.sign; label = sg.glyph + '︎ ' + (AR() ? sg.ar : sg.en); }
        else return;
        const r = m[k] || (m[k] = { k, label, value: 0, count: 0, units: 0 }); r.value += v; r.count++; r.units += i.qty;
      });
    });
    return Object.values(m).sort((a, b) => b.value - a.value);
  }

  /* reservations matrix — production planning for the drop */
  function reservations(p) {
    p = p || { start: 0, end: Infinity };
    const rows = {};
    orders().filter(o => inP(o.date, p) && valid(o)).forEach(o => o.items.filter(i => i.pre).forEach(i => {
      const pr = N.product(i.pid); const sign = pr && pr.sign || i.pid;
      const vv = pr && pr.variants.find(x => x.id === i.vid); const col = vv ? vv.color : i.color_en;
      const k = sign + '|' + col;
      const r = rows[k] || (rows[k] = { sign, col, sizes: {}, total: 0, deposits: 0 });
      inc(r.sizes, i.size, i.qty); r.total += i.qty; r.deposits += (i.deposit || 0) * i.qty;
    }));
    return Object.values(rows).sort((a, b) => b.total - a.total);
  }

  /* funnel & traffic */
  function funnel(p) {
    const ds = trafficDays(p);
    const s = ds.reduce((n, r) => n + r.s, 0), v = ds.reduce((n, r) => n + r.v, 0), c = ds.reduce((n, r) => n + r.c, 0), k = ds.reduce((n, r) => n + r.k, 0);
    const b = orders().filter(o => inP(o.date, p) && valid(o)).length;
    return { sessions: s, views: Math.max(v, c), cart: Math.max(c, k), checkout: Math.max(k, b), purchase: b };
  }
  function traffic(dim, p) {
    const m = {};
    trafficDays(p).forEach(r => { const src = dim === 'device' ? r.dev : dim === 'source' ? r.src : r.land; Object.keys(src).forEach(k => inc(m, k, src[k])); });
    return Object.keys(m).map(k => ({ k, value: m[k] })).sort((a, b) => b.value - a.value);
  }
  function searches(p) {
    const m = {}, zero = {};
    realSessions().filter(s => inP(s.t, p)).forEach(s => (s.search || []).forEach(q => { inc(m, q.q); if (!q.n) inc(zero, q.q); }));
    return { top: Object.keys(m).map(q => ({ q, n: m[q], zero: zero[q] || 0 })).sort((a, b) => b.n - a.n) };
  }

  /* customers */
  function customers() {
    const m = {};
    orders().filter(valid).forEach(o => {
      const k = o.customer.phone || o.customer.name;
      const c = m[k] || (m[k] = { phone: o.customer.phone, name: o.customer.name, orders: 0, spent: 0, first: o.date, last: o.date, zone: o.address.zone, demo: o.demo, ids: [] });
      c.orders++; c.spent += o.totals.total; c.first = Math.min(c.first, o.date); c.last = Math.max(c.last, o.date); c.ids.push(o.id);
    });
    const list = Object.values(m).sort((a, b) => b.spent - a.spent);
    const vipCut = list.length ? list[Math.max(0, Math.floor(list.length * .1) - 1)].spent : Infinity;
    list.forEach(c => {
      const days = (Date.now() - c.last) / DAY;
      c.seg = c.spent >= vipCut && c.orders > 1 ? 'vip' : c.orders > 1 && days > 90 ? 'risk' : c.orders > 1 ? 'loyal' : days <= 30 ? 'new' : 'once';
    });
    return list;
  }
  const SEGS = () => ({ vip: A('كبار العملاء', 'VIP'), loyal: A('عملاء متكرّرين', 'Returning'), new: A('جدد (آخر 30 يوم)', 'New (30 days)'), once: A('طلب مرة واحدة', 'One-time'), risk: A('معرّضين للفقد', 'At risk') });

  /* inventory */
  function inventory() {
    const sold = {};
    orders().filter(o => valid(o) && o.status !== 'delivered').forEach(o => o.items.forEach(i => { if (!i.pre) inc(sold, i.vid + '|' + i.size, i.qty); }));
    const rows = [];
    N.products(true).forEach(p => p.variants.forEach(v => {
      (p.sizes || []).forEach(s => rows.push({ p, v, size: s, track: !!v.track, stock: v.track ? +((v.stock || {})[s] || 0) : null, open: sold[v.id + '|' + s] || 0 }));
    }));
    return rows;
  }

  /* ─────────────── demo data ─────────────── */
  function rnd(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pick(r, arr, w) { if (!w) return arr[Math.floor(r() * arr.length)]; const tot = w.reduce((a, b) => a + b, 0); let x = r() * tot; for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; }
  function seedDemo() {
    const r = rnd(20260924), now = Date.now(), t0 = day0(now);
    const act = N.products().filter(p => N.collection(p.collection) && N.collection(p.collection).status === 'active');
    const zod = act.filter(p => p.sign), rest = act.filter(p => !p.sign);
    const zones = N.C.settings.shipping.zones || [];
    const colW = { black: 35, white: 14, blue: 20, olive: 12, maroon: 19, navy: 22, cream: 18, brown: 14 };
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'], sizeW = [12, 30, 30, 20, 8];
    const people = Array.from({ length: 70 }, (_, i) => ({ name: A('عميل تجريبي ', 'Demo customer ') + String(i + 1).padStart(2, '0'), phone: '0100' + String(1000000 + Math.floor(r() * 8999999)).slice(0, 7) }));
    const orders = [], traffic = [];
    let seq = 5000;
    for (let d = 179; d >= 0; d--) {
      const day = t0 - d * DAY, dow = new Date(day).getDay();
      const hype = d < 45 ? 1.9 - d / 60 : 1;
      const base = (48 + (179 - d) * .32) * (dow === 5 || dow === 4 ? 1.25 : 1) * hype;
      const s = Math.round(base * (.8 + r() * .4));
      const conv = .016 + r() * .012;
      const nOrders = Math.max(0, Math.round(s * conv + (r() - .5)));
      const dev = { mobile: Math.round(s * (.74 + r() * .06)), desktop: 0, tablet: Math.round(s * .04) }; dev.desktop = Math.max(0, s - dev.mobile - dev.tablet);
      const srcKeys = ['instagram', 'direct', 'tiktok', 'search', 'whatsapp', 'facebook', 'other'], srcW = [38, 22, 16, 10, 8, 4, 2], src = {};
      for (let i = 0; i < s; i++) inc(src, pick(r, srcKeys, srcW));
      const land = { '/': Math.round(s * .55), '/drops': Math.round(s * (d < 45 ? .25 : .05)), '/collections/sweatpants': Math.round(s * .1) }; land['/products'] = Math.max(0, s - land['/'] - land['/drops'] - land['/collections/sweatpants']);
      const v = Math.round(s * (.55 + r() * .1)), c = Math.round(s * (.09 + r() * .04)), k = Math.max(nOrders, Math.round(s * (.04 + r() * .02)));
      traffic.push({ d: day, s, dev, src, v, c, k, b: nOrders, land });
      for (let n = 0; n < nOrders; n++) {
        const t = day + Math.floor((9 + r() * 14) * HOUR) + Math.floor(r() * HOUR);
        if (t > now) continue;
        const who = r() < .22 && orders.length > 8 ? orders[Math.floor(r() * orders.length)].customer : pick(r, people);
        const lines = [], nl = r() < .72 ? 1 : r() < .85 ? 2 : 3;
        const preAllowed = d < 45 && zod.length;
        for (let j = 0; j < nl; j++) {
          const usePre = preAllowed && r() < .62;
          const pool = usePre ? zod : (rest.length ? rest : zod);
          const p = pick(r, pool, pool.map(x => x.sales || 100));
          const v2 = pick(r, p.variants, p.variants.map(x => colW[x.color] || 10));
          const size = pick(r, sizes, sizeW);
          const pre = !!(usePre && p.preorder);
          const ex = lines.find(l => l.vid === v2.id && l.size === size);
          if (ex) { ex.qty++; continue; }
          lines.push({ pid: p.id, vid: v2.id, title_en: p.title_en, title_ar: p.title_ar, color_en: v2.color_en, color_ar: v2.color_ar, size, qty: 1, price: p.price, pre, deposit: pre ? Math.round(p.price * ((N.C.drop.depositPct || 20) / 100)) : null, img: v2.images[0], collection: p.collection, src: 'direct' });
        }
        const sub = lines.reduce((a, l) => a + l.price * l.qty, 0);
        const promo = r() < .18 ? 'NASIJ10' : '';
        const disc = promo ? Math.round(sub * .1) : 0;
        const zone = pick(r, zones, zones.map(z => z.id === 'cairo' ? 60 : 40));
        const dist = pick(r, zone.districts);
        const del = sub - disc >= (N.C.settings.shipping.freeOver || 3000) ? 0 : (zone.fee || 60);
        const hasPre = lines.some(l => l.pre), onlyPre = lines.every(l => l.pre);
        const nowAmt = lines.reduce((a, l) => a + (l.pre ? l.deposit : l.price) * l.qty, 0);
        const ratio = sub ? (sub - disc) / sub : 1;
        const total = sub - disc + del, dueNow = Math.round(nowAmt * ratio) + (onlyPre ? 0 : del);
        const age = (now - t) / DAY;
        let status = onlyPre ? (age > 2 ? 'confirmed' : 'reserved') : age > 6 ? pick(r, ['delivered', 'cancelled'], [94, 6]) : age > 3 ? pick(r, ['shipped', 'delivered'], [40, 60]) : age > 1 ? pick(r, ['confirmed', 'shipped'], [60, 40]) : 'pending';
        const payment = hasPre ? pick(r, ['instapay', 'vodafone'], [65, 35]) : pick(r, ['cod', 'instapay', 'vodafone'], [58, 28, 14]);
        orders.push({ id: 'D' + (seq++), date: t, status, lang: 'ar', demo: true, customer: { name: who.name, phone: who.phone, email: '' }, address: { zone: zone.id, district: dist.id, line: A('عنوان تجريبي', 'Demo address'), notes: '' }, payment, promo, items: lines, totals: { subtotal: sub, discount: disc, delivery: del, total, dueNow, balance: total - dueNow }, preorder: hasPre, dropId: hasPre ? N.C.drop.id : null, log: [{ s: status, t }] });
      }
    }
    write(K.demo, orders); write(K.traffic, traffic);
    // a few demo custom requests
    const reqs = [['فريق كرة قدم', 'Football team', 30, 40, 24], ['شركة ناشئة', 'Startup crew', 12, 12, 60], ['حفلة تخرّج', 'Graduation party', 28, 35, 45]].map((x, i) => ({ id: 'CR-DEMO' + (i + 1), date: now - (i * 3 + 1) * DAY, status: ['new', 'contacted', 'quoted'][i], name: A('عميل تجريبي ', 'Demo customer ') + (i + 1), phone: '0100000000' + i, alt: '', width: x[2], height: x[3], qty: x[4], material: 'Heavyweight cotton 320gsm', materialOther: '', notes: A(x[0], x[1]), images: [], lang: 'ar', demo: true }));
    write(K.demoReq, reqs);
    return orders.length;
  }
  function clearDemo() { localStorage.removeItem(K.demo); localStorage.removeItem(K.traffic); localStorage.removeItem(K.demoReq); }
  function requests() { return N.requests.list().concat(read(K.demoReq, []).map(r => Object.assign({}, r, { demo: true }))).sort((a, b) => b.date - a.date); }
  function setRequest(id, patch) { const d = read(K.demoReq, []), x = d.find(r => r.id === id); if (x) { Object.assign(x, patch); write(K.demoReq, d); return; } N.requests.set(id, patch); }
  function removeRequest(id) { const d = read(K.demoReq, []); if (d.some(r => r.id === id)) { write(K.demoReq, d.filter(r => r.id !== id)); return; } N.requests.remove(id); }

  /* ─────────────── activity feed ─────────────── */
  function activity(n) {
    const ev = [];
    orders().slice(0, 40).forEach(o => ev.push({ t: o.date, kind: o.preorder ? 'pre' : 'order', o }));
    requests().slice(0, 10).forEach(r => ev.push({ t: r.date, kind: 'req', r }));
    return ev.sort((a, b) => b.t - a.t).slice(0, n || 12);
  }

  return { A, AR, RANGES, range, buckets, orders, hasDemo, get, setStatus, addNote, remove, costs, setCost, metrics, trafficDays, kpis, series, breakdown, reservations, funnel, traffic, searches, customers, SEGS, STATUS, inventory, seedDemo, clearDemo, requests, setRequest, removeRequest, activity, zoneName, distName, payName, prodName, colName2 };
})();
