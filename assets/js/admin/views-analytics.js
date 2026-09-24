/* =========================================================================
   NASIJ dashboard — analytics + reports library
   ========================================================================= */
(function () {
  'use strict';
  const N = window.NZ, S = window.NZS, Z = window.NZA, C = window.NZC;
  const { A, AR, esc, icon, money, dt, card, ph } = Z;
  const pct = v => (v || 0).toFixed(1) + '%';
  const SRC = () => ({ instagram: 'Instagram', direct: A('مباشر', 'Direct'), tiktok: 'TikTok', search: A('بحث (جوجل)', 'Search'), whatsapp: 'WhatsApp', facebook: 'Facebook', x: 'X', snapchat: 'Snapchat', youtube: 'YouTube', other: A('أخرى', 'Other') });
  const DEV = () => ({ mobile: A('موبايل', 'Mobile'), desktop: A('كمبيوتر', 'Desktop'), tablet: A('تابلت', 'Tablet') });
  const LAND = p => ({ '/': A('الرئيسية', 'Home'), '/drops': A('الدروب', 'Drop'), '/shop': A('المتجر', 'Shop'), '/custom': A('التخصيص', 'Custom'), '/checkout': A('الدفع', 'Checkout'), '/products': A('صفحات المنتجات', 'Product pages') }[p] || p);
  const donut = (rows, labelFn, fmt) => rows.length ? `<div class="donut-wrap">${C.slot('donut', { parts: rows.map((r, i) => ({ label: labelFn(r), value: r.value, color: C.PALETTE[i % C.PALETTE.length] })), center: fmt === 'money' ? C.short(rows.reduce((s, r) => s + r.value, 0)) : rows.reduce((s, r) => s + r.value, 0).toLocaleString('en-US'), sub: fmt === 'money' ? A('ج.م', 'EGP') : A('زيارة', 'sessions'), size: 150 })}<div class="legend">${rows.slice(0, 7).map((r, i) => `<div><i style="background:${C.PALETTE[i % C.PALETTE.length]}"></i>${esc(labelFn(r))}<b>${fmt === 'money' ? money(r.value) : r.value.toLocaleString('en-US')}</b></div>`).join('')}</div></div>` : `<p class="muted small">—</p>`;
  const bars = (rows, fmt) => C.slot('bars', { rows, fmt: fmt || (v => money(v)) });

  /* ═════════════════════════ ANALYTICS ═════════════════════════ */
  Z.view('analytics', {
    perm: 'analytics', title: () => A('التحليلات', 'Analytics'),
    render(arg, q) {
      const p = S.range(Z.curRange()), m = q.m || 'sales', s = S.series(m, p), k = S.kpis(p);
      const f = S.funnel(p), steps = [['sessions', A('زيارات', 'Sessions')], ['views', A('شافوا منتج', 'Viewed a product')], ['cart', A('أضافوا للشنطة', 'Added to bag')], ['checkout', A('وصلوا للدفع', 'Reached checkout')], ['purchase', A('اشتروا', 'Purchased')]];
      const max = Math.max(1, f.sessions);
      const ret = k.cur.returning;
      return `<div class="page">${ph(A('التحليلات', 'Analytics'), { act: `${Z.rangePicker(p.key)}<a class="btn" href="#reports">${icon('report')}${A('كل التقارير', 'All reports')}</a>` })}
        ${Z.demoBanner()}
        ${Z.kpiRow(p, ['sales', 'orders', 'aov', 'conv'], m, true)}
        <div class="kpis" style="--n:4">${[['sessions', A('الزيارات', 'Sessions'), k.cur.sessions.toLocaleString('en-US'), k.delta('sessions')], ['units', A('قطع مباعة', 'Units sold'), k.cur.units, k.delta('units')], ['deposits', A('عرابين الحجز', 'Deposits'), money(k.cur.deposits), k.delta('deposits')], ['returning', A('عملاء متكرّرين', 'Returning customers'), pct(ret), k.delta('returning')]].map(([mm, l, v, d]) => `<div class="kpi"${mm === 'sessions' ? ' data-metric="sessions"' : ''}><span class="kpi__l">${l}</span><span class="kpi__v num">${v} ${Z.deltaHTML(d)}</span></div>`).join('')}</div>
        ${card(Z.METRICS()[m] || '', C.slot('area', { values: s.values, prev: s.prev, labels: s.labels, fmt: v => Z.fmtMetric(m, v), fmtX: Z.fmtX(s.gran), fmtTip: t => dt(t, { weekday: 'short', day: 'numeric', month: 'short' }), names: [p.label, A('الفترة السابقة', 'Previous period')] }))}
        ${card(A('مسار الشراء', 'Conversion funnel'), `<div class="funnel">${steps.map(([key, l], i) => { const v = f[key], prv = i ? f[steps[i - 1][0]] : 0; return `<div class="funnel__s"><span class="funnel__l">${l}</span><span class="funnel__v num">${v.toLocaleString('en-US')}</span><span class="funnel__p">${i ? (prv ? pct(v / prv * 100) + ' ' + A('من الخطوة اللي قبلها', 'of previous') : '—') : ''}</span><div class="funnel__b" style="height:140px"><i style="height:${Math.max(3, v / max * 100)}%"></i></div></div>`; }).join('')}</div>`, { sub: A('من أول زيارة لحد الشراء — بتوضّح بتخسر العملاء فين.', 'From first visit to purchase — shows where shoppers drop off.') })}
        <div class="grid g3">
          ${card(A('المبيعات حسب الكولكشن', 'Sales by collection'), donut(S.breakdown('collection', p), r => r.label, 'money'))}
          ${card(A('الزيارات حسب الجهاز', 'Sessions by device'), donut(S.traffic('device', p), r => DEV()[r.k] || r.k))}
          ${card(A('مصادر الزيارات', 'Traffic sources'), bars(S.traffic('source', p).map(r => ({ label: esc(SRC()[r.k] || r.k), value: r.value })), v => v.toLocaleString('en-US')))}
        </div>
        <div class="grid g2">
          ${card(A('الأكثر مبيعاً', 'Top products'), bars(S.breakdown('product', p).slice(0, 8).map(r => ({ label: esc(r.label), value: r.value, sub: r.units + ' ' + A('قطعة', 'units') }))), { act: `<a class="btn btn--sm btn--ghost" href="#reports/by-product">${A('التقرير', 'Report')}</a>` })}
          ${card(A('الأبراج الأكثر طلباً', 'Most wanted signs'), bars(S.breakdown('sign', p).slice(0, 12).map(r => ({ label: esc(r.label), value: r.units, sub: money(r.value) })), v => v + ' ' + A('قطعة', 'units')), { act: `<a class="btn btn--sm btn--ghost" href="#reports/reservations">${A('التقرير', 'Report')}</a>` })}
        </div>
        <div class="grid g3">
          ${card(A('الألوان', 'Colours'), bars(S.breakdown('colour', p).map(r => ({ label: esc(r.label), value: r.units, color: colHex(r.k) })), v => v + ' ' + A('قطعة', 'units')))}
          ${card(A('المقاسات', 'Sizes'), bars(sizeOrder(S.breakdown('size', p)).map(r => ({ label: esc(r.label), value: r.units })), v => v + ' ' + A('قطعة', 'units')))}
          ${card(A('المحافظات', 'Governorates'), donut(S.breakdown('zone', p), r => r.label, 'money'))}
        </div>
        <div class="grid g3">
          ${card(A('طرق الدفع', 'Payment methods'), donut(S.breakdown('payment', p), r => r.label, 'money'))}
          ${card(A('حجز مقابل شراء مباشر', 'Pre-order vs direct'), donut(S.breakdown('kind', p), r => r.label, 'money'))}
          ${card(A('صفحات الدخول', 'Landing pages'), bars(S.traffic('landing', p).slice(0, 6).map(r => ({ label: esc(LAND(r.k)), value: r.value })), v => v.toLocaleString('en-US')))}
        </div>
        ${searchCard(p)}
      </div>`;
    },
    mount() { Z.$$('.kpi[data-metric]').forEach(k => k.addEventListener('click', () => { location.hash = '#analytics?m=' + k.dataset.metric; })); Z.bindDemo(); }
  });
  const colHex = k => { for (const p of Z.draft.products) { const v = p.variants.find(x => x.color === k); if (v) return v.hex; } return '#999'; };
  const SZ = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
  const sizeOrder = rows => rows.slice().sort((a, b) => SZ.indexOf(a.k) - SZ.indexOf(b.k));
  function searchCard(p) {
    const s = S.searches(p).top;
    return card(A('بحث العملاء في المتجر', 'What shoppers search for'), s.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${A('الكلمة', 'Query')}</th><th>${A('مرات', 'Times')}</th><th>${A('بدون نتايج', 'No results')}</th></tr></thead><tbody>${s.slice(0, 12).map(r => `<tr><td>${esc(r.q)}</td><td class="num">${r.n}</td><td>${r.zero ? `<span class="bdg bdg--warn">${r.zero}</span>` : '—'}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted small">${A('لسه محدش بحث.', 'No searches yet.')}</p>`, { sub: A('الكلمات اللي مالهاش نتايج = منتجات أو كلمات ناقصة في الموقع.', 'Zero-result searches point to missing products or wording.') });
  }

  /* ═════════════════════════ REPORTS ═════════════════════════ */
  const REPORTS = () => [
    { g: A('المبيعات', 'Sales'), items: [
      ['sales-over-time', A('المبيعات على مدار الوقت', 'Sales over time')], ['by-product', A('المبيعات حسب المنتج', 'Sales by product')], ['by-variant', A('المبيعات حسب المنتج واللون', 'Sales by product & colour')],
      ['by-colour', A('المبيعات حسب اللون', 'Sales by colour')], ['by-size', A('المبيعات حسب المقاس', 'Sales by size')], ['by-collection', A('المبيعات حسب الكولكشن', 'Sales by collection')],
      ['by-payment', A('المبيعات حسب طريقة الدفع', 'Sales by payment method')], ['discounts', A('استخدام أكواد الخصم', 'Discount code usage')], ['profit', A('الربح التقديري حسب المنتج', 'Estimated profit by product')]] },
    { g: A('الطلبات والتوصيل', 'Orders & delivery'), items: [['by-status', A('الطلبات حسب الحالة', 'Orders by status')], ['by-zone', A('المبيعات حسب المحافظة', 'Sales by governorate')], ['by-district', A('المبيعات حسب المنطقة', 'Sales by area')]] },
    { g: A('الدروب', 'Drop'), items: [['reservations', A('الحجوزات حسب البرج', 'Reservations by sign')], ['production', A('خطة الإنتاج (برج × لون × مقاس)', 'Production plan (sign × colour × size)')], ['deposits', A('العرابين والمتبقي', 'Deposits & balances')]] },
    { g: A('العملاء', 'Customers'), items: [['top-customers', A('أكبر العملاء', 'Top customers')], ['segments', A('شرائح العملاء', 'Customer segments')], ['new-returning', A('جدد مقابل متكرّرين', 'New vs returning')]] },
    { g: A('الزيارات والسلوك', 'Traffic & behaviour'), items: [['sessions-source', A('الزيارات حسب المصدر', 'Sessions by source')], ['sessions-device', A('الزيارات حسب الجهاز', 'Sessions by device')], ['landing', A('صفحات الدخول', 'Landing pages')], ['funnel', A('مسار الشراء', 'Conversion funnel')], ['searches', A('بحث العملاء', 'Store searches')]] },
    { g: A('المخزون', 'Inventory'), items: [['inventory', A('لقطة المخزون', 'Inventory snapshot')], ['low-stock', A('قرب يخلص', 'Low stock')], ['requests', A('طلبات التخصيص', 'Custom requests')]] }
  ];
  function runReport(id, p) {
    const bd = (dim, lbl, extra) => { const rows = S.breakdown(dim, p); return { cols: [lbl, A('طلبات/سطور', 'Orders/lines'), A('قطع', 'Units'), A('المبيعات', 'Sales')], rows: rows.map(r => [r.label, r.count, r.units || '—', money(r.value)]), raw: rows.map(r => [r.label, r.count, r.units, r.value]), chart: { type: 'bars', rows: rows.slice(0, 12).map(r => ({ label: esc(r.label), value: r.value })) } }; };
    switch (id) {
      case 'sales-over-time': { const s = S.series('sales', p), o = S.series('orders', p); return { cols: [A('الفترة', 'Period'), A('الطلبات', 'Orders'), A('المبيعات', 'Sales')], rows: s.labels.map((t, i) => [dt(t, p.gran === 'hour' ? { hour: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }), o.values[i], money(s.values[i])]).reverse(), raw: s.labels.map((t, i) => [new Date(t).toISOString(), o.values[i], s.values[i]]), chart: { type: 'area', values: s.values, prev: s.prev, labels: s.labels, gran: s.gran } }; }
      case 'by-product': return bd('product', A('المنتج', 'Product'));
      case 'by-variant': return bd('variant', A('المنتج — اللون', 'Product — colour'));
      case 'by-colour': return bd('colour', A('اللون', 'Colour'));
      case 'by-size': { const r = bd('size', A('المقاس', 'Size')); const ord = sizeOrder(S.breakdown('size', p)); r.rows = ord.map(x => [x.label, x.count, x.units, money(x.value)]); r.chart.rows = ord.map(x => ({ label: x.label, value: x.units })); return r; }
      case 'by-collection': return bd('collection', A('الكولكشن', 'Collection'));
      case 'by-payment': return bd('payment', A('طريقة الدفع', 'Payment'));
      case 'by-status': return bd('status', A('الحالة', 'Status'));
      case 'by-zone': return bd('zone', A('المحافظة', 'Governorate'));
      case 'by-district': return bd('district', A('المنطقة', 'Area'));
      case 'discounts': { const r = S.breakdown('promo', p); return { cols: [A('الكود', 'Code'), A('طلبات', 'Orders'), A('إجمالي الخصم', 'Total discount')], rows: r.map(x => [x.label, x.count, money(x.value)]), raw: r.map(x => [x.label, x.count, x.value]), chart: { type: 'bars', rows: r.map(x => ({ label: x.label, value: x.count })), fmt: 'n' } }; }
      case 'profit': {
        const c = S.costs(), m = {};
        S.orders().filter(o => o.date >= p.start && o.date < p.end && o.status !== 'cancelled').forEach(o => o.items.forEach(i => { const r = m[i.pid] || (m[i.pid] = { label: S.prodName(i.pid, i), units: 0, rev: 0, cost: c.byId[i.pid] }); r.units += i.qty; r.rev += i.price * i.qty; }));
        const rows = Object.values(m).sort((a, b) => b.rev - a.rev);
        return { note: A('الربح = الإيراد − (تكلفة القطعة × الكمية). حط تكلفة كل منتج من صفحته (بتفضل خاصة).', 'Profit = revenue − (cost × units). Set each product’s cost on its page (kept private).'), cols: [A('المنتج', 'Product'), A('قطع', 'Units'), A('الإيراد', 'Revenue'), A('التكلفة', 'Cost'), A('الربح', 'Profit'), A('الهامش', 'Margin')], rows: rows.map(r => r.cost == null ? [r.label, r.units, money(r.rev), '—', '—', '—'] : [r.label, r.units, money(r.rev), money(r.cost * r.units), money(r.rev - r.cost * r.units), pct((r.rev - r.cost * r.units) / r.rev * 100)]), raw: rows.map(r => [r.label, r.units, r.rev, r.cost == null ? '' : r.cost * r.units, r.cost == null ? '' : r.rev - r.cost * r.units]) };
      }
      case 'reservations': { const r = S.breakdown('sign', p, { preOnly: true }); return { cols: [A('البرج', 'Sign'), A('حجوزات', 'Lines'), A('قطع', 'Units'), A('قيمة كاملة', 'Full value')], rows: r.map(x => [x.label, x.count, x.units, money(x.value)]), raw: r.map(x => [x.label, x.count, x.units, x.value]), chart: { type: 'bars', rows: r.map(x => ({ label: esc(x.label), value: x.units })), fmt: 'n' } }; }
      case 'production': { const r = S.reservations(p), rows = []; r.forEach(x => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].forEach(s => { if (x.sizes[s]) rows.push([x.sign, x.col, s, x.sizes[s]]); })); return { note: A('عدد القطع المطلوب تصنيعها من كل برج ولون ومقاس — من الحجوزات غير الملغية.', 'Units to produce per sign, colour and size — from non-cancelled reservations.'), cols: [A('البرج', 'Sign'), A('اللون', 'Colour'), A('المقاس', 'Size'), A('قطع', 'Units')], rows, raw: rows }; }
      case 'deposits': { const os = S.orders().filter(o => o.preorder && o.status !== 'cancelled' && o.date >= p.start && o.date < p.end); return { cols: [A('الطلب', 'Order'), A('العميل', 'Customer'), A('الإجمالي', 'Total'), A('العربون', 'Deposit'), A('الباقي', 'Balance'), A('الحالة', 'Status')], rows: os.map(o => [o.id, o.customer.name, money(o.totals.total), money(o.totals.dueNow), money(o.totals.balance), S.STATUS()[o.status]]), raw: os.map(o => [o.id, o.customer.name, o.totals.total, o.totals.dueNow, o.totals.balance, o.status]) }; }
      case 'top-customers': { const cs = S.customers().slice(0, 50); return { all: true, cols: [A('العميل', 'Customer'), A('الموبايل', 'Phone'), A('الطلبات', 'Orders'), A('الصرف', 'Spent')], rows: cs.map(c => [c.name, c.phone, c.orders, money(c.spent)]), raw: cs.map(c => [c.name, c.phone, c.orders, c.spent]) }; }
      case 'segments': { const cs = S.customers(), SEG = S.SEGS(), m = {}; cs.forEach(c => { const r = m[c.seg] || (m[c.seg] = { n: 0, s: 0 }); r.n++; r.s += c.spent; }); const rows = Object.keys(SEG).map(k => [SEG[k], (m[k] || {}).n || 0, money((m[k] || {}).s || 0)]); return { all: true, cols: [A('الشريحة', 'Segment'), A('العملاء', 'Customers'), A('الصرف', 'Spent')], rows, raw: rows, chart: { type: 'bars', rows: Object.keys(SEG).map(k => ({ label: SEG[k], value: (m[k] || {}).n || 0 })), fmt: 'n' } }; }
      case 'new-returning': { const phones = {}, rows = { n: [0, 0], r: [0, 0] }; S.orders().filter(o => o.status !== 'cancelled').sort((a, b) => a.date - b.date).forEach(o => { const k = o.customer.phone, inR = o.date >= p.start && o.date < p.end; const ret = !!phones[k]; phones[k] = 1; if (!inR) return; const x = ret ? rows.r : rows.n; x[0]++; x[1] += o.totals.total; }); const r = [[A('عملاء جدد', 'New'), rows.n[0], money(rows.n[1])], [A('عملاء متكرّرين', 'Returning'), rows.r[0], money(rows.r[1])]]; return { cols: [A('النوع', 'Type'), A('الطلبات', 'Orders'), A('المبيعات', 'Sales')], rows: r, raw: r }; }
      case 'sessions-source': { const r = S.traffic('source', p); return { cols: [A('المصدر', 'Source'), A('الزيارات', 'Sessions')], rows: r.map(x => [SRC()[x.k] || x.k, x.value]), raw: r.map(x => [x.k, x.value]), chart: { type: 'bars', rows: r.map(x => ({ label: SRC()[x.k] || x.k, value: x.value })), fmt: 'n' } }; }
      case 'sessions-device': { const r = S.traffic('device', p); return { cols: [A('الجهاز', 'Device'), A('الزيارات', 'Sessions')], rows: r.map(x => [DEV()[x.k] || x.k, x.value]), raw: r.map(x => [x.k, x.value]), chart: { type: 'bars', rows: r.map(x => ({ label: DEV()[x.k] || x.k, value: x.value })), fmt: 'n' } }; }
      case 'landing': { const r = S.traffic('landing', p); return { cols: [A('الصفحة', 'Page'), A('الزيارات', 'Sessions')], rows: r.map(x => [LAND(x.k), x.value]), raw: r.map(x => [x.k, x.value]) }; }
      case 'funnel': { const f = S.funnel(p); const st = [['sessions', A('زيارات', 'Sessions')], ['views', A('شافوا منتج', 'Viewed product')], ['cart', A('أضافوا للشنطة', 'Added to bag')], ['checkout', A('وصلوا للدفع', 'Checkout')], ['purchase', A('اشتروا', 'Purchased')]]; const rows = st.map(([k, l], i) => [l, f[k], i ? pct(f[st[i - 1][0]] ? f[k] / f[st[i - 1][0]] * 100 : 0) : '—', pct(f.sessions ? f[k] / f.sessions * 100 : 0)]); return { cols: [A('الخطوة', 'Step'), A('العدد', 'Count'), A('من اللي قبلها', 'Of previous'), A('من الزيارات', 'Of sessions')], rows, raw: rows }; }
      case 'searches': { const r = S.searches(p).top; return { cols: [A('الكلمة', 'Query'), A('مرات', 'Times'), A('بدون نتايج', 'No results')], rows: r.map(x => [x.q, x.n, x.zero]), raw: r.map(x => [x.q, x.n, x.zero]) }; }
      case 'inventory': case 'low-stock': { const r = S.inventory().filter(x => x.track && (id === 'inventory' || x.stock - x.open <= 2)); return { all: true, note: r.length ? '' : A('مفيش ألوان متتبّع مخزونها — فعّلها من صفحة المنتج.', 'No colours have stock tracking on — enable it on the product page.'), cols: [A('المنتج', 'Product'), A('اللون', 'Colour'), A('المقاس', 'Size'), A('في المخزن', 'On hand'), A('محجوز', 'Committed'), A('المتاح', 'Available')], rows: r.map(x => [AR() ? x.p.title_ar : x.p.title_en, AR() ? x.v.color_ar || x.v.color_en : x.v.color_en, x.size, x.stock, x.open, x.stock - x.open]), raw: r.map(x => [x.p.title_en, x.v.color_en, x.size, x.stock, x.open, x.stock - x.open]) }; }
      case 'requests': { const r = S.requests().filter(x => x.date >= p.start && x.date < p.end); return { cols: [A('الطلب', 'Request'), A('العميل', 'Customer'), A('المقاس', 'Size'), A('الكمية', 'Qty'), A('الخامة', 'Fabric'), A('الحالة', 'Status')], rows: r.map(x => [x.id, x.name, x.width + '×' + x.height, x.qty, x.material || x.materialOther || '', x.status]), raw: r.map(x => [x.id, x.name, x.width + 'x' + x.height, x.qty, x.material || x.materialOther || '', x.status]) }; }
    }
    return null;
  }
  Z.view('reports', {
    perm: 'analytics', title: () => A('التقارير', 'Reports'),
    render(id) {
      if (!id) return `<div class="page">${ph(A('التقارير', 'Reports'), { act: Z.rangePicker(Z.curRange()) })}
        ${Z.demoBanner()}
        <div class="grid g3">${REPORTS().map(g => card(g.g, `<div style="display:grid;gap:2px">${g.items.map(([k, l]) => `<a href="#reports/${k}" class="row" style="padding:7px 8px;border-radius:8px;color:var(--ink)">${icon('report')}<span>${l}</span></a>`).join('')}</div>`)).join('')}</div></div>`;
      const meta = REPORTS().flatMap(g => g.items).find(x => x[0] === id);
      const p = S.range(Z.curRange()), r = runReport(id, p);
      if (!meta || !r) return `<div class="page">${ph(A('تقرير غير موجود', 'Report not found'), { back: '#reports' })}</div>`;
      const ch = r.chart ? (r.chart.type === 'area' ? C.slot('area', { values: r.chart.values, prev: r.chart.prev, labels: r.chart.labels, fmt: v => money(v), fmtX: Z.fmtX(r.chart.gran), names: [p.label, A('الفترة السابقة', 'Previous period')] }) : C.slot('bars', { rows: r.chart.rows, fmt: r.chart.fmt === 'n' ? (v => v.toLocaleString('en-US')) : (v => money(v)) })) : '';
      return `<div class="page">${ph(meta[1], { back: '#reports', act: `${r.all ? `<span class="bdg bdg--plain">${A('كل الوقت', 'All time')}</span>` : Z.rangePicker(p.key)}<button class="btn" data-rcsv>${icon('down2')}CSV</button>` })}
        ${r.note ? `<div class="banner">${icon('report')}<span class="small">${r.note}</span></div>` : ''}
        ${ch ? card('', ch) : ''}
        <section class="card card--flush"><div class="tbl-wrap"><table class="tbl"><thead><tr>${r.cols.map((c, i) => `<th class="${i ? 'r' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${r.rows.map(row => `<tr>${row.map((v, i) => `<td class="${i ? 'r num' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${r.cols.length}"><div class="empty">${A('مفيش بيانات في الفترة دي.', 'No data for this period.')}</div></td></tr>`}</tbody></table></div></section></div>`;
    },
    mount(id) {
      Z.bindDemo();
      const b = Z.$('[data-rcsv]'); if (!b) return;
      b.addEventListener('click', () => { const p = S.range(Z.curRange()), r = runReport(id, p); Z.csv('nasij-' + id, r.cols, r.raw || r.rows); });
    }
  });
})();
