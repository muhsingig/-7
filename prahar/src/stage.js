// The fixed WebGL layer: renderer, a studio environment tinted by the page,
// and a rig that eases the watch toward whatever pose the scroll asks for.
import * as THREE from 'three';
import { createWatch } from './watch.js';

const DIST = 30, FOV = 24;
const lerp = (a, b, t) => a + (b - a) * t;

export const POSE_DEFAULTS = {
  x: 0, y: 0,        // centre of the watch, as a fraction of the viewport from its middle (y up)
  s: 0.5,            // case diameter as a fraction of the viewport's short side
  rx: 0, ry: 0, rz: 0,
  explode: 0, aside: 0, strap: 1,
  focus: [0, 0, 0],  // part name or a point in the watch's own space to centre on
  alpha: 1,
};

export function createStage(canvas, { reduced = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 100);
  camera.position.set(0, 0, DIST);

  /* studio: a room in the page's own colour with white softboxes, baked to an environment map */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0x202020 }));
  studio.add(room);
  const panel = (w, h, pos, k, look = [0, 0, 0]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look);
    studio.add(m);
    return m;
  };
  panel(9, 9, [0, 10, 3], 7);            // overhead softbox
  panel(2.2, 14, [-10, 1, 4], 11);       // long strip, left
  panel(1.6, 10, [10, 2, 1], 6);         // shorter strip, right
  panel(12, 5, [0, -2, 11], 1.4);        // low fill from behind the camera
  panel(10, 2, [0, 5, -11], 5);          // rim light from behind
  panel(3, 3, [7, -9, 5], 2.5);          // kick from below
  let envRT = null;
  const roomTarget = new THREE.Color(0x202020), roomNow = new THREE.Color(0x202020);
  let envDirty = true, envClock = 0;
  function bakeEnv() {
    room.material.color.copy(roomNow);
    const next = pmrem.fromScene(studio, 0.035);
    scene.environment = next.texture;
    if (envRT) envRT.dispose();
    envRT = next;
  }

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(5, 8, 12);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(-8, 3, -6);
  scene.add(key, rim);

  /* rig */
  let portrait = false;
  const rig = new THREE.Group();
  scene.add(rig);
  let watch = null;
  function buildWatch() {
    if (watch) rig.remove(watch.object);
    watch = createWatch({ portrait });
    rig.add(watch.object);
    watch.setEdition(edition);
  }
  let edition = 'nishitha';

  const cur = { ...POSE_DEFAULTS, focus: new THREE.Vector3() };
  const tgt = { ...POSE_DEFAULTS };
  const focusA = new THREE.Vector3(), focusB = new THREE.Vector3(), focusT = new THREE.Vector3();
  let blend = { a: POSE_DEFAULTS, b: POSE_DEFAULTS, t: 0 };
  let first = true;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

  let W = 1, H = 1, viewW = 1, viewH = 1, dpr = 1, maxDpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize(w, h) {
    W = w; H = h;
    const wasPortrait = portrait;
    portrait = w / h < 0.8;
    if (!watch || wasPortrait !== portrait) buildWatch();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewH = 2 * DIST * Math.tan((FOV * Math.PI) / 360);
    viewW = viewH * camera.aspect;
    dpr = Math.min(maxDpr, dpr || maxDpr) || maxDpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    needs = true;
  }

  /* pose */
  function setBlend(a, b, t) { blend = { a, b, t }; needs = true; }

  function resolveTarget() {
    const { a, b, t } = blend;
    for (const k of ['x', 'y', 's', 'rx', 'ry', 'rz', 'explode', 'aside', 'strap', 'alpha']) tgt[k] = lerp(a[k], b[k], t);
    watch.focusPoint(a.focus, focusA);
    watch.focusPoint(b.focus, focusB);
    focusT.lerpVectors(focusA, focusB, t);
  }

  let last = performance.now(), needs = true, running = false, slow = 0, fast = 0, alphaShown = -1;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // ease the room colour toward the theme and re-bake a few times a second while it moves
    if (envDirty) {
      envClock += dt;
      roomNow.lerp(roomTarget, 1 - Math.exp(-dt * 5));
      const done = Math.abs(roomNow.r - roomTarget.r) + Math.abs(roomNow.g - roomTarget.g) + Math.abs(roomNow.b - roomTarget.b) < 0.004;
      if (envClock > 0.09 || done || !envRT) { envClock = 0; if (done) { roomNow.copy(roomTarget); envDirty = false; } bakeEnv(); }
    }

    resolveTarget();
    const k = first || reduced ? 1 : 1 - Math.exp(-dt * 5.5);
    first = false;
    for (const key of ['x', 'y', 's', 'rx', 'ry', 'rz', 'explode', 'aside', 'strap', 'alpha']) cur[key] = lerp(cur[key], tgt[key], k);
    cur.focus.lerp(focusT, k);

    if (Math.abs(cur.alpha - alphaShown) > 0.004) { alphaShown = cur.alpha; canvas.style.opacity = cur.alpha.toFixed(3); }
    if (cur.alpha < 0.01 && tgt.alpha < 0.01) return; // off stage: nothing to draw

    pointer.sx = lerp(pointer.sx, pointer.x, 1 - Math.exp(-dt * 3));
    pointer.sy = lerp(pointer.sy, pointer.y, 1 - Math.exp(-dt * 3));
    const t = now / 1000, sway = reduced ? 0 : 1;

    watch.setState({ explode: cur.explode, aside: cur.aside, strap: cur.strap });
    watch.layout();
    const d = new Date();
    watch.tick(((d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds()) * 1000 + d.getMilliseconds(), { beat: !reduced });

    const scale = (cur.s * Math.min(viewW, viewH)) / 4;
    rig.scale.setScalar(scale);
    rig.position.set(cur.x * viewW, cur.y * viewH, 0);
    rig.rotation.set(
      cur.rx + sway * (Math.sin(t * 0.43) * 0.035 - pointer.sy * 0.11),
      cur.ry + sway * (Math.sin(t * 0.31) * 0.06 + pointer.sx * 0.16),
      cur.rz, 'YXZ',
    );
    watch.object.position.copy(cur.focus).multiplyScalar(-1);

    renderer.render(scene, camera);

    // keep ordinary laptops smooth: step the resolution down if frames run long
    if (dt > 0.03) { slow++; fast = 0; } else { fast++; if (fast > 90) slow = 0; }
    if (slow > 24 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); maxDpr = dpr; renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); slow = 0; }
  }

  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  return {
    resize, start, stop, setBlend,
    get portrait() { return portrait; },
    get pose() { return { ...cur, focus: cur.focus.toArray(), dpr, running }; },
    setPointer(x, y) { pointer.x = x; pointer.y = y; },
    setEdition(id) { edition = id; if (watch) watch.setEdition(id); },
    refreshPrint() { if (watch) watch.refreshPrint(); },
    // the room takes the page's colour, so the steel picks up the hour you are reading in
    setTheme({ bg, accent, dark }) {
      const c = new THREE.Color(bg);
      const hsl = {}; c.getHSL(hsl);
      c.setHSL(hsl.h, hsl.s * (dark ? 0.55 : 0.28), dark ? Math.max(0.045, hsl.l * 0.6) : hsl.l * 0.27);
      roomTarget.copy(c);
      rim.color.set(accent).lerp(new THREE.Color(0xffffff), 0.75);
      envDirty = true;
    },
    renderer,
  };
}
