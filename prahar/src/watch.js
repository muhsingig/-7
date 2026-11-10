// Prahar One, built from nothing but numbers: every wheel, bridge and screw is
// generated here. Units: the case is 4 across, so 1 unit is roughly 1 cm.
// The watch's axis is Z; the dial faces +Z and twelve o'clock is +Y.
import * as THREE from 'three';
import * as T from './textures.js';
import { PRAHARS, EDITIONS } from './data.js';

const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- geometry helpers ---------- */

function extrude(shape, depth, { bevel = 0.006, seg = 24 } = {}) {
  const b = Math.min(bevel, depth * 0.4);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: seg,
  });
  g.translate(0, 0, b);
  return g;
}

function disc(r, hole = 0) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, TAU, false);
  if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return s;
}

function cyl(r, h, seg = 32) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.rotateX(Math.PI / 2); g.translate(0, 0, h / 2);
  return g;
}

function lathe(points, seg = 128) {
  const g = new THREE.LatheGeometry(points.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(Math.PI / 2);
  return g;
}

// A spur gear outline with a tooth centred on angle 0. Pitch radius R, N teeth.
function gearShape(N, R, { hole = 0, spokes = 0, rHub = 0, rRim = 0, spokeW = 0.05, tooth = 1 } = {}) {
  const m = R / N, rTip = R + m * tooth, rRoot = R - 1.25 * m * tooth, a = TAU / N;
  const s = new THREE.Shape();
  const P = (r, t) => [r * Math.cos(t), r * Math.sin(t)];
  for (let i = 0; i < N; i++) {
    const c = i * a;
    [P(rRoot, c - 0.5 * a), P(rRoot, c - 0.27 * a), P(rTip, c - 0.11 * a), P(rTip, c + 0.11 * a), P(rRoot, c + 0.27 * a)]
      .forEach((p, k) => (i === 0 && k === 0 ? s.moveTo(p[0], p[1]) : s.lineTo(p[0], p[1])));
  }
  s.closePath();
  if (spokes) {
    const span = TAU / spokes;
    const go = Math.asin(Math.min(0.9, spokeW / 2 / rRim)), gi = Math.asin(Math.min(0.9, spokeW / 2 / rHub));
    for (let k = 0; k < spokes; k++) {
      const a0 = k * span, a1 = (k + 1) * span, h = new THREE.Path();
      h.absarc(0, 0, rRim, a0 + go, a1 - go, false);
      h.absarc(0, 0, rHub, a1 - gi, a0 + gi, true);
      h.closePath();
      s.holes.push(h);
    }
  }
  if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return s;
}

// The escape wheel: fifteen long teeth leaning into the direction of travel.
function escapeShape(N, rRoot, rTip, hub, rimIn) {
  const a = TAU / N, s = new THREE.Shape();
  const P = (r, t) => [r * Math.cos(t), r * Math.sin(t)];
  for (let i = 0; i < N; i++) {
    const c = i * a;
    [P(rRoot, c - 0.5 * a), P(rRoot, c - 0.1 * a), P(rTip, c + 0.28 * a), P(rTip * 0.985, c + 0.4 * a), P(rRoot, c + 0.3 * a)]
      .forEach((p, k) => (i === 0 && k === 0 ? s.moveTo(p[0], p[1]) : s.lineTo(p[0], p[1])));
  }
  s.closePath();
  const span = TAU / 5, go = 0.11, gi = 0.34;
  for (let k = 0; k < 5; k++) {
    const h = new THREE.Path();
    h.absarc(0, 0, rimIn, k * span + go, (k + 1) * span - go, false);
    h.absarc(0, 0, hub, (k + 1) * span - gi, k * span + gi, true);
    h.closePath();
    s.holes.push(h);
  }
  return s;
}

function segmentShape(R, mid, half) {
  const s = new THREE.Shape();
  s.absarc(0, 0, R, mid - half, mid + half, false);
  s.closePath();
  return s;
}

function sectorShape(r0, r1, a0, a1) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, true);
  s.absarc(0, 0, r0, a1, a0, false);
  s.closePath();
  return s;
}

function handShape(len, w, tail) {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.32, -tail); s.lineTo(w * 0.32, -tail); s.lineTo(w * 0.5, len * 0.5); s.lineTo(0, len); s.lineTo(-w * 0.5, len * 0.5);
  s.closePath();
  return s;
}

/* ---------- the watch ---------- */

export function createWatch({ portrait = false } = {}) {
  const watch = new THREE.Group();
  const parts = [];   // things that move apart: { obj, base, off }
  const focus = {};   // named places the camera can settle on
  const reg = (obj, off, { side = 0 } = {}) => { parts.push({ obj, base: obj.position.clone(), off, side }); return obj; };

  /* materials */
  const brushed = T.brushedLinear();
  const circ = T.brushedCircular();
  const ray = T.sunray();
  const frost = T.grain(5, 70);

  const M = {
    polished: new THREE.MeshStandardMaterial({ color: 0xe6e9ee, metalness: 1, roughness: 0.09 }),
    satin: new THREE.MeshStandardMaterial({ color: 0xd3d7dc, metalness: 1, roughness: 0.34, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.6 }),
    steelRay: new THREE.MeshStandardMaterial({ color: 0xdfe2e6, metalness: 1, roughness: 0.3, bumpMap: T.fitToRadius(ray.clone(), 0.56), bumpScale: 1.2 }),
    bridge: new THREE.MeshStandardMaterial({ color: 0xe2e0da, metalness: 1, roughness: 0.3, bumpMap: T.genevaStripes(), bumpScale: 5 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xcfcdc6, metalness: 1, roughness: 0.42, map: T.perlage() }),
    gilt: new THREE.MeshStandardMaterial({ color: 0xe0b862, metalness: 1, roughness: 0.3, envMapIntensity: 1.35, bumpMap: T.fitToRadius(circ.clone(), 0.7), bumpScale: 0.8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2d07c, metalness: 1, roughness: 0.2, envMapIntensity: 1.6 }),
    blued: new THREE.MeshStandardMaterial({ color: 0x1b3fb0, metalness: 1, roughness: 0.2 }),
    ruby: new THREE.MeshPhysicalMaterial({ color: 0xc0122e, metalness: 0, roughness: 0.06, clearcoat: 1, emissive: 0x4a0010, emissiveIntensity: 0.6 }),
    spring: new THREE.MeshStandardMaterial({ color: 0x2b55c8, metalness: 1, roughness: 0.25 }),
    dial: new THREE.MeshPhysicalMaterial({
      color: EDITIONS[0].dial, metalness: 0.6, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.14, envMapIntensity: 0.8,
      map: T.fitToRadius(T.sunraySheen(), 1.7), bumpMap: T.fitToRadius(ray.clone(), 1.7), bumpScale: 0.9,
    }),
    second: new THREE.MeshPhysicalMaterial({ color: EDITIONS[0].second, metalness: 0.1, roughness: 0.3, clearcoat: 1 }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: 0x000000, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.14, envMapIntensity: 3.4, depthWrite: false, side: THREE.DoubleSide,
    }),
    leather: new THREE.MeshStandardMaterial({ color: 0x3b2417, metalness: 0, roughness: 0.62, bumpMap: frost, bumpScale: 2.2, transparent: true }),
    slot: new THREE.MeshStandardMaterial({ color: 0x0a0f24, metalness: 0.8, roughness: 0.5 }),
  };
  const mesh = (g, m) => new THREE.Mesh(g, m);

  /* ----- case ----- */
  const caseG = new THREE.Group();
  const caseTex = brushed.clone(); caseTex.repeat.set(10, 1);
  const caseSatin = M.satin.clone(); caseSatin.bumpMap = caseSatin.roughnessMap = caseTex;
  caseG.add(mesh(lathe([[1.74, -0.56], [1.92, -0.56], [2.0, -0.48], [2.0, 0.12], [1.93, 0.2], [1.74, 0.2], [1.74, -0.56]]), caseSatin));

  // lugs: a side profile swept across the lug's width
  const lugProfile = new THREE.Shape();
  lugProfile.moveTo(1.35, 0.17); lugProfile.lineTo(1.95, 0.15);
  lugProfile.quadraticCurveTo(2.42, 0.06, 2.62, -0.36);
  lugProfile.lineTo(2.56, -0.52); lugProfile.quadraticCurveTo(2.2, -0.5, 1.35, -0.5);
  lugProfile.closePath();
  const lugGeo = extrude(lugProfile, 0.3, { bevel: 0.03, seg: 12 });
  lugGeo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
    const l = mesh(lugGeo, M.polished);
    l.position.x = sx > 0 ? 1.04 : -1.34;
    l.scale.y = sy;
    caseG.add(l);
  });
  [1, -1].forEach((sy) => {
    const bar = mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 12), M.satin);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, sy * 2.36, -0.26);
    caseG.add(bar);
  });

  // crown at three o'clock: a fluted button on a short tube
  const crown = new THREE.Group();
  const crownGeo = extrude(gearShape(30, 0.235, { tooth: 0.9 }), 0.26, { bevel: 0.025 });
  crownGeo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  crown.add(mesh(crownGeo, M.polished));
  const tube = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 24), M.satin);
  tube.rotation.z = Math.PI / 2; tube.position.x = -0.05;
  crown.add(tube);
  crown.position.set(2.08, 0, -0.18);
  caseG.add(crown);
  watch.add(caseG);

  /* ----- strap ----- */
  const strapG = new THREE.Group();
  const strapSection = new THREE.Shape();
  { // rounded slab: x is thickness, y is width
    const t = 0.085, w = 1.0, r = 0.06;
    strapSection.moveTo(-t, -w + r); strapSection.lineTo(-t, w - r); strapSection.quadraticCurveTo(-t, w, -t + r, w);
    strapSection.lineTo(t - r, w); strapSection.quadraticCurveTo(t, w, t, w - r); strapSection.lineTo(t, -w + r);
    strapSection.quadraticCurveTo(t, -w, t - r, -w); strapSection.lineTo(-t + r, -w); strapSection.quadraticCurveTo(-t, -w, -t, -w + r);
  }
  const strapPath = new THREE.CatmullRomCurve3([[2.2, -0.27], [2.55, -0.3], [3.1, -0.48], [3.8, -0.95], [4.5, -1.8], [4.95, -2.9], [5.1, -4.2]].map(([y, z]) => new THREE.Vector3(0, y, z)));
  const strapGeo = new THREE.ExtrudeGeometry(strapSection, { steps: 48, extrudePath: strapPath, bevelEnabled: false });
  [1, -1].forEach((sy) => { const s = mesh(strapGeo, M.leather); s.scale.y = sy; strapG.add(s); });
  watch.add(strapG);

  /* ----- dial side ----- */
  const dialG = new THREE.Group();
  dialG.add(mesh(extrude(disc(1.7), 0.03, { bevel: 0, seg: 96 }), M.dial));
  dialG.children[0].position.z = 0.02;

  const print = new THREE.Mesh(new THREE.CircleGeometry(1.7, 96), new THREE.MeshStandardMaterial({
    map: T.dialPrint(1.7), transparent: true, roughness: 0.5, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }));
  print.position.z = 0.0515;
  dialG.add(print);

  // applied hour markers, faceted so they flash as the watch turns
  const idxShape = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath(); return s; };
  const idxGeo = extrude(idxShape(0.075, 0.26), 0.045, { bevel: 0.016 });
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * TAU;
    const xs = h === 0 ? [-0.062, 0.062] : [0];
    xs.forEach((dx) => {
      const i = mesh(idxGeo, M.polished), r = 1.38;
      i.position.set(Math.sin(a) * r + Math.cos(a) * dx, Math.cos(a) * r - Math.sin(a) * dx, 0.05);
      i.rotation.z = -a;
      dialG.add(i);
    });
  }

  // the prahar ring: eight enamel fields that turn once a day under a fixed pointer
  const ring = new THREE.Group();
  PRAHARS.forEach((p, k) => {
    const g = 0.014, a0 = Math.PI / 2 - (k / 8) * TAU - g, a1 = Math.PI / 2 - ((k + 1) / 8) * TAU + g;
    ring.add(mesh(extrude(sectorShape(0.6, 0.92, a0, a1), 0.02, { bevel: 0.005, seg: 24 }),
      new THREE.MeshPhysicalMaterial({ color: p.bg, metalness: 0, roughness: 0.34, clearcoat: 0.45, clearcoatRoughness: 0.12, envMapIntensity: 0.42 })));
  });
  ring.position.z = 0.05;
  dialG.add(ring);
  [[0.925, 0.965], [0.555, 0.595]].forEach(([r0, r1]) => {
    const b = mesh(extrude(disc(r1, r0), 0.03, { bevel: 0.008, seg: 96 }), M.polished);
    b.position.z = 0.05; dialG.add(b);
  });
  const pointerShape = new THREE.Shape();
  pointerShape.moveTo(-0.05, 1.05); pointerShape.lineTo(0.05, 1.05); pointerShape.lineTo(0, 0.978); pointerShape.closePath();
  const pointer = mesh(extrude(pointerShape, 0.03, { bevel: 0.008 }), M.second);
  pointer.position.z = 0.05;
  dialG.add(pointer);
  watch.add(reg(dialG, 0.95));
  focus.dial = dialG;

  // hands
  const hour = new THREE.Group(), minute = new THREE.Group(), second = new THREE.Group();
  hour.add(mesh(extrude(handShape(0.98, 0.15, 0.2), 0.026, { bevel: 0.012 }), M.polished));
  hour.add(mesh(cyl(0.11, 0.03), M.polished));
  minute.add(mesh(extrude(handShape(1.5, 0.115, 0.24), 0.024, { bevel: 0.011 }), M.polished));
  minute.add(mesh(cyl(0.09, 0.028), M.polished));
  const needle = new THREE.Shape();
  needle.moveTo(-0.014, -0.42); needle.lineTo(0.014, -0.42); needle.lineTo(0.007, 1.58); needle.lineTo(-0.007, 1.58); needle.closePath();
  second.add(mesh(extrude(needle, 0.012, { bevel: 0.003 }), M.second));
  const weight = mesh(extrude(disc(0.065, 0.03), 0.012, { bevel: 0.003 }), M.second); weight.position.y = -0.32; second.add(weight);
  second.add(mesh(cyl(0.05, 0.03), M.polished));
  hour.position.z = 0.1; minute.position.z = 0.135; second.position.z = 0.168;
  const handsG = new THREE.Group();
  handsG.add(hour, minute, second);
  watch.add(reg(handsG, 1.62));

  // bezel and crystal
  const bezel = mesh(lathe([[1.7, 0.2], [1.965, 0.2], [1.965, 0.25], [1.86, 0.36], [1.74, 0.365], [1.7, 0.33], [1.7, 0.2]]), M.polished);
  watch.add(reg(bezel, 2.35));
  const dome = [];
  for (let i = 0; i <= 24; i++) { const r = (i / 24) * 1.72; dome.push([r, 0.335 + 0.1 * Math.cos((r / 1.72) * Math.PI / 2)]); }
  const crystal = mesh(lathe(dome, 96), M.crystal);
  crystal.renderOrder = 5;
  watch.add(reg(crystal, 3.0));

  /* ----- movement: built facing the caseback, so local +Z runs toward the back ----- */
  const mov = new THREE.Group();
  mov.rotation.y = Math.PI;
  watch.add(mov);

  const mainplate = mesh(extrude(disc(1.7), 0.08, { bevel: 0.012, seg: 96 }), M.plate);
  mainplate.position.z = 0.02;
  mov.add(reg(mainplate, 0.75));

  // wheel sizes: pitch radius R and tooth count N for each wheel and the pinion it drives
  const B = { N: 72, R: 0.68 }, cP = { N: 12 }, C = { N: 75, R: 0.52 }, tP = { N: 10 }, Th = { N: 64, R: 0.44 }, fP = { N: 8 }, F = { N: 72, R: 0.4 }, eP = { N: 6 };
  cP.R = (B.R / B.N) * cP.N; tP.R = (C.R / C.N) * tP.N; fP.R = (Th.R / Th.N) * fP.N; eP.R = (F.R / F.N) * eP.N;
  const polar = (o, d, deg) => ({ x: o.x + d * Math.cos(deg * Math.PI / 180), y: o.y + d * Math.sin(deg * Math.PI / 180) });
  const pos = { centre: { x: 0, y: 0 } };
  pos.barrel = polar(pos.centre, B.R + cP.R, 125);
  pos.third = polar(pos.centre, C.R + tP.R, 20);
  pos.fourth = polar(pos.third, Th.R + fP.R, -95);
  pos.escape = polar(pos.fourth, F.R + eP.R, -150);
  pos.balance = polar(pos.escape, 0.7, 200);
  const dir = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

  const staff = (z0, z1) => { const s = mesh(cyl(0.02, z1 - z0, 12), M.polished); s.position.z = z0; return s; };
  const wheelMesh = (shape, z, depth, mat) => { const w = mesh(extrude(shape, depth, { bevel: 0.004, seg: 40 }), mat); w.position.z = z; return w; };
  const at = (g, p) => { g.position.set(p.x, p.y, 0); return g; };

  const barrel = at(new THREE.Group(), pos.barrel);
  barrel.add(wheelMesh(gearShape(B.N, B.R, { hole: 0.05 }), 0.12, 0.03, M.gilt));
  { const drum = mesh(extrude(disc(0.63), 0.12, { bevel: 0.012, seg: 64 }), M.gilt); drum.position.z = 0.15; barrel.add(drum); }
  barrel.add(staff(0.1, 0.5));
  mov.add(reg(barrel, 1.3));
  focus.barrel = barrel;

  const centre = at(new THREE.Group(), pos.centre);
  centre.add(wheelMesh(gearShape(cP.N, cP.R), 0.115, 0.04, M.polished));
  centre.add(wheelMesh(gearShape(C.N, C.R, { hole: 0.03, spokes: 5, rHub: 0.1, rRim: C.R - 0.07, spokeW: 0.05 }), 0.3, 0.026, M.gilt));
  centre.add(staff(0.1, 0.5));
  mov.add(reg(centre, 1.5));

  const third = at(new THREE.Group(), pos.third);
  third.add(wheelMesh(gearShape(tP.N, tP.R), 0.29, 0.045, M.polished));
  third.add(wheelMesh(gearShape(Th.N, Th.R, { hole: 0.025, spokes: 5, rHub: 0.08, rRim: Th.R - 0.06, spokeW: 0.045 }), 0.355, 0.024, M.gilt));
  third.add(staff(0.1, 0.5));
  mov.add(reg(third, 1.62));

  const fourth = at(new THREE.Group(), pos.fourth);
  fourth.add(wheelMesh(gearShape(fP.N, fP.R), 0.35, 0.036, M.polished));
  fourth.add(wheelMesh(gearShape(F.N, F.R, { hole: 0.025, spokes: 5, rHub: 0.075, rRim: F.R - 0.055, spokeW: 0.04 }), 0.245, 0.024, M.gilt));
  fourth.add(staff(0.1, 0.5));
  mov.add(reg(fourth, 1.42));
  focus.train = fourth;

  const escape = at(new THREE.Group(), pos.escape);
  escape.add(wheelMesh(gearShape(eP.N, eP.R), 0.24, 0.036, M.polished));
  escape.add(wheelMesh(escapeShape(15, 0.15, 0.205, 0.045, 0.125), 0.345, 0.02, M.polished));
  escape.add(staff(0.1, 0.5));
  mov.add(reg(escape, 1.56));

  // pallet fork between the escape wheel and the balance
  const toBal = dir(pos.escape, pos.balance);
  const pallet = at(new THREE.Group(), polar(pos.escape, 0.28, toBal * 180 / Math.PI));
  {
    const arm = new THREE.Group();
    const lever = mesh(new THREE.BoxGeometry(0.34, 0.03, 0.018), M.polished); lever.position.set(0.15, 0, 0.354);
    const cross = mesh(new THREE.BoxGeometry(0.04, 0.26, 0.018), M.polished); cross.position.set(-0.045, 0, 0.354);
    arm.add(lever, cross);
    [1, -1].forEach((s) => { const j = mesh(new THREE.BoxGeometry(0.07, 0.028, 0.03), M.ruby); j.position.set(-0.085, s * 0.115, 0.354); j.rotation.z = s * 0.35; arm.add(j); });
    arm.add(staff(0.3, 0.42));
    pallet.add(arm); pallet.userData.arm = arm;
  }
  mov.add(reg(pallet, 1.56));

  // balance: rim, two spokes, timing weights and a blued hairspring
  const balance = at(new THREE.Group(), pos.balance);
  const balWheel = new THREE.Group();
  {
    const rim = wheelMesh(disc(0.5, 0.435), 0.4, 0.055, M.gold); balWheel.add(rim);
    const spoke = mesh(new THREE.BoxGeometry(0.9, 0.06, 0.03), M.gold); spoke.position.z = 0.425; balWheel.add(spoke);
    const hub = mesh(cyl(0.07, 0.05, 24), M.gold); hub.position.z = 0.4; balWheel.add(hub);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, w = mesh(cyl(0.032, 0.05, 12), M.polished);
      w.position.set(Math.cos(a) * 0.468, Math.sin(a) * 0.468, 0.412); balWheel.add(w);
    }
    const roller = mesh(cyl(0.085, 0.02, 24), M.polished); roller.position.z = 0.345; balWheel.add(roller);
    const pin = mesh(cyl(0.014, 0.03, 8), M.ruby); pin.position.set(0.066, 0, 0.33); balWheel.add(pin);
    balWheel.add(staff(0.3, 0.52));
  }
  const spiralPts = [];
  for (let i = 0; i <= 420; i++) { const t = i / 420, a = t * TAU * 10.5, r = 0.07 + t * 0.26; spiralPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
  const hairspring = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 840, 0.0045, 4), M.spring);
  hairspring.position.z = 0.475;
  balance.add(balWheel, hairspring);
  mov.add(reg(balance, 3.25));
  focus.balance = balance;

  // bridges: a barrel bridge and a train bridge with a window for the balance
  const R34 = 1.66, cut = 120 * Math.PI / 180, gap = 0.012, dCut = 0.568;
  const bridgeA = mesh(extrude(segmentShape(R34, cut, Math.acos((dCut + gap) / R34)), 0.06, { bevel: 0.014, seg: 64 }), M.bridge);
  const shapeB = segmentShape(R34, cut + Math.PI, Math.PI - Math.acos((dCut - gap) / R34));
  { const h = new THREE.Path(); h.absarc(pos.balance.x, pos.balance.y, 0.62, 0, TAU, true); shapeB.holes.push(h); }
  const bridgeB = mesh(extrude(shapeB, 0.06, { bevel: 0.014, seg: 64 }), M.bridge);
  const bridges = new THREE.Group();
  bridges.add(bridgeA, bridgeB);
  bridges.position.z = 0.44;

  const jewel = (p, r = 0.045) => {
    const g = new THREE.Group();
    const chaton = mesh(cyl(r * 1.7, 0.012, 24), M.gold); chaton.position.z = 0.06;
    const stone = mesh(new THREE.SphereGeometry(r, 20, 12), M.ruby); stone.scale.z = 0.45; stone.position.z = 0.072;
    g.add(chaton, stone); g.position.set(p.x, p.y, 0);
    return g;
  };
  const screw = (x, y, r = 0.055, rot = 0) => {
    const g = new THREE.Group();
    const head = mesh(cyl(r, 0.022, 20), M.blued); head.position.z = 0.058;
    const slot = mesh(new THREE.BoxGeometry(r * 1.8, r * 0.26, 0.006), M.slot); slot.position.z = 0.082;
    g.add(head, slot); g.position.set(x, y, 0); g.rotation.z = rot;
    return g;
  };
  [pos.centre, pos.third, pos.fourth, pos.escape].forEach((p) => bridges.add(jewel(p)));
  [[1.42, 0.35], [0.6, -1.4], [-1.38, 0.52], [1.25, -0.82], [0.22, 1.02], [-0.75, 1.36], [0.35, 1.52], [-1.52, -0.3]]
    .forEach(([x, y], i) => bridges.add(screw(x, y, 0.06, i * 0.9)));
  mov.add(reg(bridges, 2.5, { side: 1 }));

  // winding wheels on top of the barrel bridge
  const winding = new THREE.Group();
  {
    const ratchet = at(new THREE.Group(), pos.barrel);
    ratchet.add(wheelMesh(gearShape(64, 0.5, { hole: 0.05, tooth: 1.1 }), 0.505, 0.03, M.steelRay));
    ratchet.add(at(screw(0, 0, 0.085, 0.4), { x: 0, y: 0 })); ratchet.children[1].position.z = 0.46;
    const crownWheel = at(new THREE.Group(), polar(pos.barrel, 0.5 + 0.24, 205));
    const cwMat = M.steelRay.clone(); cwMat.bumpMap = T.fitToRadius(ray.clone(), 0.27);
    crownWheel.add(wheelMesh(gearShape(31, 0.24, { hole: 0.04, tooth: 1.1 }), 0.505, 0.03, cwMat));
    crownWheel.add(screw(0, 0, 0.065, 1.2)); crownWheel.children[1].position.z = 0.46;
    winding.add(ratchet, crownWheel);
    winding.userData = { ratchet, crownWheel };
    focus.ratchet = ratchet;
  }
  mov.add(reg(winding, 2.95, { side: 1 }));

  // balance bridge: one arm across the window, a jewel over the staff
  const psi = Math.atan2(pos.balance.y, pos.balance.x) + Math.PI / 2;
  {
    const top = [], bot = [], halfLen = 0.76;
    const width = (s) => 0.075 + 0.085 * Math.exp(-((s / 0.17) ** 2)) + 0.075 * Math.exp(-(((Math.abs(s) - halfLen) / 0.13) ** 2));
    for (let i = 0; i <= 60; i++) {
      const s = -halfLen - 0.13 + (i / 60) * (2 * halfLen + 0.26);
      const end = Math.min(1, (halfLen + 0.13 - Math.abs(s)) / 0.06), w = width(s) * Math.sqrt(Math.max(0, end * (2 - end)));
      top.push([s, w]); bot.push([s, -w]);
    }
    const sh = new THREE.Shape();
    top.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    bot.reverse().forEach(([x, y]) => sh.lineTo(x, y));
    sh.closePath();
    const cockMat = M.bridge.clone(); cockMat.bumpMap = frost; cockMat.bumpScale = 0.8; cockMat.roughness = 0.36;
    const cock = new THREE.Group();
    cock.add(mesh(extrude(sh, 0.06, { bevel: 0.014 }), cockMat));
    const j = jewel({ x: 0, y: 0 }, 0.05); cock.add(j);
    cock.add(screw(-halfLen, 0, 0.06, 0.5), screw(halfLen, 0, 0.06, 1.7));
    cock.position.set(pos.balance.x, pos.balance.y, 0.5);
    cock.rotation.z = psi;
    mov.add(reg(cock, 3.85));
  }

  // caseback: a steel ring around a sapphire window
  const back = new THREE.Group();
  back.add(mesh(lathe([[1.32, -0.62], [1.4, -0.66], [1.82, -0.66], [1.9, -0.64], [1.92, -0.56], [1.32, -0.56], [1.32, -0.62]]), M.satin));
  const backGlass = mesh(new THREE.CircleGeometry(1.34, 64), M.crystal);
  backGlass.rotation.y = Math.PI; backGlass.position.z = -0.61; backGlass.renderOrder = 5;
  back.add(backGlass);
  watch.add(reg(back, -4.5, { side: -1 }));

  /* ----- state ----- */
  const state = { explode: 0, aside: 0, strap: 1 };
  const maxOff = 4.5;
  const mesh2 = (aTheta, aN, bN, phi) => { // angle of gear A given its partner B (see README: tooth meets gap)
    const aA = TAU / aN, aB = TAU / bN, uB = (phi + Math.PI - aTheta.b) / aB;
    return phi - aA * (0.5 - uB);
  };
  const phi = {
    fe: dir(pos.fourth, pos.escape), tf: dir(pos.third, pos.fourth), ct: dir(pos.centre, pos.third), bc: dir(pos.barrel, pos.centre),
  };

  function setState(next) { Object.assign(state, next); }

  function layout() {
    const e = state.explode;
    parts.forEach((p) => {
      const delay = (1 - Math.abs(p.off) / maxOff) * 0.4;
      const t = smooth(0, 1, Math.min(1, Math.max(0, (e - delay) / (1 - 0.4))));
      p.obj.position.z = p.base.z + p.off * t;
      // the bridges, winding wheels and caseback can slide clear so the train is seen
      if (p.side) {
        const s = p.side < 0 ? smooth(0, 0.5, state.aside) : smooth(0.5, 1, state.aside);
        if (portrait) p.obj.position.x = p.base.x + s * 6.5 * p.side * -1;
        else p.obj.position.y = p.base.y + s * 6.5;
      }
    });
    const s = state.strap;
    strapG.visible = s > 0.01;
    M.leather.opacity = Math.min(1, s * 1.4);
    strapG.children.forEach((c) => { c.position.y = Math.sign(c.scale.y) * (1 - s) * 2.2; });
  }

  // now: milliseconds since local midnight. beat: false freezes the fast parts (reduced motion).
  function tick(dayMs, { beat = true } = {}) {
    const tSec = dayMs / 1000;
    const beats = tSec * 6, bi = Math.floor(beats), bf = beats - bi;
    const step = beat ? bi + smooth(0, 0.34, bf) : Math.floor(tSec) * 6;

    hour.rotation.z = -(tSec / 43200) * TAU;
    minute.rotation.z = -(tSec / 3600) * TAU;
    second.rotation.z = -((step / 6) / 60) * TAU;
    ring.rotation.z = ((tSec / 3600 - 6) / 24) * TAU;

    const thE = (step * TAU / 30) % (TAU * 1e4);
    const th4 = mesh2({ b: thE }, F.N, eP.N, phi.fe);
    const th3 = mesh2({ b: th4 }, Th.N, fP.N, phi.tf);
    const thC = mesh2({ b: th3 }, C.N, tP.N, phi.ct);
    const thB = mesh2({ b: thC }, B.N, cP.N, phi.bc);
    escape.rotation.z = thE; fourth.rotation.z = th4; third.rotation.z = th3; centre.rotation.z = thC; barrel.rotation.z = thB;

    if (beat) {
      const swing = Math.sin(Math.PI * beats);
      balWheel.rotation.z = 1.35 * swing;
      hairspring.rotation.z = 0.5 * swing;
      hairspring.scale.setScalar(1 - 0.045 * swing);
      const side = bi % 2 ? 1 : -1;
      pallet.userData.arm.rotation.z = toBal + side * 0.13 * (smooth(0, 0.3, bf) * 2 - 1);
    } else {
      pallet.userData.arm.rotation.z = toBal + 0.13;
    }
  }

  function setEdition(id) {
    const ed = EDITIONS.find((e) => e.id === id) || EDITIONS[0];
    M.dial.color.set(ed.dial);
    M.second.color.set(ed.second);
  }

  async function refreshPrint() { // redraw the dial printing once the web fonts are in
    const old = print.material.map;
    print.material.map = T.dialPrint(1.7);
    print.material.needsUpdate = true;
    old.dispose();
  }

  const tmp = new THREE.Vector3();
  function focusPoint(name, out) { // where a named part is right now, in the watch's own space
    if (Array.isArray(name)) return out.set(name[0], name[1], name[2]);
    const o = focus[name];
    if (!o) return out.set(0, 0, 0);
    o.getWorldPosition(tmp);
    return out.copy(watch.worldToLocal(tmp));
  }

  layout();
  return { object: watch, setState, layout, tick, setEdition, refreshPrint, focusPoint, state };
}
