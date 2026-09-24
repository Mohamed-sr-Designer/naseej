/* =========================================================================
   NASIJ visit tracking (Shopify-style sessions) — feeds the dashboard.
   A session ends after 30 idle minutes or when a new external source lands.
   Recorded: device, source (utm/referrer), landing, pages, product views,
   add-to-cart, checkout reached, purchase, searches, custom requests.
   Demo: stored in this browser (nz_track). At launch, swap write() for a
   call to your server — the rest stays the same.
   ========================================================================= */
window.NZ_TRACK = (function () {
  'use strict';
  const KEY = 'nz_track', MAX = 800, GAP = 30 * 60e3;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const write = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { } };
  const data = read() || { vid: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), sessions: [] };
  const device = () => { const w = Math.min(window.innerWidth || 1200, (screen && screen.width) || 9999); return w < 768 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop'; };
  function source() {
    const q = new URLSearchParams(location.search), utm = (q.get('utm_source') || q.get('ref') || '').toLowerCase();
    const map = h => /google|bing|yahoo|duckduckgo|yandex/.test(h) ? 'search' : /instagram/.test(h) ? 'instagram' : /tiktok/.test(h) ? 'tiktok'
      : /facebook|fb\./.test(h) ? 'facebook' : /whatsapp|wa\.me/.test(h) ? 'whatsapp' : /(^|\.)x\.com|twitter|t\.co/.test(h) ? 'x' : /snapchat|snap/.test(h) ? 'snapchat' : /youtube|youtu\.be/.test(h) ? 'youtube' : 'other';
    if (utm) return map(utm);
    if (!document.referrer) return 'direct';
    try { const h = new URL(document.referrer).hostname; if (h === location.hostname) return null; return map(h); } catch (e) { return 'direct'; }
  }
  const persist = () => { data.sessions = data.sessions.slice(-MAX); write(data); };
  let s = null;
  function session() {
    const now = Date.now(), last = data.sessions[data.sessions.length - 1];
    if (s && now - s.last < GAP) return s;
    const src = source();
    if (last && now - last.last < GAP && !(src && src !== 'direct' && src !== last.src)) { s = last; return s; }
    s = { id: 's' + now.toString(36), t: now, last: now, dev: device(), lang: (window.NZ && NZ.lang) || 'en', land: (location.hash || '#/').slice(1).split('?')[0] || '/', src: src || 'direct', pv: 0, pages: [], views: [], cart: 0, cartIds: [], co: 0, buy: 0, val: 0, search: [], req: 0 };
    data.sessions.push(s); return s;
  }
  function page(path, name) {
    const x = session(); x.last = Date.now(); x.pv++;
    if (x.pages.length < 40) x.pages.push(path);
    if (name === 'checkout') x.co = 1;
    persist();
  }
  function event(name, d) {
    const x = session(); d = d || {}; x.last = Date.now();
    if (name === 'view_item' && d.id && x.views.indexOf(d.id) < 0) x.views.push(d.id);
    if (name === 'add_to_cart') { x.cart = 1; if (d.id && x.cartIds.indexOf(d.id) < 0) x.cartIds.push(d.id); }
    if (name === 'begin_checkout') x.co = 1;
    if (name === 'purchase') { x.buy = 1; x.co = 1; x.val += +d.total || 0; x.order = d.id; }
    if (name === 'search' && d.q && x.search.length < 20) x.search.push({ q: String(d.q).slice(0, 40), n: d.n || 0 });
    if (name === 'custom_request') x.req = (x.req || 0) + 1;
    persist();
  }
  return { page, event, session: () => s };
})();
