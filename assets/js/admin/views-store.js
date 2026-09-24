/* =========================================================================
   NASIJ dashboard — online store (CMS) + settings
   homepage · theme · navigation · pages · journal · store text · media ·
   general · shipping · payments · staff · publish
   ========================================================================= */
(function () {
  'use strict';
  const N = window.NZ, S = window.NZS, Z = window.NZA;
  const { A, AR, esc, icon, money, card, ph, F, listEd } = Z;
  const D = () => Z.draft;
  const T = (o, f) => (AR() ? (o[f + '_ar'] || o[f + '_en']) : (o[f + '_en'] || o[f + '_ar'])) || '';

  /* link targets for menus & buttons */
  function targets() {
    const t = [['#/', A('الرئيسية', 'Home')], ['#/shop', A('كل المنتجات', 'Shop all')], ['#/drops', A('الدروب', 'Drop page')], ['#/custom', A('التخصيص', 'Custom page')], ['#/faq', A('الأسئلة', 'FAQ')], ['#/size-guide', A('دليل المقاسات', 'Size guide')], ['#/journal', A('المجلة', 'Journal')], ['#/account', A('طلباتي', 'Orders')]];
    D().collections.forEach(c => t.push(['#/collections/' + c.handle, A('كولكشن: ', 'Collection: ') + T(c, 'title')]));
    (D().pages.policies || []).forEach(p => t.push(['#/policies/' + p.id, A('صفحة: ', 'Page: ') + T(p, 'title')]));
    return t;
  }
  function linkField(path, label) {
    const v = Z.get(path) || '', opts = targets(), known = opts.some(o => o[0] === v);
    return `<label class="fld"><span>${label}</span><select class="inp" data-link="${esc(path)}">${opts.map(o => `<option value="${esc(o[0])}"${o[0] === v ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}<option value="__custom"${!known ? ' selected' : ''}>${A('رابط مخصص…', 'Custom link…')}</option></select>${!known ? `<input class="inp" dir="ltr" data-p="${esc(path)}" value="${esc(v)}" placeholder="https://… / #/…" style="margin-top:6px">` : ''}</label>`;
  }
  function bindLinks() { Z.$$('[data-link]').forEach(s => s.addEventListener('change', () => { if (s.value === '__custom') { Z.set(s.dataset.link, ''); } else Z.set(s.dataset.link, s.value); Z.rerender(); })); }

  /* ═════════════════════════ HOMEPAGE ═════════════════════════ */
  const OPEN = new Set();
  const TYPES = () => ({ hero: A('البطل (أول الصفحة)', 'Hero'), dial: A('دايرة الأبراج التفاعلية', 'Zodiac dial'), drop: A('شريط الدروب', 'Drop rail'), collections: A('بلاطات الكولكشنز', 'Collection tiles'), products: A('شبكة منتجات', 'Product grid'), editorial: A('صورة + نص', 'Image with text'), band: A('شريط بلون مميز', 'Accent band'), faq: A('أسئلة شائعة', 'FAQ') });
  const BLANK = { hero: { type: 'hero', on: true, image: 'images/zodiac/zodiac-banner.jpg', kicker_en: '', kicker_ar: '', title_en: 'New headline', title_ar: 'عنوان جديد', text_en: '', text_ar: '', cta_en: 'Shop now', cta_ar: 'تسوّق دلوقتي', to: '#/shop' },
    dial: { type: 'dial', on: true, kicker_en: 'Find your sign', kicker_ar: 'اعرف برجك' }, drop: { type: 'drop', on: true, collection: 'zodiac', limit: 12, kicker_en: 'The drop', kicker_ar: 'الدروب', title_en: '', title_ar: '' },
    collections: { type: 'collections', on: true, kicker_en: 'Shop by category', kicker_ar: 'تسوّق حسب الفئة', title_en: '', title_ar: '' }, products: { type: 'products', on: true, source: 'collection', collection: '', limit: 8, kicker_en: '', kicker_ar: '', title_en: 'New section', title_ar: 'قسم جديد' },
    editorial: { type: 'editorial', on: true, image: '', kicker_en: '', kicker_ar: '', title_en: '', title_ar: '', text_en: '', text_ar: '', cta_en: '', cta_ar: '', to: '#/shop' }, band: { type: 'band', on: true, kicker_en: '', kicker_ar: '', title_en: '', title_ar: '', text_en: '', text_ar: '', cta_en: '', cta_ar: '', to: '#/custom' }, faq: { type: 'faq', on: true, limit: 5, kicker_en: 'Good to know', kicker_ar: 'معلومات تهمّك', title_en: 'Questions', title_ar: 'أسئلة' } };
  function sectionFields(b, s) {
    const cols = D().collections.map(c => [c.id, T(c, 'title')]);
    const kt = `${F.bi(b, 'kicker', A('سطر صغير فوق العنوان', 'Kicker'))}${F.bi(b, 'title', A('العنوان', 'Title'))}`;
    switch (s.type) {
      case 'hero': return `${F.img(b + '.image', A('الصورة', 'Image'), { max: 2400, sub: A('عرضية — 1920×1020 تقريباً', 'landscape — about 1920×1020') })}${kt}${F.bi(b, 'text', A('النص', 'Text'), { rows: 2 })}<div class="fgrid">${F.bi(b, 'cta', A('الزرار الأساسي', 'Primary button'))}</div>${linkField(b + '.to', A('رابط الزرار الأساسي', 'Primary button link'))}${F.bi(b, 'cta2', A('الزرار التاني', 'Secondary button'))}${linkField(b + '.to2', A('رابط الزرار التاني', 'Secondary button link'))}`;
      case 'dial': return `${kt}${F.bi(b, 'text', A('النص', 'Text'), { rows: 2 })}<p class="muted small" style="margin:0">${A('الدايرة بتسحب الأبراج وصورها من منتجات الأبراج تلقائياً.', 'The dial pulls signs and photos from the zodiac products automatically.')}</p>`;
      case 'drop': return `${kt}<div class="fgrid">${F.select(b + '.collection', A('الكولكشن', 'Collection'), cols)}${F.num(b + '.limit', A('عدد المنتجات', 'Products to show'), { min: 1 })}</div>`;
      case 'collections': return `${kt}<p class="muted small" style="margin:0">${A('البلاطات = الكولكشنز الظاهرة اللي فيها منتجات. الترتيب والصور من «الكولكشنز».', 'Tiles = visible collections with products. Order and images come from Collections.')} <a href="#collections">${A('الكولكشنز', 'Collections')}</a></p>`;
      case 'products': return `${kt}<div class="fgrid">${F.select(b + '.source', A('المصدر', 'Source'), [['best', A('الأكثر مبيعاً (كل المتجر)', 'Best sellers (whole store)')], ['collection', A('كولكشن معيّن', 'A collection')]], { rr: 1 })}${F.num(b + '.limit', A('عدد المنتجات', 'Products to show'), { min: 1 })}${s.source !== 'best' ? F.select(b + '.collection', A('الكولكشن', 'Collection'), [['', '—']].concat(cols)) : ''}</div>`;
      case 'editorial': return `${F.img(b + '.image', A('الصورة', 'Image'), { max: 1800 })}${kt}${F.bi(b, 'text', A('النص', 'Text'), { rows: 3 })}${F.bi(b, 'cta', A('الزرار', 'Button'))}${linkField(b + '.to', A('رابط الزرار', 'Button link'))}`;
      case 'band': return `${kt}${F.bi(b, 'text', A('النص', 'Text'), { rows: 2 })}${F.bi(b, 'cta', A('الزرار', 'Button'))}${linkField(b + '.to', A('رابط الزرار', 'Button link'))}`;
      case 'faq': return `${kt}${F.num(b + '.limit', A('عدد الأسئلة', 'Questions to show'), { min: 1 })}<p class="muted small" style="margin:0">${A('الأسئلة نفسها من «الصفحات والأسئلة».', 'The questions come from Pages & FAQ.')}</p>`;
    }
    return '';
  }
  Z.view('homepage', {
    perm: 'content', title: () => A('أقسام الرئيسية', 'Homepage'),
    render() {
      const secs = D().home.sections, TY = TYPES();
      return `<div class="page page--narrow">${ph(A('أقسام الصفحة الرئيسية', 'Homepage sections'), { act: `<button class="btn" data-preview>${icon('eye')}${A('معاينة', 'Preview')}</button>` })}
        <p class="muted" style="margin:-6px 0 0">${A('رتّب الأقسام، اخفي أو اظهر أي قسم، وعدّل كل نص وصورة. التعديلات بتتحفظ تلقائي كمسودة لحد ما تنشر.', 'Reorder, show/hide and edit every text and image. Changes autosave as a draft until you publish.')}</p>
        <div class="lst">${secs.map((s, i) => `<div class="lst__r${s.on === false ? ' off' : ''}"><span class="lst__h"><button class="iconb" data-move="home.sections" data-i="${i}" data-d="-1"${i ? '' : ' disabled'}>${icon('up')}</button><button class="iconb" data-move="home.sections" data-i="${i}" data-d="1"${i < secs.length - 1 ? '' : ' disabled'}>${icon('down')}</button></span>
          <details data-sec="${esc(s.id || i)}"${OPEN.has(String(s.id || i)) ? ' open' : ''}><summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px"><b>${TY[s.type] || s.type}</b><span class="muted small">${esc(T(s, 'title') || T(s, 'kicker') || '')}</span></summary><div style="display:grid;gap:12px;margin-top:14px">${sectionFields('home.sections.' + i, s)}</div></details>
          <span class="lst__a">${F.bool('home.sections.' + i + '.on', '', { rr: 1 })}<button class="iconb" data-del="home.sections" data-i="${i}">${icon('trash')}</button></span></div>`).join('')}</div>
        ${card(A('إضافة قسم', 'Add section'), `<div class="row">${Object.keys(TY).map(k => `<button class="btn btn--sm" data-add="home.sections" data-blank='${esc(JSON.stringify(Object.assign({ id: k + '-' + Date.now().toString(36).slice(-4) }, BLANK[k])))}'>${icon('plus')}${TY[k]}</button>`).join('')}</div>`)}</div>`;
    },
    mount() {
      bindLinks();
      Z.$$('details[data-sec]').forEach(d => d.addEventListener('toggle', () => { if (d.open) OPEN.add(d.dataset.sec); else OPEN.delete(d.dataset.sec); }));
    }
  });

  /* ═════════════════════════ THEME ═════════════════════════ */
  Z.view('theme', {
    perm: 'content', title: () => A('الثيم والهوية', 'Theme'),
    render() {
      return `<div class="page page--narrow">${ph(A('الثيم والهوية', 'Theme'), { act: `<button class="btn" data-preview>${icon('eye')}${A('معاينة', 'Preview')}</button>` })}
        ${card(A('الألوان', 'Colours'), `<div class="fgrid g3">${F.color('theme.accent', A('لون الإبراز (الأزرار والشريط)', 'Accent (buttons, marquee)'))}${F.color('theme.night', A('الخلفية الغامقة', 'Dark surface'))}${F.color('theme.paper', A('الخلفية الفاتحة', 'Light surface'))}</div>
          <div id="swPrev" style="margin-top:14px;display:flex;border-radius:10px;overflow:hidden;border:1px solid var(--line)"><div style="flex:1;padding:18px;background:${esc(D().theme.night)};color:#F3F0EA;font-weight:700">NASIJ <span style="background:${esc(D().theme.accent)};color:#111;padding:4px 10px;border-radius:4px;margin-inline-start:8px">${A('احجز برجك', 'Reserve')}</span></div><div style="flex:1;padding:18px;background:${esc(D().theme.paper)};color:#111;font-weight:700">${A('ورق فاتح', 'Bone paper')}</div></div>`)}
        ${card(A('الشكل', 'Style'), `<div style="display:grid;gap:12px">${F.num('theme.radius', A('استدارة الحواف (px)', 'Corner radius (px)'), { min: 0 })}${F.bool('theme.grain', A('ملمس الحبيبات (grain) على الأقسام الغامقة', 'Film grain on dark sections'))}
          <div class="fgrid">${F.select('settings.defaultMode', A('المظهر الافتراضي', 'Default mode'), [['light', A('فاتح + غامق (مختلط)', 'Light (mixed)')], ['dark', A('غامق بالكامل', 'All dark')]])}${F.select('settings.defaultLang', A('اللغة الافتراضية', 'Default language'), [['en', 'English'], ['ar', 'العربية']])}</div></div>`)}
        ${card(A('اللوجو', 'Logo'), `<div class="fgrid">${F.img('theme.logo', A('اللوجو الغامق (على خلفية فاتحة)', 'Dark logo (on light)'), { max: 600 })}${F.img('theme.logoLight', A('اللوجو الفاتح (على خلفية غامقة)', 'Light logo (on dark)'), { max: 600 })}</div><p class="muted small" style="margin:10px 0 0">${A('لو فاضي بيستخدم اللوجو الأصلي.', 'Empty = the original logo.')}</p>`)}
        ${card(A('شريط الإعلانات المتحرك', 'Announcement marquee'), listEd('settings.announcement', b => F.pair(b, A('رسالة', 'Message')), { en: '', ar: '' }))}</div>`;
    }
  });

  /* ═════════════════════════ NAVIGATION ═════════════════════════ */
  Z.view('navigation', {
    perm: 'content', title: () => A('القوائم', 'Navigation'),
    render() {
      const row = b => `${F.pair(b, A('الاسم', 'Label'))}${linkField(b + '.to', A('الرابط', 'Link'))}`;
      return `<div class="page page--narrow">${ph(A('القوائم', 'Navigation'))}
        ${card(A('القائمة الرئيسية (الهيدر)', 'Main menu (header)'), listEd('nav.header', row, { en: 'Link', ar: 'رابط', to: '#/shop' }), { sub: A('أول رابط بيظهر عليه نقطة «لايف» وقت الدروب.', 'The first link gets a “live” dot while the drop runs.') })}
        ${card(A('قائمة الفوتر', 'Footer menu'), listEd('nav.footer', row, { en: 'Link', ar: 'رابط', to: '#/faq' }))}</div>`;
    },
    mount() { bindLinks(); }
  });

  /* ═════════════════════════ PAGES & FAQ ═════════════════════════ */
  Z.view('pages', {
    perm: 'content', title: () => A('الصفحات والأسئلة', 'Pages & FAQ'),
    render(arg) {
      const tab = arg || 'faq';
      const tabs = [['faq', A('الأسئلة الشائعة', 'FAQ')], ['policies', A('السياسات', 'Policies')], ['size', A('دليل المقاسات', 'Size guide')], ['custom', A('صفحة التخصيص', 'Custom page')]];
      let body = '';
      if (tab === 'faq') body = card('', listEd('pages.faq', b => `${F.bi(b, 'q', A('السؤال', 'Question'))}${F.bi(b, 'a', A('الإجابة', 'Answer'), { rows: 3 })}`, { q_en: '', q_ar: '', a_en: '', a_ar: '' }, { addLabel: A('سؤال جديد', 'New question') }));
      if (tab === 'policies') body = card('', listEd('pages.policies', (b, it) => `${F.text(b + '.id', A('الرابط', 'URL id'), { dir: 'ltr', hint: '#/policies/' + esc(it.id || '') })}${F.bi(b, 'title', A('العنوان', 'Title'))}${F.bi(b, 'body', A('المحتوى (HTML بسيط: h3, p, ul, li)', 'Content (simple HTML: h3, p, ul, li)'), { rows: 8 })}`, { id: 'new-page', title_en: 'New page', title_ar: 'صفحة جديدة', body_en: '<p></p>', body_ar: '<p></p>' }, { addLabel: A('صفحة جديدة', 'New page') }));
      if (tab === 'size') body = card('', `${F.bi('pages.sizeGuide', 'text', A('نص الإرشاد', 'Fit guidance'), { rows: 3 })}<h3 style="margin:18px 0 8px;font-size:.95rem">${A('جدول المقاسات (سم)', 'Measurements (cm)')}</h3>
        ${listEd('pages.sizeGuide.rows', b => `<div class="fgrid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${F.text(b + '.size', A('المقاس', 'Size'), { dir: 'ltr' })}${F.text(b + '.chest', A('الصدر', 'Chest'), { dir: 'ltr' })}${F.text(b + '.length', A('الطول', 'Length'), { dir: 'ltr' })}${F.text(b + '.sleeve', A('الكم', 'Sleeve'), { dir: 'ltr' })}</div>`, { size: 'M', chest: '', length: '', sleeve: '' }, { addLabel: A('صف جديد', 'Add row') })}
        <p class="muted small">${A('الجدول بيظهر في الموقع أول ما تضيف صفوف.', 'The table appears on the site once it has rows.')}</p>`);
      if (tab === 'custom') body = card('', `<div style="display:grid;gap:12px">${F.bi('pages.custom', 'title', A('العنوان', 'Title'))}${F.bi('pages.custom', 'text', A('النص', 'Text'), { rows: 2 })}${F.bi('pages.custom', 'done', A('رسالة بعد الإرسال', 'Message after sending'), { rows: 2 })}
        <h3 style="margin:8px 0 0;font-size:.95rem">${A('الخامات المتاحة', 'Fabric options')}</h3>${listEd('pages.custom.materials', b => F.pair(b, A('الخامة', 'Fabric')), { en: '', ar: '' })}</div>`);
      return `<div class="page page--narrow">${ph(A('الصفحات والأسئلة', 'Pages & FAQ'))}<div class="tabs" style="background:#fff;border-radius:12px 12px 0 0">${tabs.map(([k, l]) => `<a href="#pages/${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}</div>${body}</div>`;
    }
  });

  /* ═════════════════════════ JOURNAL ═════════════════════════ */
  Z.view('journal', {
    perm: 'content', title: () => A('المجلة', 'Journal'),
    render(id) {
      const js = D().journal || [];
      if (id) {
        const i = js.findIndex(a => a.id === id); if (i < 0) return `<div class="page">${ph(A('غير موجود', 'Not found'), { back: '#journal' })}</div>`;
        const b = 'journal.' + i;
        return `<div class="page page--narrow">${ph(esc(T(js[i], 'title')), { back: '#journal', act: `<button class="btn btn--danger btn--ghost" data-jdel="${i}">${icon('trash')}${A('حذف', 'Delete')}</button>` })}
          ${card('', `<div style="display:grid;gap:12px">${F.select(b + '.status', A('الحالة', 'Status'), [['published', A('منشور', 'Published')], ['draft', A('مسودة', 'Draft')]])}${F.bi(b, 'title', A('العنوان', 'Title'))}${F.bi(b, 'cat', A('التصنيف', 'Category'))}${F.text(b + '.date', A('التاريخ', 'Date'))}${F.img(b + '.image', A('الصورة', 'Cover image'), { max: 1600 })}${F.bi(b, 'excerpt', A('المقتطف', 'Excerpt'), { rows: 2 })}${F.bi(b, 'body', A('المقال (HTML: h2, p, ul)', 'Article (HTML: h2, p, ul)'), { rows: 14 })}</div>`)}</div>`;
      }
      return `<div class="page">${ph(A('المجلة', 'Journal'), { act: `<button class="btn btn--pri" data-jadd>${icon('plus')}${A('مقال جديد', 'New article')}</button>` })}
        <section class="card card--flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>${A('العنوان', 'Title')}</th><th>${A('التصنيف', 'Category')}</th><th>${A('الحالة', 'Status')}</th><th class="r">${A('الترتيب', 'Order')}</th></tr></thead><tbody>
        ${js.map((a, i) => `<tr data-href="journal/${esc(a.id)}"><td style="width:60px"><img class="thumb" src="${esc(a.image)}" alt=""></td><td><b>${esc(T(a, 'title'))}</b><div class="faint small">${esc(a.date || '')}</div></td><td class="small">${esc(T(a, 'cat'))}</td><td>${a.status === 'draft' ? `<span class="bdg">${A('مسودة', 'Draft')}</span>` : `<span class="bdg bdg--ok">${A('منشور', 'Published')}</span>`}</td><td class="r"><button class="iconb" data-move="journal" data-i="${i}" data-d="-1"${i ? '' : ' disabled'}>${icon('up')}</button><button class="iconb" data-move="journal" data-i="${i}" data-d="1"${i < js.length - 1 ? '' : ' disabled'}>${icon('down')}</button></td></tr>`).join('')}</tbody></table></div></section></div>`;
    },
    mount(id) {
      const js = D().journal || (D().journal = []);
      const add = Z.$('[data-jadd]'); if (add) add.addEventListener('click', () => { const nid = 'a' + Date.now().toString(36).slice(-5); js.unshift({ id: nid, status: 'draft', date: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), cat_en: 'Style', cat_ar: 'ستايل', title_en: 'New article', title_ar: 'مقال جديد', excerpt_en: '', excerpt_ar: '', image: '', body_en: '<p></p>', body_ar: '<p></p>' }); Z.save(); location.hash = '#journal/' + nid; });
      const del = Z.$('[data-jdel]'); if (del) del.addEventListener('click', () => Z.confirmBox(A('حذف المقال؟', 'Delete this article?'), A('حذف', 'Delete'), () => { js.splice(+del.dataset.jdel, 1); Z.save(); location.hash = '#journal'; }, true));
    }
  });

  /* ═════════════════════════ STORE TEXT ═════════════════════════ */
  const GROUPS = () => ({ nav: A('القوائم والهيدر', 'Header & menus'), c: A('عام', 'General'), p: A('صفحة المنتج', 'Product page'), l: A('صفحات المنتجات', 'Listings'), d: A('الدروب', 'Drop'), b: A('الشنطة', 'Bag'), k: A('الدفع', 'Checkout'), o: A('تأكيد الطلب', 'Order confirmation'), a: A('طلباتي', 'Account'), r: A('التخصيص', 'Custom page'), m: A('متفرقات', 'Misc') });
  Z.view('copy', {
    perm: 'content', title: () => A('نصوص الموقع', 'Store text'),
    render(arg, q) {
      const g = q.g || 'nav', qq = (q.q || '').toLowerCase(), G = GROUPS(), copy = D().copy || {};
      const keys = Object.keys(N.STR).filter(k => (qq ? (k + ' ' + N.STR[k].join(' ') + ' ' + JSON.stringify(copy[k] || '')).toLowerCase().indexOf(qq) > -1 : k.split('.')[0] === g));
      return `<div class="page">${ph(A('نصوص الموقع', 'Store text'))}
        <p class="muted" style="margin:-6px 0 0">${A('كل كلمة في المتجر (أزرار، رسائل، عناوين). اكتب بديل بالعربي أو الإنجليزي — الفاضي بيستخدم النص الأصلي الظاهر كخلفية باهتة.', 'Every word in the store (buttons, messages, labels). Write a replacement — empty fields keep the original shown as a hint.')} <code>{name}</code> = ${A('قيمة بتتحط تلقائي', 'a value filled in automatically')}.</p>
        <section class="card card--flush"><div class="tabs">${Object.keys(G).map(k => `<a href="#copy?g=${k}" class="${!qq && g === k ? 'on' : ''}">${G[k]}</a>`).join('')}</div>
        <div class="tbar"><input class="inp" style="max-width:340px" id="cq" placeholder="${A('دوّر في كل النصوص…', 'Search all text…')}" value="${esc(q.q || '')}"></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:26%">${A('المكان', 'Key')}</th><th>العربية</th><th>English</th><th></th></tr></thead><tbody>
        ${keys.map(k => { const d = N.STR[k], o = copy[k] || {}; return `<tr><td class="mono small faint">${esc(k)}</td><td><input class="inp" dir="rtl" data-copy="${esc(k)}" data-l="ar" value="${esc(o.ar || '')}" placeholder="${esc(d[1])}"></td><td><input class="inp" dir="ltr" data-copy="${esc(k)}" data-l="en" value="${esc(o.en || '')}" placeholder="${esc(d[0])}"></td><td>${o.ar || o.en ? `<button class="iconb" data-creset="${esc(k)}" title="${A('رجوع للأصلي', 'Reset')}">${icon('x')}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div></section></div>`;
    },
    mount(arg, q) {
      Z.$$('[data-copy]').forEach(i => i.addEventListener('input', () => { const c = D().copy || (D().copy = {}); const o = c[i.dataset.copy] || (c[i.dataset.copy] = {}); o[i.dataset.l] = i.value; if (!o.en && !o.ar) delete c[i.dataset.copy]; Z.save(); }));
      Z.$$('[data-creset]').forEach(b => b.addEventListener('click', () => { delete (D().copy || {})[b.dataset.creset]; Z.save(); Z.rerender(); }));
      let t; const cq = Z.$('#cq'); cq.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { location.hash = '#copy?' + new URLSearchParams({ g: q.g || 'nav', q: cq.value }).toString(); setTimeout(() => { const n = Z.$('#cq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 30); }, 350); });
    }
  });

  /* ═════════════════════════ MEDIA ═════════════════════════ */
  Z.view('media', {
    perm: 'content', title: () => A('مكتبة الصور', 'Media'),
    render() {
      const lib = D().media || [], used = Z.allImages();
      const all = Array.from(new Set(lib.concat(used)));
      return `<div class="page">${ph(A('مكتبة الصور', 'Media'), { act: `<label class="btn btn--pri">${icon('upload')}${A('رفع صورة', 'Upload')}<input type="file" accept="image/*" hidden data-up="media" data-push="1" data-max="2000"></label>` })}
        <p class="muted" style="margin:-6px 0 0">${A('الصور المرفوعة بتتحفظ كمسودة وبتتنشر كملفات حقيقية مع الضغط على «نشر». بعد كده تقدر تختارها في أي مكان من «من المكتبة».', 'Uploads are kept in the draft and become real files when you Publish. Then pick them anywhere via “From library”.')} · ${all.length} ${A('صورة', 'images')}</p>
        <section class="card"><div class="media" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${all.map(u => `<div class="media__i"><img src="${esc(u)}" alt="" loading="lazy"><span class="act"><button data-cp="${esc(u)}" title="copy">⧉</button>${lib.indexOf(u) > -1 ? `<button data-mdel="${esc(u)}" title="delete">✕</button>` : ''}</span></div>`).join('')}</div></section></div>`;
    },
    mount() {
      Z.$$('[data-cp]').forEach(b => b.addEventListener('click', () => { try { navigator.clipboard.writeText(b.dataset.cp.slice(0, 200)); } catch (e) { } Z.toast(A('اتنسخ المسار', 'Path copied')); }));
      Z.$$('[data-mdel]').forEach(b => b.addEventListener('click', () => { D().media = (D().media || []).filter(u => u !== b.dataset.mdel); Z.save(); Z.rerender(); }));
    }
  });

  /* ═════════════════════════ GENERAL ═════════════════════════ */
  Z.view('general', {
    perm: 'settings', title: () => A('الإعدادات العامة', 'General'),
    render() {
      return `<div class="page page--narrow">${ph(A('الإعدادات العامة', 'General settings'))}
        ${card(A('البراند', 'Brand'), `<div style="display:grid;gap:12px">${F.bi('settings', 'name', A('الاسم', 'Name'))}${F.bi('settings', 'tagline', A('الشعار', 'Tagline'), { rows: 2 })}</div>`)}
        ${card(A('التواصل', 'Contact'), `<div class="fgrid">${F.text('settings.whatsapp', A('رقم واتساب (بكود الدولة)', 'WhatsApp (with country code)'), { dir: 'ltr', ph: '2012…' })}${F.text('settings.email', A('الإيميل', 'Email'), { dir: 'ltr' })}${F.text('settings.instagram', A('إنستجرام (بدون @)', 'Instagram (no @)'), { dir: 'ltr' })}${F.text('settings.tiktok', A('تيك توك (بدون @)', 'TikTok (no @)'), { dir: 'ltr' })}</div>`)}
        ${card(A('العملة', 'Currency'), `<div class="fgrid">${F.text('settings.currency_ar', A('بالعربي', 'Arabic'))}${F.text('settings.currency_en', A('بالإنجليزي', 'English'), { dir: 'ltr' })}</div>`)}
        ${card(A('محركات البحث (SEO)', 'Search engines (SEO)'), `<div style="display:grid;gap:12px">${F.bi('settings', 'seo_title', A('عنوان الصفحة', 'Page title'))}${F.bi('settings', 'seo_desc', A('الوصف', 'Description'), { rows: 2 })}</div>`)}</div>`;
    }
  });

  /* ═════════════════════════ SHIPPING ═════════════════════════ */
  Z.view('shipping', {
    perm: 'settings', title: () => A('الشحن والتوصيل', 'Shipping'),
    render() {
      return `<div class="page page--narrow">${ph(A('الشحن والتوصيل', 'Shipping & delivery'))}
        ${card(A('قواعد عامة', 'Rules'), `<div style="display:grid;gap:12px">${F.num('settings.shipping.freeOver', A('توصيل مجاني فوق', 'Free delivery over'), { sub: A('ج.م — 0 = بدون', 'EGP — 0 = never'), min: 0 })}${F.bi('settings.shipping', 'eta', A('مدة التوصيل (بتظهر للعميل)', 'Delivery time (shown to customers)'), { rows: 2 })}</div>`)}
        ${card(A('مناطق التوصيل', 'Delivery zones'), listEd('settings.shipping.zones', (b, z) => `<div class="fgrid g3">${F.text(b + '.ar', A('المحافظة', 'Governorate') + ' AR')}${F.text(b + '.en', A('المحافظة', 'Governorate') + ' EN', { dir: 'ltr' })}${F.num(b + '.fee', A('رسوم التوصيل', 'Delivery fee'), { min: 0 })}</div>${F.bool(b + '.on', A('بنوصّل هنا', 'We deliver here'))}
          <details><summary style="cursor:pointer" class="small"><b>${(z.districts || []).length}</b> ${A('منطقة — اضغط للتعديل', 'areas — click to edit')}</summary><div style="margin-top:10px">${listEd(b + '.districts', bb => `<div class="fgrid">${F.text(bb + '.ar', A('المنطقة', 'Area') + ' AR')}${F.text(bb + '.en', A('المنطقة', 'Area') + ' EN', { dir: 'ltr' })}</div>`, { id: 'area-' + Date.now().toString(36).slice(-4), ar: '', en: '' }, { addLabel: A('منطقة جديدة', 'New area') })}</div></details>`,
          { id: 'zone-' + Date.now().toString(36).slice(-4), en: 'New zone', ar: 'منطقة جديدة', fee: 60, on: true, districts: [] }, { addLabel: A('محافظة جديدة', 'New governorate') }), { sub: A('المحافظات اللي بتظهر في صفحة الدفع. حالياً: القاهرة والجيزة.', 'Governorates offered at checkout. Currently Cairo and Giza.') })}</div>`;
    }
  });

  /* ═════════════════════════ PAYMENTS ═════════════════════════ */
  Z.view('payments', {
    perm: 'settings', title: () => A('طرق الدفع', 'Payments'),
    render() {
      const pb = k => `settings.payments.${k}`;
      return `<div class="page page--narrow">${ph(A('طرق الدفع', 'Payment methods'))}
        ${card(A('الدفع عند الاستلام', 'Cash on delivery'), `<div style="display:grid;gap:12px">${F.bool(pb('cod') + '.on', A('مفعّل', 'Enabled'), { hint: A('مش بيظهر مع الحجز المسبق — العربون لازم يتحوّل', 'Hidden for pre-orders — deposits must be transferred') })}${F.pair(pb('cod'), A('الاسم', 'Label'))}</div>`)}
        ${card(A('إنستاباي', 'InstaPay'), `<div style="display:grid;gap:12px">${F.bool(pb('instapay') + '.on', A('مفعّل', 'Enabled'))}${F.text(pb('instapay') + '.handle', A('عنوان إنستاباي', 'InstaPay address'), { dir: 'ltr' })}${F.pair(pb('instapay'), A('الاسم', 'Label'))}</div>`)}
        ${card(A('فودافون كاش', 'Vodafone Cash'), `<div style="display:grid;gap:12px">${F.bool(pb('vodafone') + '.on', A('مفعّل', 'Enabled'))}${F.text(pb('vodafone') + '.number', A('رقم المحفظة', 'Wallet number'), { dir: 'ltr' })}${F.pair(pb('vodafone'), A('الاسم', 'Label'))}</div>`)}
        <div class="banner">${icon('card')}<div class="grow"><b>${A('الدفع بالكارت أونلاين', 'Online card payments')}</b><span class="small">${A('ممكن نضيف Paymob أو Fawry لما يبقى فيه سيرفر للموقع.', 'Paymob or Fawry can be added once the store has a server.')}</span></div></div></div>`;
    }
  });

  /* ═════════════════════════ STAFF ═════════════════════════ */
  Z.view('staff', {
    perm: 'owner', title: () => A('الموظفين', 'Staff'),
    render() {
      const us = Z.users(), P = Z.PERMS();
      return `<div class="page page--narrow">${ph(A('الموظفين والصلاحيات', 'Staff & permissions'), { act: `<button class="btn btn--pri" data-uadd>${icon('plus')}${A('موظف جديد', 'Add staff')}</button>` })}
        ${us.map((u, i) => card(`${esc(u.name || u.email)} <span class="bdg ${u.role === 'owner' ? 'bdg--brand' : ''} bdg--plain">${u.role === 'owner' ? A('المالك', 'Owner') : A('موظف', 'Staff')}</span>`, `<div class="row" style="margin-bottom:10px"><span class="mono small" dir="ltr">${esc(u.email)}</span></div>
          ${u.role === 'owner' ? `<p class="muted small" style="margin:0 0 10px">${A('المالك عنده كل الصلاحيات.', 'The owner can access everything.')}</p>` : `<div style="display:grid;gap:8px;margin-bottom:12px">${P.map(([k, l]) => `<label class="tg"><input type="checkbox" data-uperm="${i}|${k}" ${(u.perms || []).indexOf(k) > -1 ? 'checked' : ''}><span class="tg__sw"></span><span><b>${l}</b></span></label>`).join('')}</div>`}
          <div class="row"><button class="btn btn--sm" data-upw="${i}">${icon('lock')}${A('تغيير كلمة السر', 'Change password')}</button>${u.role !== 'owner' ? `<button class="btn btn--sm btn--danger btn--ghost" data-urm="${i}">${icon('trash')}${A('إزالة', 'Remove')}</button>` : ''}</div>`)).join('')}
        <div class="banner banner--warn">${icon('lock')}<div class="grow"><b>${A('مهم', 'Important')}</b><span class="small">${A('الحسابات والصلاحيات دي بتتحفظ في المتصفح ده بس (مش بتتنشر). لحسابات حقيقية على أكتر من جهاز لازم سيرفر تسجيل دخول (Firebase / Supabase).', 'These accounts live in this browser only (never published). Real multi-device accounts need a sign-in server (Firebase / Supabase).')}</span></div></div></div>`;
    },
    mount() {
      const us = Z.users();
      Z.$$('[data-uperm]').forEach(c => c.addEventListener('change', () => { const [i, k] = c.dataset.uperm.split('|'); const u = us[+i]; u.perms = (u.perms || []).filter(x => x !== k); if (c.checked) u.perms.push(k); Z.saveUsers(us); Z.toast(A('اتحفظ', 'Saved')); }));
      Z.$$('[data-urm]').forEach(b => b.addEventListener('click', () => Z.confirmBox(A('إزالة الموظف؟', 'Remove this staff member?'), A('إزالة', 'Remove'), () => { us.splice(+b.dataset.urm, 1); Z.saveUsers(us); Z.rerender(); }, true)));
      Z.$$('[data-upw]').forEach(b => b.addEventListener('click', () => {
        const u = us[+b.dataset.upw];
        Z.modal(A('كلمة سر جديدة', 'New password') + ' — ' + esc(u.email), `<label class="fld"><span>${A('كلمة السر (8 حروف على الأقل)', 'Password (min 8 characters)')}</span><input class="inp" type="password" dir="ltr" id="npw"></label>`, `<button class="btn" data-mclose>${A('إلغاء', 'Cancel')}</button><button class="btn btn--pri" id="npwOk">${A('حفظ', 'Save')}</button>`, m => {
          m.querySelector('#npwOk').addEventListener('click', async () => { const v = m.querySelector('#npw').value; if (v.length < 8) return Z.toast(A('قصيرة', 'Too short'), true); u.hash = await Z.sha(v); Z.saveUsers(us); Z.closeModal(); Z.toast(A('اتغيّرت', 'Changed')); });
        });
      }));
      Z.$('[data-uadd]').addEventListener('click', () => {
        Z.modal(A('موظف جديد', 'New staff member'), `<label class="fld"><span>${A('الاسم', 'Name')}</span><input class="inp" id="un"></label><label class="fld"><span>${A('الإيميل', 'Email')}</span><input class="inp" dir="ltr" type="email" id="ue"></label><label class="fld"><span>${A('كلمة السر', 'Password')}</span><input class="inp" dir="ltr" type="password" id="up"></label>`, `<button class="btn" data-mclose>${A('إلغاء', 'Cancel')}</button><button class="btn btn--pri" id="uok">${A('إضافة', 'Add')}</button>`, m => {
          m.querySelector('#uok').addEventListener('click', async () => {
            const name = m.querySelector('#un').value.trim(), email = m.querySelector('#ue').value.trim().toLowerCase(), pw = m.querySelector('#up').value;
            if (!/@/.test(email) || pw.length < 8) return Z.toast(A('إيميل صحيح وكلمة سر 8 حروف', 'Valid email and an 8+ character password'), true);
            if (us.some(x => x.email === email)) return Z.toast(A('الإيميل موجود', 'Email already exists'), true);
            us.push({ email, name, role: 'staff', hash: await Z.sha(pw), perms: ['orders'] }); Z.saveUsers(us); Z.closeModal(); Z.rerender();
          });
        });
      });
    }
  });

  /* ═════════════════════════ PUBLISH ═════════════════════════ */
  Z.view('publish', {
    perm: 'settings', title: () => A('النشر', 'Publish'),
    render() {
      const g = Z.gh(), tk = Z.token(), dirty = Z.dirty();
      return `<div class="page page--narrow">${ph(A('نشر التعديلات', 'Publish changes'), { badge: dirty ? `<span class="bdg bdg--warn">${A('فيه تعديلات', 'Changes pending')}</span>` : `<span class="bdg bdg--ok">${A('مطابق للمنشور', 'Up to date')}</span>` })}
        ${card(A('إزاي النشر بيشتغل', 'How publishing works'), `<ol style="margin:0;padding-inline-start:18px;display:grid;gap:6px" class="small"><li>${A('كل تعديل بتعمله بيتحفظ «مسودة» في المتصفح ده.', 'Every edit is saved as a draft in this browser.')}</li><li>${A('«معاينة» بتفتح الموقع الحقيقي بالمسودة (ليك إنت بس).', '“Preview” opens the real store with your draft (only you see it).')}</li><li>${A('«نشر» بيرفع الصور الجديدة وملف المحتوى على GitHub، والموقع بيتحدّث لكل الناس خلال دقيقة أو اتنين.', '“Publish” uploads new images and the content file to GitHub; the store updates for everyone within a minute or two.')}</li></ol>`)}
        ${card(A('النشر على GitHub', 'Publish to GitHub'), `<div style="display:grid;gap:12px"><div class="fgrid g3">${F.text('settings.publish.owner', A('الحساب', 'Owner'), { dir: 'ltr' })}${F.text('settings.publish.repo', A('المستودع', 'Repository'), { dir: 'ltr' })}${F.text('settings.publish.branch', A('الفرع', 'Branch'), { dir: 'ltr' })}</div>
          <label class="fld"><span>${A('توكن GitHub', 'GitHub token')} <small>${A('fine-grained — صلاحية Contents: Read & write على المستودع ده بس', 'fine-grained — Contents: Read & write on this repo only')}</small></span><input class="inp mono" type="password" dir="ltr" id="ghTok" value="${tk ? '••••••••••••' : ''}" placeholder="github_pat_…"></label>
          <label class="tg"><input type="checkbox" id="ghRem" ${localStorage.getItem(Z.LS.gh) ? 'checked' : ''}><span class="tg__sw"></span><span><b>${A('افتكر التوكن على الجهاز ده', 'Remember the token on this device')}</b><small>${A('لو مقفول بيتنسي أول ما تقفل التاب', 'Off = forgotten when the tab closes')}</small></span></label>
          <div class="row"><button class="btn btn--brand" id="pubBtn" ${dirty ? '' : 'disabled'}>${icon('upload')}${A('نشر دلوقتي', 'Publish now')}</button><button class="btn" data-preview>${icon('eye')}${A('معاينة', 'Preview')}</button><button class="btn" id="dlBtn">${icon('down2')}${A('تحميل content.json', 'Download content.json')}</button>${dirty ? `<button class="btn btn--danger btn--ghost" data-discard>${A('تجاهل التعديلات', 'Discard changes')}</button>` : ''}</div>
          <div id="pubLog" class="small muted"></div></div>`)}
        ${card(A('من غير توكن؟', 'No token?'), `<p class="small" style="margin:0">${A('حمّل content.json وارفعه بنفسك في المستودع مكان الملف القديم — نفس النتيجة. (الصور الجديدة لازم تتنشر بالتوكن أو تترفع يدوي في images/uploads.)', 'Download content.json and replace the one in the repository yourself — same result. (New images need the token, or upload them manually to images/uploads.)')}</p>`)}
        <div class="banner banner--warn">${icon('lock')}<div class="grow"><b>${A('حدود النسخة الحالية (موقع ثابت على GitHub Pages)', 'Limits of this version (static site on GitHub Pages)')}</b><span class="small">${A('الطلبات وطلبات التخصيص والزيارات بتتحفظ على جهاز العميل نفسه، وكل طلب بيتبعتلك على واتساب برقم الطلب. عشان تشوف كل الطلبات من كل الأجهزة هنا في اللوحة، محتاجين نربط قاعدة بيانات (Firebase أو Supabase) — الكود جاهز يتربط من مكان واحد.', 'Orders, custom requests and visits are stored on the customer’s own device, and every order reaches you on WhatsApp with its number. To see all orders from all devices here, connect a database (Firebase or Supabase) — the code is ready to plug in at one place.')}</span></div></div></div>`;
    },
    mount() {
      const tok = Z.$('#ghTok'), rem = Z.$('#ghRem');
      const saveTok = () => { const v = tok.value.trim(); if (!v || /^•+$/.test(v)) return; sessionStorage.setItem(Z.LS.gh, v); if (rem.checked) localStorage.setItem(Z.LS.gh, v); else localStorage.removeItem(Z.LS.gh); };
      tok.addEventListener('change', saveTok);
      rem.addEventListener('change', () => { const v = Z.token(); if (rem.checked && v) localStorage.setItem(Z.LS.gh, v); else localStorage.removeItem(Z.LS.gh); });
      Z.$('#dlBtn').addEventListener('click', () => Z.download());
      const pb = Z.$('#pubBtn'); if (pb) pb.addEventListener('click', async () => {
        saveTok(); const log = Z.$('#pubLog'); pb.disabled = true;
        try { await Z.publish(m => { log.textContent = m; }); log.innerHTML = `<b style="color:var(--ok)">✓ ${A('اتنشر! الموقع هيتحدّث خلال دقيقة أو اتنين.', 'Published! The store updates within a minute or two.')}</b>`; Z.toast(A('اتنشر', 'Published')); setTimeout(() => Z.rerender(), 1800); }
        catch (e) { log.innerHTML = `<b style="color:var(--bad)">${esc(e.message)}</b>`; pb.disabled = false; }
      });
    }
  });
})();
