// =====================================================
//   FlavorHub — translator.js  v3
//   Performance-optimized translation engine
//   ⚡ Priority-based  🎯 Progressive  🧠 Smart cache
// =====================================================
'use strict';

const TRANSLATOR = (() => {

  // ─────────────────────────────────────────────────────
  //   LANGUAGES
  // ─────────────────────────────────────────────────────
  const LANGUAGES = [
    { code: 'en', label: 'English',   flag: '🇺🇸', dir: 'ltr', font: '' },
    { code: 'hi', label: 'हिन्दी',     flag: '🇮🇳', dir: 'ltr', font: 'Noto Sans Devanagari' },
    { code: 'bn', label: 'বাংলা',      flag: '🇧🇩', dir: 'ltr', font: 'Noto Sans Bengali' },
  ];

  // ─────────────────────────────────────────────────────
  //   AGENT 1 — PERSISTENT CACHE
  //   Memory-first lookup, localStorage persistence across
  //   sessions, LRU eviction at 3000 entries.
  // ─────────────────────────────────────────────────────

  const LS_CACHE_KEY = 'fh_xlat_cache_v5';  // v5: clears wrong "Live" translations
  const MAX_CACHE    = 3000;

  let _cache = (() => {
    try {
      const raw = localStorage.getItem(LS_CACHE_KEY);
      return raw ? JSON.parse(raw) : Object.create(null);
    } catch { return Object.create(null); }
  })();
  let _cacheCount  = Object.keys(_cache).length;
  let _cacheDirty  = false;
  let _cacheFlushT = null;

  function _cacheKey(lang, text) { return lang + '\x00' + text; }
  function _getCached(lang, text) {
    const over = STATIC_OVERRIDES[lang]?.[text.trim()];
    if (over !== undefined) return over;
    const v = _cache[_cacheKey(lang, text)]; return v !== undefined ? v : null;
  }
  function _setCached(lang, text, result) {
    const k = _cacheKey(lang, text);
    if (_cache[k] === undefined) {
      if (_cacheCount >= MAX_CACHE) {
        const keys = Object.keys(_cache);
        const drop = Math.floor(keys.length / 4);
        for (let i = 0; i < drop; i++) { delete _cache[keys[i]]; _cacheCount--; }
      }
      _cacheCount++;
    }
    _cache[k] = result;
    _cacheDirty = true;
    clearTimeout(_cacheFlushT);
    _cacheFlushT = setTimeout(_flushCache, 1500);
  }
  function _flushCache() {
    if (!_cacheDirty) return;
    try { localStorage.setItem(LS_CACHE_KEY, JSON.stringify(_cache)); } catch {}
    _cacheDirty = false;
  }

  const STATIC_OVERRIDES = {
    bn: { 'Live': 'সরাসরি' },
    hi: { 'Live': 'सजीव'   },
  };

  // ─────────────────────────────────────────────────────
  //   STATIC SKIP LIST
  // ─────────────────────────────────────────────────────
  const STATIC_SKIP = new Set([
    'ok','yes','no','en','hi','bn','es','fr','zh','ar',
    'save','saved','back','next','prev','close','open','on','off','loading','error',
  ]);

  function _worthTranslating(text) {
    const t = text.trim();
    if (t.length < 2) return false;
    if (/^[\d\s\W]+$/u.test(t)) return false;
    if (STATIC_SKIP.has(t.toLowerCase())) return false;
    return true;
  }

  // ─────────────────────────────────────────────────────
  //   AGENT 2 — API LAYER (Claude Haiku, parallel chunks)
  // ─────────────────────────────────────────────────────

  const CHUNK_SIZE   = 10;   // MyMemory: translate in parallel batches
  const MAX_PARALLEL = 2;

  // MyMemory language code overrides (where ISO code differs)
  const MM_LANG_MAP = { zh: 'zh-CN' };
  function _mmLang(lang) { return MM_LANG_MAP[lang] || lang; }

  async function translateBatch(texts, lang) {
    if (lang === 'en' || !texts.length) return [...texts];
    const results = new Array(texts.length);
    const toFetch = [];
    texts.forEach((text, idx) => {
      if (!_worthTranslating(text)) { results[idx] = text; return; }
      const cached = _getCached(lang, text);
      if (cached !== null) { results[idx] = cached; }
      else { toFetch.push({ text, idx }); }
    });
    if (!toFetch.length) return results;
    const chunks = [];
    for (let i = 0; i < toFetch.length; i += CHUNK_SIZE) chunks.push(toFetch.slice(i, i + CHUNK_SIZE));
    for (let i = 0; i < chunks.length; i += MAX_PARALLEL) {
      await Promise.all(chunks.slice(i, i + MAX_PARALLEL).map(c => _callMyMemory(c, lang, results)));
    }
    return results;
  }

  // MyMemory is a per-string API — translate each text individually in parallel.
  // Free tier: 5 000 chars/day per IP (no key needed). CORS is fully supported.
  async function _callMyMemory(chunk, lang, results) {
    const target = _mmLang(lang);
    await Promise.all(chunk.map(async ({ text, idx }) => {
      let translated = text;
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|${target}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          // MyMemory sometimes wraps segments in XML tags like <G ID="1">…</G> — strip them
          translated = data.responseData.translatedText.replace(/<\/?[^>]+>/g, '').trim() || text;
        }
      } catch (err) {
        console.warn('[TRANSLATOR] MyMemory request failed', err);
      }
      results[idx] = translated;
      _setCached(lang, text, translated);
    }));
  }

  // ─────────────────────────────────────────────────────
  //   AGENT 3 — DOM UTILITIES
  // ─────────────────────────────────────────────────────

  const SKIP_TAGS = new Set(['SCRIPT','STYLE','CODE','PRE','SVG','MATH','NOSCRIPT','CANVAS','TEXTAREA','SELECT','OPTION']);
  const SKIP_CLASSES = new Set(['lang-selector-wrap','lang-dropdown','lang-option','lang-flag','lang-label','lang-check','lang-dropdown-footer']);
  const TRANSLATE_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  const _origText = new WeakMap();
  const _origAttr = new WeakMap();

  function _shouldSkip(el, root) {
    let cur = el;
    while (cur && cur !== root) {
      if (SKIP_TAGS.has(cur.tagName)) return true;
      if (cur.hasAttribute?.('data-notranslate')) return true;
      if (cur.classList) { for (const cls of SKIP_CLASSES) if (cur.classList.contains(cls)) return true; }
      cur = cur.parentElement;
    }
    return false;
  }

  function _collectTextNodes(root) {
    const nodes = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (_shouldSkip(n.parentElement, root)) continue;
      if (!_worthTranslating(n.textContent)) continue;
      nodes.push(n);
    }
    return nodes;
  }

  function _collectAttrElements(root) {
    const els = [];
    root.querySelectorAll(TRANSLATE_ATTRS.map(a => `[${a}]`).join(',')).forEach(el => {
      if (_shouldSkip(el, root)) return;
      const attrs = {};
      TRANSLATE_ATTRS.forEach(a => { const v = el.getAttribute(a); if (v && _worthTranslating(v)) attrs[a] = v; });
      if (Object.keys(attrs).length) els.push({ el, attrs });
    });
    return els;
  }

  function _applyTextMap(nodes, map) {
    nodes.forEach(node => {
      if (_origText.has(node)) return;
      const trimmed = node.textContent.trim();
      const xlat    = map[trimmed];
      if (!xlat || xlat === trimmed) return;
      _origText.set(node, node.textContent);
      node.textContent = node.textContent.replace(trimmed, xlat);
    });
  }

  function _applyAttrMap(attrEls, map) {
    attrEls.forEach(({ el, attrs }) => {
      const stored = _origAttr.get(el) || {};
      Object.entries(attrs).forEach(([attr, origVal]) => {
        if (stored[attr] !== undefined) return;
        const xlat = map[origVal.trim()];
        if (!xlat || xlat === origVal.trim()) return;
        stored[attr] = origVal; el.setAttribute(attr, xlat);
      });
      if (Object.keys(stored).length) _origAttr.set(el, stored);
    });
  }

  function _markTranslated(root, lang) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) { if (_origText.has(n) && n.parentElement) n.parentElement.setAttribute('data-xlang', lang); }
    root.querySelectorAll(TRANSLATE_ATTRS.map(a => `[${a}]`).join(',')).forEach(el => { if (_origAttr.has(el)) el.setAttribute('data-xlang', lang); });
  }

  function _revertAll() {
    document.querySelectorAll('[data-xlang]').forEach(el => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const orig = _origText.get(n);
        if (orig !== undefined) { n.textContent = orig; _origText.delete(n); }
      }
      const attrOrig = _origAttr.get(el);
      if (attrOrig) { Object.entries(attrOrig).forEach(([attr, val]) => el.setAttribute(attr, val)); _origAttr.delete(el); }
      el.removeAttribute('data-xlang');
    });
  }

  // ─────────────────────────────────────────────────────
  //   AGENT 4 — PROGRESSIVE TRANSLATION ENGINE
  //   P0 (sync)  — cache hits applied instantly
  //   P1 (fast)  — navbar/hero/buttons fetched first
  //   P2 (normal)— body content
  //   P3 (lazy)  — off-screen via IntersectionObserver
  // ─────────────────────────────────────────────────────

  function _shimmerOn(nodes)  { nodes.forEach(n => n.parentElement?.classList.add('xlat-shimmer')); }
  function _shimmerOff(nodes) { nodes.forEach(n => n.parentElement?.classList.remove('xlat-shimmer')); }

  async function _translateSubtree(root, lang, session) {
    if (!root || lang === 'en') return;

    // Skip nodes already translated — check both WeakMap and data-xlang attr
    const allNodes  = _collectTextNodes(root);
    const textNodes = allNodes.filter(n => !_origText.has(n));

    const uniqueTexts = [...new Set(textNodes.map(n => n.textContent.trim()))].filter(Boolean);

    // P0 — apply cache hits synchronously (no API, no await, instant)
    const p0Map    = {};
    const uncached = [];
    uniqueTexts.forEach(t => {
      const c = _getCached(lang, t);
      if (c !== null) p0Map[t] = c;
      else if (_worthTranslating(t)) uncached.push(t);
    });
    if (Object.keys(p0Map).length) _applyTextMap(textNodes, p0Map);

    if (session !== undefined && _session !== session) return;  // stale job

    // Collect untranslated attrs — merge with text into ONE API call
    const attrEls      = _collectAttrElements(root).filter(({ el }) => !_origAttr.has(el));
    const uniqueAttrTx = [...new Set(
      attrEls.flatMap(({ attrs }) => Object.values(attrs).map(v => v.trim()))
    )].filter(t => _getCached(lang, t) === null && _worthTranslating(t));

    const allUncached = [...new Set([...uncached, ...uniqueAttrTx])];

    if (allUncached.length) {
      const waiting = textNodes.filter(n => !_origText.has(n) && _worthTranslating(n.textContent));
      _shimmerOn(waiting);

      const translated = await translateBatch(allUncached, lang);

      if (session !== undefined && _session !== session) { _shimmerOff(waiting); return; }

      const map = {};
      allUncached.forEach((t, i) => { map[t] = translated[i]; });
      _shimmerOff(waiting);
      _applyTextMap(textNodes, map);
      _applyAttrMap(attrEls, map);
    } else if (attrEls.length) {
      // All attr strings were already cached — apply from cache directly
      const map = {};
      [...new Set(attrEls.flatMap(({ attrs }) => Object.values(attrs).map(v => v.trim())))]
        .forEach(t => { const c = _getCached(lang, t); if (c !== null) map[t] = c; });
      _applyAttrMap(attrEls, map);
    }

    _markTranslated(root, lang);
  }

  // ─────────────────────────────────────────────────────
  //   AGENT 5 — PRIORITY QUEUE + VIEWPORT DETECTION
  // ─────────────────────────────────────────────────────

  let _ioObserver = null;

  function _getRegionsByPriority() {
    return {
      // HIGH — small, above-fold, user sees immediately
      high: [
        document.querySelector('.nav-links'),
        document.getElementById('navCookBtn'),
        document.querySelector('.hero-content'),
        document.querySelector('.detail-toolbar'),
        document.querySelector('.detail-info h1'),
        document.querySelector('.filter-bar'),
        document.querySelector('.active-filters'),
        // Section headers: "Trending Now", "Quick Meals", "Healthy Picks" + their badges
        ...document.querySelectorAll('.h-scroll-header'),
        // Stats bar: "5,000+ Recipes", "100+ Cuisines", "Nutrition Included"
        document.querySelector('.discovery-stats'),
      ].filter(Boolean),
      // NORMAL — important body content
      normal: [
        document.querySelector('.ingredients-panel'),
        document.querySelector('.nutrition-panel'),
        document.querySelector('.detail-badges'),
        document.querySelector('.detail-info p.intro'),
        document.getElementById('cookOverlay'),
        document.querySelector('footer'),
        // "Browse by Category" and "World Cuisines" headings
        ...document.querySelectorAll('.section-head'),
      ].filter(Boolean),
      // LAZY — heavy/off-screen content, translated on scroll
      // IMPORTANT: never include mainContent — it's the parent of
      // all other regions and would cause double-translation
      lazy: [
        document.querySelector('.steps-panel'),
        document.querySelector('#filterResultsSection'),
        document.querySelector('.cards-grid'),
        // querySelectorAll: grab ALL scroll sections (header + track) for Trending/Quick/Healthy
        ...document.querySelectorAll('.h-scroll-section'),
        document.querySelector('.subs-panel'),
        document.querySelector('.category-scroll'),
        document.querySelector('.cuisine-grid'),
        document.querySelector('.cuisine-grid-v3'),
      ].filter(Boolean),
    };
  }

  async function _translatePageProgressive(lang, session) {
    const { high, normal, lazy } = _getRegionsByPriority();

    // Deduplicate: if a child element appears in both high and normal,
    // only translate it once
    const queued = new Set();
    const dedup  = arr => arr.filter(el => { if (queued.has(el)) return false; queued.add(el); return true; });

    // P1 — high priority: all in parallel
    await Promise.all(dedup(high).map(r => _translateSubtree(r, lang, session)));
    if (session !== undefined && _session !== session) return;

    // P2 — normal priority: all in parallel
    await Promise.all(dedup(normal).map(r => _translateSubtree(r, lang, session)));
    if (session !== undefined && _session !== session) return;

    // P3 — lazy: only when user scrolls to them
    _setupLazyObserver(dedup(lazy), lang, session);
  }

  function _setupLazyObserver(elements, lang, session) {
    if (_ioObserver) { _ioObserver.disconnect(); _ioObserver = null; }
    const remaining = new Set(elements);
    if (!remaining.size) return;
    _ioObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Always use the live _session and _currentLang so we never
        // abort a still-valid translation due to a stale captured token
        if (_currentLang !== lang) return;
        remaining.delete(el);
        _ioObserver?.unobserve(el);
        _translateSubtree(el, _currentLang, _session).catch(() => {});
        if (!remaining.size) { _ioObserver?.disconnect(); _ioObserver = null; }
      });
    }, { rootMargin: '200px' });
    remaining.forEach(el => _ioObserver.observe(el));
  }

  // ─────────────────────────────────────────────────────
  //   AGENT 6 — PRE-TRANSLATION (COMMON UI TEXT)
  //   Warm cache on hover before user even clicks confirm.
  // ─────────────────────────────────────────────────────

  const COMMON_UI = [
    'Save','Saved','Back to Results','Cook Mode','Chef Mode','Original Mode',
    'Filter','Veg','Vegan','Quick <25 min','Medium','Trending Now',
    'Ingredients','Step-by-Step Instructions','Nutrition','Watch on YouTube',
    'Search recipes…','Favourites','Home','No video available for this recipe.',
    'Ingredient Substitutions','Loading…','Fetching matching recipes…',
    'No recipes match these filters.','Try removing a filter to see more.',
  ];

  function _preTranslate(lang) {
    if (lang === 'en') return;
    const uncached = COMMON_UI.filter(s => _getCached(lang, s) === null);
    if (uncached.length) translateBatch(uncached, lang).catch(() => {});
  }

  // ─────────────────────────────────────────────────────
  //   AGENT 7 — UI/UX
  // ─────────────────────────────────────────────────────

  let _currentLang = 'en', _translating = false, _pendingLang = null;

  function _showLoader() { document.getElementById('langSelectorBtn')?.classList.add('translating'); document.getElementById('langLoadingIndicator')?.classList.add('active'); }
  function _hideLoader() { document.getElementById('langSelectorBtn')?.classList.remove('translating'); document.getElementById('langLoadingIndicator')?.classList.remove('active'); }

  function _applyDir(code) { document.documentElement.dir = LANGUAGES.find(l => l.code === code)?.dir === 'rtl' ? 'rtl' : 'ltr'; }

  function _loadFont(code) {
    const lang = LANGUAGES.find(l => l.code === code);
    if (!lang?.font) return;
    const id = 'gf-' + lang.font.replace(/\s/g, '-');
    if (document.getElementById(id)) return;
    document.head.appendChild(Object.assign(document.createElement('link'), { id, rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(lang.font)}:wght@300;400;600&display=swap` }));
  }

  function _applyFont(code) {
    _loadFont(code);
    const lang = LANGUAGES.find(l => l.code === code);
    if (lang?.font) { document.body.style.setProperty('--script-font', `'${lang.font}', sans-serif`); document.body.classList.add('has-script-font'); }
    else { document.body.style.removeProperty('--script-font'); document.body.classList.remove('has-script-font'); }
  }

  function _updateUI(code) {
    const lang = LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
    const lbl  = document.getElementById('langBtnLabel');
    if (lbl) lbl.textContent = lang.code.toUpperCase();
    document.querySelectorAll('.lang-option').forEach(opt => {
      const active = opt.dataset.code === code;
      opt.classList.toggle('active', active);
      const chk = opt.querySelector('.lang-check');
      if (chk) chk.textContent = active ? '✓' : '';
    });
  }

  function _buildSelector() {
    const nav = document.getElementById('navbar');
    if (!nav || document.getElementById('langSelectorBtn')) return;
    const wrap = document.createElement('div');
    wrap.className = 'lang-selector-wrap';
    wrap.id = 'langSelectorWrap';
    wrap.innerHTML = `
      <div id="langLoadingIndicator" class="lang-loading-indicator" title="Translating…"><div class="lang-spinner"></div></div>
      <button id="langSelectorBtn" class="lang-selector-btn" title="Change language" aria-haspopup="true" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10"/></svg>
        <span id="langBtnLabel">EN</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10" class="lang-chevron"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div id="langDropdown" class="lang-dropdown" role="listbox">
        ${LANGUAGES.map(l => `<button class="lang-option${l.code === 'en' ? ' active' : ''}" data-code="${l.code}" role="option"><span class="lang-flag">${l.flag}</span><span class="lang-label">${l.label}</span><span class="lang-check">${l.code === 'en' ? '✓' : ''}</span></button>`).join('')}

      </div>`;
    const cookBtn = document.getElementById('navCookBtn');
    nav.insertBefore(wrap, cookBtn || null);
    const btn = document.getElementById('langSelectorBtn');
    const dd  = document.getElementById('langDropdown');
    btn.addEventListener('click', e => { e.stopPropagation(); const open = dd.classList.toggle('open'); btn.setAttribute('aria-expanded', open); });
    document.addEventListener('click', () => { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); });
    dd.addEventListener('click', e => {
      const opt = e.target.closest('.lang-option');
      if (!opt) return;
      e.stopPropagation(); dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
      selectLanguage(opt.dataset.code);
    });
    // Hover = pre-warm that language's cache instantly
    dd.addEventListener('mouseover', e => {
      const opt = e.target.closest('.lang-option');
      if (opt && opt.dataset.code !== 'en') _preTranslate(opt.dataset.code);
    });
  }

  // ─────────────────────────────────────────────────────
  //   AGENT 8 — STATE MACHINE + MUTATION OBSERVER
  // ─────────────────────────────────────────────────────

  const LS_LANG_KEY = 'fh_preferred_lang';
  function _saveLang(c)  { try { localStorage.setItem(LS_LANG_KEY, c); } catch {} }
  function _loadLang()   { try { return localStorage.getItem(LS_LANG_KEY) || 'en'; } catch { return 'en'; } }

  // Session token: increment on every new translation job.
  // Any in-flight job that sees its token is stale aborts silently.
  let _session = 0;

  async function selectLanguage(code) {
    if (code === _currentLang && !_translating) return;
    if (_translating) { _pendingLang = code; return; }
    if (_ioObserver) { _ioObserver.disconnect(); _ioObserver = null; }
    _revertAll();
    _currentLang = code; _saveLang(code); _updateUI(code); _applyDir(code); _applyFont(code);
    if (code === 'en') return;
    _translating = true;
    _session++;
    _showLoader();
    try { await _translatePageProgressive(code, _session); }
    catch (err) { console.warn('[TRANSLATOR] error:', err); }
    finally {
      _translating = false; _hideLoader();
      if (_pendingLang && _pendingLang !== _currentLang) {
        const next = _pendingLang; _pendingLang = null; selectLanguage(next);
      }
    }
  }

  function _observe() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    // _obsLock: MutationObserver is DISCONNECTED while we are translating,
    // then reconnected. This is the only reliable way to prevent the
    // observer from firing on its own DOM writes.
    let _obsLock   = false;
    let _obsTimer  = null;
    let _obsInst   = null;

    function _reconnect() {
      if (_obsInst) _obsInst.disconnect();
      _obsInst = new MutationObserver(_onMutation);
      // childList + subtree catches async card injections (Trending/Quick/Healthy)
      _obsInst.observe(main, { childList: true, subtree: true });
    }

    async function _onMutation(mutations) {
      if (_currentLang === 'en' || _obsLock) return;
      // Ignore pure text-node mutations (our own xlat writes) to reduce noise
      const hasRealNodes = mutations.some(m =>
        m.addedNodes.length > 0 &&
        [...m.addedNodes].some(n => n.nodeType === Node.ELEMENT_NODE)
      );
      if (!hasRealNodes) return;
      clearTimeout(_obsTimer);
      // 600 ms debounce — gives async sections (Trending / Quick Meals / Healthy)
      // time to fully populate before we scan & translate them.
      _obsTimer = setTimeout(async () => {
        _obsLock = true;
        _obsInst.disconnect();   // ← stop watching BEFORE we touch the DOM
        _showLoader();
        try {
          // Re-run full progressive translation so newly injected regions
          // (all .h-scroll-track, category-scroll, cuisine-grid, etc.) are picked up
          await _translatePageProgressive(_currentLang, _session);
        } catch {}
        finally {
          _hideLoader();
          _obsLock = false;
          _reconnect();          // ← start watching again AFTER DOM is stable
        }
      }, 600);
    }

    _reconnect();
  }

  function init() {
    _buildSelector();
    _observe();
    const saved = _loadLang();
    if (saved && saved !== 'en') {
      _preTranslate(saved);
      setTimeout(() => selectLanguage(saved), 400);
    }
  }

  return { init, selectLanguage, translateBatch, translateElement: (el) => {
    if (el && _currentLang !== 'en') _translateSubtree(el, _currentLang, _session).catch(() => {});
  }, LANGUAGES };

})();

// Inject shimmer CSS
(function() {
  if (document.getElementById('xlat-shimmer-style')) return;
  const s = document.createElement('style');
  s.id = 'xlat-shimmer-style';
  s.textContent = `
    .xlat-shimmer { position: relative; overflow: hidden; }
    .xlat-shimmer::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 60%, transparent 100%);
      background-size: 200% 100%;
      animation: xlat-sweep 1.4s ease-in-out infinite;
      pointer-events: none; border-radius: inherit;
    }
    @keyframes xlat-sweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `;
  document.head.appendChild(s);
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TRANSLATOR.init.bind(TRANSLATOR));
} else {
  TRANSLATOR.init();
}
