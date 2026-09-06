/* ═══════════════════════════════════════════════════════════════════════
   NASIJ — Cloud layer (Firebase) + expanded Admin Dashboard
   Additive module. Loads AFTER the main app script.
   - firebase-config.js has real keys  → Firestore/Auth/Storage (global, live)
   - otherwise                          → localStorage demo mode (this browser)
   Firestore model:
     config/site = { colors, content, heroSlides, pageBanners, prodOverrides,
        soldOut, featured, productOrder, productsCustom, productsDeleted, stock,
        categories, promos, settings, seo, sections }
     collections: orders/*, users/*, admins/*, reviews/*, newsletter/*
     Storage: media/* (uploaded images)
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CFG = window.NASIJ_FIREBASE || {};
  const HAS_FB = !!(CFG.apiKey && CFG.projectId && window.firebase);
  window.NASIJ_CLOUD_ON = HAS_FB;

  // Pristine snapshot of the built-in products (to rebuild the effective catalog)
  const BASE_PRODUCTS = (window.PRODUCTS || []).map(p => ({
    ...p,
    imgs: Array.isArray(p.imgs) ? [...p.imgs] : [],
    sizes: Array.isArray(p.sizes) ? [...p.sizes] : p.sizes
  }));
  window.BASE_PRODUCTS = BASE_PRODUCTS;

  const DEFAULT_CATS = [
    { id: 'hoodies',     en: 'Hoodies',     ar: 'هوديز',     hidden: false },
    { id: 'sweatshirts', en: 'Sweatshirts', ar: 'سويت شيرت', hidden: false },
    { id: 'jackets',     en: 'Jackets',     ar: 'جاكيتات',   hidden: false },
    { id: 'shirts',      en: 'Shirts',      ar: 'قمصان',     hidden: false }
  ];
  let CONF = {
    colors: {}, content: {}, heroSlides: {}, pageBanners: {},
    prodOverrides: {}, soldOut: [], featured: [], productOrder: null,
    productsCustom: [], productsDeleted: [], stock: {},
    categories: DEFAULT_CATS.slice(), promos: [], settings: {}, seo: {}, sections: {}
  };
  window.NASIJ_CONF = CONF;
  window.NASIJ_CATS = CONF.categories;

  let fb = { app: null, auth: null, db: null, storage: null };
  if (HAS_FB) {
    try {
      fb.app = firebase.initializeApp(CFG);
      fb.auth = firebase.auth();
      fb.db = firebase.firestore();
      try { fb.storage = firebase.storage(); } catch (e) {}
      window.NASIJ_FB = fb;
    } catch (e) { console.warn('[NASIJ] Firebase init failed:', e); window.NASIJ_CLOUD_ON = false; }
  }

  /* ─────────────────────────── DB adapter ─────────────────────────── */
  const DB = {
    async getConfig() {
      if (window.NASIJ_CLOUD_ON) {
        try { const s = await fb.db.collection('config').doc('site').get(); return s.exists ? s.data() : null; }
        catch (e) { console.warn('[NASIJ] getConfig', e); return null; }
      }
      try { return JSON.parse(localStorage.getItem('nasij_conf') || 'null'); } catch { return null; }
    },
    async saveConfig(conf) {
      try { localStorage.setItem('nasij_conf', JSON.stringify(conf)); } catch (e) {}
      if (window.NASIJ_CLOUD_ON) {
        try { await fb.db.collection('config').doc('site').set(conf, { merge: true }); }
        catch (e) { console.warn('[NASIJ] saveConfig', e); throw e; }
      }
    },
    watchConfig(cb) {
      if (!window.NASIJ_CLOUD_ON) return;
      try { fb.db.collection('config').doc('site').onSnapshot(s => { if (s.exists) cb(s.data()); }); } catch (e) {}
    },
    async list(col) {
      if (window.NASIJ_CLOUD_ON) { const q = await fb.db.collection(col).get(); return q.docs.map(d => ({ id: d.id, ...d.data() })); }
      try { return JSON.parse(localStorage.getItem('nasij_' + col) || '[]'); } catch { return []; }
    },
    async setDoc(col, id, data) {
      if (window.NASIJ_CLOUD_ON) { await fb.db.collection(col).doc(String(id)).set(data, { merge: true }); return id; }
      const arr = await this.list(col); const i = arr.findIndex(x => String(x.id) === String(id));
      if (i > -1) arr[i] = { ...arr[i], ...data, id }; else arr.push({ ...data, id });
      localStorage.setItem('nasij_' + col, JSON.stringify(arr)); return id;
    },
    async addDoc(col, data) {
      if (window.NASIJ_CLOUD_ON) { const ref = await fb.db.collection(col).add(data); return ref.id; }
      const arr = await this.list(col); const id = 'L' + Date.now();
      arr.push({ ...data, id }); localStorage.setItem('nasij_' + col, JSON.stringify(arr)); return id;
    },
    async delDoc(col, id) {
      if (window.NASIJ_CLOUD_ON) { await fb.db.collection(col).doc(String(id)).delete(); return; }
      const arr = (await this.list(col)).filter(x => String(x.id) !== String(id));
      localStorage.setItem('nasij_' + col, JSON.stringify(arr));
    },
    async upload(path, file) {
      if (window.NASIJ_CLOUD_ON && fb.storage) {
        const ref = fb.storage.ref().child(path); await ref.put(file); return await ref.getDownloadURL();
      }
      return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    }
  };
  window.NASIJ_DB = DB;

  /* ───────── Apply CONF → live app ───────── */
  function applyOv(p, o) {
    if (!o) return;
    if (o.en) p.en = o.en; if (o.ar) p.ar = o.ar;
    if (o.de) p.de = o.de; if (o.da) p.da = o.da;
    if (o.price != null && o.price !== '') p.price = +o.price;
    if (o.cat) p.cat = o.cat;
    if (o.colorName) p.colorName = o.colorName; if (o.color) p.color = o.color;
    if (Array.isArray(o.sizes) && o.sizes.length) p.sizes = o.sizes;
    if (Array.isArray(o.imgs) && o.imgs.length) p.imgs = o.imgs;
  }
  function rebuildProducts() {
    const deleted = new Set((CONF.productsDeleted || []).map(String));
    const ov = CONF.prodOverrides || {};
    const eff = [];
    BASE_PRODUCTS.forEach(bp => {
      if (deleted.has(String(bp.id))) return;
      const p = { ...bp, imgs: [...bp.imgs], sizes: Array.isArray(bp.sizes) ? [...bp.sizes] : bp.sizes };
      applyOv(p, ov[p.id]); if (CONF.stock && CONF.stock[p.id]) p.stock = CONF.stock[p.id];
      eff.push(p);
    });
    (CONF.productsCustom || []).forEach(cp => {
      if (deleted.has(String(cp.id))) return;
      const p = { ...cp, imgs: Array.isArray(cp.imgs) ? [...cp.imgs] : [] };
      applyOv(p, ov[p.id]); if (CONF.stock && CONF.stock[p.id]) p.stock = CONF.stock[p.id];
      eff.push(p);
    });
    if (window.PRODUCTS) { window.PRODUCTS.length = 0; eff.forEach(p => window.PRODUCTS.push(p)); }
  }
  function applyConfToApp() {
    window.__nasijApplying = true;
    CONF.categories = (CONF.categories && CONF.categories.length) ? CONF.categories : DEFAULT_CATS.slice();
    window.NASIJ_CATS = CONF.categories;
    window.NASIJ_CONF = CONF;
    try {
      if (window._soldOutIds) { window._soldOutIds.clear(); (CONF.soldOut || []).forEach(id => window._soldOutIds.add(+id)); }
      if (window._featuredIds) { window._featuredIds.clear(); (CONF.featured || []).forEach(id => window._featuredIds.add(+id)); }
    } catch (e) {}
    try { if (CONF.productOrder) window._productOrder = CONF.productOrder; } catch (e) {}
    try {
      localStorage.setItem('axia_site_custom', JSON.stringify({
        colors: CONF.colors || {}, heroSlides: CONF.heroSlides || [],
        pageBanners: CONF.pageBanners || {}, content: CONF.content || {}
      }));
      localStorage.setItem('axia_prod_overrides', JSON.stringify(CONF.prodOverrides || {}));
      localStorage.setItem('axia_soldout', JSON.stringify(CONF.soldOut || []));
      localStorage.setItem('axia_featured', JSON.stringify(CONF.featured || []));
      if (CONF.productOrder) localStorage.setItem('axia_product_order', JSON.stringify(CONF.productOrder));
      if (CONF.seo && Object.keys(CONF.seo).length) localStorage.setItem('axia_site_seo', JSON.stringify(CONF.seo));
    } catch (e) {}
    rebuildProducts();
    try { if (typeof loadSiteCustomizations === 'function') loadSiteCustomizations(); } catch (e) {}
    try { window.NASIJ_applySettings && window.NASIJ_applySettings(); } catch (e) {}
    try { window.NASIJ_rebuildFilters && window.NASIJ_rebuildFilters(); } catch (e) {}
    try { window.NASIJ_applySections && window.NASIJ_applySections(); } catch (e) {}
    reRenderAll();
    window.__nasijApplying = false;
  }
  function reRenderAll() {
    try {
      if (typeof renderHomePreview === 'function') renderHomePreview();
      if (typeof renderNewArrivals === 'function') renderNewArrivals();
      if (typeof renderNewEdit === 'function') renderNewEdit();
      if (typeof renderGoldEdit === 'function') renderGoldEdit();
      const pv = document.getElementById('page-products');
      if (pv && pv.classList.contains('active') && typeof renderProducts === 'function') renderProducts('all');
      if (typeof applyLang === 'function') applyLang();
    } catch (e) {}
  }
  window.NASIJ_applyConf = applyConfToApp;
  window.NASIJ_rebuildProducts = rebuildProducts;
  window.NASIJ_reRenderAll = reRenderAll;

  let _pushT = null;
  window.NASIJ_saveConf = function (immediate) {
    window.NASIJ_CONF = CONF;
    clearTimeout(_pushT);
    const doIt = () => DB.saveConfig(CONF).catch(() => {});
    if (immediate) return doIt();
    _pushT = setTimeout(doIt, 500);
    return Promise.resolve();
  };

  window.__NASIJ = {
    get CONF() { return CONF; },
    set CONF(v) { CONF = v; window.NASIJ_CONF = v; },
    DB, fb, rebuildProducts, applyConfToApp, reRenderAll
  };

  async function boot() {
    const remote = await DB.getConfig();
    if (remote) CONF = Object.assign(CONF, remote);
    window.NASIJ_CONF = CONF; window.__NASIJ.CONF = CONF;
    applyConfToApp();
    DB.watchConfig(remote2 => { CONF = Object.assign(CONF, remote2); window.NASIJ_CONF = CONF; window.__NASIJ.CONF = CONF; applyConfToApp(); });
    try { window.NASIJ_CloudAuth && window.NASIJ_CloudAuth(); } catch (e) {}
    try { window.NASIJ_initAdmin && window.NASIJ_initAdmin(); } catch (e) {}
  }
  window.addEventListener('load', () => { setTimeout(boot, 80); });
})();

/* ═══════════ PART 2 — Auth (roles) · Settings · Filters · Sections ═══════════ */
(function () {
  'use strict';
  const DB = window.NASIJ_DB;
  const S = window.S || { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
  const conf = () => window.NASIJ_CONF || {};

  /* ── Role helpers ── */
  window.NASIJ_role   = () => ((window.Auth && Auth.current && Auth.current()) || {}).role || 'guest';
  window.NASIJ_isAdmin = () => ['super_admin', 'staff'].includes(window.NASIJ_role());
  window.NASIJ_isSuper = () => window.NASIJ_role() === 'super_admin';
  window.NASIJ_can = (perm) => {
    const u = (window.Auth && Auth.current && Auth.current()) || {};
    if (u.role === 'super_admin') return true;
    if (u.role === 'staff') return !!(u.perms && (u.perms[perm] || u.perms.all));
    return false;
  };

  /* ── Firebase Auth integration (overrides the localStorage Auth) ── */
  window.NASIJ_CloudAuth = function () {
    if (!window.Auth) return;
    const fb = window.NASIJ_FB;

    if (window.NASIJ_CLOUD_ON && fb && fb.auth) {
      const fetchRole = async (uid) => {
        let role = 'customer', perms = {};
        try { const a = await fb.db.collection('admins').doc(uid).get(); if (a.exists) { role = a.data().role || 'staff'; perms = a.data().perms || {}; } } catch (e) {}
        return { role, perms };
      };
      const buildUser = async (fbu) => {
        let prof = {};
        try { const d = await fb.db.collection('users').doc(fbu.uid).get(); if (d.exists) prof = d.data(); } catch (e) {}
        const { role, perms } = await fetchRole(fbu.uid);
        return { id: fbu.uid, email: fbu.email, fname: prof.fname || (fbu.displayName || '').split(' ')[0] || 'Owner', lname: prof.lname || '', phone: prof.phone || '', role, perms };
      };
      fb.auth.onAuthStateChanged(async (fbu) => {
        if (fbu) {
          const u = await buildUser(fbu);
          S.set('axia_current', u); localStorage.setItem('axia_token', 'fb_' + fbu.uid);
          try { updateNav(); } catch (e) {}
          window.NASIJ_afterAuth && window.NASIJ_afterAuth(u);
        } else {
          localStorage.removeItem('axia_current'); localStorage.removeItem('axia_token');
          try { updateNav(); } catch (e) {}
          window.NASIJ_afterAuth && window.NASIJ_afterAuth(null);
        }
      });
      Auth.login = async (email, pass) => {
        const cr = await fb.auth.signInWithEmailAndPassword(email.trim(), pass);
        return await buildUser(cr.user);
      };
      Auth.register = async (fname, lname, email, pass) => {
        const cr = await fb.auth.createUserWithEmailAndPassword(email.trim(), pass);
        const u = { fname, lname, email: email.trim(), phone: '', role: 'customer' };
        try { await fb.db.collection('users').doc(cr.user.uid).set(u, { merge: true }); } catch (e) {}
        return { id: cr.user.uid, ...u };
      };
      Auth.logout = () => { try { fb.auth.signOut(); } catch (e) {} localStorage.removeItem('axia_current'); localStorage.removeItem('axia_token'); };
      Auth.init = () => {}; // handled by onAuthStateChanged
    } else {
      // localStorage demo mode: seed an owner so the dashboard can be previewed on the live site
      try {
        const users = S.get('axia_local_users', []);
        if (!users.find(u => u.email === 'owner@naseej.eg')) {
          users.push({ id: 9001, fname: 'Store', lname: 'Owner', email: 'owner@naseej.eg', phone: '', role: 'super_admin', _pass: 'nasij-admin' });
          S.set('axia_local_users', users);
        }
      } catch (e) {}
    }
    window.NASIJ_afterAuth && window.NASIJ_afterAuth((window.Auth.current && Auth.current()) || null);
  };

  /* ── Admin entry point + guard ── */
  window.NASIJ_afterAuth = function (u) {
    // (re)inject admin UI so owner-only sections appear once role is known
    try { if (u && window.NASIJ_isAdmin() && window.NASIJ_initAdmin) window.NASIJ_initAdmin(); } catch (e) {}
    let fab = document.getElementById('nasijAdminFab');
    if (u && window.NASIJ_isAdmin()) {
      if (!fab) {
        fab = document.createElement('button');
        fab.id = 'nasijAdminFab';
        fab.title = 'Dashboard';
        fab.setAttribute('aria-label', 'Open admin dashboard');
        fab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>';
        fab.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:900;width:52px;height:52px;border-radius:50%;background:#1A1A1A;color:#F4F1EA;border:none;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;transition:transform .2s;';
        fab.onmouseenter = () => fab.style.transform = 'scale(1.08)';
        fab.onmouseleave = () => fab.style.transform = 'scale(1)';
        fab.onclick = () => { try { go('admin'); } catch (e) {} };
        document.body.appendChild(fab);
      }
      fab.style.display = 'flex';
    } else if (fab) { fab.style.display = 'none'; }
  };

  // Refresh admin entry/nav on every auth change (login/logout/init), both modes
  if (window.updateNav && !window.__nasijNavWrapped) {
    const _un = window.updateNav;
    window.updateNav = function () { const r = _un.apply(this, arguments); try { window.NASIJ_afterAuth((window.Auth && Auth.current && Auth.current()) || null); } catch (e) {} return r; };
    window.__nasijNavWrapped = true;
  }

  // Guard the admin route
  if (window.go && !window.__nasijGoWrapped) {
    const _go = window.go;
    window.go = function (pg) {
      if (pg === 'admin' && !window.NASIJ_isAdmin()) {
        try { toast(window.tA ? tA('لازم تسجّل دخول كأدمن', 'Admin login required') : 'Admin login required', 'error'); } catch (e) {}
        return _go('login');
      }
      return _go.apply(this, arguments);
    };
    window.__nasijGoWrapped = true;
  }
  // Support #admin deep link
  window.addEventListener('load', () => {
    setTimeout(() => { if ((location.hash === '#admin') && window.NASIJ_isAdmin()) { try { go('admin'); } catch (e) {} } }, 400);
  });

  /* ── Apply editable business settings to the DOM ── */
  window.NASIJ_applySettings = function () {
    const s = conf().settings || {};
    window.NASIJ_WA = s.whatsapp || window.NASIJ_WA || '201228748098';
    if (s.whatsapp) {
      document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
        a.href = a.href.replace(/wa\.me\/[0-9]+/, 'wa.me/' + s.whatsapp);
      });
    }
    if (s.instagram) {
      document.querySelectorAll('a[href*="instagram.com/"]').forEach(a => {
        a.href = 'https://instagram.com/' + s.instagram.replace(/^@/, '');
      });
    }
    if (s.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(a => { a.href = 'mailto:' + s.email; });
    }
  };

  /* ── Rebuild the products filter row from categories config ── */
  window.NASIJ_catLabel = function (id, ar) {
    const c = (conf().categories || []).find(x => x.id === id);
    if (c) return ar ? (c.ar || c.en) : (c.en || c.ar);
    return id;
  };
  window.NASIJ_rebuildFilters = function () {
    const row = document.querySelector('#page-products .filter-cats');
    if (!row) return;
    const ar = (window.lang === 'ar');
    const cats = (conf().categories || []).filter(c => !c.hidden);
    let html = `<button class="filter-btn active" onclick="filterProd('all',this)" data-en="All" data-ar="الكل" aria-pressed="true" data-cat="all">${ar ? 'الكل' : 'All'}</button>`;
    cats.forEach(c => {
      html += `<button class="filter-btn" onclick="filterProd('${c.id}',this)" data-en="${(c.en || '').replace(/"/g, '&quot;')}" data-ar="${(c.ar || '').replace(/"/g, '&quot;')}" aria-pressed="false" data-cat="${c.id}">${ar ? (c.ar || c.en) : (c.en || c.ar)}</button>`;
    });
    row.innerHTML = html;
  };

  /* ── Show / hide homepage & storefront sections ── */
  // map: section key → CSS selector(s)
  const SECTION_MAP = {
    trustBar:     '.trust-bar',
    categories:   '.gift-cats-sec',
    bestsellers:  '#page-home .feat-sec:not(.gold-edit-sec)',
    cairoEdit:    '.gold-edit-sec',
    newEdit:      '.new-edit-sec',
    newArrivals:  '.new-arr-sec',
    collectionCta:'.coll-banner',
    instagram:    '.insta-sec, .ugc-sec',
    testimonials: '.testi-sec'
  };
  window.NASIJ_SECTION_MAP = SECTION_MAP;
  window.NASIJ_applySections = function () {
    const sec = conf().sections || {};
    Object.entries(SECTION_MAP).forEach(([key, sel]) => {
      const off = sec[key] === false;
      document.querySelectorAll(sel).forEach(el => { el.style.display = off ? 'none' : ''; });
    });
  };
})();

/* ═══════════ PART 3A — Auto-sync existing admin saves + Orders → cloud ═══════════ */
(function () {
  'use strict';
  const conf = () => window.NASIJ_CONF;
  const push = () => { try { window.NASIJ_saveConf && window.NASIJ_saveConf(); } catch (e) {} };

  // Mirror the legacy admin localStorage keys into the cloud config automatically.
  const SYNC = {
    axia_site_custom: (v) => { const c = conf(); c.colors = v.colors || {}; c.content = v.content || {}; c.heroSlides = v.heroSlides || []; c.pageBanners = v.pageBanners || {}; },
    axia_prod_overrides: (v) => { conf().prodOverrides = v || {}; if (window.NASIJ_rebuildProducts) window.NASIJ_rebuildProducts(); },
    axia_soldout: (v) => { conf().soldOut = v || []; },
    axia_featured: (v) => { conf().featured = v || []; },
    axia_product_order: (v) => { conf().productOrder = v; },
    axia_site_seo: (v) => { conf().seo = v || {}; }
  };
  const _set = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, val) {
    _set(k, val);
    if (window.__nasijApplying) return;
    const fn = SYNC[k];
    if (fn) { try { fn(JSON.parse(val)); push(); } catch (e) {} }
  };

  // Orders → Firestore (cloud) with a local mirror so the customer still sees "my orders".
  if (window.Orders) {
    const S = window.S;
    window.Orders.add = async function (order) {
      const items = order.items.map(i => ({ id: i.id, en: i.en, ar: i.ar, price: i.price, qty: i.qty, size: i.size || null }));
      const doc = {
        items, total: order.total,
        name: (order.info?.fname || '') + ' ' + (order.info?.lname || ''),
        email: order.info?.email || '', phone: order.info?.phone || '',
        whatsapp: order.info?.whatsapp || '', area: order.info?.area || '',
        address: order.info?.address || '', payment: order.payment || '',
        notes: order.info?.notes || order.notes || '',
        status: 'pending', created_at: new Date().toISOString()
      };
      let id = 'ORD-' + Date.now();
      try { id = await window.NASIJ_DB.addDoc('orders', doc); } catch (e) {}
      const full = { ...doc, id };
      try { const lo = S.get('axia_local_orders', []); lo.push(full); S.set('axia_local_orders', lo); } catch (e) {}
      return { order: full };
    };
  }
})();

/* ═══════════ PART 3B-1 — Admin: scaffold · products CRUD · analytics · orders ═══════════ */
(function () {
  'use strict';
  const DB = window.NASIJ_DB;
  const conf = () => window.NASIJ_CONF;
  const saveNow = () => window.NASIJ_saveConf(true);
  const ar = () => (window.lang === 'ar');
  const tA = (a, e) => (window.tA ? window.tA(a, e) : (ar() ? a : e));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const EGP = n => (Number(n) || 0).toLocaleString() + ' EGP';
  const SIZES = window.SIZES || ['S', 'M', 'L', 'XL', 'XXL'];

  const NAV_ITEMS = [
    { id: 'analytics',  en: 'Analytics',  ar: 'التحليلات',  svg: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>' },
    { id: 'categories', en: 'Categories', ar: 'الفئات',     svg: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' },
    { id: 'promos',     en: 'Promo Codes',ar: 'أكواد الخصم',svg: '<path d="M20 12l-8 8-9-9V4h7z"/><circle cx="7.5" cy="7.5" r="1.5"/>' },
    { id: 'sections',   en: 'Sections',   ar: 'أقسام الموقع',svg: '<rect x="3" y="4" width="18" height="4"/><rect x="3" y="10" width="18" height="4"/><rect x="3" y="16" width="18" height="4"/>' },
    { id: 'staff',      en: 'Staff & Roles', ar: 'الموظفون', svg: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-1a6 6 0 0 1 12 0v1"/><path d="M17 11a3 3 0 1 0-2-5"/>', super: true },
    { id: 'settings',   en: 'Settings',   ar: 'الإعدادات',  svg: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 2h-5l-.4 2.4a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L3.1 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 1.7 1L9.5 22h5l.4-2.4a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z"/>', super: true }
  ];

  function injectStyles() {
    if (document.getElementById('nasij-admin-css')) return;
    const st = document.createElement('style'); st.id = 'nasij-admin-css';
    st.textContent = `
    .nz-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1200;display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:3vh 1rem;}
    .nz-modal-ov.open{display:flex;}
    .nz-modal{background:var(--bg-elev);color:var(--ink);width:min(720px,100%);border-radius:8px;padding:1.6rem;box-shadow:0 20px 60px rgba(0,0,0,.35);}
    .nz-modal h3{font-family:var(--fh);font-size:1.3rem;margin:0 0 1rem;}
    .nz-grid2{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;}
    .nz-field{display:flex;flex-direction:column;gap:.3rem;margin-bottom:.7rem;}
    .nz-field label{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-s);}
    .nz-field input,.nz-field select,.nz-field textarea{padding:.55rem .7rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink);font-family:var(--fb);font-size:.85rem;width:100%;}
    .nz-field textarea{min-height:64px;resize:vertical;}
    .nz-row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;}
    .nz-chip{display:inline-flex;align-items:center;gap:.35rem;border:1px solid var(--border);border-radius:20px;padding:.3rem .7rem;font-size:.78rem;cursor:pointer;user-select:none;}
    .nz-chip.on{background:var(--ink);color:var(--cream);border-color:var(--ink);}
    .nz-actions{display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem;}
    .nz-btn{padding:.6rem 1.2rem;border-radius:4px;border:1px solid var(--ink);background:var(--ink);color:var(--cream);font-size:.8rem;cursor:pointer;letter-spacing:.03em;}
    .nz-btn.ghost{background:transparent;color:var(--ink);}
    .nz-btn.danger{background:#DC2626;border-color:#DC2626;color:#fff;}
    .nz-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin-bottom:1.6rem;}
    .nz-stat{background:var(--bg-elev);border:1px solid var(--border);border-radius:8px;padding:1.1rem 1.2rem;}
    .nz-stat .lbl{font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-s);margin-bottom:.4rem;}
    .nz-stat .val{font-family:var(--fh);font-size:1.7rem;font-weight:500;}
    .nz-stat .sub{font-size:.66rem;color:var(--ink-s);margin-top:.2rem;}
    .nz-imgs{display:flex;gap:.5rem;flex-wrap:wrap;}
    .nz-imgs .thumb{position:relative;width:56px;height:74px;border-radius:4px;overflow:hidden;border:1px solid var(--border);}
    .nz-imgs .thumb img{width:100%;height:100%;object-fit:cover;}
    .nz-imgs .thumb button{position:absolute;top:1px;right:1px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:16px;height:16px;font-size:10px;line-height:1;cursor:pointer;}
    .nz-add{border:1px dashed var(--border);border-radius:4px;padding:.55rem .9rem;cursor:pointer;font-size:.78rem;color:var(--ink-s);background:transparent;}`;
    document.head.appendChild(st);
  }

  function injectNav() {
    const ul = document.getElementById('admin-nav-ul');
    if (!ul) return;
    const mk = (it) => {
      const a = document.createElement('a');
      a.className = 'adm-nav-item'; a.id = 'anav-' + it.id;
      a.setAttribute('onclick', `showAdminSec('${it.id}',this)`);
      a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${it.svg}</svg><span data-en="${it.en}" data-ar="${it.ar}">${ar() ? it.ar : it.en}</span>`;
      return a;
    };
    // Analytics right after Overview
    if (!document.getElementById('anav-analytics')) {
      const overview = document.getElementById('anav-overview');
      if (overview && overview.parentNode) overview.parentNode.insertBefore(mk(NAV_ITEMS[0]), overview.nextSibling);
      else ul.appendChild(mk(NAV_ITEMS[0]));
    }
    if (!document.getElementById('nz-nav-divider')) {
      const div = document.createElement('li'); div.className = 'adm-nav-divider'; div.id = 'nz-nav-divider';
      ul.appendChild(div);
    }
    NAV_ITEMS.slice(1).forEach(it => {
      if (document.getElementById('anav-' + it.id)) return;
      if (it.super && !window.NASIJ_isSuper()) return;
      ul.appendChild(mk(it));
    });
  }

  function injectSections() {
    const main = document.querySelector('#page-admin .adm-main');
    if (!main || document.getElementById('admin-sec-analytics')) return;
    NAV_ITEMS.forEach(it => {
      const d = document.createElement('div');
      d.className = 'admin-section'; d.id = 'admin-sec-' + it.id;
      d.innerHTML = `<div class="admin-content-inner" style="padding:1.4rem 1.8rem 3rem;"><div id="nz-${it.id}"></div></div>`;
      main.appendChild(d);
    });
    // product editor + generic modal
    if (!document.getElementById('nzModal')) {
      const m = document.createElement('div'); m.className = 'nz-modal-ov'; m.id = 'nzModal';
      m.innerHTML = `<div class="nz-modal" id="nzModalBox"></div>`;
      m.addEventListener('click', e => { if (e.target === m) closeModal(); });
      document.body.appendChild(m);
    }
  }
  function openModal(html) { const b = document.getElementById('nzModalBox'); if (b) b.innerHTML = html; document.getElementById('nzModal').classList.add('open'); }
  function closeModal() { document.getElementById('nzModal').classList.remove('open'); }
  window.NASIJ_closeModal = closeModal;

  /* ── Wrap showAdminSec to render the new sections ── */
  function wrapShowAdminSec() {
    if (window.__nasijSASWrapped || !window.showAdminSec) return;
    const _sas = window.showAdminSec;
    const mine = { analytics: renderAnalytics, categories: renderCategories, promos: renderPromos, sections: renderSections, staff: renderStaff, settings: renderSettings };
    window.showAdminSec = function (sec, el) {
      if ((sec === 'staff' || sec === 'settings') && !window.NASIJ_isSuper()) {
        try { toast(tA('متاح للمالك فقط', 'Owner only'), 'error'); } catch (e) {}
        sec = 'overview'; el = document.getElementById('anav-overview');
      }
      _sas(sec, el);
      const titles = { analytics: ['التحليلات', 'Analytics'], categories: ['الفئات', 'Categories'], promos: ['أكواد الخصم', 'Promo Codes'], sections: ['أقسام الموقع', 'Sections'], staff: ['الموظفون', 'Staff & Roles'], settings: ['الإعدادات', 'Settings'] };
      if (titles[sec]) { const t = document.getElementById('adm-page-title'); if (t) t.textContent = tA(titles[sec][0], titles[sec][1]); }
      if (mine[sec]) mine[sec]();
      if (sec === 'orders') setTimeout(renderCloudOrders, 30);
    };
    window.__nasijSASWrapped = true;
  }

  /* ─────────── ANALYTICS (revenue / profit / orders / top) ─────────── */
  function productCost(p) {
    const ov = (conf().prodOverrides || {})[p.id] || {};
    if (ov.cost != null && ov.cost !== '') return +ov.cost;
    if (p.cost != null) return +p.cost;
    const margin = (conf().settings || {}).profitMargin;
    const m = margin != null ? +margin / 100 : 0.45;
    return Math.round((p.price || 0) * (1 - m));
  }
  async function renderAnalytics() {
    const box = document.getElementById('nz-analytics'); if (!box) return;
    box.innerHTML = `<p class="admin-page-sub">${tA('جاري تحميل البيانات…', 'Loading…')}</p>`;
    let orders = [];
    try { orders = await DB.list('orders'); } catch (e) {}
    const paid = orders.filter(o => (o.status || 'pending') !== 'cancelled');
    const revenue = paid.reduce((s, o) => s + (+o.total || 0), 0);
    const findP = id => (window.PRODUCTS || []).find(p => String(p.id) === String(id)) || (window.BASE_PRODUCTS || []).find(p => String(p.id) === String(id));
    let profit = 0; const qtyBy = {};
    paid.forEach(o => (o.items || []).forEach(it => {
      const p = findP(it.id); const cost = p ? productCost(p) : Math.round((it.price || 0) * 0.55);
      profit += ((+it.price || 0) - cost) * (+it.qty || 1);
      qtyBy[it.id] = (qtyBy[it.id] || 0) + (+it.qty || 1);
    }));
    const byStatus = {};
    orders.forEach(o => { const s = o.status || 'pending'; byStatus[s] = (byStatus[s] || 0) + 1; });
    const aov = paid.length ? Math.round(revenue / paid.length) : 0;
    const top = Object.entries(qtyBy).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([id, q]) => { const p = findP(id); return { name: p ? (ar() ? p.ar : p.en) : id, q, rev: (p ? p.price : 0) * q }; });
    const cur = ar() ? 'ج.م' : 'EGP';
    box.innerHTML = `
      <p class="admin-page-sub">${tA('نظرة عامة على الأداء المالي.', 'Financial performance overview.')}</p>
      <div class="nz-stat-grid">
        <div class="nz-stat"><div class="lbl">${tA('الإيرادات', 'Revenue')}</div><div class="val">${revenue.toLocaleString()} <span style="font-size:.9rem">${cur}</span></div><div class="sub">${paid.length} ${tA('طلب', 'orders')}</div></div>
        <div class="nz-stat"><div class="lbl">${tA('صافي الربح', 'Net Profit')}</div><div class="val" style="color:#0E9F6E">${profit.toLocaleString()} <span style="font-size:.9rem">${cur}</span></div><div class="sub">${revenue ? Math.round(profit / revenue * 100) : 0}% ${tA('هامش', 'margin')}</div></div>
        <div class="nz-stat"><div class="lbl">${tA('متوسط الطلب', 'Avg. Order')}</div><div class="val">${aov.toLocaleString()} <span style="font-size:.9rem">${cur}</span></div></div>
        <div class="nz-stat"><div class="lbl">${tA('إجمالي الطلبات', 'Total Orders')}</div><div class="val">${orders.length}</div><div class="sub">${Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(' · ') || '—'}</div></div>
        <div class="nz-stat"><div class="lbl">${tA('المنتجات', 'Products')}</div><div class="val">${(window.PRODUCTS || []).length}</div></div>
      </div>
      <div class="admin-table-wrap">
        <div class="admin-table-header"><span class="admin-table-title">${tA('الأكثر مبيعاً', 'TOP SELLERS')}</span></div>
        <table class="atbl"><thead><tr><th>#</th><th>${tA('المنتج', 'Product')}</th><th>${tA('الكمية', 'Units')}</th><th>${tA('الإيراد', 'Revenue')}</th></tr></thead>
        <tbody>${top.length ? top.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.name)}</td><td>${t.q}</td><td>${EGP(t.rev)}</td></tr>`).join('') : `<tr><td colspan="4" style="color:var(--ink-s);padding:1rem;">${tA('لا توجد مبيعات بعد', 'No sales yet')}</td></tr>`}</tbody></table>
      </div>`;
  }

  /* ─────────── CLOUD ORDERS (list · status · invoice) ─────────── */
  async function renderCloudOrders() {
    const el = document.getElementById('admin-orders-table');
    if (!el) return;
    el.innerHTML = `<p style="color:var(--ink-s);padding:1rem;">${tA('جاري التحميل…', 'Loading…')}</p>`;
    let orders = [];
    try { orders = await DB.list('orders'); } catch (e) {}
    orders.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    if (!orders.length) { el.innerHTML = `<p style="color:var(--ink-s);padding:1rem;">${tA('لا توجد طلبات بعد.', 'No orders yet.')}</p>`; return; }
    const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    el.innerHTML = `<table class="atbl"><thead><tr>
        <th>${tA('رقم', 'ID')}</th><th>${tA('العميل', 'Customer')}</th><th>${tA('المنتجات', 'Items')}</th>
        <th>${tA('الإجمالي', 'Total')}</th><th>${tA('الحالة', 'Status')}</th><th>${tA('فاتورة', 'Invoice')}</th></tr></thead>
      <tbody>${orders.map(o => `<tr>
        <td style="font-size:.66rem;color:var(--ink-s)">${esc(String(o.id).slice(0, 10))}</td>
        <td>${esc(o.name || '—')}<br><span style="font-size:.64rem;color:var(--ink-s)">${esc(o.phone || o.email || '')}</span></td>
        <td style="font-size:.72rem">${(o.items || []).map(i => esc((ar() ? i.ar : i.en) || '') + (i.size ? ' (' + i.size + ')' : '') + '×' + i.qty).join('<br>')}</td>
        <td style="font-weight:500">${EGP(o.total)}</td>
        <td><select onchange="NASIJ_setOrderStatus('${o.id}',this.value)" style="padding:.3rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink);font-size:.72rem">${statuses.map(s => `<option value="${s}"${(o.status || 'pending') === s ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
        <td><button class="edit-ico-btn" onclick='NASIJ_invoice(${JSON.stringify(o).replace(/'/g, "&#39;")})'>🧾 ${tA('طباعة', 'Print')}</button></td>
      </tr>`).join('')}</tbody></table>`;
  }
  window.NASIJ_setOrderStatus = async function (id, status) {
    try { await DB.setDoc('orders', id, { status }); toast(tA('تم تحديث الحالة', 'Status updated')); } catch (e) { toast('Error', 'error'); }
  };
  window.NASIJ_invoice = function (o) {
    const s = conf().settings || {};
    const rows = (o.items || []).map(i => `<tr><td>${esc((i.en || i.ar) || '')}${i.size ? ' (' + i.size + ')' : ''}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${EGP(i.price)}</td><td style="text-align:right">${EGP((i.price || 0) * (i.qty || 1))}</td></tr>`).join('');
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html dir="ltr"><head><title>Invoice ${esc(String(o.id))}</title><meta charset="utf-8">
      <style>body{font-family:Arial,sans-serif;color:#111;max-width:720px;margin:24px auto;padding:0 16px;}h1{letter-spacing:.3em;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:8px;font-size:13px;text-align:left}.tot{font-weight:bold;font-size:15px}.muted{color:#666;font-size:12px}</style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>NASIJ</h1><div class="muted">${esc(s.instagram || '@naseej.eg')} · ${esc(s.whatsapp || '201228748098')}</div></div>
        <div style="text-align:right"><h2 style="margin:0">INVOICE</h2><div class="muted">${esc(String(o.id))}<br>${esc((o.created_at || '').slice(0, 10))}</div></div>
      </div>
      <div style="margin-top:14px" class="muted"><b>Bill to:</b> ${esc(o.name || '')} · ${esc(o.phone || '')}<br>${esc(o.address || '')} ${esc(o.area || '')}</div>
      <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr class="tot"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right">${EGP(o.total)}</td></tr></tfoot></table>
      <p class="muted" style="margin-top:20px">Payment: ${esc(o.payment || '—')} · Thank you for shopping with NASIJ 🇪🇬</p>
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  /* ─────────── PRODUCTS: full CRUD ─────────── */
  function nextId() {
    let mx = 43;
    (window.BASE_PRODUCTS || []).forEach(p => mx = Math.max(mx, +p.id || 0));
    (conf().productsCustom || []).forEach(p => mx = Math.max(mx, +p.id || 0));
    return Math.max(1000, mx + 1);
  }
  window.NASIJ_addProduct = function () { openProductEditor(null); };
  window.NASIJ_editProduct = function (id) { openProductEditor(id); };

  function openProductEditor(id) {
    const isNew = id == null;
    const p = isNew ? { id: nextId(), cat: (conf().categories[0] || {}).id || 'hoodies', sizes: ['S', 'M', 'L', 'XL', 'XXL'], imgs: [], price: 0 }
      : (window.PRODUCTS || []).find(x => String(x.id) === String(id)) || {};
    const ovc = ((conf().prodOverrides || {})[p.id] || {});
    const stock = (conf().stock || {})[p.id] || {};
    const cats = conf().categories || [];
    window.__nzImgs = [...(p.imgs || [])];
    const sizeChips = SIZES.map(s => `<span class="nz-chip ${(p.sizes || []).includes(s) ? 'on' : ''}" data-sz="${s}" onclick="this.classList.toggle('on');NASIJ_syncStockInputs()">${s}</span>`).join('');
    openModal(`
      <h3>${isNew ? tA('إضافة منتج', 'Add product') : tA('تعديل منتج', 'Edit product')}</h3>
      <div class="nz-grid2">
        <div class="nz-field"><label>${tA('الاسم (EN)', 'Name (EN)')}</label><input id="pe-en" value="${esc(p.en || '')}"></div>
        <div class="nz-field"><label>${tA('الاسم (AR)', 'Name (AR)')}</label><input id="pe-ar" value="${esc(p.ar || '')}"></div>
      </div>
      <div class="nz-grid2">
        <div class="nz-field"><label>${tA('الفئة', 'Category')}</label><select id="pe-cat">${cats.map(c => `<option value="${c.id}"${p.cat === c.id ? ' selected' : ''}>${esc(ar() ? c.ar : c.en)}</option>`).join('')}</select></div>
        <div class="nz-field"><label>${tA('اللون', 'Color name')}</label><input id="pe-colorName" value="${esc(p.colorName || '')}"></div>
      </div>
      <div class="nz-grid2">
        <div class="nz-field"><label>${tA('السعر (ج.م)', 'Price (EGP)')}</label><input id="pe-price" type="number" value="${esc(p.price || 0)}"></div>
        <div class="nz-field"><label>${tA('التكلفة (للربح)', 'Cost (for profit)')}</label><input id="pe-cost" type="number" value="${esc(ovc.cost != null ? ovc.cost : (p.cost != null ? p.cost : ''))}"></div>
      </div>
      <div class="nz-field"><label>${tA('الوصف (EN)', 'Description (EN)')}</label><textarea id="pe-de">${esc(p.de || '')}</textarea></div>
      <div class="nz-field"><label>${tA('الوصف (AR)', 'Description (AR)')}</label><textarea id="pe-da">${esc(p.da || '')}</textarea></div>
      <div class="nz-field"><label>${tA('المقاسات المتاحة', 'Available sizes')}</label><div class="nz-row" id="pe-sizes">${sizeChips}</div></div>
      <div class="nz-field"><label>${tA('المخزون لكل مقاس', 'Stock per size')}</label><div class="nz-row" id="pe-stock"></div></div>
      <div class="nz-field"><label>${tA('الصور', 'Images')}</label>
        <div class="nz-imgs" id="pe-imgs"></div>
        <div class="nz-row" style="margin-top:.5rem">
          <label class="nz-add">📁 ${tA('رفع صورة', 'Upload')}<input type="file" accept="image/*" style="display:none" onchange="NASIJ_uploadImg(this)"></label>
          <button class="nz-add" onclick="NASIJ_addImgUrl()">🔗 ${tA('رابط صورة', 'Image URL')}</button>
        </div>
      </div>
      <div class="nz-row" style="gap:1rem;margin-top:.4rem">
        <span class="nz-chip ${window._featuredIds && window._featuredIds.has(+p.id) ? 'on' : ''}" id="pe-featured">★ ${tA('مميز', 'Featured')}</span>
        <span class="nz-chip ${window._soldOutIds && window._soldOutIds.has(+p.id) ? 'on' : ''}" id="pe-soldout">${tA('نفد المخزون', 'Sold out')}</span>
        <span class="nz-chip ${(conf().newIds || []).map(String).includes(String(p.id)) ? 'on' : ''}" id="pe-new">${tA('جديد', 'NEW')}</span>
      </div>
      <div class="nz-actions">
        ${isNew ? '' : `<button class="nz-btn danger" onclick="NASIJ_deleteProduct('${p.id}')">${tA('حذف', 'Delete')}</button>`}
        <button class="nz-btn ghost" onclick="NASIJ_closeModal()">${tA('إلغاء', 'Cancel')}</button>
        <button class="nz-btn" onclick="NASIJ_saveProduct('${p.id}',${isNew})">${tA('حفظ', 'Save')}</button>
      </div>`);
    document.getElementById('pe-featured').onclick = function () { this.classList.toggle('on'); };
    document.getElementById('pe-soldout').onclick = function () { this.classList.toggle('on'); };
    document.getElementById('pe-new').onclick = function () { this.classList.toggle('on'); };
    window.__nzStock = { ...stock };
    NASIJ_syncStockInputs(); renderPeImgs();
  }
  window.NASIJ_syncStockInputs = function () {
    const wrap = document.getElementById('pe-stock'); if (!wrap) return;
    const sizes = [...document.querySelectorAll('#pe-sizes .nz-chip.on')].map(c => c.dataset.sz);
    const st = window.__nzStock || {};
    wrap.innerHTML = sizes.length ? sizes.map(s => `<div style="text-align:center"><div style="font-size:.62rem;color:var(--ink-s)">${s}</div><input type="number" min="0" value="${st[s] != null ? st[s] : 10}" data-st="${s}" style="width:58px;padding:.35rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)"></div>`).join('') : `<span style="font-size:.72rem;color:var(--ink-s)">${tA('اختر المقاسات أولاً', 'Pick sizes first')}</span>`;
  };
  function renderPeImgs() {
    const wrap = document.getElementById('pe-imgs'); if (!wrap) return;
    wrap.innerHTML = (window.__nzImgs || []).map((u, i) => `<div class="thumb"><img src="${esc(u)}"><button onclick="NASIJ_rmImg(${i})">×</button></div>`).join('') || `<span style="font-size:.72rem;color:var(--ink-s)">${tA('لا صور بعد', 'No images yet')}</span>`;
  }
  window.NASIJ_rmImg = function (i) { window.__nzImgs.splice(i, 1); renderPeImgs(); };
  window.NASIJ_addImgUrl = function () { const u = prompt(tA('الصق رابط الصورة', 'Paste image URL')); if (u) { window.__nzImgs.push(u.trim()); renderPeImgs(); } };
  window.NASIJ_uploadImg = async function (input) {
    const f = input.files && input.files[0]; if (!f) return;
    try { toast(tA('جاري الرفع…', 'Uploading…')); const url = await DB.upload('media/' + Date.now() + '_' + f.name, f); window.__nzImgs.push(url); renderPeImgs(); toast(tA('تم الرفع', 'Uploaded')); }
    catch (e) { toast('Upload failed', 'error'); }
    input.value = '';
  };
  window.NASIJ_saveProduct = function (id, isNew) {
    const g = i => (document.getElementById(i) || {}).value;
    const sizes = [...document.querySelectorAll('#pe-sizes .nz-chip.on')].map(c => c.dataset.sz);
    const stock = {}; document.querySelectorAll('#pe-stock input[data-st]').forEach(inp => stock[inp.dataset.st] = +inp.value || 0);
    const data = { en: g('pe-en').trim(), ar: g('pe-ar').trim(), cat: g('pe-cat'), colorName: g('pe-colorName').trim(), price: +g('pe-price') || 0, cost: g('pe-cost') === '' ? null : +g('pe-cost'), de: g('pe-de').trim(), da: g('pe-da').trim(), sizes, imgs: [...(window.__nzImgs || [])] };
    if (!data.en && !data.ar) { toast(tA('اكتب اسم المنتج', 'Enter a product name'), 'error'); return; }
    const c = conf();
    const numId = isNaN(+id) ? id : +id;
    const isBase = (window.BASE_PRODUCTS || []).some(p => String(p.id) === String(id));
    if (isBase) {
      c.prodOverrides = c.prodOverrides || {};
      c.prodOverrides[id] = { ...(c.prodOverrides[id] || {}), en: data.en, ar: data.ar, cat: data.cat, colorName: data.colorName, price: data.price, cost: data.cost, de: data.de, da: data.da, sizes: data.sizes, imgs: data.imgs.length ? data.imgs : undefined };
    } else {
      c.productsCustom = c.productsCustom || [];
      const obj = { id: numId, en: data.en, ar: data.ar, cat: data.cat, colorName: data.colorName, color: '#8A8377', price: data.price, cost: data.cost, de: data.de, da: data.da, sizes: data.sizes.length ? data.sizes : ['S', 'M', 'L', 'XL', 'XXL'], imgs: data.imgs.length ? data.imgs : ['images/products/p01.jpeg'], lead: 3, sales: 0 };
      const i = c.productsCustom.findIndex(x => String(x.id) === String(id));
      if (i > -1) c.productsCustom[i] = obj; else c.productsCustom.push(obj);
    }
    c.stock = c.stock || {}; c.stock[id] = stock;
    // badges
    const featOn = document.getElementById('pe-featured').classList.contains('on');
    const soldOn = document.getElementById('pe-soldout').classList.contains('on');
    const newOn = document.getElementById('pe-new').classList.contains('on');
    c.featured = [...new Set([...(c.featured || []).map(Number), ...(featOn ? [numId] : [])].filter(x => featOn || x !== numId))];
    if (!featOn) c.featured = (c.featured || []).filter(x => +x !== +numId);
    c.soldOut = (c.soldOut || []).filter(x => +x !== +numId); if (soldOn) c.soldOut.push(numId);
    c.newIds = (c.newIds || []).filter(x => +x !== +numId); if (newOn) c.newIds.push(numId);
    // sync sets + NEW_IDS
    try { window._featuredIds.clear(); c.featured.forEach(x => window._featuredIds.add(+x)); } catch (e) {}
    try { window._soldOutIds.clear(); c.soldOut.forEach(x => window._soldOutIds.add(+x)); } catch (e) {}
    try { if (window.NEW_IDS) { window.NEW_IDS.length = 0; c.newIds.forEach(x => window.NEW_IDS.push(+x)); } } catch (e) {}
    saveNow();
    window.NASIJ_rebuildProducts(); window.NASIJ_reRenderAll();
    closeModal();
    try { renderAdminProducts(); } catch (e) {}
    toast(tA('تم الحفظ ✓', 'Saved ✓'));
  };
  window.NASIJ_deleteProduct = function (id) {
    if (!confirm(tA('متأكد من حذف المنتج؟', 'Delete this product?'))) return;
    const c = conf();
    c.productsDeleted = c.productsDeleted || [];
    if (!c.productsDeleted.map(String).includes(String(id))) c.productsDeleted.push(isNaN(+id) ? id : +id);
    c.productsCustom = (c.productsCustom || []).filter(x => String(x.id) !== String(id));
    saveNow(); window.NASIJ_rebuildProducts(); window.NASIJ_reRenderAll();
    closeModal(); try { renderAdminProducts(); } catch (e) {}
    toast(tA('تم الحذف', 'Deleted'));
  };

  // Add an "Add product" button + make the row Edit button open the full editor
  function enhanceProductsSection() {
    const sec = document.getElementById('admin-sec-products'); if (!sec) return;
    if (!sec.querySelector('.nz-addprod')) {
      const hdr = sec.querySelector('.admin-table-header') || sec.querySelector('.admin-content-inner') || sec;
      const btn = document.createElement('button');
      btn.className = 'btn-dark nz-addprod'; btn.style.cssText = 'padding:.5rem 1rem;font-size:.72rem;';
      btn.innerHTML = '<span>＋ ' + tA('إضافة منتج', 'Add product') + '</span>';
      btn.onclick = () => window.NASIJ_addProduct();
      if (hdr && hdr.classList.contains('admin-table-header')) hdr.appendChild(btn);
      else sec.insertBefore(btn, sec.firstChild);
    }
    // repoint existing edit buttons to the full editor
    window.toggleProductEdit = function (pid) { window.NASIJ_editProduct(pid); };
  }

  window.NASIJ_initAdmin = function () {
    injectStyles(); injectNav(); injectSections(); wrapShowAdminSec();
    // enhance products whenever that section renders
    const _rap = window.renderAdminProducts;
    if (_rap && !window.__nasijRapWrapped) {
      window.renderAdminProducts = function () { _rap.apply(this, arguments); setTimeout(enhanceProductsSection, 20); };
      window.__nasijRapWrapped = true;
    }
    // route Orders section through the cloud renderer
    const _rao = window.renderAdminOrders;
    if (_rao && !window.__nasijRaoWrapped) {
      window.renderAdminOrders = function () { try { _rao.apply(this, arguments); } catch (e) {} setTimeout(renderCloudOrders, 20); };
      window.__nasijRaoWrapped = true;
    }
  };

  // expose renderers referenced by wrapShowAdminSec (defined in 3B-2)
  window.__nzRenderers = { analytics: renderAnalytics };
  function renderCategories() { window.__nzCategories && window.__nzCategories(); }
  function renderPromos() { window.__nzPromos && window.__nzPromos(); }
  function renderSections() { window.__nzSections && window.__nzSections(); }
  function renderStaff() { window.__nzStaff && window.__nzStaff(); }
  function renderSettings() { window.__nzSettings && window.__nzSettings(); }
})();

/* ═══════════ PART 3B-2 — Categories · Promos · Sections · Staff · Settings ═══════════ */
(function () {
  'use strict';
  const DB = window.NASIJ_DB;
  const conf = () => window.NASIJ_CONF;
  const saveNow = () => window.NASIJ_saveConf(true);
  const ar = () => (window.lang === 'ar');
  const tA = (a, e) => (window.tA ? window.tA(a, e) : (ar() ? a : e));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const box = id => document.getElementById('nz-' + id);
  const sub = (t) => `<p class="admin-page-sub">${t}</p>`;

  /* ── CATEGORIES ── */
  window.__nzCategories = function () {
    const b = box('categories'); if (!b) return;
    const cats = conf().categories || [];
    b.innerHTML = sub(tA('أضف/عدّل/امسح فئات المتجر. تظهر في فلتر المنتجات.', 'Add, edit, remove store categories. They appear in the product filter.')) +
      `<div class="admin-table-wrap"><table class="atbl"><thead><tr><th>${tA('الاسم (EN)', 'Name (EN)')}</th><th>${tA('الاسم (AR)', 'Name (AR)')}</th><th>ID</th><th>${tA('ظاهر', 'Visible')}</th><th>${tA('ترتيب', 'Order')}</th><th></th></tr></thead><tbody>` +
      cats.map((c, i) => `<tr>
        <td><input value="${esc(c.en)}" onchange="NASIJ_catEdit(${i},'en',this.value)" style="width:120px;padding:.3rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)"></td>
        <td><input value="${esc(c.ar)}" onchange="NASIJ_catEdit(${i},'ar',this.value)" style="width:120px;padding:.3rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)"></td>
        <td style="font-size:.66rem;color:var(--ink-s)">${esc(c.id)}</td>
        <td><button class="edit-ico-btn" onclick="NASIJ_catEdit(${i},'hidden',${!c.hidden})">${c.hidden ? tA('مخفي', 'Hidden') : tA('ظاهر', 'Visible')}</button></td>
        <td><button class="edit-ico-btn" onclick="NASIJ_catMove(${i},-1)">↑</button> <button class="edit-ico-btn" onclick="NASIJ_catMove(${i},1)">↓</button></td>
        <td><button class="edit-ico-btn" style="color:#DC2626" onclick="NASIJ_catDel(${i})">✕</button></td>
      </tr>`).join('') +
      `</tbody></table></div>
      <div class="nz-row" style="margin-top:1rem"><input id="nz-newcat-en" placeholder="${tA('اسم إنجليزي', 'English name')}" style="padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)"><input id="nz-newcat-ar" placeholder="${tA('اسم عربي', 'Arabic name')}" style="padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)"><button class="nz-btn" onclick="NASIJ_catAdd()">＋ ${tA('إضافة فئة', 'Add category')}</button></div>`;
  };
  const slug = s => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('cat' + Date.now());
  window.NASIJ_catEdit = function (i, k, v) { conf().categories[i][k] = v; saveNow(); window.NASIJ_rebuildFilters && window.NASIJ_rebuildFilters(); window.NASIJ_reRenderAll(); window.__nzCategories(); };
  window.NASIJ_catMove = function (i, d) { const a = conf().categories; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; saveNow(); window.NASIJ_rebuildFilters && window.NASIJ_rebuildFilters(); window.__nzCategories(); };
  window.NASIJ_catDel = function (i) { if (!confirm(tA('حذف الفئة؟', 'Delete category?'))) return; conf().categories.splice(i, 1); saveNow(); window.NASIJ_rebuildFilters && window.NASIJ_rebuildFilters(); window.NASIJ_reRenderAll(); window.__nzCategories(); };
  window.NASIJ_catAdd = function () {
    const en = (document.getElementById('nz-newcat-en').value || '').trim();
    const arn = (document.getElementById('nz-newcat-ar').value || '').trim();
    if (!en && !arn) return;
    conf().categories.push({ id: slug(en || arn), en: en || arn, ar: arn || en, hidden: false });
    saveNow(); window.NASIJ_rebuildFilters && window.NASIJ_rebuildFilters(); window.__nzCategories();
  };

  /* ── PROMO CODES ── */
  function syncPromos() {
    if (!window.PROMO_CODES) return;
    const keep = { 'NASIJ10': 0.10 };
    Object.keys(window.PROMO_CODES).forEach(k => { if (!keep[k]) delete window.PROMO_CODES[k]; });
    Object.assign(window.PROMO_CODES, keep);
    (conf().promos || []).forEach(p => {
      if (!p.active) return;
      if (p.expiry && new Date(p.expiry) < new Date()) return;
      window.PROMO_CODES[String(p.code).toUpperCase()] = (+p.percent || 0) / 100;
    });
  }
  window.NASIJ_syncPromos = syncPromos;
  window.__nzPromos = function () {
    const b = box('promos'); if (!b) return;
    const promos = conf().promos || [];
    b.innerHTML = sub(tA('أكواد خصم بالنسبة المئوية. تُطبَّق عند الدفع.', 'Percentage promo codes, applied at checkout.')) +
      `<div class="admin-table-wrap"><table class="atbl"><thead><tr><th>${tA('الكود', 'Code')}</th><th>${tA('الخصم %', 'Discount %')}</th><th>${tA('ينتهي', 'Expires')}</th><th>${tA('مفعّل', 'Active')}</th><th></th></tr></thead><tbody>` +
      (promos.length ? promos.map((p, i) => `<tr>
        <td style="font-weight:600;letter-spacing:.05em">${esc(p.code)}</td>
        <td>${esc(p.percent)}%</td>
        <td style="font-size:.7rem">${esc(p.expiry || '—')}</td>
        <td><button class="edit-ico-btn" onclick="NASIJ_promoToggle(${i})">${p.active ? '✓ ' + tA('مفعّل', 'On') : tA('موقوف', 'Off')}</button></td>
        <td><button class="edit-ico-btn" style="color:#DC2626" onclick="NASIJ_promoDel(${i})">✕</button></td>
      </tr>`).join('') : `<tr><td colspan="5" style="color:var(--ink-s);padding:1rem">${tA('لا أكواد بعد', 'No codes yet')}</td></tr>`) +
      `</tbody></table></div>
      <div class="nz-row" style="margin-top:1rem">
        <input id="nz-pc-code" placeholder="CODE" style="padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink);text-transform:uppercase">
        <input id="nz-pc-pct" type="number" min="1" max="90" placeholder="%" style="width:70px;padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)">
        <input id="nz-pc-exp" type="date" style="padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink)">
        <button class="nz-btn" onclick="NASIJ_promoAdd()">＋ ${tA('إضافة كود', 'Add code')}</button>
      </div>`;
  };
  window.NASIJ_promoAdd = function () {
    const code = (document.getElementById('nz-pc-code').value || '').trim().toUpperCase();
    const pct = +document.getElementById('nz-pc-pct').value || 0;
    const exp = document.getElementById('nz-pc-exp').value || '';
    if (!code || !pct) { toast(tA('اكتب الكود والنسبة', 'Enter code and %'), 'error'); return; }
    conf().promos = conf().promos || []; conf().promos.push({ code, percent: pct, expiry: exp, active: true });
    saveNow(); syncPromos(); window.__nzPromos();
  };
  window.NASIJ_promoToggle = function (i) { const p = conf().promos[i]; p.active = !p.active; saveNow(); syncPromos(); window.__nzPromos(); };
  window.NASIJ_promoDel = function (i) { conf().promos.splice(i, 1); saveNow(); syncPromos(); window.__nzPromos(); };

  /* ── SECTIONS (show/hide storefront blocks) ── */
  const SECTION_LABELS = {
    trustBar: ['شريط المميزات', 'Trust bar'], categories: ['قسم الفئات', 'Categories'],
    bestsellers: ['الأكثر مبيعاً', 'Bestsellers'], cairoEdit: ['ذا كايرو إيديت', 'The Cairo Edit'],
    newEdit: ['الإصدار الجديد', 'The New Edit'], newArrivals: ['وصل حديثاً', 'New Arrivals'],
    collectionCta: ['بانر المجموعة', 'Collection CTA'], instagram: ['إنستجرام/UGC', 'Instagram / UGC'],
    testimonials: ['آراء العملاء', 'Testimonials']
  };
  window.__nzSections = function () {
    const b = box('sections'); if (!b) return;
    const sec = conf().sections || {};
    const map = window.NASIJ_SECTION_MAP || {};
    b.innerHTML = sub(tA('اظهر أو اخفِ أي قسم في الصفحة الرئيسية.', 'Show or hide any homepage section.')) +
      `<div class="admin-table-wrap"><table class="atbl"><thead><tr><th>${tA('القسم', 'Section')}</th><th>${tA('الحالة', 'State')}</th></tr></thead><tbody>` +
      Object.keys(map).map(k => { const lbl = SECTION_LABELS[k] || [k, k]; const on = sec[k] !== false; return `<tr><td>${tA(lbl[0], lbl[1])}</td><td><button class="edit-ico-btn" style="background:${on ? 'rgba(16,185,129,.12)' : 'rgba(220,38,38,.08)'};color:${on ? '#0E9F6E' : '#DC2626'}" onclick="NASIJ_sectionToggle('${k}',${!on})">${on ? '✓ ' + tA('ظاهر', 'Visible') : tA('مخفي', 'Hidden')}</button></td></tr>`; }).join('') +
      `</tbody></table></div>`;
  };
  window.NASIJ_sectionToggle = function (k, val) { conf().sections = conf().sections || {}; conf().sections[k] = val; saveNow(); window.NASIJ_applySections && window.NASIJ_applySections(); window.__nzSections(); };

  /* ── STAFF & ROLES ── */
  window.__nzStaff = async function () {
    const b = box('staff'); if (!b) return;
    b.innerHTML = sub(tA('تحكّم في أدوار الموظفين وصلاحياتهم.', 'Manage staff roles and permissions.')) + `<p style="color:var(--ink-s)">${tA('جاري التحميل…', 'Loading…')}</p>`;
    let users = [], admins = [];
    try { users = await DB.list('users'); } catch (e) {}
    try { admins = await DB.list('admins'); } catch (e) {}
    if (!window.NASIJ_CLOUD_ON) { users = (window.S ? S.get('axia_local_users', []) : []); }
    const roleOf = (u) => { const a = admins.find(x => String(x.id) === String(u.id)); return (a && a.role) || u.role || 'customer'; };
    const rows = users.length ? users.map(u => {
      const role = roleOf(u);
      return `<tr>
        <td>${esc((u.fname || '') + ' ' + (u.lname || '')) || '—'}<br><span style="font-size:.64rem;color:var(--ink-s)">${esc(u.email || u.id)}</span></td>
        <td><select onchange="NASIJ_setRole('${esc(u.id)}',this.value)" style="padding:.35rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--ink);font-size:.74rem">
          ${['customer', 'staff', 'super_admin'].map(r => `<option value="${r}"${role === r ? ' selected' : ''}>${r}</option>`).join('')}</select></td>
      </tr>`;
    }).join('') : `<tr><td colspan="2" style="color:var(--ink-s);padding:1rem">${tA('لا مستخدمين بعد — الموظف يسجّل دخول مرة ثم ترقّيه من هنا.', 'No users yet — a staff member signs in once, then you promote them here.')}</td></tr>`;
    b.innerHTML = sub(tA('تحكّم في أدوار الموظفين. الموظف يسجّل حساب مرة، ثم ترقّيه لموظف/مالك.', 'Manage roles. A staff member registers once, then you promote them to staff/owner.')) +
      `<div class="admin-table-wrap"><table class="atbl"><thead><tr><th>${tA('المستخدم', 'User')}</th><th>${tA('الدور', 'Role')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  window.NASIJ_setRole = async function (id, role) {
    try {
      if (window.NASIJ_CLOUD_ON) {
        if (role === 'customer') { await DB.delDoc('admins', id); }
        else { await DB.setDoc('admins', id, { role, perms: role === 'super_admin' ? { all: true } : { products: true, orders: true, content: true } }); }
      } else {
        const users = S.get('axia_local_users', []); const u = users.find(x => String(x.id) === String(id)); if (u) { u.role = role; S.set('axia_local_users', users); }
      }
      toast(tA('تم تحديث الدور', 'Role updated'));
    } catch (e) { toast('Error (check rules)', 'error'); }
  };

  /* ── SETTINGS (business info + profit margin) ── */
  window.__nzSettings = function () {
    const b = box('settings'); if (!b) return;
    const s = conf().settings || {};
    const f = (id, lbl, val, type) => `<div class="nz-field"><label>${lbl}</label><input id="nz-set-${id}" type="${type || 'text'}" value="${esc(val == null ? '' : val)}"></div>`;
    b.innerHTML = sub(tA('بيانات المتجر — تظهر في الموقع كله.', 'Store details — reflected across the whole site.')) +
      `<div class="nz-grid2">
        ${f('whatsapp', tA('واتساب (رقم دولي)', 'WhatsApp (intl number)'), s.whatsapp || '201228748098')}
        ${f('instagram', tA('إنستجرام', 'Instagram handle'), s.instagram || 'naseej.eg')}
        ${f('email', tA('الإيميل', 'Email'), s.email || 'hello@naseej.eg')}
        ${f('deliveryFee', tA('رسوم التوصيل (ج.م)', 'Delivery fee (EGP)'), s.deliveryFee != null ? s.deliveryFee : 60, 'number')}
        ${f('freeOver', tA('توصيل مجاني فوق (ج.م)', 'Free delivery over (EGP)'), s.freeOver != null ? s.freeOver : 3000, 'number')}
        ${f('profitMargin', tA('هامش الربح الافتراضي %', 'Default profit margin %'), s.profitMargin != null ? s.profitMargin : 45, 'number')}
      </div>
      <div class="nz-actions"><button class="nz-btn" onclick="NASIJ_saveSettings()">${tA('حفظ الإعدادات', 'Save settings')}</button></div>`;
  };
  window.NASIJ_saveSettings = function () {
    const g = id => (document.getElementById('nz-set-' + id) || {}).value;
    conf().settings = Object.assign(conf().settings || {}, {
      whatsapp: (g('whatsapp') || '').replace(/[^0-9]/g, ''),
      instagram: (g('instagram') || '').replace(/^@/, ''),
      email: g('email') || '',
      deliveryFee: +g('deliveryFee') || 0,
      freeOver: +g('freeOver') || 0,
      profitMargin: +g('profitMargin') || 45
    });
    saveNow();
    try { window.NASIJ_applySettings(); } catch (e) {}
    toast(tA('تم حفظ الإعدادات ✓', 'Settings saved ✓'));
  };

  // keep promos + settings in sync on load
  window.addEventListener('load', () => { setTimeout(() => { try { syncPromos(); } catch (e) {} }, 300); });
})();

  // __NASIJ_PARTS__
