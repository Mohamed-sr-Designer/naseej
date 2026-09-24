/* =========================================================================
   NASIJ dashboard core
   · auth     : email + password (SHA-256, salted), owner / staff permissions
   · draft    : a full copy of the store content, autosaved in this browser;
                preview it on the live storefront, then publish (GitHub) or
                download content.json
   · fields   : bilingual inputs bound to draft paths (data-p)
   · routing  : #view/arg?q — views register with NZA.view()
   ========================================================================= */
window.NZA = (function () {
  'use strict';
  const N = window.NZ, S = window.NZS;
  const esc = N.esc, $ = N.$, $$ = N.$$;
  const LS = { lang: 'nz_adm_lang', users: 'nz_adm_users', sess: 'nz_adm_session', gh: 'nz_gh_token', range: 'nz_adm_range', draft: N.LS.draft, preview: N.LS.preview };
  const AR = () => (localStorage.getItem(LS.lang) || 'ar') === 'ar';
  const A = (ar, en) => (AR() ? ar : en);
  const money = (n, cur) => (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (cur === false ? '' : ' ' + A('ج.م', 'EGP'));
  const dt = (t, o) => { try { return new Date(t).toLocaleString(AR() ? 'ar-EG' : 'en-GB', o || { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const d8 = t => dt(t, { day: 'numeric', month: 'short', year: 'numeric' });
  const clone = N.clone;

  /* ─────────────── icons ─────────────── */
  const IC = {
    home: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-5h4v5"/>', orders: '<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    tag: '<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>', box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    coll: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.2 2.3 3.5 5.2"/>',
    chart: '<path d="M4 4v16h16"/><path d="M8 15l3.5-4 3 2.5L19 8"/>', report: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    disc: '<circle cx="12" cy="12" r="8.5"/><path d="M9 15l6-6"/><circle cx="9.3" cy="9.3" r=".8"/><circle cx="14.7" cy="14.7" r=".8"/>',
    orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 14a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 11z"/><path d="M5 13v7h14v-7"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', brush: '<path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12c-3 0-5 2-5 5 0 1-1 2-2 2 2 1 7 1 9-2 1-1 1-3-2-5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', page: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    type: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>', image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.4 7.4 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.4 7.4 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4z"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>', card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', back: '<path d="M15 5l-7 7 7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    down2: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>', wa: '<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 2.4 2.2 4.4 4.6 4.9l1.2-1.2 2 .9-.4 1.6c-3.8.3-8.4-3.9-8.1-7.8l1.6-.4.9 2z"/>',
    print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/>', check: '<path d="m5 12 4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>', drag: '<circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/>'
  };
  const icon = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

  /* ─────────────── toast / modal ─────────────── */
  function toast(msg, bad) { const box = $('#toasts'); if (!box) return; const t = document.createElement('div'); t.className = 'toast' + (bad ? ' toast--bad' : ''); t.textContent = msg; box.appendChild(t); setTimeout(() => t.remove(), 2600); }
  function modal(title, body, foot, onMount) {
    const m = $('#modal');
    m.innerHTML = `<div class="modal__c" role="dialog" aria-modal="true"><div class="modal__h"><h2>${title}</h2><button class="iconb" data-mclose aria-label="close">${icon('x')}</button></div><div class="modal__b">${body}</div>${foot ? `<div class="modal__f">${foot}</div>` : ''}</div>`;
    m.classList.add('on');
    if (onMount) onMount(m);
    return m;
  }
  const closeModal = () => { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; };
  function confirmBox(msg, okLabel, fn, danger) {
    modal(A('تأكيد', 'Confirm'), `<p style="margin:0">${msg}</p>`, `<button class="btn" data-mclose>${A('إلغاء', 'Cancel')}</button><button class="btn ${danger ? 'btn--danger' : 'btn--pri'}" id="cfOk">${okLabel}</button>`,
      m => { m.querySelector('#cfOk').addEventListener('click', () => { closeModal(); fn(); }); });
  }

  /* ─────────────── accounts & session ─────────────── */
  const DEF_USERS = [
    { email: 'owner@naseej.eg', name: 'Owner', role: 'owner', hash: '10ed048ef3dab662f7e6f94aa46a4cb4f5fcb4eea44ab34f952257710b1b84fd', perms: ['*'] },
    { email: 'manager@naseej.eg', name: 'Manager', role: 'staff', hash: 'ad0378747183f6f32f1f42483a2337fcee48d81e41eccd82f2bee1f9b6a6bd8e', perms: ['orders', 'products', 'content', 'promos', 'analytics'] }
  ];
  const PERMS = () => [['orders', A('الطلبات والعملاء', 'Orders & customers')], ['products', A('المنتجات والمخزون والدروب', 'Products, inventory & drop')], ['analytics', A('التحليلات والتقارير', 'Analytics & reports')], ['promos', A('أكواد الخصم', 'Discounts')], ['content', A('محتوى المتجر (الصفحة الرئيسية، الثيم، الصفحات)', 'Store content (homepage, theme, pages)')], ['settings', A('الإعدادات والنشر', 'Settings & publishing')]];
  const users = () => { const u = N.read(LS.users, null); return Array.isArray(u) && u.length ? u : clone(DEF_USERS); };
  const saveUsers = u => N.write(LS.users, u);
  async function sha(p) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nasij::' + p));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function session() { let s = null; try { s = JSON.parse(sessionStorage.getItem(LS.sess) || localStorage.getItem(LS.sess) || 'null'); } catch (e) { } if (!s) return null; const u = users().find(x => x.email === s.email); return u ? Object.assign({}, u) : null; }
  let me = null;
  const can = p => !!me && (me.role === 'owner' || (me.perms || []).indexOf('*') > -1 || (me.perms || []).indexOf(p) > -1);

  /* ─────────────── draft ─────────────── */
  let draft = null, pubHash = '', base = null;
  const H = o => N.hash(JSON.stringify(o));
  function loadDraft() {
    base = N.published ? N.merge(N.DEF, N.published) : clone(N.DEF);
    pubHash = H(base);
    const d = N.read(LS.draft, null);
    draft = d ? N.merge(N.DEF, d) : clone(base);
    N.use(draft);   // every NZ helper (products, collections, drop…) now reads the draft
  }
  const dirty = () => H(draft) !== pubHash;
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      if (!N.write(LS.draft, draft)) toast(A('المساحة ممتلئة — صغّر الصور', 'Storage full — use smaller images'), true);
      paintPub();
    }, 200);
  }
  const get = (path, o) => String(path).split('.').reduce((x, k) => (x == null ? x : x[k]), o || draft);
  function set(path, val) {
    const ks = String(path).split('.'), last = ks.pop();
    const obj = ks.reduce((x, k) => { if (x[k] == null) x[k] = /^\d+$/.test(k) ? [] : {}; return x[k]; }, draft);
    obj[last] = val; save();
  }
  function discard() { localStorage.removeItem(LS.draft); loadDraft(); paintPub(); render(); toast(A('رجعنا للنسخة المنشورة', 'Reverted to the published version')); }
  function paintPub() {
    const b = $('#pubbar'); if (!b) return;
    const d = dirty();
    b.classList.toggle('hide', !d);
    const st = $('#pubStatus'); if (st) st.innerHTML = d ? `<span class="bdg bdg--warn">${A('تعديلات غير منشورة', 'Unpublished changes')}</span>` : `<span class="bdg bdg--ok">${A('مطابق للمنشور', 'Up to date')}</span>`;
  }
  const useDraft = fn => fn();

  /* ─────────────── fields ─────────────── */
  const P = s => esc(s);
  const F = {
    /* bilingual pair: obj[field_en] + obj[field_ar] */
    bi(path, field, label, o) {
      o = o || {}; const rows = o.rows || 0;
      const en = get(path + '.' + field + '_en'), ar = get(path + '.' + field + '_ar');
      const inp = (lang, v) => rows
        ? `<textarea class="inp" rows="${rows}" data-p="${P(path + '.' + field + '_' + lang)}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${esc(v == null ? '' : v)}</textarea>`
        : `<input class="inp" data-p="${P(path + '.' + field + '_' + lang)}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" value="${esc(v == null ? '' : v)}">`;
      return `<div class="fgrid${o.cls ? ' ' + o.cls : ''}" ${o.full ? 'style="grid-column:1/-1"' : ''}>
        <label class="fld"><span>${label} <i class="lang-tag">AR</i></span>${inp('ar', ar)}</label>
        <label class="fld"><span>${label} <i class="lang-tag">EN</i></span>${inp('en', en)}</label>${o.hint ? `<div class="hint full">${o.hint}</div>` : ''}</div>`;
    },
    /* {en, ar} objects */
    pair(path, label, o) {
      o = o || {};
      return `<div class="fgrid"><label class="fld"><span>${label} <i class="lang-tag">AR</i></span><input class="inp" dir="rtl" data-p="${P(path + '.ar')}" value="${esc(get(path + '.ar') || '')}"></label>
        <label class="fld"><span>${label} <i class="lang-tag">EN</i></span><input class="inp" dir="ltr" data-p="${P(path + '.en')}" value="${esc(get(path + '.en') || '')}"></label></div>`;
    },
    text(path, label, o) { o = o || {}; const v = get(path); return `<label class="fld${o.full ? ' full' : ''}"><span>${label}${o.sub ? ` <small>${o.sub}</small>` : ''}</span>${o.rows ? `<textarea class="inp" rows="${o.rows}" data-p="${P(path)}"${o.dir ? ` dir="${o.dir}"` : ''}>${esc(v == null ? '' : v)}</textarea>` : `<input class="inp" data-p="${P(path)}" value="${esc(v == null ? '' : v)}"${o.dir ? ` dir="${o.dir}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.type ? ` type="${o.type}"` : ''}>`}${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</label>`; },
    num(path, label, o) { o = o || {}; const v = get(path); return `<label class="fld${o.full ? ' full' : ''}"><span>${label}${o.sub ? ` <small>${o.sub}</small>` : ''}</span><input class="inp num" type="number" dir="ltr" step="${o.step || 'any'}"${o.min != null ? ` min="${o.min}"` : ''} data-p="${P(path)}" data-t="num" value="${v == null ? '' : v}">${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</label>`; },
    bool(path, label, o) { o = o || {}; const v = get(path); return `<label class="tg${o.full ? ' full' : ''}"><input type="checkbox" data-p="${P(path)}" data-t="bool"${v ? ' checked' : ''}${o.rr ? ' data-rr="1"' : ''}><span class="tg__sw"></span><span><b>${label}</b>${o.hint ? `<small>${o.hint}</small>` : ''}</span></label>`; },
    select(path, label, opts, o) { o = o || {}; const v = get(path); return `<label class="fld${o.full ? ' full' : ''}"><span>${label}</span><select class="inp" data-p="${P(path)}"${o.rr ? ' data-rr="1"' : ''}>${opts.map(x => `<option value="${esc(x[0])}"${String(v) === String(x[0]) ? ' selected' : ''}>${esc(x[1])}</option>`).join('')}</select>${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</label>`; },
    color(path, label) { const v = get(path) || '#000000'; return `<label class="fld"><span>${label}</span><span class="color-row"><input type="color" data-p="${P(path)}" value="${esc(v)}"><input class="inp mono" dir="ltr" data-p="${P(path)}" value="${esc(v)}" style="max-width:130px"></span></label>`; },
    img(path, label, o) {
      o = o || {}; const v = get(path) || '';
      return `<div class="fld${o.full ? ' full' : ''}"><span>${label}${o.sub ? ` <small>${o.sub}</small>` : ''}</span><div class="imgf"><span class="imgf__ph">${v ? `<img src="${esc(v)}" alt="">` : icon('image')}</span>
        <span class="row"><label class="btn btn--sm">${icon('upload')}${v ? A('استبدال', 'Replace') : A('رفع', 'Upload')}<input type="file" accept="image/*" hidden data-up="${P(path)}" data-max="${o.max || 1600}"></label>
        <button class="btn btn--sm btn--ghost" data-pick="${P(path)}">${A('من المكتبة', 'From library')}</button>${v && !o.required ? `<button class="btn btn--sm btn--ghost" data-clear="${P(path)}">${A('إزالة', 'Remove')}</button>` : ''}
        <small class="faint mono" style="width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:320px">${v.indexOf('data:') === 0 ? A('صورة جديدة (تتنشر مع التعديلات)', 'New image (published with your changes)') : esc(v)}</small></span></div></div>`;
    }
  };
  /* generic list editor with add / reorder / delete */
  function listEd(path, row, blank, o) {
    o = o || {}; const arr = get(path) || [];
    return `<div class="lst">${arr.map((it, i) => `<div class="lst__r${o.offKey && it[o.offKey] === false ? ' off' : ''}"><span class="lst__h"><button class="iconb" data-move="${P(path)}" data-i="${i}" data-d="-1"${i ? '' : ' disabled'} aria-label="up">${icon('up')}</button><button class="iconb" data-move="${P(path)}" data-i="${i}" data-d="1"${i < arr.length - 1 ? '' : ' disabled'} aria-label="down">${icon('down')}</button></span>
      <div style="display:grid;gap:10px;min-width:0">${row(path + '.' + i, it, i)}</div>
      <span class="lst__a"><button class="iconb" data-del="${P(path)}" data-i="${i}" aria-label="delete">${icon('trash')}</button></span></div>`).join('') || `<p class="muted small" style="margin:0">${A('مفيش عناصر لسه.', 'Nothing yet.')}</p>`}
      ${blank ? `<div><button class="btn btn--sm" data-add="${P(path)}" data-blank='${esc(JSON.stringify(blank))}'>${icon('plus')}${o.addLabel || A('إضافة', 'Add')}</button></div>` : ''}</div>`;
  }
  const card = (title, body, o) => `<section class="card${o && o.flush ? ' card--flush' : ''}"${o && o.id ? ` id="${o.id}"` : ''}>${title ? `<div class="card__h"${o && o.flush ? ' style="padding:14px 16px 0"' : ''}><h2>${title}</h2>${o && o.act ? `<div class="row">${o.act}</div>` : ''}</div>` : ''}${o && o.sub ? `<p class="card__s"${o.flush ? ' style="padding:0 16px"' : ''}>${o.sub}</p>` : ''}${body}</section>`;
  const ph = (title, o) => `<div class="ph"><h1>${o && o.back ? `<a class="ph__back" href="${o.back}" aria-label="back">${icon('back')}</a>` : ''}${title}${o && o.badge ? ' ' + o.badge : ''}</h1>${o && o.act ? `<div class="ph__act">${o.act}</div>` : ''}</div>`;
  const deltaHTML = d => d == null ? `<span class="delta flat">—</span>` : `<span class="delta ${d > 0.5 ? 'up' : d < -0.5 ? 'down' : 'flat'}">${d > 0.5 ? '↑' : d < -0.5 ? '↓' : ''}${Math.abs(d).toFixed(0)}%</span>`;
  const statusBdg = s => { const L = S.STATUS(); const cls = { reserved: 'brand', pending: 'warn', confirmed: 'info', shipped: 'info', delivered: 'ok', cancelled: 'bad' }[s] || ''; return `<span class="bdg bdg--${cls}">${L[s] || s}</span>`; };
  function rangePicker(key) { return `<select class="rng" data-range>${Object.entries(S.RANGES()).map(([k, l]) => `<option value="${k}"${k === key ? ' selected' : ''}>${l}</option>`).join('')}</select>`; }
  const curRange = () => localStorage.getItem(LS.range) || '30';
  function csv(name, cols, rows) {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const txt = '﻿' + [cols.map(q).join(',')].concat(rows.map(r => r.map(q).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = name + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* image → downscaled data URL */
  function readImg(file, max) {
    return new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => {
        if (/svg/.test(file.type)) return res(fr.result);
        const im = new Image(); im.onload = () => { const s = Math.min(1, (max || 1600) / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); const png = /png|webp/.test(file.type) && max <= 600; res(c.toDataURL(png ? 'image/png' : 'image/jpeg', .84)); }; im.onerror = () => res(''); im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  /* every image path the store uses (for the library picker) */
  function allImages() {
    const set = new Set();
    const walk = o => { if (!o) return; if (typeof o === 'string') { if (/^(images\/|data:image)/.test(o)) set.add(o); return; } if (typeof o === 'object') Object.values(o).forEach(walk); };
    walk(draft);
    return Array.from(set);
  }

  /* ─────────────── views & routing ─────────────── */
  const VIEWS = {};
  const view = (name, def) => { VIEWS[name] = def; };
  let route = { name: 'home', arg: '', q: {} };
  function parse() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, '')) || 'home';
    const [p, qs] = h.split('?'); const parts = p.split('/');
    const q = {}; new URLSearchParams(qs || '').forEach((v, k) => { q[k] = v; });
    return { name: parts[0] || 'home', arg: parts.slice(1).join('/'), q };
  }
  const NAV = () => [
    { g: '', items: [['home', 'home', A('الرئيسية', 'Home')], ['orders', 'orders', A('الطلبات', 'Orders'), 'orders'], ['products', 'tag', A('المنتجات', 'Products'), 'products'], ['collections', 'coll', A('الكولكشنز', 'Collections'), 'products', 1], ['inventory', 'box', A('المخزون', 'Inventory'), 'products', 1], ['customers', 'users', A('العملاء', 'Customers'), 'orders'], ['analytics', 'chart', A('التحليلات', 'Analytics'), 'analytics'], ['reports', 'report', A('التقارير', 'Reports'), 'analytics', 1], ['discounts', 'disc', A('أكواد الخصم', 'Discounts'), 'promos'], ['drop', 'orbit', A('الدروب والحجوزات', 'Drop & pre-orders'), 'products'], ['requests', 'pen', A('طلبات التخصيص', 'Custom requests'), 'orders']] },
    { g: A('المتجر الإلكتروني', 'Online store'), items: [['homepage', 'layers', A('أقسام الرئيسية', 'Homepage'), 'content'], ['theme', 'brush', A('الثيم والهوية', 'Theme'), 'content'], ['navigation', 'menu', A('القوائم', 'Navigation'), 'content'], ['pages', 'page', A('الصفحات والأسئلة', 'Pages & FAQ'), 'content'], ['journal', 'book', A('المجلة', 'Journal'), 'content'], ['copy', 'type', A('نصوص الموقع', 'Store text'), 'content'], ['media', 'image', A('مكتبة الصور', 'Media'), 'content']] },
    { g: A('الإعدادات', 'Settings'), items: [['general', 'gear', A('عامة', 'General'), 'settings'], ['shipping', 'truck', A('الشحن والتوصيل', 'Shipping'), 'settings'], ['payments', 'card', A('طرق الدفع', 'Payments'), 'settings'], ['staff', 'lock', A('الموظفين والصلاحيات', 'Staff & permissions'), 'owner'], ['publish', 'upload', A('النشر', 'Publish'), 'settings']] }
  ];
  function counts() {
    const os = S.orders();
    return { orders: os.filter(o => o.status === 'pending' || o.status === 'reserved').length, requests: S.requests().filter(r => r.status === 'new').length };
  }
  function shell() {
    const c = counts();
    $('#root').innerHTML = `
      <header class="top">
        <button class="iconb top__menu" data-side style="color:#fff">${icon('menu')}</button>
        <a class="top__brand" href="#home"><img src="images/logo-en-white.png" alt="NASIJ"><span>${A('لوحة التحكم', 'Admin')}</span></a>
        <div class="top__search">${icon('search')}<input id="gsearch" placeholder="${A('دوّر على طلب، عميل، منتج…  (/)', 'Search orders, customers, products…  (/)')}" autocomplete="off"><div class="top__res" id="gres"></div></div>
        <div class="top__act">
          <a class="tbtn" href="index.html" target="_blank" rel="noopener">${icon('ext')}<span class="hide-s">${A('المتجر', 'View store')}</span></a>
          <button class="tbtn" data-alang>${icon('globe')}${AR() ? 'EN' : 'ع'}</button>
          <button class="tbtn" data-logout title="${esc(me.email)}"><span class="avatar">${esc((me.name || me.email)[0].toUpperCase())}</span></button>
        </div>
      </header>
      <div class="shell">
        <nav class="side" id="side">${NAV().map(g => `${g.g ? `<div class="side__g">${g.g}</div>` : ''}${g.items.filter(([, , , perm]) => !perm || (perm === 'owner' ? me.role === 'owner' : can(perm))).map(([k, ic, l, , sub]) => `<a href="#${k}" data-nav="${k}"${sub ? ' style="padding-inline-start:36px;font-weight:500"' : ''}>${sub ? '' : icon(ic)}<span>${l}</span>${k === 'orders' && c.orders ? `<span class="cnt">${c.orders}</span>` : ''}${k === 'requests' && c.requests ? `<span class="cnt">${c.requests}</span>` : ''}</a>`).join('')}`).join('')}
          <div class="side__foot"><span class="muted small">${esc(me.email)} · ${me.role === 'owner' ? A('المالك', 'Owner') : A('موظف', 'Staff')}</span></div>
        </nav>
        <main class="main"><div id="view"></div>
          <div class="pubbar hide" id="pubbar"><span class="row"><b>${A('عندك تعديلات لسه متنشرتش على الموقع.', 'You have changes that aren’t live yet.')}</b><span class="muted small" style="color:#bbb">${A('بتتحفظ تلقائي في المتصفح ده.', 'Autosaved in this browser.')}</span></span>
            <span class="row"><button class="btn btn--sm" data-preview>${icon('eye')}${A('معاينة', 'Preview')}</button><button class="btn btn--sm btn--ghost" style="color:#ddd" data-discard>${A('تجاهل التعديلات', 'Discard')}</button><a class="btn btn--sm btn--brand" href="#publish">${icon('upload')}${A('نشر', 'Publish')}</a></span></div>
        </main>
      </div>
      <div class="modal" id="modal"></div><div class="toasts" id="toasts"></div>`;
    document.documentElement.lang = AR() ? 'ar' : 'en'; document.documentElement.dir = AR() ? 'rtl' : 'ltr';
  }
  function render() {
    if (!me) return login();
    route = parse();
    const v = VIEWS[route.name] || VIEWS.home;
    if (!$('#side')) shell();
    $$('#side a').forEach(a => a.classList.toggle('on', a.dataset.nav === route.name));
    if (v.perm && !(v.perm === 'owner' ? me.role === 'owner' : can(v.perm))) { $('#view').innerHTML = `<div class="page"><div class="card empty">${icon('lock')}<b>${A('مش عندك صلاحية للقسم ده.', 'You don’t have access to this section.')}</b><a class="btn" href="#home">${A('الرئيسية', 'Home')}</a></div></div>`; return; }
    let html = '';
    try { html = useDraft(() => v.render(route.arg, route.q)); } catch (e) { console.error(e); html = `<div class="page"><div class="banner banner--warn"><b>${A('حصل خطأ في عرض الصفحة', 'This view failed to render')}</b><span class="mono small">${esc(e.message)}</span></div></div>`; }
    $('#view').innerHTML = html;
    if (window.NZC) NZC.mount($('#view'));
    if (v.mount) try { useDraft(() => v.mount(route.arg, route.q)); } catch (e) { console.error(e); }
    paintPub();
    document.title = (v.title ? (typeof v.title === 'function' ? v.title() : v.title) + ' · ' : '') + A('نسيج — لوحة التحكم', 'NASIJ Admin');
    $('#side').classList.remove('on');
  }
  const rerender = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };

  /* ─────────────── login ─────────────── */
  function login() {
    document.documentElement.lang = AR() ? 'ar' : 'en'; document.documentElement.dir = AR() ? 'rtl' : 'ltr';
    $('#root').innerHTML = `<div class="login"><form class="login__card" id="loginForm">
      <div class="row row--sb"><img src="images/logo-en.png" alt="NASIJ"><button type="button" class="btn btn--sm btn--ghost" data-alang>${AR() ? 'English' : 'العربية'}</button></div>
      <h1>${A('تسجيل الدخول للوحة التحكم', 'Sign in to the dashboard')}</h1>
      <label class="fld"><span>${A('الإيميل', 'Email')}</span><input class="inp" name="email" type="email" dir="ltr" autocomplete="username" required></label>
      <label class="fld"><span>${A('كلمة السر', 'Password')}</span><input class="inp" name="pw" type="password" dir="ltr" autocomplete="current-password" required></label>
      <label class="tg"><input type="checkbox" name="rem"><span class="tg__sw"></span><span><b>${A('افتكرني على الجهاز ده', 'Keep me signed in on this device')}</b></span></label>
      <p class="muted small" id="loginErr" style="margin:0;color:var(--bad)" hidden></p>
      <button class="btn btn--pri" style="height:40px;justify-content:center">${A('دخول', 'Sign in')}</button>
      <p class="login__hint">${A('الدخول بيتحقق هنا في المتصفح. لحماية حقيقية (أكتر من جهاز وأكتر من موظف) لازم سيرفر — موضّح في «النشر».', 'Sign-in is verified in this browser. Real multi-device security needs a server — see Publish.')}</p>
    </form><div class="toasts" id="toasts"></div></div>`;
    $('#loginForm').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target;
      const email = f.email.value.trim().toLowerCase(), h = await sha(f.pw.value);
      const u = users().find(x => x.email.toLowerCase() === email && x.hash === h);
      if (!u) { const er = $('#loginErr'); er.hidden = false; er.textContent = A('الإيميل أو كلمة السر مش صح.', 'Wrong email or password.'); return; }
      const s = JSON.stringify({ email: u.email, t: Date.now() });
      sessionStorage.setItem(LS.sess, s); if (f.rem.checked) localStorage.setItem(LS.sess, s);
      me = u; shell(); render();
    });
  }

  /* ─────────────── publish ─────────────── */
  const gh = () => Object.assign({ owner: 'Mohamed-sr-Designer', repo: 'naseej', branch: 'main' }, (draft.settings || {}).publish || {});
  const token = () => sessionStorage.getItem(LS.gh) || localStorage.getItem(LS.gh) || '';
  async function ghReq(path, method, body) {
    const g = gh();
    const r = await fetch(`https://api.github.com/repos/${g.owner}/${g.repo}/contents/${path}${method === 'GET' ? '?ref=' + g.branch : ''}`, {
      method, headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' }, body: body ? JSON.stringify(body) : undefined
    });
    if (method === 'GET' && r.status === 404) return null;
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || ('GitHub ' + r.status));
    return r.json();
  }
  const b64 = s => btoa(unescape(encodeURIComponent(s)));
  async function publish(log) {
    if (!token()) throw new Error(A('أضف توكن GitHub الأول.', 'Add a GitHub token first.'));
    const g = gh();
    // 1) turn uploaded images (data URLs) into real files
    const uploads = [];
    const walk = (o, p) => { if (!o || typeof o !== 'object') return; Object.keys(o).forEach(k => { const v = o[k]; if (typeof v === 'string' && v.indexOf('data:image') === 0) uploads.push({ o, k, v }); else if (typeof v === 'object') walk(v); }); };
    walk(draft);
    for (let i = 0; i < uploads.length; i++) {
      const u = uploads[i], ext = (u.v.match(/^data:image\/(\w+)/) || [])[1] || 'jpg', name = 'images/uploads/' + N.hash(u.v) + '.' + (ext === 'jpeg' ? 'jpg' : ext === 'svg+xml' ? 'svg' : ext);
      log(A('رفع صورة ', 'Uploading image ') + (i + 1) + '/' + uploads.length);
      const ex = await ghReq(name, 'GET');
      if (!ex) await ghReq(name, 'PUT', { message: 'Dashboard upload ' + name, content: u.v.split(',')[1], branch: g.branch });
      u.o[u.k] = name;
    }
    save();
    // 2) content.json
    log(A('نشر المحتوى…', 'Publishing content…'));
    const ex = await ghReq('content.json', 'GET');
    await ghReq('content.json', 'PUT', { message: 'Publish store content from the dashboard', content: b64(JSON.stringify(draft)), branch: g.branch, sha: ex ? ex.sha : undefined });
    pubHash = H(draft); base = clone(draft); N.use(draft);
    localStorage.removeItem(LS.draft); paintPub();
    return true;
  }
  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(draft)], { type: 'application/json' }));
    a.download = 'content.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function preview() { N.write(LS.draft, draft); localStorage.setItem(LS.preview, '1'); window.open('index.html#/', '_blank'); }

  /* ─────────────── events ─────────────── */
  function bind() {
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.p != null && el.type !== 'checkbox' && el.type !== 'file' && el.tagName !== 'SELECT') {
        let v = el.value; if (el.dataset.t === 'num') v = el.value === '' ? null : +el.value;
        set(el.dataset.p, v);
        if (el.type === 'color') { const tw = el.parentElement.querySelector('input.inp'); if (tw) tw.value = v; }
        if (el.dataset.live) { const t = $(el.dataset.live); if (t) t.textContent = v; }
      }
      if (el.id === 'gsearch') gsearch(el.value);
    });
    document.addEventListener('change', async e => {
      const el = e.target;
      if (el.dataset.up) {
        const f = el.files && el.files[0]; if (!f) return;
        const url = await readImg(f, +el.dataset.max || 1600); if (!url) return toast(A('مش قادر أقرا الصورة', 'Couldn’t read that image'), true);
        if (el.dataset.push) { const arr = get(el.dataset.up) || []; arr.push(url); set(el.dataset.up, arr); } else set(el.dataset.up, url);
        return rerender();
      }
      if (el.dataset.p != null && (el.type === 'checkbox' || el.tagName === 'SELECT')) {
        let v = el.type === 'checkbox' ? el.checked : el.value;
        if (el.dataset.t === 'num') v = +v;
        set(el.dataset.p, v); if (el.dataset.rr) rerender(); return;
      }
      if (el.dataset.range != null) { localStorage.setItem(LS.range, el.value); return rerender(); }
    });
    document.addEventListener('click', e => {
      const b = e.target.closest('button, a, [data-href]'); if (!b) { if (!e.target.closest('.top__search')) { const r = $('#gres'); r && r.classList.remove('on'); } return; }
      if (b.dataset.href && !e.target.closest('input,button,a,label')) { location.hash = b.dataset.href; return; }
      if (b.hasAttribute('data-mclose') || (b.id === 'modal')) { closeModal(); return; }
      if (b.hasAttribute('data-alang')) { localStorage.setItem(LS.lang, AR() ? 'en' : 'ar'); if (me) { shell(); render(); } else login(); return; }
      if (b.hasAttribute('data-logout')) { confirmBox(A('تسجيل الخروج؟', 'Sign out?'), A('خروج', 'Sign out'), () => { sessionStorage.removeItem(LS.sess); localStorage.removeItem(LS.sess); me = null; login(); }); return; }
      if (b.hasAttribute('data-side')) { $('#side').classList.toggle('on'); return; }
      if (b.hasAttribute('data-preview')) { preview(); return; }
      if (b.hasAttribute('data-discard')) { confirmBox(A('هتتمسح كل التعديلات اللي متنشرتش. متأكد؟', 'All unpublished changes will be lost. Continue?'), A('تجاهل', 'Discard'), discard, true); return; }
      if (b.dataset.clear) { set(b.dataset.clear, ''); rerender(); return; }
      if (b.dataset.add) { const arr = get(b.dataset.add) || []; arr.push(JSON.parse(b.dataset.blank || '{}')); set(b.dataset.add, arr); rerender(); return; }
      if (b.dataset.del) { const arr = get(b.dataset.del) || []; confirmBox(A('حذف العنصر ده؟', 'Delete this item?'), A('حذف', 'Delete'), () => { arr.splice(+b.dataset.i, 1); set(b.dataset.del, arr); rerender(); }, true); return; }
      if (b.dataset.move) { const arr = get(b.dataset.move) || [], i = +b.dataset.i, j = i + (+b.dataset.d); if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; set(b.dataset.move, arr); rerender(); return; }
      if (b.dataset.pick) { pickImage(url => { set(b.dataset.pick, url); rerender(); }); return; }
    });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { const g = $('#gsearch'); if (g) { e.preventDefault(); g.focus(); } }
      if (e.key === 'Escape') { closeModal(); const r = $('#gres'); r && r.classList.remove('on'); }
    });
    $('#root').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
    window.addEventListener('hashchange', render);
  }
  function pickImage(cb) {
    const imgs = allImages();
    modal(A('اختار صورة', 'Choose an image'), `<div class="media">${imgs.map(u => `<button class="media__i" data-u="${esc(u)}" style="padding:0;border:0"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>`, '', m => {
      m.querySelector('.media').addEventListener('click', e => { const b = e.target.closest('[data-u]'); if (!b) return; closeModal(); cb(b.dataset.u); });
    });
  }
  function gsearch(q) {
    const box = $('#gres'); q = q.trim().toLowerCase();
    if (!q) { box.classList.remove('on'); return; }
    const os = S.orders().filter(o => (o.id + ' ' + o.customer.name + ' ' + o.customer.phone).toLowerCase().indexOf(q) > -1).slice(0, 6);
    const ps = draft.products.filter(p => (p.title_en + ' ' + p.title_ar + ' ' + p.id).toLowerCase().indexOf(q) > -1).slice(0, 6);
    const cs = S.customers().filter(c => (c.name + ' ' + c.phone).toLowerCase().indexOf(q) > -1).slice(0, 4);
    box.innerHTML = [
      os.map(o => `<a href="#orders/${esc(o.id)}">${icon('orders')}<span><b>${esc(o.id)}</b> <small>${esc(o.customer.name)} · ${money(o.totals.total)}</small></span></a>`).join(''),
      ps.map(p => `<a href="#products/${esc(p.id)}"><img src="${esc(p.variants[0].images[0])}" style="width:28px;height:34px;object-fit:cover;border-radius:5px" alt=""><span>${esc(AR() ? p.title_ar : p.title_en)} <small>${esc(p.status)}</small></span></a>`).join(''),
      cs.map(c => `<a href="#customers/${encodeURIComponent(c.phone)}">${icon('users')}<span>${esc(c.name)} <small>${esc(c.phone)}</small></span></a>`).join('')
    ].join('') || `<p class="muted small" style="padding:8px">${A('مفيش نتايج', 'No results')}</p>`;
    box.classList.add('on');
  }

  /* ─────────────── boot ─────────────── */
  async function boot() {
    await N.load();
    N.initLang();
    loadDraft();
    me = session();
    bind();
    render();
  }

  return {
    A, AR, esc, $, $$, icon, money, dt, d8, toast, modal, closeModal, confirmBox, F, listEd, card, ph, deltaHTML, statusBdg, rangePicker, curRange, csv, readImg, allImages,
    view, render, rerender, get, set, save, get draft() { return draft; }, dirty, discard, publish, download, preview, gh, token, users, saveUsers, sha, PERMS, can, get me() { return me; }, useDraft, boot, LS
  };
})();
