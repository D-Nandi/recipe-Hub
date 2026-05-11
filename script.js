// ===========================
//   FlavorHub v3 — script.js
//   Consolidated & Upgraded
// ===========================
'use strict';

// ── State ──
const searchInput  = document.getElementById('searchInput');
const mainContent  = document.getElementById('mainContent');
let lastQuery      = '';
let _prevPage      = null;
let currentMeal    = null;
let cookSteps      = [];
let cookIndex      = 0;
let _cookXlatVer   = 0;
let favourites     = JSON.parse(localStorage.getItem('fh_favourites') || '[]');

// ── Back navigation ──
function goBack() {
  if (typeof _prevPage === 'function') {
    const fn = _prevPage;
    _prevPage = null;
    fn();
  } else {
    showDiscoveryHome();
  }
}

const BACK_BTN_HTML = `<button class="back-nav-btn" onclick="goBack()" aria-label="Go back">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
  Back
</button>`;

// ──────────────────────────────────────────
//   CHANGE 1: Touch device detection for cursor
//   Only inject the chopstick cursor on pointer devices.
//   On touch devices cursor: none is NOT applied.
// ──────────────────────────────────────────
(function initCursor() {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const cursorEl = document.getElementById('cursor');
  if (isTouch) {
    // Touch device — remove the cursor element and the style that hides the pointer
    if (cursorEl) cursorEl.remove();
    document.documentElement.classList.add('touch-device');
  } else {
    // Desktop — activate chopstick cursor
    document.addEventListener('mousemove', e => {
      if (cursorEl) {
        cursorEl.style.left = e.clientX + 'px';
        cursorEl.style.top  = e.clientY + 'px';
      }
    });
  }
})();

// ── Fav badge ──
function updateFavBadge() {
  document.getElementById('favCount').textContent = favourites.length;
}
updateFavBadge();

// ── Nav scroll style ──
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
});

// ── Enter key ──
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

// ──────────────────────────────────────────
//   STEAM HERO ANIMATION
// ──────────────────────────────────────────
(function initSteamHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const canvas = document.getElementById('heroCanvas');
  if (canvas) canvas.remove();

  const glow = document.createElement('div');
  glow.className = 'hero-glow';
  hero.insertBefore(glow, hero.firstChild);

  const container = document.createElement('div');
  container.className = 'steam-container';
  hero.insertBefore(container, hero.firstChild);

  function makeSteamSVG(sw) {
    let paths = '';
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * 30;
      const c1x = 150 + offset + (Math.random() - 0.5) * 60;
      const c1y = 380 + (Math.random() - 0.5) * 60;
      const c2x = 150 + offset + (Math.random() - 0.5) * 80;
      const c2y = 240 + (Math.random() - 0.5) * 60;
      const c3x = 150 + offset + (Math.random() - 0.5) * 55;
      const c3y = 110 + (Math.random() - 0.5) * 50;
      const op  = (0.50 + Math.random() * 0.40).toFixed(2);
      paths += `<path d="M150 500 C${c1x} ${c1y} ${c2x} ${c2y} ${c3x} ${c3y} C${310 - c3x} ${c3y - 50} ${310 - c2x} 20 150 0"
        stroke="url(#steam-grad)" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
    }
    return `<svg viewBox="0 0 300 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="steam-grad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="rgba(255,200,150,0.05)"/>
          <stop offset="40%" stop-color="rgba(255,215,170,0.8)"/>
          <stop offset="100%" stop-color="rgba(255,235,200,0.1)"/>
        </linearGradient>
      </defs>${paths}</svg>`;
  }

  const numWisps = 18;
  for (let i = 0; i < numWisps; i++) {
    const layerRand = Math.random();
    let layerName, baseZ, baseBlur, baseOp, baseDur, baseW;
    if (layerRand < 0.35) { layerName='far';  baseZ=1; baseBlur=24; baseOp=0.35; baseDur=38; baseW=340; }
    else if (layerRand < 0.70) { layerName='mid'; baseZ=2; baseBlur=16; baseOp=0.48; baseDur=28; baseW=310; }
    else { layerName='near'; baseZ=3; baseBlur=10; baseOp=0.60; baseDur=22; baseW=280; }

    const u1 = Math.random() || 0.0001;
    const u2 = Math.random();
    const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const rawLeft = 50 + gaussian * 32;
    const clampedLeft = Math.max(1, Math.min(99, rawLeft));
    const left = clampedLeft.toFixed(1) + '%';
    const distFromCenter = Math.abs(clampedLeft - 50) / 50;
    const edgeFade = 1 - distFromCenter * 0.30;
    const edgeBlur = 1 + distFromCenter * 0.45;

    const dur   = (baseDur + (Math.random() * 12 - 6)).toFixed(1) + 's';
    const delay = '-' + (Math.random() * 40).toFixed(1) + 's';
    const w     = ((baseW + (Math.random() * 50 - 25)) * edgeFade).toFixed(0) + 'px';
    const blur  = Math.max(4, (baseBlur * edgeBlur) + (Math.random() * 6 - 3)).toFixed(1) + 'px';
    const op    = Math.min(0.9, Math.max(0.12, (baseOp * edgeFade) + (Math.random() * 0.1 - 0.05))).toFixed(2);
    const sway1 = (Math.random() * 50 - 25).toFixed(1) + 'px';
    const sway2 = (Math.random() * 60 - 30).toFixed(1) + 'px';
    const sway3 = (Math.random() * 70 - 35).toFixed(1) + 'px';
    const sw    = 55 + Math.random() * 25;

    const el = document.createElement('div');
    el.className = `steam-wisp steam-${layerName}`;
    el.style.cssText = `left:${left};--w:${w};--dur:${dur};--delay:${delay};--blur:${blur};--max-op:${op};--sway1:${sway1};--sway2:${sway2};--sway3:${sway3};--z:${baseZ};`;
    el.innerHTML = makeSteamSVG(sw);
    container.appendChild(el);
  }
})();

// ──────────────────────────────────────────
//   CHANGE 2: cachedFetch WITH EXPIRY (10 min)
// ──────────────────────────────────────────
const _apiCache = {};
const CACHE_TTL = 600_000; // 10 minutes in ms

async function cachedFetch(url) {
  const now = Date.now();
  const cached = _apiCache[url];
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.data;

  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  _apiCache[url] = { data, ts: now };
  return data;
}

// ──────────────────────────────────────────
//   BEEF FILTER
// ──────────────────────────────────────────
const BEEF_TERMS = ['beef','steak','hamburger','ground beef','minced beef','beef mince',
  'beef broth','beef stock','beef fat','beef suet','beef tallow','beef liver','beef kidney',
  'beef heart','beef tongue','beef brisket','beef ribs','beef chuck','beef sirloin',
  'beef tenderloin','beef fillet','beef roast','beef stew','beef curry','beef bourguignon',
  'beef stroganoff','beef wellington','beef tartare','beef carpaccio'];

function isBeef(meal) {
  const cat   = (meal.strCategory || '').toLowerCase();
  const title = (meal.strMeal || meal.title || '').toLowerCase();
  if (cat === 'beef') return true;
  for (const t of BEEF_TERMS) { if (title.includes(t)) return true; }
  for (let i = 1; i <= 20; i++) {
    const ing = (meal[`strIngredient${i}`] || '').toLowerCase();
    if (!ing) continue;
    for (const t of BEEF_TERMS) { if (ing.includes(t)) return true; }
  }
  return false;
}

// ──────────────────────────────────────────
//   CHANGE 3: CURATED TRENDING LIST
//   Day-of-week rotation → same list per day, not random each load
// ──────────────────────────────────────────
const TRENDING_IDS_BY_DAY = [
  // Sunday
  ['52772','52854','52975','53049','52804','52835','52959','53048'],
  // Monday
  ['52807','52932','52865','52987','52776','53030','52820','52944'],
  // Tuesday
  ['52768','52908','52840','52996','53003','52893','52782','52912'],
  // Wednesday
  ['52785','52855','53012','52870','52900','52927','52830','53021'],
  // Thursday
  ['52800','52945','52776','52998','52850','52912','53031','52868'],
  // Friday
  ['52820','52872','53005','52942','52786','52855','52993','52836'],
  // Saturday
  ['52960','52835','52775','53040','52902','52870','52988','52813'],
];

// ──────────────────────────────────────────
//   SEARCH & NAVIGATION
// ──────────────────────────────────────────
function quickSearch(q) {
  searchInput.value = q;
  doSearch();
  setTimeout(() => {
    document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function showHome() {
  showDiscoveryHome();
}

// ──────────────────────────────────────────
//   CHANGE 4: DEBOUNCED SEARCH SUGGESTIONS
// ──────────────────────────────────────────
let suggestTimeout  = null;
let currentSuggestQuery = '';
const suggestDropdown   = document.getElementById('suggestionsDropdown');

searchInput.addEventListener('input', () => {
  const val = searchInput.value.trim();
  clearTimeout(suggestTimeout);

  if (val.length < 2) { hideSuggestions(); return; }

  suggestDropdown.innerHTML = `
    <div class="suggest-loading">
      <div class="suggest-spinner"></div>
      Finding recipes for "${val}"…
    </div>`;

  // Debounce: wait 300ms after last keystroke before hitting the API
  suggestTimeout = setTimeout(() => fetchSuggestions(val), 300);
});

searchInput.addEventListener('focus', () => {
  const val = searchInput.value.trim();
  if (val.length >= 2 && suggestDropdown.children.length) {
    suggestDropdown.style.display = 'block';
  }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) hideSuggestions();
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideSuggestions();
  if (e.key === 'Enter') { hideSuggestions(); doSearch(); }
});

function hideSuggestions() {
  suggestDropdown.innerHTML = '';
}

async function fetchSuggestions(q) {
  currentSuggestQuery = q;
  try {
    const [byName, byFirstLetter] = await Promise.all([
      fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`).then(r => r.json()),
      fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${encodeURIComponent(q[0])}`).then(r => r.json()),
    ]);
    if (currentSuggestQuery !== q) return;

    const seen = new Set();
    const combined = [];
    if (byName.meals) {
      byName.meals.forEach(m => { if (!seen.has(m.idMeal)) { seen.add(m.idMeal); combined.push(m); } });
    }
    if (byFirstLetter.meals) {
      byFirstLetter.meals.forEach(m => {
        if (!seen.has(m.idMeal) && m.strMeal.toLowerCase().includes(q.toLowerCase())) {
          seen.add(m.idMeal); combined.push(m);
        }
      });
    }
    if (!combined.length) { hideSuggestions(); return; }

    const filtered = combined.filter(m => !isBeef(m));
    renderSuggestions(filtered.slice(0, 7), q);
  } catch {
    hideSuggestions();
  }
}

function renderSuggestions(meals, q) {
  function highlight(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx)
      + `<mark style="background:rgba(232,160,69,0.25);color:var(--accent);border-radius:2px">${text.slice(idx, idx + query.length)}</mark>`
      + text.slice(idx + query.length);
  }
  let html = `<div class="suggest-label">Suggested Recipes</div>`;
  meals.forEach(m => {
    const meta = [m.strArea, m.strCategory].filter(Boolean).join(' · ');
    html += `
      <div class="suggest-item" onclick="pickSuggestion('${m.idMeal}')">
        <img class="suggest-thumb" src="${m.strMealThumb}/preview" alt="${m.strMeal}" loading="lazy"/>
        <div class="suggest-info">
          <div class="suggest-name">${highlight(m.strMeal, q)}</div>
          ${meta ? `<div class="suggest-meta">${meta}</div>` : ''}
        </div>
        <span class="suggest-arrow" aria-hidden="true">→</span>
      </div>`;
  });
  suggestDropdown.innerHTML = html;
}

function pickSuggestion(id) {
  hideSuggestions();
  showDetail(id);
  document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
}

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  lastQuery = q;
  document.getElementById('navCookBtn').style.display = 'none';
  mainContent.setAttribute('aria-live', 'polite');
  mainContent.innerHTML = `<div class="state-box"><div class="spinner"></div><h3>Searching recipes...</h3><p>Finding everything for "<strong>${q}</strong>"</p></div>`;
  try {
    const [byName, byLetter, byCategory] = await Promise.allSettled([
      fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q), { mode: 'cors' }).then(r => r.json()),
      fetch('https://www.themealdb.com/api/json/v1/1/search.php?f=' + encodeURIComponent(q[0]), { mode: 'cors' }).then(r => r.json()),
      fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=' + encodeURIComponent(q), { mode: 'cors' }).then(r => r.json()),
    ]);
    const seen = new Set(), all = [];
    if (byName.status === 'fulfilled' && byName.value.meals)
      byName.value.meals.forEach(m => { if (!seen.has(m.idMeal)) { seen.add(m.idMeal); all.push(m); } });
    if (byLetter.status === 'fulfilled' && byLetter.value.meals)
      byLetter.value.meals.forEach(m => { if (!seen.has(m.idMeal) && m.strMeal.toLowerCase().includes(q.toLowerCase())) { seen.add(m.idMeal); all.push(m); } });
    if (byCategory.status === 'fulfilled' && byCategory.value.meals)
      byCategory.value.meals.forEach(m => { if (!seen.has(m.idMeal)) { seen.add(m.idMeal); all.push(m); } });
    renderResults(all, q);
  } catch {
    mainContent.innerHTML = `<div class="state-box"><span class="state-icon">⚠️</span><h3>Could not load recipes</h3><p>Check your internet and try again.</p><button onclick="doSearch()" style="margin-top:18px;background:var(--accent);color:#1a0800;border:none;padding:10px 24px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Retry</button></div>`;
  }
}

// ──────────────────────────────────────────
//   CHANGE 5: RENDER HELPERS (split out of showDetail & browseCategory)
// ──────────────────────────────────────────

// Build the ingredients array from a MealDB meal object
function buildIngredientList(m) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name    = m[`strIngredient${i}`];
    const measure = m[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: (measure || '').trim() });
    }
  }
  return ingredients;
}

// Parse raw instructions string into step array
function parseSteps(instructions) {
  if (!instructions) return [];
  return instructions
    .replace(/\r\n/g, '\n')
    .split(/\n|\.\s{2,}|\d+\.\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
}

// Build the substitution list HTML
const SUB_MAP = {
  'butter':             'Coconut oil or ghee',
  'heavy cream':        'Coconut cream or cashew cream',
  'milk':               'Oat milk or almond milk',
  'eggs':               'Flax egg (1 tbsp flaxseed + 3 tbsp water)',
  'buttermilk':         'Milk + 1 tsp lemon juice (let sit 5 min)',
  'all-purpose flour':  'Almond flour or oat flour (1:1 for most recipes)',
  'sugar':              'Honey (¾ cup per 1 cup sugar) or maple syrup',
  'sour cream':         'Greek yogurt works perfectly',
  'chicken broth':      'Vegetable broth or water with bouillon',
  'wine':               'Grape juice + splash of vinegar',
  'breadcrumbs':        'Crushed cornflakes or oats',
};

function buildSubstitutionsHTML(ingredients) {
  const matched = ingredients
    .filter(ing => Object.keys(SUB_MAP).some(k => ing.name.toLowerCase().includes(k)))
    .map(ing => {
      const key = Object.keys(SUB_MAP).find(k => ing.name.toLowerCase().includes(k));
      return `<div class="sub-item"><strong>${ing.name}</strong> → ${SUB_MAP[key]}</div>`;
    });
  if (!matched.length) return '';
  return `
    <div class="subs-panel">
      <div class="subs-toggle" onclick="toggleSubs(this)">
        <span>🔄 Ingredient Substitutions (${matched.length})</span>
        <span>▾</span>
      </div>
      <div class="subs-content">${matched.join('')}</div>
    </div>`;
}

// Build the ingredients panel HTML
function buildIngredientsHTML(ingredients) {
  return `
    <div class="ingredients-panel">
      <h2 class="section-title">Ingredients</h2>
      <ul class="ing-list">
        ${ingredients.map((ing, idx) => `
          <li>
            <div class="ing-check" id="ingCheck${idx}" onclick="toggleIngCheck(${idx})"></div>
            <span class="ing-measure">${ing.measure}</span>
            <span class="ing-name">${ing.name}</span>
          </li>`).join('')}
      </ul>
      ${buildSubstitutionsHTML(ingredients)}
    </div>`;
}

// Build the steps panel HTML
function buildStepsHTML(steps) {
  return `
    <div class="steps-panel">
      <h2 class="section-title">Step-by-Step Instructions</h2>
      <ol class="steps-list">
        ${steps.map((s, i) => `
          <li class="step-item" id="stepItem${i}" onclick="highlightStep(${i})">
            <span class="step-num">${i + 1}</span>
            <p class="step-text">${s}</p>
          </li>`).join('')}
      </ol>
    </div>`;
}

// Build the nutrition panel HTML (placeholder while loading)
function buildNutritionHTML() {
  return `
    <div class="nutrition-panel">
      <p class="nutrition-title">📊 Estimated Nutrition (per serving)</p>
      <div class="nutrition-grid" id="nutritionGrid">
        <span class="nut-loading">Fetching nutrition data…</span>
      </div>
    </div>`;
}

// Build a recipe card for grid views
function buildRecipeCardHTML(m, i, categoryQuery = '') {
  const isSaved = favourites.some(f => f.idMeal === m.idMeal);
  const cat = categoryQuery || (m.strCategory || '').toLowerCase();
  return `
    <div class="recipe-card" style="animation-delay:${i * 0.06}s"
         data-title="${(m.strMeal || '').toLowerCase()}" data-category="${cat}">
      <div class="card-img" onclick="showDetail('${m.idMeal}')">
        <img src="${m.strMealThumb}" alt="${m.strMeal}" loading="lazy"/>
        <div class="card-overlay"></div>
        ${m.strCategory ? `<span class="card-category">${m.strCategory}</span>` : ''}
        <button class="card-fav-btn ${isSaved ? 'saved' : ''}"
          onclick="event.stopPropagation();toggleFavCard('${m.idMeal}','${escHtml(m.strMeal)}','${m.strMealThumb}',this)"
          aria-label="${isSaved ? 'Remove from saved' : 'Save recipe'}"
          title="${isSaved ? 'Remove' : 'Save'}">
          ${isSaved ? '♥' : '♡'}
        </button>
      </div>
      <div class="card-body" onclick="showDetail('${m.idMeal}')">
        <h3>${m.strMeal}</h3>
        <div class="card-tags">
          ${m.strArea ? `<span class="tag">${m.strArea}</span>` : ''}
          ${m.strTags ? m.strTags.split(',').slice(0, 2).map(t => `<span class="tag">${t.trim()}</span>`).join('') : ''}
        </div>
        <div class="view-hint">View Full Recipe</div>
      </div>
    </div>`;
}

// ──────────────────────────────────────────
//   RENDER RESULTS
// ──────────────────────────────────────────
function renderResults(meals, q) {
  const filtered = (meals || []).filter(m => !isBeef(m));
  if (!filtered.length) {
    mainContent.innerHTML = `
      <div class="state-box">
        <span class="state-icon">🔍</span>
        <h3>No recipes found</h3>
        <p>No results for "<strong>${q}</strong>". Try something else!</p>
      </div>`;
    return;
  }

  let html = `
    ${BACK_BTN_HTML}
    <div class="results-header">
      <h2>Results for "${q}"</h2>
      <span>${filtered.length} recipe${filtered.length !== 1 ? 's' : ''} found</span>
    </div>
    <div class="cards-grid">`;
  filtered.forEach((m, i) => { html += buildRecipeCardHTML(m, i); });
  html += `</div>`;
  mainContent.innerHTML = html;
  mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ──────────────────────────────────────────
//   FAVOURITES
// ──────────────────────────────────────────
function toggleFavCard(id, name, thumb, btn) {
  const idx = favourites.findIndex(f => f.idMeal === id);
  if (idx === -1) {
    favourites.push({ idMeal: id, strMeal: name, strMealThumb: thumb });
    btn.classList.add('saved'); btn.textContent = '♥';
    btn.setAttribute('aria-label', 'Remove from saved');
    showToast('❤️ Saved to your collection!', 'success');
  } else {
    favourites.splice(idx, 1);
    btn.classList.remove('saved'); btn.textContent = '♡';
    btn.setAttribute('aria-label', 'Save recipe');
    showToast('Removed from saved', '');
  }
  localStorage.setItem('fh_favourites', JSON.stringify(favourites));
  updateFavBadge();
}

function toggleFavDetail(id, name, thumb, btn) {
  const idx = favourites.findIndex(f => f.idMeal === id);
  if (idx === -1) {
    favourites.push({ idMeal: id, strMeal: name, strMealThumb: thumb });
    if (btn) { btn.classList.add('saved'); btn.textContent = '♥ Saved'; }
    showToast('❤️ Saved to your collection!', 'success');
  } else {
    favourites.splice(idx, 1);
    if (btn) { btn.classList.remove('saved'); btn.textContent = '♡ Save'; }
    showToast('Removed from saved', '');
  }
  localStorage.setItem('fh_favourites', JSON.stringify(favourites));
  updateFavBadge();
}

function showFavourites() {
  document.getElementById('navCookBtn').style.display = 'none';
  if (!favourites.length) {
    mainContent.innerHTML = `
      <div class="state-box">
        <span class="state-icon">🤍</span>
        <h3>No saved recipes yet</h3>
        <p>Hit the ♡ on any recipe card to save it here.</p>
      </div>`;
    mainContent.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  let html = `
    ${BACK_BTN_HTML}
    <div class="fav-header">
      <h2>Your Saved Recipes <span style="color:var(--accent);font-size:22px">(${favourites.length})</span></h2>
      <button class="clear-fav-btn" onclick="clearAllFavs()">Clear All</button>
    </div>
    <div class="cards-grid">`;
  favourites.forEach((m, i) => {
    html += `
      <div class="recipe-card" style="animation-delay:${i * 0.07}s">
        <div class="card-img" onclick="showDetail('${m.idMeal}')">
          <img src="${m.strMealThumb}" alt="${m.strMeal}" loading="lazy"/>
          <div class="card-overlay"></div>
          <button class="card-fav-btn saved" onclick="event.stopPropagation();removeFavAndRefresh('${m.idMeal}')"
            aria-label="Remove from saved" title="Remove">♥</button>
        </div>
        <div class="card-body" onclick="showDetail('${m.idMeal}')">
          <h3>${m.strMeal}</h3>
          <div class="view-hint">View Full Recipe</div>
        </div>
      </div>`;
  });
  html += `</div>`;
  mainContent.innerHTML = html;
  mainContent.scrollIntoView({ behavior: 'smooth' });
}

function clearAllFavs() {
  favourites = [];
  localStorage.setItem('fh_favourites', JSON.stringify(favourites));
  updateFavBadge();
  showFavourites();
  showToast('Cleared all saved recipes', '');
}

function removeFavAndRefresh(id) {
  const idx = favourites.findIndex(f => f.idMeal === id);
  if (idx !== -1) favourites.splice(idx, 1);
  localStorage.setItem('fh_favourites', JSON.stringify(favourites));
  updateFavBadge();
  showFavourites();
}

// ──────────────────────────────────────────
//   RECIPE DETAIL — uses helper functions (Change 5)
// ──────────────────────────────────────────
async function showDetail(id) {
  const _capturedHTML = mainContent.innerHTML;
  _prevPage = () => { mainContent.innerHTML = _capturedHTML; mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  document.getElementById('navCookBtn').style.display = 'none';
  mainContent.setAttribute('aria-live', 'polite');
  mainContent.innerHTML = `<div class="state-box"><div class="spinner"></div><h3>Loading recipe...</h3></div>`;

  try {
    const res  = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
    const data = await res.json();
    const m    = data.meals[0];
    currentMeal = m;

    const ingredients = buildIngredientList(m);
    cookSteps  = parseSteps(m.strInstructions);
    cookIndex  = 0;

    const isSaved   = favourites.some(f => f.idMeal === m.idMeal);
    const introText = m.strInstructions
      ? m.strInstructions.substring(0, 180).replace(/\r?\n/, ' ') + '...'
      : 'A delicious recipe waiting to be cooked.';

    const html = `
      <div class="detail-view">
        <div class="detail-toolbar">
          <button class="back-btn" onclick="goBack()" aria-label="Go back">← Back</button>
          <div class="detail-actions">
            <button class="action-btn ${isSaved ? 'saved' : ''}" id="favDetailBtn"
              onclick="toggleFavDetail('${m.idMeal}','${escHtml(m.strMeal)}','${m.strMealThumb}',this)"
              aria-label="${isSaved ? 'Remove from saved' : 'Save recipe'}">
              ${isSaved ? '♥ Saved' : '♡ Save'}
            </button>
            ${cookSteps.length > 0 ? `<button class="action-btn" style="color:var(--accent);border-color:rgba(232,160,69,0.4)" onclick="startCookMode()">🍳 <span class="cook-btn-text">Cook Mode</span></button>` : ''}
          </div>
        </div>

        <div class="detail-hero">
          <div class="detail-img">
            <img src="${m.strMealThumb}" alt="${m.strMeal}"/>
          </div>
          <div class="detail-info">
            <div class="detail-badges">
              ${m.strArea     ? `<span class="badge badge-area">${m.strArea} Cuisine</span>` : ''}
              ${m.strCategory ? `<span class="badge badge-cat">${m.strCategory}</span>`      : ''}
            </div>
            <h1>${m.strMeal}</h1>
            <p class="intro">${introText}</p>
            ${buildNutritionHTML()}
            ${m.strYoutube
              ? `<a class="yt-btn" href="${m.strYoutube}" target="_blank" rel="noopener" aria-label="Watch ${m.strMeal} on YouTube">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                  Watch on YouTube
                </a>`
              : `<p class="no-video">No video available for this recipe.</p>`}
          </div>
        </div>

        <div class="detail-body">
          ${buildIngredientsHTML(ingredients)}
          ${buildStepsHTML(cookSteps)}
        </div>
      </div>`;

    mainContent.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (cookSteps.length > 0) {
      document.getElementById('navCookBtn').style.display = 'inline-flex';
    }

    fetchNutrition(ingredients, m.strMeal);

  } catch {
    mainContent.innerHTML = `
      <div class="state-box">
        <span class="state-icon">⚠️</span>
        <h3>Could not load recipe</h3>
        <p>Something went wrong. Please try again.</p>
      </div>`;
  }
}

// ──────────────────────────────────────────
//   NUTRITION
// ──────────────────────────────────────────
async function fetchNutrition(ingredients, title) {
  const grid = document.getElementById('nutritionGrid');
  if (!grid) return;

  try {
    const APP_ID  = 'YOUR_EDAMAM_APP_ID';
    const APP_KEY = 'YOUR_EDAMAM_APP_KEY';
    if (APP_ID === 'YOUR_EDAMAM_APP_ID') throw new Error('no key');

    const res = await fetch(`https://api.edamam.com/api/nutrition-details?app_id=${APP_ID}&app_key=${APP_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, ingr: ingredients.map(i => `${i.measure} ${i.name}`) })
    });
    if (!res.ok) throw new Error('API error');
    const data     = await res.json();
    const servings = data.yield || 4;
    renderNutrition(grid,
      Math.round((data.calories || 0) / servings),
      Math.round((data.totalNutrients?.PROCNT?.quantity || 0) / servings),
      Math.round((data.totalNutrients?.CHOCDF?.quantity || 0) / servings),
      Math.round((data.totalNutrients?.FAT?.quantity    || 0) / servings)
    );
  } catch {
    estimateNutrition(grid, ingredients, title);
  }
}

function estimateNutrition(grid, ingredients, title) {
  const tl = title.toLowerCase();
  let base = 380;
  if (tl.includes('salad') || tl.includes('soup'))                              base = 220;
  else if (tl.includes('cake') || tl.includes('dessert') || tl.includes('pudding')) base = 460;
  else if (tl.includes('chicken') || tl.includes('lamb'))                       base = 450;
  else if (tl.includes('pasta') || tl.includes('biryani') || tl.includes('rice')) base = 520;
  else if (tl.includes('pizza'))                                                  base = 580;
  else if (tl.includes('fish') || tl.includes('seafood'))                        base = 320;
  else if (tl.includes('veg') || tl.includes('dal') || tl.includes('lentil'))   base = 290;

  const calories = base + Math.round((Math.random() - 0.5) * 60);
  const protein  = Math.round(calories * 0.12 / 4);
  const fat      = Math.round(calories * 0.3  / 9);
  const carbs    = Math.round((calories - protein * 4 - fat * 9) / 4);
  renderNutrition(grid, calories, protein, carbs, fat, true);
}

function renderNutrition(grid, calories, protein, carbs, fat, isEstimate = false) {
  grid.innerHTML = `
    <div class="nut-item"><span class="nut-value">${calories}</span><span class="nut-label">Calories</span></div>
    <div class="nut-item"><span class="nut-value">${protein}g</span><span class="nut-label">Protein</span></div>
    <div class="nut-item"><span class="nut-value">${carbs}g</span><span class="nut-label">Carbs</span></div>
    <div class="nut-item"><span class="nut-value">${fat}g</span><span class="nut-label">Fat</span></div>
    ${isEstimate ? '<div style="grid-column:1/-1;font-size:11px;color:var(--muted2);text-align:center;padding-top:4px">~ Estimated per serving</div>' : ''}`;
}

// ──────────────────────────────────────────
//   INGREDIENT CHECKLIST & SUBS
// ──────────────────────────────────────────
function toggleIngCheck(idx) {
  const el = document.getElementById(`ingCheck${idx}`);
  if (!el) return;
  el.classList.toggle('checked');
  const li = el.closest('li');
  if (li) {
    li.style.opacity = el.classList.contains('checked') ? '0.45' : '1';
    li.querySelector('.ing-name').style.textDecoration = el.classList.contains('checked') ? 'line-through' : 'none';
  }
}

function toggleSubs(toggle) {
  toggle.classList.toggle('open');
  toggle.nextElementSibling.classList.toggle('open');
}

function highlightStep(idx) {
  document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active-step'));
  const el = document.getElementById(`stepItem${idx}`);
  if (el) { el.classList.add('active-step'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

// ──────────────────────────────────────────
//   COOK MODE
// ──────────────────────────────────────────
function startCookMode() {
  if (!currentMeal || !cookSteps.length) return;
  cookIndex = 0;
  document.getElementById('cookTitle').textContent = currentMeal.strMeal;
  updateCookStep();
  document.getElementById('cookOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function toggleCookMode() {
  const overlay = document.getElementById('cookOverlay');
  if (overlay.classList.contains('active')) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  } else {
    startCookMode();
  }
}

function getStepIcon(text) {
  const t = text.toLowerCase();
  if (t.includes('heat') || t.includes('preheat') || t.includes('oven'))           return '🔥';
  if (t.includes('chop') || t.includes('cut') || t.includes('dice') || t.includes('slice')) return '🔪';
  if (t.includes('mix') || t.includes('stir') || t.includes('whisk'))              return '🥄';
  if (t.includes('fry') || t.includes('sauté') || t.includes('pan'))               return '🍳';
  if (t.includes('boil') || t.includes('simmer') || t.includes('pot'))             return '🫕';
  if (t.includes('bake') || t.includes('roast'))                                   return '🫙';
  if (t.includes('add') || t.includes('pour') || t.includes('sprinkle'))           return '🧂';
  if (t.includes('serve') || t.includes('garnish') || t.includes('plate'))         return '🍽️';
  if (t.includes('marinate') || t.includes('season'))                              return '🌿';
  if (t.includes('rest') || t.includes('cool') || t.includes('chill'))             return '⏱️';
  if (t.includes('wash') || t.includes('rinse') || t.includes('drain'))            return '💧';
  if (t.includes('knead') || t.includes('dough'))                                  return '🧁';
  if (t.includes('grate') || t.includes('crush') || t.includes('grind'))           return '⚙️';
  return '🍴';
}

function getCookTip(text) {
  const t = text.toLowerCase();
  if (t.includes('oil') && (t.includes('heat') || t.includes('hot'))) return '💡 Tip: The oil is ready when a drop of water sizzles immediately on contact.';
  if (t.includes('onion')) return '💡 Tip: For no tears, refrigerate onions for 30 min before cutting.';
  if (t.includes('salt'))  return '💡 Tip: Season as you go — layers of salt build much better flavor than salting at the end.';
  if (t.includes('garlic')) return '💡 Tip: Crushed garlic releases more flavor than sliced.';
  if (t.includes('simmer')) return '💡 Tip: A true simmer has small bubbles gently breaking the surface — not a rolling boil.';
  if (t.includes('marinate')) return '💡 Tip: Acid-based marinades work fast — 30 minutes is often enough; overnight can make meat mushy.';
  if (t.includes('bake') && t.includes('preheat')) return '💡 Tip: Always preheat — putting food into a cold oven throws off timing and texture.';
  if (t.includes('pasta') || t.includes('boil')) return '💡 Tip: Salt your pasta water generously — it should taste like the sea.';
  return '';
}

function updateCookStep(direction = 'next') {
  const total    = cookSteps.length;
  const stepText = cookSteps[cookIndex];
  const icon     = getStepIcon(stepText);
  const tip      = getCookTip(stepText);

  document.getElementById('cookStepCounter').textContent = `Step ${cookIndex + 1}`;
  document.getElementById('cookStepTotal').textContent   = `of ${total}`;

  const card = document.getElementById('cookStepCard');
  if (card) {
    card.classList.remove('going-prev');
    void card.offsetWidth;
    if (direction === 'prev') card.classList.add('going-prev');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
  }

  document.getElementById('cookStepIcon').textContent = icon;
  document.getElementById('cookStepText').textContent = stepText;

  const tipEl = document.getElementById('cookTip');
  if (tipEl) {
    tipEl.textContent = tip;
    tip ? tipEl.classList.add('has-tip') : tipEl.classList.remove('has-tip');
  }

  const pct = ((cookIndex + 1) / total) * 100;
  document.getElementById('cookProgressFill').style.width = pct + '%';

  document.getElementById('cookPrev').disabled = cookIndex === 0;
  const nextBtn = document.getElementById('cookNext');
  nextBtn.disabled = false;
  nextBtn.innerHTML = cookIndex === total - 1
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg> Done!`
    : `Next <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;

  const dotsEl  = document.getElementById('cookDots');
  const maxDots = Math.min(total, 12);
  dotsEl.innerHTML = '';
  for (let i = 0; i < maxDots; i++) {
    const mapped = Math.round((i / Math.max(maxDots - 1, 1)) * (total - 1));
    const dot = document.createElement('div');
    dot.className = `cook-dot ${mapped === cookIndex ? 'active' : ''}`;
    dot.title = `Step ${mapped + 1}`;
    dot.onclick = () => { const dir = mapped > cookIndex ? 'next' : 'prev'; cookIndex = mapped; updateCookStep(dir); };
    dotsEl.appendChild(dot);
  }

  highlightStep(cookIndex);

  // Translation for cook mode
  (async () => {
    if (typeof TRANSLATOR === 'undefined') return;
    let lang = 'en';
    try { lang = localStorage.getItem('fh_preferred_lang') || 'en'; } catch {}
    if (lang === 'en') return;

    const myVer  = ++_cookXlatVer;
    const idx    = cookIndex;
    const isLast = idx === total - 1;
    const rawTip = getCookTip(cookSteps[idx]);
    const strings = [`Step ${idx + 1}`, `of ${total}`, cookSteps[idx]];
    if (isLast) strings.push('Done!');
    if (rawTip)  strings.push(rawTip);

    try {
      const results = await TRANSLATOR.translateBatch(strings, lang);
      if (myVer !== _cookXlatVer) return;
      let i = 0;
      const el = id => document.getElementById(id);
      if (el('cookStepCounter')) el('cookStepCounter').textContent = results[i++] || `Step ${idx + 1}`;
      if (el('cookStepTotal'))   el('cookStepTotal').textContent   = results[i++] || `of ${total}`;
      if (el('cookStepText'))    el('cookStepText').textContent    = results[i++] || cookSteps[idx];
      if (isLast) {
        const doneTx = results[i++] || 'Done!';
        const nb = el('cookNext');
        if (nb) nb.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg> ${doneTx}`;
      }
      if (rawTip && el('cookTip')) el('cookTip').textContent = results[i] || rawTip;
    } catch {}
  })();
}

function cmPrev() {
  if (cookIndex > 0) { cookIndex--; updateCookStep('prev'); }
}

function cmNext() {
  if (cookIndex < cookSteps.length - 1) { cookIndex++; updateCookStep('next'); }
  else { toggleCookMode(); showToast('🎉 Recipe complete! Enjoy your meal!', 'success'); }
}

document.addEventListener('keydown', e => {
  const overlay = document.getElementById('cookOverlay');
  if (!overlay.classList.contains('active')) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); cmNext(); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); cmPrev(); }
  if (e.key === 'Escape')     toggleCookMode();
});

// ──────────────────────────────────────────
//   TOAST
// ──────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ──────────────────────────────────────────
//   UTILS
// ──────────────────────────────────────────
function escHtml(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ──────────────────────────────────────────
//   CUISINE BROWSE
// ──────────────────────────────────────────
let _cuisinePool = [], _cuisineShown = [], _cuisineName = '', _cuisineFlag = '';

const _cuisineFallbacks = {
  Indian: ['biryani','chicken tikka','curry','dal','butter chicken','korma','samosa','paneer','vindaloo','rogan josh']
};

async function _fetchAreaMeals(area) {
  const res  = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?a=' + encodeURIComponent(area));
  const data = await res.json();
  if (data.meals && data.meals.length) return data.meals;
  const keywords = _cuisineFallbacks[area];
  if (!keywords) return [];
  const seen = new Set(), merged = [];
  for (const kw of keywords) {
    try {
      const r2 = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(kw));
      const d2 = await r2.json();
      if (d2.meals) d2.meals.forEach(m => { if (!seen.has(m.idMeal)) { seen.add(m.idMeal); merged.push(m); } });
    } catch {}
  }
  return merged;
}

async function browseCuisine(area, flag) {
  _prevPage     = () => showDiscoveryHome();
  _cuisineName  = area; _cuisineFlag = flag;
  _cuisinePool  = []; _cuisineShown = [];
  document.getElementById('navCookBtn').style.display = 'none';
  mainContent.innerHTML = `<div class="state-box"><div class="spinner"></div><h3>${flag} Loading ${area} recipes...</h3></div>`;
  mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const meals = await _fetchAreaMeals(area);
    if (!meals.length) {
      mainContent.innerHTML = `<div class="state-box"><span class="state-icon">🔍</span><h3>No recipes found for ${area}</h3></div>`;
      return;
    }
    _cuisinePool = meals.filter(m => !isBeef(m)).sort(() => Math.random() - 0.5);
    renderCuisineSlice();
  } catch {
    mainContent.innerHTML = `<div class="state-box"><span class="state-icon">⚠️</span><h3>Could not load recipes</h3><p>Check your connection.</p></div>`;
  }
}

function renderCuisineSlice() {
  const PER  = 8;
  let avail  = _cuisinePool.filter(m => !_cuisineShown.includes(m.idMeal));
  if (!avail.length) { _cuisineShown = []; avail = [..._cuisinePool]; }
  const batch = avail.sort(() => Math.random() - 0.5).slice(0, PER);
  batch.forEach(m => _cuisineShown.push(m.idMeal));
  const rem = _cuisinePool.length - _cuisineShown.length;

  let h = BACK_BTN_HTML;
  h += `<div class="results-header"><h2>${_cuisineFlag} ${_cuisineName} Cuisine</h2><span>${_cuisinePool.length} recipes</span></div>`;
  h += `<div class="cards-grid" id="cuisineGrid">`;
  batch.forEach((m, i) => {
    const saved = favourites.some(f => f.idMeal === m.idMeal);
    const name  = m.strMeal.replace(/'/g, "\\'");
    h += `<div class="recipe-card" style="animation-delay:${i * 0.06}s">
      <div class="card-img" onclick="showDetail('${m.idMeal}')">
        <img src="${m.strMealThumb}" alt="${m.strMeal}" loading="lazy"/>
        <div class="card-overlay"></div>
        <button class="card-fav-btn ${saved ? 'saved' : ''}" onclick="event.stopPropagation();toggleFavCard('${m.idMeal}','${name}','${m.strMealThumb}',this)"
          aria-label="${saved ? 'Remove from saved' : 'Save recipe'}" title="${saved ? 'Remove' : 'Save'}">${saved ? '♥' : '♡'}</button>
      </div>
      <div class="card-body" onclick="showDetail('${m.idMeal}')">
        <h3>${m.strMeal}</h3><div class="view-hint">View Full Recipe</div>
      </div>
    </div>`;
  });
  h += `</div>`;
  h += `<div class="cuisine-shuffle-footer">
    <p class="cuisine-sub">Showing ${batch.length} of ${_cuisinePool.length} recipes</p>
    <button class="cuisine-shuffle-btn" id="shuffleBtn" onclick="shuffleCuisine()" aria-label="Shuffle recipes">
      <span class="shuffle-icon-wrap"><svg class="shuffle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18" aria-hidden="true"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg></span>
      <span>${rem > 0 ? `Shuffle · <em>${rem} more</em>` : 'Shuffle · <em>restart</em>'}</span>
    </button>
  </div>`;

  mainContent.innerHTML = h;
  mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function shuffleCuisine() {
  const btn = document.getElementById('shuffleBtn');
  const g   = document.getElementById('cuisineGrid');
  if (btn) btn.classList.add('spinning');
  if (g) { g.style.opacity = '0'; g.style.transform = 'translateY(14px)'; g.style.transition = 'opacity .22s,transform .22s'; }
  setTimeout(() => { if (btn) btn.classList.remove('spinning'); renderCuisineSlice(); }, 420);
}

// ──────────────────────────────────────────
//   FILTER SYSTEM
// ──────────────────────────────────────────
let activeFilters = { diet: null, time: null };

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.filter-tag-remove-btn');
  if (btn) { e.stopPropagation(); const { filterType: type, filterVal: val } = btn.dataset; if (type && val) setFilter(type, val); }
});

function setFilter(type, val) {
  if (activeFilters[type] === val) {
    activeFilters[type] = null;
    refreshFilterUI(); renderActiveFilterTags();
    if (!activeFilters.diet && !activeFilters.time) showDiscoveryHome();
    else showFilteredResults();
  } else {
    activeFilters[type] = val;
    refreshFilterUI(); renderActiveFilterTags();
    showFilteredResults();
  }
}

function refreshFilterUI() {
  document.querySelectorAll('.filter-chip').forEach(chip =>
    chip.classList.toggle('active', activeFilters[chip.dataset.filterType] === chip.dataset.filterVal)
  );
}

async function showFilteredResults() {
  const { diet, time } = activeFilters;
  if (!diet && !time) { showDiscoveryHome(); return; }

  const DIET_MAP = { veg: 'Vegetarian', vegan: 'Vegan' };
  const TIME_MAP = { quick: ['Starter','Breakfast','Side'], medium: ['Pasta','Seafood','Chicken','Miscellaneous'] };
  const labels   = { veg: '🌿 Vegetarian', vegan: '🌱 Vegan', quick: '⚡ Quick Meals', medium: '⏱️ Medium Dishes' };
  const panelLabel = [diet && labels[diet], time && labels[time]].filter(Boolean).join(' · ');

  mainContent.innerHTML = `
    <div class="discovery-home">
      ${filterBarHTML()}
      <div class="active-filters" id="activeFilterTags"></div>
      <div id="filterResultsAnchor"></div>
      <div id="filterResultsSection">
        <div class="filter-results-header"><h2>✨ ${panelLabel}</h2><span id="filterResultsCountBadge">Loading…</span></div>
        <div class="filter-loading"><div class="spinner" style="width:20px;height:20px;border-width:2px;flex-shrink:0"></div><span>Fetching matching recipes…</span></div>
        <div class="filter-results-grid" id="filterResultsGrid" style="display:none"></div>
      </div>
    </div>`;
  refreshFilterUI();
  renderActiveFilterTags();

  try {
    const cats = diet ? [DIET_MAP[diet]] : (TIME_MAP[time] || []);
    const fetches = cats.map(c =>
      fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(c)}`)
        .then(r => r.json()).then(d => d.meals || []).catch(() => [])
    );
    const results = await Promise.all(fetches);
    const seen = new Set(), pool = [];
    results.flat().forEach(m => { if (!seen.has(m.idMeal)) { seen.add(m.idMeal); pool.push(m); } });
    const filtered = pool.filter(m => !isBeef(m)).sort(() => Math.random() - 0.5).slice(0, 24);

    const badge    = document.getElementById('filterResultsCountBadge');
    const loadEl   = document.querySelector('.filter-loading');
    const grid     = document.getElementById('filterResultsGrid');
    if (badge) badge.textContent = filtered.length + ' recipes';
    if (!filtered.length) { if (loadEl) loadEl.outerHTML = `<div class="filter-empty-notice"><span>😔</span><p>No recipes match. Try a different combination.</p></div>`; return; }
    if (loadEl) loadEl.style.display = 'none';
    if (grid) { grid.innerHTML = filtered.map((m, i) => miniCardHTML(m, i, '')).join(''); grid.style.display = 'grid'; }
  } catch {
    const section = document.getElementById('filterResultsSection');
    if (section) section.innerHTML = `<p style="color:var(--muted);padding:24px">Could not load filtered results. Try again.</p>`;
  }
}

function applyFiltersToCurrentView() {
  const { diet, time } = activeFilters;
  if (!diet && !time) return;
  const MEAT = ['chicken','beef','lamb','pork','mutton','bacon','turkey','prawn','shrimp','fish','salmon','tuna','duck'];
  const SLOW = ['roast','braise','stew','casserole','bake','wellington','bourguignon','curry','biryani','risotto'];
  const QUICK = ['salad','sandwich','toast','smoothie','wrap','dip','hummus','bruschetta','omelette'];
  document.querySelectorAll('.mini-card, .recipe-card').forEach(card => {
    let show  = true;
    const tit = (card.dataset.title || '').toLowerCase();
    const cat = (card.dataset.category || '').toLowerCase();
    const ct  = parseInt(card.dataset.cooktime || '0', 10);
    if (diet === 'veg'   && MEAT.some(k => tit.includes(k) || cat.includes(k))) show = false;
    if (diet === 'vegan') { const nv = [...MEAT,'egg','dairy','milk','cheese','butter','cream','honey','yogurt','ghee']; if (nv.some(k => tit.includes(k) || cat.includes(k))) show = false; }
    if (time === 'quick') { if (ct > 0) { if (ct > 25) show = false; } else if (SLOW.some(k => tit.includes(k) || cat.includes(k))) show = false; }
    if (time === 'medium') { if (ct > 0) { if (ct <= 25 || ct > 60) show = false; } else if (QUICK.some(k => tit.includes(k) || cat.includes(k))) show = false; }
    card.style.display = show ? '' : 'none';
  });
}

function renderActiveFilterTags() {
  const el = document.getElementById('activeFilterTags');
  if (!el) return;
  const labels = { veg:'🌿 Vegetarian', vegan:'🌱 Vegan', quick:'⚡ Quick (<25 min)', medium:'⏱️ Medium (25–60 min)' };
  const tags = [];
  if (activeFilters.diet) tags.push({ type:'diet', val:activeFilters.diet, label:labels[activeFilters.diet] });
  if (activeFilters.time) tags.push({ type:'time', val:activeFilters.time, label:labels[activeFilters.time] });
  el.innerHTML = tags.map(t =>
    `<span class="active-filter-tag">${t.label}
      <button class="filter-tag-remove-btn" data-filter-type="${t.type}" data-filter-val="${t.val}" aria-label="Remove ${t.label} filter">✕</button>
    </span>`
  ).join('');
}

// ──────────────────────────────────────────
//   CATEGORY & CUISINE BROWSE
// ──────────────────────────────────────────
async function browseCategory(query, label) {
  _prevPage = () => showDiscoveryHome();
  document.getElementById('navCookBtn').style.display = 'none';
  mainContent.setAttribute('aria-live', 'polite');
  mainContent.innerHTML = `<div class="state-box"><div class="spinner"></div><h3>${label}</h3></div>`;
  mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    let data = await cachedFetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(query)}`);
    if (!data.meals || !data.meals.length) {
      data = await cachedFetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
    }
    if (!data.meals) throw new Error('no meals');
    const meals = data.meals.filter(m => !isBeef(m)).sort(() => Math.random() - 0.5).slice(0, 24);
    let html = `
      ${BACK_BTN_HTML}
      <div class="results-header"><h2>${label}</h2><span>${data.meals.length} recipes</span></div>
      <div class="filter-bar" style="margin-bottom:24px">
        <span class="filter-label">Filter</span>
        <div class="filter-group">
          <button class="filter-chip" data-filter-type="diet" data-filter-val="veg"   onclick="setFilter('diet','veg')">🌿 Veg</button>
          <button class="filter-chip" data-filter-type="diet" data-filter-val="vegan" onclick="setFilter('diet','vegan')">🌱 Vegan</button>
        </div>
      </div>
      <div class="active-filters" id="activeFilterTags"></div>
      <div class="cards-grid">`;
    meals.forEach((m, i) => { html += buildRecipeCardHTML(m, i, query.toLowerCase()); });
    html += '</div>';
    mainContent.innerHTML = html;
    refreshFilterUI(); applyFiltersToCurrentView();
    mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    mainContent.innerHTML = `
      <div class="state-box">
        <span class="state-icon">⚠️</span>
        <h3>Could not load ${label}</h3>
        <button onclick="showDiscoveryHome()" style="margin-top:16px;background:var(--accent);color:#1a0800;border:none;padding:10px 24px;border-radius:30px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">← Home</button>
      </div>`;
  }
}

// ──────────────────────────────────────────
//   MINI CARD
// ──────────────────────────────────────────
function miniCardHTML(meal, i, badge) {
  const id    = meal.idMeal || meal.id || '';
  const title = (meal.strMeal || meal.title || 'Recipe').replace(/'/g, "\\'");
  const img   = meal.strMealThumb || meal.image || '';
  const cat   = meal.strCategory  || meal.category || '';
  const ct    = meal.cookingTime  || 0;
  const saved = favourites.some(f => f.idMeal === id || f.idMeal === String(id));
  return `
    <div class="mini-card" style="animation-delay:${i * 0.05}s"
         data-title="${(meal.strMeal||meal.title||'').toLowerCase().replace(/'/g,'')}"
         data-category="${cat.toLowerCase()}" data-cooktime="${ct}"
         onclick="showDetail('${id}')">
      <div class="mini-card-img">
        <img src="${img}" alt="${title}" loading="lazy"/>
        <div class="mini-card-overlay"></div>
        ${badge ? `<span class="mini-card-badge">${badge}</span>` : ''}
      </div>
      <div class="mini-card-body">
        <h3>${meal.strMeal || meal.title || 'Recipe'}</h3>
        <div class="mini-card-info">
          ${cat ? `<span class="mini-card-tag">${cat}</span>` : '<span></span>'}
          <button class="mini-card-fav ${saved ? 'saved' : ''}"
            onclick="event.stopPropagation();miniToggleFav('${id}','${title}','${img}',this)"
            aria-label="${saved ? 'Remove from saved' : 'Save recipe'}"
            title="${saved ? 'Remove' : 'Save'}">${saved ? '♥' : '♡'}</button>
        </div>
      </div>
    </div>`;
}

function miniToggleFav(id, name, thumb, btn) {
  const idx = favourites.findIndex(f => f.idMeal === id);
  if (idx === -1) {
    favourites.push({ idMeal: id, strMeal: name, strMealThumb: thumb });
    btn.classList.add('saved'); btn.textContent = '♥';
    btn.setAttribute('aria-label', 'Remove from saved');
    showToast('❤️ Saved to your collection!', 'success');
  } else {
    favourites.splice(idx, 1);
    btn.classList.remove('saved'); btn.textContent = '♡';
    btn.setAttribute('aria-label', 'Save recipe');
    showToast('Removed from saved', '');
  }
  localStorage.setItem('fh_favourites', JSON.stringify(favourites));
  updateFavBadge();
}

// ──────────────────────────────────────────
//   DISCOVERY HOME BUILDERS
// ──────────────────────────────────────────
const CATEGORIES = [
  { name:'Chicken',    emoji:'🍗', color:'#c96a2b,#e8a045', query:'Chicken'    },
  { name:'Dessert',    emoji:'🍰', color:'#c9536a,#e87090', query:'Dessert'    },
  { name:'Vegetarian', emoji:'🥗', color:'#4ac92b,#70e845', query:'Vegetarian' },
  { name:'Pasta',      emoji:'🍝', color:'#c9a02b,#e8c845', query:'Pasta'      },
  { name:'Seafood',    emoji:'🐟', color:'#2b6ac9,#45a0e8', query:'Seafood'    },
  { name:'Breakfast',  emoji:'🍳', color:'#9b2bc9,#c845e8', query:'Breakfast'  },
  { name:'Lamb',       emoji:'🫕', color:'#c9762b,#e8a060', query:'Lamb'       },
  { name:'Soup',       emoji:'🥣', color:'#2bc9c9,#45e8e8', query:'Side'       },
  { name:'Vegan',      emoji:'🌱', color:'#2bc96a,#45e895', query:'Vegan'      },
];

const CUISINES = [
  { area:'Indian',   flag:'🇮🇳', c1:'#c96a2b', c2:'#e8a045' },
  { area:'Italian',  flag:'🇮🇹', c1:'#2b6ac9', c2:'#45a0e8' },
  { area:'Japanese', flag:'🇯🇵', c1:'#c92b4a', c2:'#e84570' },
  { area:'Thai',     flag:'🇹🇭', c1:'#4ac92b', c2:'#70e845' },
  { area:'Mexican',  flag:'🇲🇽', c1:'#c9a02b', c2:'#e8c845' },
  { area:'Moroccan', flag:'🌍',  c1:'#9b2bc9', c2:'#c845e8' },
  { area:'French',   flag:'🇫🇷', c1:'#c92b9b', c2:'#e845c8' },
  { area:'Chinese',  flag:'🇨🇳', c1:'#2bc9a0', c2:'#45e8c8' },
  { area:'Korean',   flag:'🇰🇷', c1:'#c93050', c2:'#e85070' },
  { area:'American', flag:'🇺🇸', c1:'#2b5fc9', c2:'#4580e8' },
  { area:'Spanish',  flag:'🇪🇸', c1:'#c9a02b', c2:'#e8d045' },
  { area:'Greek',    flag:'🇬🇷', c1:'#2b85c9', c2:'#45afe8' },
];

function skeletonRow() {
  return Array.from({ length: 6 }, () =>
    `<div class="mini-card-skeleton skeleton" style="height:220px;flex-shrink:0;width:220px;border-radius:18px;"></div>`
  ).join('');
}

function scrollTrack(id, dir) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: dir * 260, behavior: 'smooth' });
}

function hSectionHTML(id, title, badge, live) {
  return `
    <div class="h-scroll-section">
      <div class="h-scroll-header">
        <div class="h-scroll-title">
          <h2>${title}</h2>
          ${badge ? `<span class="h-scroll-badge ${live ? 'live' : ''}">${badge}</span>` : ''}
        </div>
        <div class="scroll-nav">
          <button class="scroll-arrow" onclick="scrollTrack('${id}',-1)" aria-label="Scroll left">&#8592;</button>
          <button class="scroll-arrow" onclick="scrollTrack('${id}',1)"  aria-label="Scroll right">&#8594;</button>
        </div>
      </div>
      <div class="h-scroll-track" id="${id}" role="list">${skeletonRow()}</div>
    </div>`;
}

function filterBarHTML() {
  return `
    <div class="filter-bar" role="group" aria-label="Recipe filters">
      <span class="filter-label">Filter</span>
      <div class="filter-group">
        <button class="filter-chip" data-filter-type="diet" data-filter-val="veg"   onclick="setFilter('diet','veg')"   aria-pressed="false">🌿 Veg</button>
        <button class="filter-chip" data-filter-type="diet" data-filter-val="vegan" onclick="setFilter('diet','vegan')" aria-pressed="false">🌱 Vegan</button>
      </div>
      <div class="filter-sep"></div>
      <div class="filter-group">
        <button class="filter-chip" data-filter-type="time" data-filter-val="quick"  onclick="setFilter('time','quick')"  aria-pressed="false">⚡ Quick &lt;25 min</button>
        <button class="filter-chip" data-filter-type="time" data-filter-val="medium" onclick="setFilter('time','medium')" aria-pressed="false">⏱️ Medium</button>
      </div>
      <span class="filter-result-count" id="filterResultCount" style="display:none"></span>
    </div>
    <div class="active-filters" id="activeFilterTags" role="status" aria-live="polite"></div>`;
}

function statsBarHTML() {
  return `
    <div class="discovery-stats">
      <div class="dstat"><span class="dstat-icon" aria-hidden="true">🍽️</span><div><span class="dstat-val">5,000+</span><span class="dstat-lbl">Recipes</span></div></div>
      <div class="dstat"><span class="dstat-icon" aria-hidden="true">🌍</span><div><span class="dstat-val">100+</span><span class="dstat-lbl">Cuisines</span></div></div>
      <div class="dstat"><span class="dstat-icon" aria-hidden="true">📊</span><div><span class="dstat-val">Nutrition</span><span class="dstat-lbl">Included</span></div></div>
    </div>`;
}

function categoryPillsHTML() {
  return `
    <div class="section-block">
      <div class="section-head"><h2>Browse by Category</h2></div>
      <div class="category-scroll">
        ${CATEGORIES.map(c => {
          const [c1, c2] = c.color.split(',');
          return `<div class="cat-pill" onclick="browseCategory('${c.query}','${c.emoji} ${c.name}')" role="button" tabindex="0">
            <div class="cat-pill-icon" style="--cat-grad:linear-gradient(135deg,${c1}25,${c2}18)">${c.emoji}</div>
            <span>${c.name}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function cuisineGridHTML() {
  return `
    <div class="section-block">
      <div class="section-head"><h2>World Cuisines</h2></div>
      <div class="cuisine-grid cuisine-grid-v3">
        ${CUISINES.map(c => `
          <div class="cuisine-card" onclick="browseCuisine('${c.area}','${c.flag}')"
               style="--c1:${c.c1};--c2:${c.c2}" role="button" tabindex="0">
            <div class="cc-emoji">${c.flag}</div>
            <span>${c.area}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ──────────────────────────────────────────
//   DISCOVERY HOME + SECTIONS
// ──────────────────────────────────────────
async function showDiscoveryHome() {
  document.getElementById('navCookBtn').style.display = 'none';
  mainContent.setAttribute('aria-live', 'polite');
  mainContent.innerHTML = `
    <div class="discovery-home">
      ${filterBarHTML()}
      ${statsBarHTML()}
      ${hSectionHTML('trendingTrack', '🔥 Trending Now', 'Curated', true)}
      ${hSectionHTML('quickTrack',    '⚡ Quick Meals',  '≤25 min', false)}
      ${hSectionHTML('healthyTrack',  '🥗 Healthy Picks','Curated', false)}
      <hr class="section-divider"/>
      ${categoryPillsHTML()}
      <hr class="section-divider"/>
      ${cuisineGridHTML()}
    </div>`;
  loadTrendingSection();
  loadQuickMealsSection();
  loadHealthySection();
}

// ──────────────────────────────────────────
//   CHANGE 3: CURATED TRENDING (not random each load)
// ──────────────────────────────────────────
async function loadTrendingSection() {
  const track = document.getElementById('trendingTrack');
  if (!track) return;
  try {
    const dayIdx  = new Date().getDay();
    const ids     = TRENDING_IDS_BY_DAY[dayIdx];
    const fetches = ids.map(id =>
      cachedFetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`).then(d => d.meals[0])
    );
    const results = await Promise.allSettled(fetches);
    const meals   = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)
      .filter(m => !isBeef(m));
    track.innerHTML = meals.map((m, i) => miniCardHTML(m, i, '🔥')).join('');
    applyFiltersToCurrentView();
  } catch {
    track.innerHTML = `<div class="section-empty">🌐 Trending unavailable</div>`;
  }
}

async function loadQuickMealsSection() {
  const track = document.getElementById('quickTrack');
  if (!track) return;
  try {
    const [starters, breakfast] = await Promise.all([
      cachedFetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Starter'),
      cachedFetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast'),
    ]);
    const pool  = [...(starters.meals || []), ...(breakfast.meals || [])];
    const seen  = new Set();
    const meals = [];
    pool.forEach(m => { if (!seen.has(m.idMeal)) { seen.add(m.idMeal); meals.push(m); } });
    track.innerHTML = meals.sort(() => Math.random() - 0.5).slice(0, 10)
      .map((m, i) => miniCardHTML(m, i, '⚡')).join('');
    applyFiltersToCurrentView();
  } catch {
    track.innerHTML = `<div class="section-empty">⚡ Quick meals unavailable</div>`;
  }
}

async function loadHealthySection() {
  const track = document.getElementById('healthyTrack');
  if (!track) return;
  try {
    const [veg, mis] = await Promise.all([
      cachedFetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian'),
      cachedFetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Miscellaneous'),
    ]);
    const pool  = [...(veg.meals || []), ...(mis.meals || [])];
    const seen  = new Set();
    const meals = [];
    pool.forEach(m => { if (!seen.has(m.idMeal)) { seen.add(m.idMeal); meals.push(m); } });
    track.innerHTML = meals.sort(() => Math.random() - 0.5).slice(0, 10)
      .map((m, i) => miniCardHTML(m, i, '🥗')).join('');
    applyFiltersToCurrentView();
  } catch {
    track.innerHTML = `<div class="section-empty">🥗 Healthy picks unavailable</div>`;
  }
}

// ── Boot ──
showDiscoveryHome();
