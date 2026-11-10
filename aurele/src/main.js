import Lenis from 'lenis';
import { EDITIONS } from './data.js';
import { createStage, POSE_DEFAULTS } from './stage.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const reduced = root.classList.contains('reduce'); // set in the head: system setting, or ?motion=reduce
const glOff = /[?&]gl=off/.test(location.search);  // ?gl=off previews the page without WebGL
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const pad = (n) => String(n).padStart(2, '0');

let stage = null, lenis = null;

/* ---------- words that follow the clock ---------- */
const heroNow = $('#heroNow'), footClock = $('#footClock');
const geneva = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hour12: false });
function writeClock() {
  const d = new Date();
  heroNow.innerHTML = `It is <b>${pad(d.getHours())}:${pad(d.getMinutes())}</b> where you are. The hands on this page are set to it.`;
  footClock.textContent = `${geneva.format(d)} local time`;
}
writeClock();
setInterval(writeClock, 1000);

/* ---------- entrances ---------- */
function setupReveals() {
  $$('.rise').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('rise'));
    el.style.setProperty('--i', Math.min(sibs.indexOf(el), 5));
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  $$('.rise').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });
}

/* ---------- navigation ---------- */
const nav = $('#nav'), toggle = $('#menuToggle'), menu = $('#menu');
let lastY = 0;
function onScrollNav(y) {
  nav.classList.toggle('is-solid', y > innerHeight * 0.5);
  if (!menu.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > lastY && y > 160);
  lastY = y;
}
function setMenu(open) {
  menu.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Close' : 'Menu';
  if (open) nav.classList.remove('is-hidden');
  if (lenis) open ? lenis.stop() : lenis.start();
  document.body.style.overflow = open ? 'hidden' : '';
}
toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  const top = a.getAttribute('href') === '#top' ? 0 : target.getBoundingClientRect().top + scrollY;
  if (lenis) lenis.scrollTo(top, { duration: 1.8 });
  else scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  history.replaceState(null, '', a.getAttribute('href'));
}));

/* ---------- choosing a reference ---------- */
const visitLink = $('#visitLink');
$$('#refs input').forEach((input) => input.addEventListener('change', () => {
  const ed = EDITIONS.find((e) => e.id === input.value);
  if (stage) stage.setEdition(ed.id);
  flat.setEdition(ed);
  visitLink.href = `mailto:salon@aurele.example?subject=${encodeURIComponent(`Appointment — ${ed.name}, ref. ${ed.ref}`)}`;
}));

/* ---------- a flat drawing of the watch, for browsers without WebGL ---------- */
const flat = (() => {
  let host = null; const hands = {};
  function build() {
    host = $('#flatWatch');
    const ed = EDITIONS[0];
    const pt = (r, a) => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
    const half = (a0, a1, fill) => `<path fill="${fill}" d="M${pt(46, a0)}A46 46 0 0 1 ${pt(46, a1)}L${pt(30, a1)}A30 30 0 0 0 ${pt(30, a0)}Z"/>`;
    const marks = Array.from({ length: 12 }, (_, h) => `<rect x="-1.6" y="-76" width="3.2" height="13" data-mark transform="rotate(${h * 30})"/>`).join('');
    host.innerHTML = `<svg viewBox="-110 -150 220 300" role="img" aria-label="Drawing of the Méridien dial showing the current time">
      <rect x="-50" y="-150" width="100" height="300" fill="#14100e"/>
      <circle r="100" data-metal/><circle r="85" data-dial/>
      <g data-marks>${marks}</g>
      <g data-ring>${half(0.02, Math.PI - 0.02, '#e9dfc8')}${half(Math.PI + 0.02, 2 * Math.PI - 0.02, '#0c1524')}</g>
      <path d="M-3.4 10 3.4 10 4.6 -24 0 -49 -4.6 -24Z" data-hand data-h="hour"/>
      <path d="M-2.6 12 2.6 12 3.6 -38 0 -75 -3.6 -38Z" data-hand data-h="minute"/>
      <g data-h="second"><rect x="-0.5" y="-79" width="1" height="100" data-sec/><circle r="2.4" data-hand/></g>
    </svg>`;
    ['hour', 'minute', 'second'].forEach((k) => { hands[k] = $(`[data-h="${k}"]`, host); });
    hands.ring = $('g[data-ring]', host);
    setEdition(ed);
    tick(); setInterval(tick, 1000);
  }
  function tick() {
    const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h = d.getHours() + m / 60;
    hands.hour.setAttribute('transform', `rotate(${(h % 12) * 30})`);
    hands.minute.setAttribute('transform', `rotate(${m * 6})`);
    hands.second.setAttribute('transform', `rotate(${s * 6})`);
    hands.ring.setAttribute('transform', `rotate(${-((h - 6) / 24) * 360})`);
  }
  function setEdition(ed) {
    if (!host) return;
    $('[data-metal]', host).setAttribute('fill', ed.satin);
    $('[data-dial]', host).setAttribute('fill', ed.dial);
    $$('[data-mark]', host).forEach((n) => n.setAttribute('fill', ed.markers));
    $$('[data-hand]', host).forEach((n) => n.setAttribute('fill', ed.hands));
    $('[data-sec]', host).setAttribute('fill', ed.second);
  }
  return { build, setEdition };
})();

/* ---------- the 3D stage and the poses the scroll moves it through ---------- */
const P = (o) => ({ ...POSE_DEFAULTS, ...o });
const PI = Math.PI;
function poseBook(portrait) {
  return portrait ? {
    hero: P({ k: 0.82, dy: -0.01, rx: -0.42, ry: 0.4, rz: -0.1, strap: 0, anchor: true }),
    tell: P({ y: 0.12, s: 1.3, rx: -0.42, ry: -0.3, rz: 0.12, strap: 0, focus: 'dial' }),
    open: P({ y: 0.08, s: 0.74, rx: -1.02, ry: 0.5, explode: 1, strap: 0, focus: [0, 0, -0.75] }),
    wind: P({ y: 0.13, s: 1.3, rx: -0.55, ry: PI - 0.55, explode: 1, aside: 0.5, strap: 0, focus: 'ratchet' }),
    turn: P({ x: 0.13, y: 0.15, s: 1.6, rx: -0.62, ry: PI - 0.4, explode: 1, aside: 1, strap: 0, focus: 'train' }),
    beat: P({ x: 0.08, y: 0.13, s: 2.1, rx: -0.68, ry: PI - 0.3, explode: 1, aside: 1, strap: 0, focus: 'balance' }),
    price: P({ k: 0.8, rx: -0.3, ry: 2 * PI - 0.38, rz: 0.06, strap: 0, anchor: true }),
    back: P({ k: 0.8, rx: -0.25, ry: 3 * PI + 0.4, rz: 0.08, strap: 0, anchor: true }),
  } : {
    hero: P({ k: 0.8, dy: 0, rx: -0.38, ry: 0.46, rz: -0.1, strap: 0, anchor: true }),
    tell: P({ x: 0.17, y: 0.0, s: 1.25, rx: -0.55, ry: -0.42, rz: 0.12, strap: 0, focus: 'dial' }),
    open: P({ x: 0.14, y: 0.02, s: 0.42, rx: -0.2, ry: 1.02, explode: 1, strap: 0, focus: [0, 0, -0.75] }),
    wind: P({ x: 0.17, y: 0.02, s: 1.45, rx: -0.42, ry: PI - 0.62, explode: 1, aside: 0.5, strap: 0, focus: 'ratchet' }),
    turn: P({ x: 0.16, y: 0.02, s: 1.75, rx: -0.5, ry: PI - 0.5, explode: 1, aside: 1, strap: 0, focus: 'train' }),
    beat: P({ x: 0.17, y: 0.02, s: 2.3, rx: -0.55, ry: PI - 0.4, explode: 1, aside: 1, strap: 0, focus: 'balance' }),
    price: P({ k: 0.66, rx: -0.3, ry: 2 * PI - 0.4, rz: 0.06, strap: 1, anchor: true }),
    back: P({ k: 0.74, rx: -0.2, ry: 3 * PI + 0.42, rz: 0.08, strap: 0, anchor: true }),
  };
}

const glCanvas = $('#gl');
const stageEls = $$('[data-stage]').map((el) => ({ el, name: el.dataset.stage }));
let book = null, lastVisible = P({}), cw = 1, ch = 1;

function poseFor(st, rect) {
  if (st.name === 'hide') return null;
  const base = book[st.name];
  if (!base.anchor) return base;
  return {
    ...base,
    x: (rect.left + rect.width / 2 - cw / 2) / cw,
    y: -(rect.top + rect.height / 2 - ch / 2) / ch - (base.dy || 0),
    s: (base.k * Math.min(rect.width, rect.height)) / Math.min(cw, ch),
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

function sizeStage() {
  cw = glCanvas.clientWidth; ch = glCanvas.clientHeight;
  stage.resize(cw, ch);
  book = poseBook(stage.portrait);
}

/* ---------- boot ---------- */
const loader = $('#loader'), loaderBar = $('#loaderBar');
function runLoader(ready) {
  return new Promise((resolve) => {
    let n = 0;
    const timer = setInterval(async () => {
      if (n < 8) { n++; loaderBar.style.transform = `scaleX(${n / 8})`; return; }
      clearInterval(timer);
      await ready;
      setTimeout(resolve, reduced ? 0 : 320);
    }, reduced ? 40 : 190);
  });
}

async function boot() {
  setupReveals();

  const fonts = Promise.race([
    Promise.all([document.fonts.load('600 60px "Cormorant Garamond"', 'AURÈLE'), document.fonts.load('500 20px "Jost"', 'GENÈVE')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});

  stage = glOff ? null : createStage(glCanvas, { reduced });
  if (!stage) { root.classList.add('no-gl'); flat.build(); }
  if (stage) {
    stage.setTheme({ bg: '#262019', accent: '#c2a468', dark: true });
    sizeStage();
    updatePose();
  }

  const ready = fonts.then(() => { if (stage) { stage.refreshPrint(); sizeStage(); updatePose(); stage.start(); } });
  await runLoader(ready);

  if (!reduced && finePointer) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    window.lenis = lenis;
  }
  function loop(now) {
    if (lenis) lenis.raf(now);
    onScrollNav(scrollY);
    if (stage) updatePose();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  let rw = innerWidth, rh = innerHeight, rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (innerWidth === rw && Math.abs(innerHeight - rh) < 140) return; // ignore the phone address bar sliding
      rw = innerWidth; rh = innerHeight;
      if (stage) sizeStage();
    }, 120);
  });
  if (finePointer && stage) {
    addEventListener('pointermove', (e) => stage.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1), { passive: true });
  }

  loader.classList.add('is-done');
  $('.hero').classList.add('is-in');
  $$('.hero .rise').forEach((el, i) => setTimeout(() => el.classList.add('is-in'), (reduced ? 0 : 700) + i * 160));
  window.__aurele = { stage };
}

boot();
