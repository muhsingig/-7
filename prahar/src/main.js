import Lenis from 'lenis';
import { PRAHARS, EDITIONS, praharIndexAt } from './data.js';
import { createStage, POSE_DEFAULTS } from './stage.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const reduced = root.classList.contains('reduce'); // set in the head: system setting, or ?motion=reduce
const glOff = /[?&]gl=off/.test(location.search);  // ?gl=off previews the page without WebGL
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const forced = /[?&]prahar=\d/.test(location.search);
const pad = (n) => String(n).padStart(2, '0');

/* ---------- the eight-part ring: brand mark, loader, favicon ---------- */
function ringSVG(strokeWidth = 5) {
  const r = 12 - strokeWidth / 2 - 0.5, c = 2 * Math.PI * r, seg = c / 8, gap = 0.9;
  const arcs = PRAHARS.map((p, k) => `<circle cx="12" cy="12" r="${r}" fill="none" stroke="${p.bg}" stroke-width="${strokeWidth}" stroke-dasharray="${(seg - gap).toFixed(3)} ${(c - seg + gap).toFixed(3)}" transform="rotate(${-90 + k * 45 + 1.5} 12 12)"/>`).join('');
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="${r}" fill="none" stroke="currentColor" stroke-width="${strokeWidth + 1.6}"/>${arcs}</svg>`;
}
$$('[data-ring]').forEach((el) => { el.innerHTML = ringSVG(el.classList.contains('loader__ring') ? 6 : 5.5); });

/* ---------- theme: the page wears the colours of a prahar ---------- */
let nowIdx = praharIndexAt();
let themeIdx = +root.dataset.prahar;
let stage = null;
const metaTheme = $('meta[name="theme-color"]');
const panels = $$('.band__panel');
const backBtn = $('#backToNow');

function setTheme(i) {
  themeIdx = i;
  root.dataset.prahar = i;
  const p = PRAHARS[i];
  metaTheme.content = p.bg;
  panels.forEach((b, k) => { b.setAttribute('aria-checked', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
  backBtn.hidden = i === nowIdx;
  if (stage) stage.setTheme(p);
}

/* ---------- words that follow the clock ---------- */
const heroNow = $('#heroNow'), footClock = $('#footClock');
const bombay = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
function writeClock() {
  const d = new Date(), p = PRAHARS[praharIndexAt(d)];
  heroNow.innerHTML = `It is <b>${pad(d.getHours())}:${pad(d.getMinutes())}</b> where you are: ${p.name}, ${p.ordinal}. The hands on this page are showing it.`;
  const parts = bombay.formatToParts(d), bh = +parts.find((x) => x.type === 'hour').value % 24, bm = parts.find((x) => x.type === 'minute').value;
  const bp = PRAHARS[Math.floor((((bh - 6) % 24) + 24) % 24 / 3)];
  footClock.textContent = `${pad(bh)}:${bm} in Bombay, ${bp.name}`;
  const idx = praharIndexAt(d);
  if (idx !== nowIdx) { // the prahar has turned while the page was open
    const following = themeIdx === nowIdx && !forced;
    nowIdx = idx;
    if (following) setTheme(idx); else backBtn.hidden = themeIdx === nowIdx;
  }
}
writeClock();
setInterval(writeClock, 1000);

/* ---------- type fitted to the frame ---------- */
function fitAll() {
  $$('[data-fit]').forEach((el) => {
    const inner = $('[data-fit-in]', el);
    el.style.fontSize = '100px';
    const cs = getComputedStyle(el);
    const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const w = inner.getBoundingClientRect().width;
    if (!w || !avail) { el.style.fontSize = ''; return; }
    let size = (100 * avail) / w;
    if (el.classList.contains('hero__name') && innerWidth > 900) size = Math.min(size, (innerHeight - 310) / 0.86);
    el.style.fontSize = `${size.toFixed(2)}px`;
  });
}

/* ---------- entrances ---------- */
function setupReveals() {
  $$('.rise').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('rise'));
    el.style.setProperty('--i', Math.min(sibs.indexOf(el), 6));
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  $$('.rise, .price__line').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });
}

/* ---------- navigation ---------- */
const nav = $('#nav'), toggle = $('#menuToggle');
let lenis = null, lastY = 0;
function onScrollNav(y) {
  nav.classList.toggle('is-solid', y > innerHeight * 0.6);
  if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > lastY && y > 140);
  lastY = y;
}
function setMenu(open) {
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Close' : 'Menu';
  if (lenis) open ? lenis.stop() : lenis.start();
  document.body.style.overflow = open ? 'hidden' : '';
}
toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  const top = a.getAttribute('href') === '#top' ? 0 : target.getBoundingClientRect().top + scrollY - (target.matches('.reserve, .story') ? 0 : 20);
  if (lenis) lenis.scrollTo(top, { duration: 1.4 });
  else scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  history.replaceState(null, '', a.getAttribute('href'));
}));

/* ---------- the band of prahars ---------- */
panels.forEach((b, i) => {
  b.addEventListener('click', () => setTheme(i));
  b.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const n = (i + step + 8) % 8;
    setTheme(n); panels[n].focus();
  });
});
backBtn.addEventListener('click', () => setTheme(nowIdx));

/* ---------- specification notes ---------- */
const specNote = $('#specNote');
$$('.specs__col li').forEach((li) => {
  li.tabIndex = 0;
  const on = () => { $$('.specs__col li.is-on').forEach((x) => x.classList.remove('is-on')); li.classList.add('is-on'); specNote.textContent = li.dataset.note; };
  li.addEventListener('pointerenter', on);
  li.addEventListener('focus', on);
});

/* ---------- dial colours ---------- */
const reserve = $('#reserve');
$$('#dials input').forEach((input) => input.addEventListener('change', () => {
  const ed = EDITIONS.find((e) => e.id === input.value);
  if (stage) stage.setEdition(ed.id);
  flat.setEdition(ed);
  reserve.href = `mailto:atelier@prahar.example?subject=${encodeURIComponent('Reserving a Prahar One')}&body=${encodeURIComponent(`Dial: ${ed.name}, ${ed.note}\nName: \nCity: `)}`;
}));

/* ---------- a flat drawing of the watch, for browsers without WebGL ---------- */
const flat = (() => {
  let host = null, dial = null, sec = null, hands = {};
  function build() {
    host = $('#flatWatch');
    const sectors = PRAHARS.map((p, k) => {
      const a0 = (k / 8) * 2 * Math.PI + 0.012, a1 = ((k + 1) / 8) * 2 * Math.PI - 0.012;
      const pt = (r, a) => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
      return `<path fill="${p.bg}" d="M${pt(46, a0)}A46 46 0 0 1 ${pt(46, a1)}L${pt(30, a1)}A30 30 0 0 0 ${pt(30, a0)}Z"/>`;
    }).join('');
    const marks = Array.from({ length: 12 }, (_, h) => `<rect x="-1.8" y="-76" width="3.6" height="13" fill="#e6e9ee" transform="rotate(${h * 30})"/>`).join('');
    host.innerHTML = `<svg viewBox="-110 -110 220 220" role="img" aria-label="Drawing of the Prahar One dial showing the current time">
      <rect x="-52" y="-150" width="104" height="300" fill="#17120f"/>
      <circle r="100" fill="#cfd3d8"/><circle r="92" fill="#e6e9ee"/>
      <circle r="85" fill="${EDITIONS[0].dial}" data-dial/>
      ${marks}
      <g data-ring>${sectors}</g>
      <path d="M-2.6 -52.5h5.2L0 -48.9Z" fill="${EDITIONS[0].second}" data-sec/>
      <path d="M-3.4 10 3.4 10 4.6 -24 0 -49 -4.6 -24Z" fill="#f3f5f7" data-h="hour"/>
      <path d="M-2.6 12 2.6 12 3.6 -38 0 -75 -3.6 -38Z" fill="#f3f5f7" data-h="minute"/>
      <g data-h="second"><rect x="-0.6" y="-79" width="1.2" height="100" fill="${EDITIONS[0].second}" data-sec/><circle r="2.6" fill="#e6e9ee"/></g>
    </svg>`;
    dial = $('[data-dial]', host); sec = $$('[data-sec]', host);
    ['hour', 'minute', 'second'].forEach((k) => { hands[k] = $(`[data-h="${k}"]`, host); });
    hands.ring = $('g[data-ring]', host);
    tick(); setInterval(tick, 1000);
  }
  function tick() {
    const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h = d.getHours() + m / 60;
    hands.hour.setAttribute('transform', `rotate(${(h % 12) * 30})`);
    hands.minute.setAttribute('transform', `rotate(${m * 6})`);
    hands.second.setAttribute('transform', `rotate(${s * 6})`);
    hands.ring.setAttribute('transform', `rotate(${-((h - 6) / 24) * 360})`);
  }
  return {
    build,
    setEdition(ed) { if (!host) return; dial.setAttribute('fill', ed.dial); sec.forEach((n) => n.setAttribute('fill', ed.second)); },
  };
})();

/* ---------- the 3D stage and the poses the scroll moves it through ---------- */
const P = (o) => ({ ...POSE_DEFAULTS, ...o });
const PI = Math.PI;
function poseBook(portrait) {
  return portrait ? {
    hero: P({ k: 0.8, dy: -0.01, rx: -0.42, ry: 0.4, rz: -0.1, strap: 0, anchor: true }),
    tell: P({ y: 0.1, s: 1.3, rx: -0.42, ry: -0.3, rz: 0.12, strap: 0, focus: 'dial' }),
    open: P({ y: 0.05, s: 0.78, rx: -1.02, ry: 0.5, explode: 1, strap: 0, focus: [0, 0, -0.75] }),
    wind: P({ y: 0.1, s: 1.3, rx: -0.55, ry: PI - 0.55, explode: 1, aside: 0.5, strap: 0, focus: 'ratchet' }),
    turn: P({ x: 0.13, y: 0.12, s: 1.6, rx: -0.62, ry: PI - 0.4, explode: 1, aside: 1, strap: 0, focus: 'train' }),
    beat: P({ x: 0.08, y: 0.1, s: 2.1, rx: -0.68, ry: PI - 0.3, explode: 1, aside: 1, strap: 0, focus: 'balance' }),
    back: P({ k: 0.8, rx: -0.25, ry: PI + 0.4, rz: 0.08, strap: 0, anchor: true }),
    price: P({ k: 0.82, rx: -0.32, ry: 2 * PI - 0.4, rz: 0.06, strap: 0, anchor: true }),
  } : {
    hero: P({ k: 1.2, dy: -0.012, rx: -0.4, ry: 0.42, rz: -0.1, strap: 0, anchor: true }),
    tell: P({ x: 0.17, y: 0.0, s: 1.25, rx: -0.55, ry: -0.42, rz: 0.12, strap: 0, focus: 'dial' }),
    open: P({ x: 0.0, y: 0.03, s: 0.54, rx: -0.2, ry: 1.02, explode: 1, strap: 0, focus: [0, 0, -0.75] }),
    wind: P({ x: 0.16, y: 0.02, s: 1.45, rx: -0.42, ry: PI - 0.62, explode: 1, aside: 0.5, strap: 0, focus: 'ratchet' }),
    turn: P({ x: 0.15, y: 0.02, s: 1.75, rx: -0.5, ry: PI - 0.5, explode: 1, aside: 1, strap: 0, focus: 'train' }),
    beat: P({ x: 0.15, y: 0.02, s: 2.3, rx: -0.55, ry: PI - 0.4, explode: 1, aside: 1, strap: 0, focus: 'balance' }),
    back: P({ k: 0.72, rx: -0.2, ry: PI + 0.42, rz: 0.08, anchor: true }),
    price: P({ k: 0.8, rx: -0.3, ry: 2 * PI - 0.42, rz: 0.06, anchor: true }),
  };
}

const glCanvas = $('#gl');
const stageEls = $$('[data-stage]').map((el) => ({ el, name: el.dataset.stage }));
const words = $$('.panel').map((el) => ({ el, word: $('.panel__word span', el) }));
let book = null, lastVisible = P({}), cw = 1, ch = 1;

function poseFor(st, rect) {
  if (st.name === 'hide') return null;
  const base = book[st.name];
  if (!base.anchor) return base;
  const short = Math.min(cw, ch);
  return {
    ...base,
    x: (rect.left + rect.width / 2 - cw / 2) / cw,
    y: -(rect.top + rect.height / 2 - ch / 2) / ch - (base.dy || 0),
    s: (base.k * Math.min(rect.width, rect.height)) / short,
  };
}

function updatePose() {
  const mid = innerHeight / 2;
  const list = stageEls.map((st) => { const r = st.el.getBoundingClientRect(); return { st, r, c: r.top + r.height / 2 - mid }; });
  let i = 0;
  for (let k = 0; k < list.length; k++) if (list[k].c <= 0) i = k;
  const A = list[i], B = list[Math.min(i + 1, list.length - 1)];
  let t = A === B || A.c > 0 ? 0 : clamp(-A.c / (B.c - A.c));
  t = reduced ? (t < 0.5 ? 0 : 1) : smooth(0.2, 0.8, t);
  let a = poseFor(A.st, A.r), b = poseFor(B.st, B.r);
  if (a) lastVisible = a; else if (b) lastVisible = b;
  if (!a && !b) { a = b = { ...lastVisible, alpha: 0 }; } else if (!a) { a = { ...b, alpha: 0 }; } else if (!b) { b = { ...a, alpha: 0 }; }
  stage.setBlend(a, b, t);
}

function updateWords() {
  if (reduced) return;
  const vh = innerHeight;
  words.forEach(({ el, word }) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    const p = clamp((vh - r.top) / (r.height + vh));
    word.style.setProperty('--shift', ((0.5 - p) * vh * 0.22).toFixed(1));
  });
}

function sizeStage() {
  cw = glCanvas.clientWidth; ch = glCanvas.clientHeight;
  stage.resize(cw, ch);
  book = poseBook(stage.portrait);
}

/* ---------- boot ---------- */
const loader = $('#loader'), loaderCount = $('#loaderCount'), loaderArcs = $$('.loader__ring circle').slice(1);
function runLoader(ready) {
  return new Promise((resolve) => {
    let n = 0;
    const stepMs = reduced ? 40 : 150;
    const timer = setInterval(async () => {
      if (n < 8) { loaderArcs[n].classList.add('is-on'); n++; loaderCount.textContent = n; return; }
      clearInterval(timer);
      await ready;
      setTimeout(resolve, reduced ? 0 : 220);
    }, stepMs);
  });
}

async function boot() {
  setTheme(themeIdx);
  setupReveals();

  const fonts = Promise.race([
    Promise.all([document.fonts.load('400 100px "Rozha One"', 'Prahar प्रहर'), document.fonts.load('600 20px "Anek Latin"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});

  stage = glOff ? null : createStage(glCanvas, { reduced });
  if (!stage) { root.classList.add('no-gl'); flat.build(); }

  if (stage) {
    stage.setTheme(PRAHARS[themeIdx]);
    sizeStage();
    updatePose();
  }
  fitAll();

  const ready = fonts.then(() => { fitAll(); if (stage) { stage.refreshPrint(); sizeStage(); updatePose(); stage.start(); } });
  await runLoader(ready);

  if (!reduced && finePointer) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    window.lenis = lenis;
  }
  function loop(now) {
    if (lenis) lenis.raf(now);
    const y = scrollY;
    onScrollNav(y);
    if (stage) { updatePose(); updateWords(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  let rw = innerWidth, rh = innerHeight, rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      // phones fire resize whenever the address bar slides: ignore those small height changes
      if (innerWidth === rw && Math.abs(innerHeight - rh) < 140) return;
      rw = innerWidth; rh = innerHeight;
      fitAll();
      if (stage) sizeStage();
    }, 120);
  });
  if (finePointer && stage) {
    addEventListener('pointermove', (e) => stage.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1), { passive: true });
  }

  loader.classList.add('is-done');
  $('.hero').classList.add('is-in');
  $$('.hero .rise').forEach((el, i) => setTimeout(() => el.classList.add('is-in'), (reduced ? 0 : 520) + i * 90));
  window.__prahar = { stage, setTheme };
}

boot();
