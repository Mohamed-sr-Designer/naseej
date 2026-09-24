/* =========================================================================
   NASIJ core — shared by the storefront and the dashboard.
   · content  : defaults.js  ⊕  content.json (published)  ⊕  draft (preview)
   · catalog  : products / variants / collections / drop helpers
   · store    : cart, wishlist, orders, custom requests (localStorage)
   · i18n     : UI strings (AR/EN) with dashboard overrides
   ========================================================================= */
window.NZ = (function () {
  'use strict';
  const LS = {
    lang: 'nz_lang', mode: 'nz_mode', cart: 'nz_cart', wish: 'nz_wish', orders: 'nz_orders',
    requests: 'nz_requests', promo: 'nz_promo', profile: 'nz_profile', draft: 'nz_cms_draft', preview: 'nz_cms_preview',
    recent: 'nz_recent', popup: 'nz_popup'
  };
  const read = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const uid = p => (p || '') + Date.now().toString(36).slice(-5).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }

  /* deep merge: objects merge, arrays and scalars from `b` replace `a` */
  function merge(a, b) {
    if (b === undefined || b === null) return clone(a);
    if (Array.isArray(a) || Array.isArray(b) || typeof a !== 'object' || typeof b !== 'object' || !a) return clone(b);
    const out = clone(a);
    Object.keys(b).forEach(k => { out[k] = (k in a) ? merge(a[k], b[k]) : clone(b[k]); });
    return out;
  }

  /* ─────────────────────────── content ─────────────────────────── */
  const DEF = window.NZ_DEFAULTS;
  let C = clone(DEF);
  let published = null;
  const previewing = () => { try { return localStorage.getItem(LS.preview) === '1' && !!localStorage.getItem(LS.draft); } catch (e) { return false; } };
  async function load() {
    try {
      const r = await fetch('content.json?ts=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); if (j && typeof j === 'object' && Object.keys(j).length) published = j; }
    } catch (e) { /* offline or file:// — defaults only */ }
    let eff = published ? merge(DEF, published) : clone(DEF);
    if (previewing()) { const d = read(LS.draft, null); if (d) eff = merge(DEF, d); }
    C = eff;
    return C;
  }
  const content = () => C;

  /* ─────────────────────────── i18n ─────────────────────────── */
  const STR = {
    // header / nav
    'nav.search': ['Search', 'بحث'], 'nav.bag': ['Bag', 'الشنطة'], 'nav.menu': ['Menu', 'القائمة'], 'nav.home': ['Home', 'الرئيسية'],
    'nav.shop': ['Shop', 'المتجر'], 'nav.saved': ['Saved', 'المحفوظ'], 'nav.drops': ['Drop', 'الدروب'], 'nav.account': ['Orders', 'طلباتي'],
    'nav.close': ['Close', 'إغلاق'], 'nav.theme': ['Theme', 'المظهر'], 'nav.lang': ['العربية', 'English'],
    // common
    'c.shopNow': ['Shop now', 'تسوّق دلوقتي'], 'c.viewAll': ['View all', 'عرض الكل'], 'c.from': ['From', 'من'],
    'c.soldOut': ['Sold out', 'نفدت'], 'c.new': ['New', 'جديد'], 'c.preorder': ['Pre-order', 'حجز'], 'c.drop': ['Drop 01', 'دروب ٠١'],
    'c.sale': ['Sale', 'تخفيض'], 'c.colour': ['Colour', 'اللون'], 'c.size': ['Size', 'المقاس'], 'c.qty': ['Qty', 'الكمية'],
    'c.back': ['Back', 'رجوع'], 'c.backSide': ['Back', 'الظهر'], 'c.front': ['Front', 'الأمام'], 'c.items': ['items', 'منتج'], 'c.item': ['item', 'منتج'],
    'c.days': ['Days', 'يوم'], 'c.hrs': ['Hrs', 'ساعة'], 'c.min': ['Min', 'دقيقة'], 'c.sec': ['Sec', 'ثانية'],
    'c.continue': ['Continue shopping', 'كمّل تسوّق'], 'c.remove': ['Remove', 'إزالة'], 'c.edit': ['Edit', 'تعديل'],
    'c.whatsapp': ['WhatsApp us', 'كلّمنا واتساب'], 'c.readMore': ['Read more', 'اقرأ أكتر'],
    // product
    'p.addToBag': ['Add to bag', 'أضف للشنطة'], 'p.buyNow': ['Buy it now', 'اشتري دلوقتي'], 'p.reserve': ['Reserve · {amount} deposit', 'احجز · عربون {amount}'],
    'p.pickSize': ['Pick a size', 'اختار المقاس'], 'p.sizeGuide': ['Size guide', 'دليل المقاسات'], 'p.added': ['Added to your bag', 'اتضاف للشنطة'],
    'p.reserved': ['Reserved — deposit added to your bag', 'اتحجز — العربون اتضاف للشنطة'],
    'p.details': ['Details', 'التفاصيل'], 'p.fabric': ['Fabric & care', 'الخامة والعناية'], 'p.delivery': ['Delivery & returns', 'التوصيل والاسترجاع'],
    'p.dropTerms': ['How the pre-order works', 'الحجز بيمشي إزاي'], 'p.fullPrice': ['Full price {price} · pay {rest} on delivery', 'السعر الكامل {price} · الباقي {rest} عند الاستلام'],
    'p.other': ['Other signs', 'أبراج تانية'], 'p.also': ['You may also like', 'ممكن يعجبك كمان'], 'p.saved': ['Saved', 'اتحفظ'],
    'p.save': ['Save', 'حفظ'], 'p.shipsAfter': ['Ships after the drop · {date}', 'بيتشحن بعد الدروب · {date}'],
    'p.inStockCairo': ['Delivery across Cairo & Giza', 'توصيل في القاهرة والجيزة'], 'p.notFound': ['This piece isn’t available.', 'القطعة دي مش متاحة.'],
    'p.lowStock': ['Only {n} left', 'فاضل {n} بس'],
    // listing
    'l.all': ['All', 'الكل'], 'l.sort': ['Sort', 'ترتيب'], 'l.sort.featured': ['Featured', 'المميز'], 'l.sort.low': ['Price: low → high', 'السعر: من الأقل'],
    'l.sort.high': ['Price: high → low', 'السعر: من الأعلى'], 'l.sort.best': ['Best selling', 'الأكثر مبيعاً'],
    'l.filter': ['Filter', 'فلترة'], 'l.empty': ['Nothing here yet.', 'مفيش حاجة هنا لسه.'], 'l.count': ['{n} pieces', '{n} قطعة'],
    'l.shopAll': ['Shop all', 'كل المنتجات'],
    // drop
    'd.opens': ['Drops in', 'ينزل خلال'], 'd.live': ['The drop is live', 'الدروب نزل'], 'd.reserved': ['{n} of {goal} reserved', 'اتحجز {n} من {goal}'],
    'd.deposit': ['{pct}% deposit', 'عربون {pct}٪'], 'd.how1': ['Pick your sign', 'اختار برجك'], 'd.how1t': ['Twelve signs, five colourways.', '١٢ برج و٥ ألوان.'],
    'd.how2': ['Pay {pct}% now', 'ادفع {pct}٪ دلوقتي'], 'd.how2t': ['A deposit locks in your size and colour.', 'العربون بيثبّت مقاسك ولونك.'],
    'd.how3': ['The rest on delivery', 'الباقي عند الاستلام'], 'd.how3t': ['It ships after the drop date.', 'بيتشحن بعد ميعاد الدروب.'],
    'd.birthday': ['Your birthday', 'تاريخ ميلادك'], 'd.find': ['Find my sign', 'طلّع برجي'], 'd.yourSign': ['Your sign', 'برجك'],
    'd.reserveSign': ['Reserve {sign}', 'احجز {sign}'], 'd.terms': ['Reservation terms', 'شروط الحجز'], 'd.element': ['Element', 'العنصر'],
    'd.spin': ['Drag or tap a sign', 'اسحب أو دوس على برج'],
    // cart
    'b.title': ['Your bag', 'شنطتك'], 'b.empty': ['Your bag is empty.', 'شنطتك فاضية.'], 'b.subtotal': ['Subtotal', 'المجموع'],
    'b.checkout': ['Checkout', 'إتمام الطلب'], 'b.free': ['You’ve unlocked free delivery', 'التوصيل عليك مجاني'],
    'b.toFree': ['{amount} away from free delivery', 'فاضل {amount} على التوصيل المجاني'], 'b.deposit': ['Deposit now', 'العربون دلوقتي'],
    'b.balance': ['Balance on delivery', 'الباقي عند الاستلام'], 'b.promo': ['Promo code', 'كود الخصم'], 'b.apply': ['Apply', 'تطبيق'],
    'b.promoOk': ['Code applied', 'الكود اتطبّق'], 'b.promoBad': ['That code isn’t valid', 'الكود ده مش شغال'], 'b.discount': ['Discount', 'الخصم'],
    'b.delivery': ['Delivery', 'التوصيل'], 'b.total': ['Total', 'الإجمالي'], 'b.dueNow': ['Due now', 'المطلوب دلوقتي'],
    'b.calcLater': ['Calculated at checkout', 'بيتحسب وقت الدفع'], 'b.freeShip': ['Free', 'مجاني'],
    // checkout
    'k.title': ['Checkout', 'إتمام الطلب'], 'k.contact': ['Contact', 'بيانات التواصل'], 'k.delivery': ['Delivery', 'التوصيل'], 'k.payment': ['Payment', 'الدفع'],
    'k.review': ['Review', 'المراجعة'], 'k.name': ['Full name', 'الاسم بالكامل'], 'k.phone': ['Mobile number', 'رقم الموبايل'],
    'k.email': ['Email (optional)', 'الإيميل (اختياري)'], 'k.gov': ['Governorate', 'المحافظة'], 'k.district': ['Area', 'المنطقة'],
    'k.address': ['Street, building, floor, apartment', 'الشارع، العمارة، الدور، الشقة'], 'k.notes': ['Notes for the courier (optional)', 'ملاحظات للمندوب (اختياري)'],
    'k.choose': ['Choose…', 'اختار…'], 'k.place': ['Place order', 'تأكيد الطلب'], 'k.placeDeposit': ['Place order · pay {amount}', 'تأكيد الطلب · ادفع {amount}'],
    'k.next': ['Continue', 'التالي'], 'k.agree': ['I agree to the reservation terms', 'موافق على شروط الحجز'],
    'k.onlyAreas': ['We deliver across Cairo & Giza only.', 'بنوصّل في القاهرة والجيزة فقط.'], 'k.required': ['Please fill in the highlighted fields.', 'من فضلك كمّل البيانات المعلّمة.'],
    'k.phoneBad': ['Enter a valid Egyptian mobile number (01XXXXXXXXX).', 'اكتب رقم موبايل مصري صحيح (01XXXXXXXXX).'],
    'k.summary': ['Order summary', 'ملخص الطلب'], 'k.empty': ['Your bag is empty — add something first.', 'شنطتك فاضية — ضيف حاجة الأول.'],
    'k.secure': ['We’ll confirm your order on WhatsApp before it ships.', 'هنأكّد طلبك على واتساب قبل الشحن.'],
    // confirmation
    'o.thanks': ['Thank you, {name}.', 'شكراً يا {name}.'], 'o.placed': ['Order {id} is in.', 'طلبك رقم {id} وصلنا.'],
    'o.next': ['What happens next', 'اللي هيحصل بعد كده'], 'o.step1': ['We confirm on WhatsApp', 'بنأكّد معاك على واتساب'],
    'o.step2': ['We prepare your pieces', 'بنجهّز القطع'], 'o.step3': ['Door-to-door delivery', 'التوصيل لحد الباب'],
    'o.sendWa': ['Send order on WhatsApp', 'ابعت الطلب على واتساب'], 'o.payNow': ['Pay {amount} via {method}', 'ادفع {amount} عن طريق {method}'],
    'o.payHint': ['Send the transfer screenshot on WhatsApp to confirm.', 'ابعت صورة التحويل على واتساب عشان نأكّد.'],
    'o.status': ['Status', 'الحالة'], 'o.notFound': ['We couldn’t find that order on this device.', 'مش لاقيين الطلب ده على الجهاز ده.'],
    'o.st.pending': ['Received', 'اتستلم'], 'o.st.confirmed': ['Confirmed', 'اتأكّد'], 'o.st.shipped': ['On the way', 'في الطريق'],
    'o.st.delivered': ['Delivered', 'اتسلّم'], 'o.st.cancelled': ['Cancelled', 'اتلغى'], 'o.st.reserved': ['Reserved', 'محجوز'],
    // account
    'a.title': ['Your orders', 'طلباتك'], 'a.none': ['No orders on this device yet.', 'مفيش طلبات على الجهاز ده لسه.'],
    'a.saved': ['Saved pieces', 'القطع المحفوظة'], 'a.noSaved': ['Nothing saved yet — tap the heart on any piece.', 'مفيش حاجة محفوظة — دوس على القلب في أي قطعة.'],
    // custom
    'r.ref': ['Your reference', 'الريفرنس بتاعك'], 'r.upload': ['Upload your design or inspiration', 'ارفع التصميم أو صورة للفكرة'],
    'r.uploadHint': ['PNG, JPG or WEBP · up to 4 images', 'PNG أو JPG أو WEBP · لحد ٤ صور'], 'r.size': ['Print size', 'مقاس الطباعة'],
    'r.w': ['Width (cm)', 'العرض (سم)'], 'r.h': ['Height (cm)', 'الطول (سم)'], 'r.qty': ['Quantity', 'الكمية'], 'r.fabric': ['Fabric', 'الخامة'],
    'r.other': ['Something else? Describe it', 'خامة تانية؟ اوصفها'], 'r.reach': ['How do we reach you?', 'نتواصل معاك إزاي؟'],
    'r.alt': ['Email or Instagram', 'إيميل أو إنستجرام'], 'r.notes': ['Anything else we should know?', 'أي تفاصيل تانية؟'],
    'r.send': ['Send request', 'ابعت الطلب'], 'r.fine': ['No payment now. We review every request by hand and reply with a quote.', 'مفيش دفع دلوقتي. بنراجع كل طلب بإيدينا ونرد عليك بالسعر.'],
    'r.done': ['Request received', 'وصلنا طلبك'], 'r.again': ['Send another', 'ابعت طلب تاني'], 'r.no': ['Request no. {id}', 'رقم الطلب · {id}'],
    'r.errSize': ['Please enter the width and height in cm.', 'اكتب العرض والطول بالسنتيمتر.'], 'r.errName': ['Please enter your name.', 'اكتب اسمك.'],
    'r.max': ['Up to 4 images', 'أقصى عدد ٤ صور'],
    // misc
    'm.faq': ['Frequently asked', 'الأسئلة الشائعة'], 'm.sizeGuide': ['Size guide', 'دليل المقاسات'], 'm.journal': ['Journal', 'المجلة'],
    'm.404': ['Lost in space.', 'تهت في الفضا.'], 'm.404t': ['This page drifted out of orbit.', 'الصفحة دي خرجت من المدار.'],
    'm.searchPh': ['Search hoodies, signs, colours…', 'دوّر على هودي، برج، لون…'], 'm.noResults': ['No results for “{q}”.', 'مفيش نتايج لـ «{q}».'],
    'm.getInTouch': ['Get in touch', 'تواصل معنا'], 'm.deliveryArea': ['Delivery — Cairo & Giza', 'التوصيل — القاهرة والجيزة'],
    'm.rights': ['© {y} NASIJ. Made in Egypt.', '© {y} نسيج. صناعة مصرية.'], 'm.copied': ['Copied', 'اتنسخ'],
    'm.preview': ['Preview mode — you’re seeing unpublished dashboard changes.', 'وضع المعاينة — بتشوف تعديلات من لوحة التحكم لسه متنشرتش.'],
    'm.exitPreview': ['Exit preview', 'خروج من المعاينة'], 'm.useCode': ['Use code', 'استخدم الكود'], 'm.gotIt': ['Got it', 'تمام']
  };
  let lang = read(LS.lang, null);
  const isAr = () => lang === 'ar';
  function t(key, vars) {
    const ov = (C.copy || {})[key];
    let s = ov && (isAr() ? ov.ar : ov.en);
    if (!s) { const d = STR[key]; s = d ? (isAr() ? d[1] : d[0]) : key; }
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  /* pick a bilingual field: L(obj,'title') → obj.title_ar | obj.title_en */
  const L = (o, f) => { if (!o) return ''; const a = o[f + '_ar'], e = o[f + '_en']; return isAr() ? (a || e || '') : (e || a || ''); };
  const LL = o => (o ? (isAr() ? (o.ar || o.en || '') : (o.en || o.ar || '')) : '');

  /* money — western digits in both languages, currency label per language */
  function money(n, opts) {
    const v = Math.round((+n || 0) * 100) / 100;
    const s = v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    if (opts === false) return s;
    return isAr() ? s + ' ' + (C.settings.currency_ar || 'ج.م') : s + ' ' + (C.settings.currency_en || 'EGP');
  }
  const date = (d, o) => { try { return new Date(d).toLocaleDateString(isAr() ? 'ar-EG' : 'en-GB', o || { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };

  /* ─────────────────────────── catalog ─────────────────────────── */
  const products = all => (C.products || []).filter(p => all || p.status === 'active');
  const product = idOrHandle => (C.products || []).find(p => p.id === idOrHandle || p.handle === idOrHandle);
  const collections = all => (C.collections || []).filter(c => all || c.status === 'active');
  const collection = h => (C.collections || []).find(c => c.id === h || c.handle === h);
  const inCollection = h => products().filter(p => p.collection === h && collection(h) && collection(h).status === 'active').sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const variant = (p, vid) => (p && p.variants || []).find(v => v.id === vid || v.color === vid) || (p && p.variants && p.variants[0]);
  const title = p => L(p, 'title');
  const colourName = v => (v ? (isAr() ? (v.color_ar || v.color_en) : (v.color_en || v.color_ar)) : '');
  const img = (p, v, i) => { v = v || variant(p); return (v && v.images && v.images[i || 0]) || (p && p.variants && p.variants[0] && p.variants[0].images[0]) || ''; };
  function sign(id) { return (C.signs || []).find(s => s.id === id); }
  function signForDate(month, day) {
    // START = [month, day] each sign begins; walk from the latest start ≤ date
    const list = (C.signs || []).map(s => ({ s, m: s.start[0], d: s.start[1] })).sort((a, b) => a.m - b.m || a.d - b.d);
    let hit = null;
    list.forEach(x => { if (month > x.m || (month === x.m && day >= x.d)) hit = x.s; });
    return hit || list[list.length - 1].s; // before Jan 20 → Capricorn
  }

  /* stock: variant.track=false → unlimited; stock = { S: n, M: n, … } */
  function stockOf(v, size) { if (!v || !v.track) return Infinity; const n = (v.stock || {})[size]; return n == null ? 0 : +n; }
  function soldOut(p, v) { v = v || variant(p); if (!v || !v.track) return false; return (p.sizes || []).every(s => stockOf(v, s) <= 0); }

  /* drop / pre-order */
  const drop = () => C.drop || {};
  const dropTime = () => new Date(drop().date).getTime();
  const dropOpen = () => !!drop().on && Date.now() < dropTime();
  const isPre = p => !!(p && p.preorder && dropOpen() && drop().collection === p.collection);
  const deposit = price => Math.max(1, Math.round((price || 0) * (drop().depositPct || 20) / 100));
  function reservedCount() {
    const d = drop();
    const mine = orders.list().filter(o => o.status !== 'cancelled').reduce((n, o) => n + (o.items || []).filter(i => i.pre).reduce((m, i) => m + (i.qty || 1), 0), 0);
    return (+d.seed || 0) + mine + (+window.NZ_EXTRA_RESERVED || 0);
  }
  function countdown(to) {
    let ms = Math.max(0, to - Date.now());
    const d = Math.floor(ms / 864e5); ms -= d * 864e5;
    const h = Math.floor(ms / 36e5); ms -= h * 36e5;
    const m = Math.floor(ms / 6e4); ms -= m * 6e4;
    return { d, h, m, s: Math.floor(ms / 1000), done: to <= Date.now() };
  }

  /* ─────────────────────────── cart ─────────────────────────── */
  const listeners = [];
  const emit = (what) => listeners.forEach(fn => { try { fn(what); } catch (e) { } });
  const on = fn => listeners.push(fn);

  const cart = {
    lines() { return read(LS.cart, []).filter(l => product(l.pid)); },
    save(ls) { write(LS.cart, ls); emit('cart'); },
    count() { return cart.lines().reduce((n, l) => n + l.qty, 0); },
    add(pid, vid, size, qty, extra) {
      const p = product(pid); if (!p) return false;
      const v = variant(p, vid); if (!v) return false;
      const pre = isPre(p);
      if (!pre && stockOf(v, size) <= 0) return false;
      const ls = cart.lines();
      const key = p.id + '|' + v.id + '|' + size + '|' + (pre ? 'pre' : 'buy');
      const ex = ls.find(l => l.key === key);
      if (ex) ex.qty = Math.min(pre ? 5 : Math.max(1, Math.min(10, stockOf(v, size))), ex.qty + (qty || 1));
      else ls.push(Object.assign({ key, pid: p.id, vid: v.id, size, qty: qty || 1, pre, at: Date.now() }, extra || {}));
      cart.save(ls); emit('added'); return true;
    },
    setQty(key, q) { const ls = cart.lines(); const l = ls.find(x => x.key === key); if (!l) return; if (q <= 0) return cart.remove(key); l.qty = Math.min(10, q); cart.save(ls); },
    remove(key) { cart.save(cart.lines().filter(l => l.key !== key)); },
    clear() { cart.save([]); write(LS.promo, null); },
    /* every money figure the bag / checkout shows */
    totals(zoneId) {
      const lines = cart.lines();
      let full = 0, now = 0, merch = 0;
      const rows = lines.map(l => {
        const p = product(l.pid), v = variant(p, l.vid);
        const unit = +p.price || 0, dep = l.pre ? deposit(unit) : unit;
        full += unit * l.qty; now += dep * l.qty; if (!l.pre) merch += unit * l.qty;
        return { l, p, v, unit, dep, line: unit * l.qty, lineNow: dep * l.qty };
      });
      const code = read(LS.promo, null), promo = code ? promoFind(code) : null;
      let discount = 0;
      if (promo && full >= (+promo.min || 0)) discount = promo.type === 'fixed' ? Math.min(+promo.value, full) : Math.round(full * (+promo.value) / 100);
      const S = C.settings.shipping || {};
      const zone = (S.zones || []).find(z => z.id === zoneId);
      const freeOver = +S.freeOver || 0;
      const onlyPre = rows.length && rows.every(r => r.l.pre);
      let delivery = zone ? +zone.fee || 0 : null;
      if (freeOver && full - discount >= freeOver) delivery = 0;
      // pre-order only: delivery is collected with the balance on delivery
      const deliveryNow = onlyPre ? 0 : (delivery || 0);
      const total = Math.max(0, full - discount) + (delivery || 0);
      // the discount is spread over the whole order, so a pre-order deposit
      // stays exactly {depositPct}% of what the customer will actually pay
      const ratio = full ? Math.max(0, full - discount) / full : 1;
      const dueNow = Math.round(now * ratio) + deliveryNow;
      return { rows, full, now, merch, discount, promo, delivery, deliveryNow, total, dueNow, balance: Math.max(0, total - dueNow), freeOver, onlyPre, hasPre: rows.some(r => r.l.pre), count: lines.reduce((n, l) => n + l.qty, 0) };
    }
  };
  function promoFind(code) {
    code = String(code || '').trim().toUpperCase();
    const p = (C.promos || []).find(x => String(x.code).toUpperCase() === code && x.active);
    if (!p) return null;
    if (p.expiry && new Date(p.expiry + 'T23:59:59').getTime() < Date.now()) return null;
    if (+p.limit) { const used = orders.list().filter(o => (o.promo || '').toUpperCase() === code).length; if (used >= +p.limit) return null; }
    return p;
  }
  const promo = { get: () => read(LS.promo, null), set: c => { write(LS.promo, c ? String(c).toUpperCase() : null); emit('cart'); }, find: promoFind };

  /* ─────────────────────────── wishlist ─────────────────────────── */
  const wish = {
    list: () => read(LS.wish, []).filter(id => product(id)),
    has: id => read(LS.wish, []).indexOf(id) > -1,
    toggle(id) { const w = read(LS.wish, []); const i = w.indexOf(id); if (i > -1) w.splice(i, 1); else w.unshift(id); write(LS.wish, w); emit('wish'); return i < 0; }
  };

  /* ─────────────────────────── orders ─────────────────────────── */
  const orders = {
    list: () => read(LS.orders, []),
    get: id => orders.list().find(o => o.id === id),
    save(list) { write(LS.orders, list); emit('orders'); },
    create(info) {
      const T = cart.totals(info.zone);
      if (!T.rows.length) return null;
      const id = 'NZ' + (1000 + orders.list().length + 1) + '-' + uid().slice(0, 3);
      const o = {
        id, date: Date.now(), status: T.onlyPre ? 'reserved' : 'pending', lang,
        customer: { name: info.name, phone: info.phone, email: info.email || '' },
        address: { zone: info.zone, district: info.district, line: info.address, notes: info.notes || '' },
        payment: info.payment, promo: T.promo ? T.promo.code : '',
        items: T.rows.map(r => ({ pid: r.p.id, vid: r.v.id, title_en: r.p.title_en, title_ar: r.p.title_ar, color_en: r.v.color_en, color_ar: r.v.color_ar, size: r.l.size, qty: r.l.qty, price: r.unit, pre: r.l.pre, deposit: r.l.pre ? r.dep : null, img: r.v.images[0], collection: r.p.collection, src: r.l.src || 'direct' })),
        totals: { subtotal: T.full, discount: T.discount, delivery: T.delivery || 0, total: T.total, dueNow: T.dueNow, balance: T.balance },
        preorder: T.hasPre, dropId: T.hasPre ? drop().id : null,
        log: [{ s: T.onlyPre ? 'reserved' : 'pending', t: Date.now() }]
      };
      const all = orders.list(); all.unshift(o); orders.save(all);
      write(LS.profile, { name: info.name, phone: info.phone, email: info.email || '', zone: info.zone, district: info.district, address: info.address });
      cart.clear();
      emit('order'); try { window.NZ_TRACK && NZ_TRACK.event('purchase', { id, total: o.totals.total }); } catch (e) { }
      return o;
    },
    setStatus(id, s) { const all = orders.list(); const o = all.find(x => x.id === id); if (!o) return false; o.status = s; o.log = (o.log || []).concat([{ s, t: Date.now() }]); orders.save(all); return true; },
    remove(id) { orders.save(orders.list().filter(o => o.id !== id)); }
  };
  const profile = () => read(LS.profile, {});

  /* ─────────────────────────── custom requests ─────────────────────────── */
  const requests = {
    list: () => read(LS.requests, []),
    add(r) { const all = requests.list(); all.unshift(r); if (!write(LS.requests, all)) { r.images = []; all[0] = r; write(LS.requests, all); } emit('requests'); return r; },
    set(id, patch) { const all = requests.list(); const r = all.find(x => x.id === id); if (r) Object.assign(r, patch); write(LS.requests, all); },
    remove(id) { write(LS.requests, requests.list().filter(x => x.id !== id)); }
  };

  /* WhatsApp deep link */
  const wa = text => 'https://wa.me/' + String(C.settings.whatsapp || '').replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : '');

  return {
    LS, read, write, clone, esc, $, $$, uid, hash, merge, load, content, previewing, use(o) { C = o; }, get C() { return C; }, get DEF() { return DEF; }, get published() { return published; },
    STR, t, L, LL, isAr, get lang() { return lang; }, setLang(l) { lang = l; write(LS.lang, l); emit('lang'); }, initLang() { if (!lang) lang = (C.settings && C.settings.defaultLang) || 'en'; },
    money, date, products, product, collections, collection, inCollection, variant, title, colourName, img, sign, signForDate,
    stockOf, soldOut, drop, dropTime, dropOpen, isPre, deposit, reservedCount, countdown,
    cart, promo, wish, orders, profile, requests, wa, on, emit
  };
})();
