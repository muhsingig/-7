// Every surface finish on the watch is drawn here on a canvas: no image files.
import * as THREE from 'three';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

function tex(canvas, { srgb = false, repeat = 1, clamp = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// ExtrudeGeometry and ShapeGeometry use model x/y as uv. This maps a part of
// radius r, centred on its own origin, onto the 0..1 square of a texture.
export function fitToRadius(t, r) {
  const k = 1 / (2 * r);
  t.repeat.set(k, k);
  t.offset.set(0.5, 0.5);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Straight satin brushing: fine parallel scratches.
export function brushedLinear() {
  return tex(make(512, (g, s) => {
    const r = rng(11);
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const y = r() * s, x = r() * s, w = 40 + r() * 320, v = r() > 0.5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.13})`;
      g.fillRect(x, y, w, 1);
      if (x + w > s) g.fillRect(x - s, y, w, 1);
    }
  }), { repeat: 3 });
}

// Circular graining (turned on a lathe): concentric scratches.
export function brushedCircular() {
  return tex(make(1024, (g, s) => {
    const r = rng(23);
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    g.lineWidth = 1;
    for (let i = 0; i < 4200; i++) {
      const rad = r() * s * 0.72, a0 = r() * Math.PI * 2, len = 0.15 + r() * 1.4, v = r() > 0.5 ? 255 : 0;
      g.strokeStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.14})`;
      g.beginPath(); g.arc(s / 2, s / 2, rad, a0, a0 + len); g.stroke();
    }
  }), { clamp: true });
}

// Sunray brushing for dials and the ratchet wheel: scratches radiating from the centre.
export function sunray() {
  return tex(make(1024, (g, s) => {
    const r = rng(37);
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    g.translate(s / 2, s / 2);
    for (let i = 0; i < 5200; i++) {
      const a = r() * Math.PI * 2, r0 = r() * s * 0.2, r1 = r0 + s * (0.1 + r() * 0.6), v = r() > 0.5 ? 255 : 0;
      g.strokeStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.12})`;
      g.lineWidth = 0.6 + r() * 0.8;
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
    }
  }), { clamp: true });
}

// The broad soft light-and-dark fans a sunray dial throws, baked as a colour map.
export function sunraySheen() {
  return tex(make(512, (g, s) => {
    const cg = g.createConicGradient(0.6, s / 2, s / 2);
    const stops = [0.72, 1, 0.74, 0.5, 0.72, 1, 0.74, 0.5, 0.72];
    stops.forEach((v, i) => {
      const c = Math.round(v * 255);
      cg.addColorStop(i / (stops.length - 1), `rgb(${c},${c},${c})`);
    });
    g.fillStyle = cg; g.fillRect(0, 0, s, s);
  }), { srgb: true, clamp: true });
}

// Cotes de Geneve: wide stripes, each a shallow scoop, with grain along the stripe.
export function genevaStripes() {
  return tex(make(512, (g, s) => {
    const r = rng(41), bands = 4, bw = s / bands;
    for (let b = 0; b < bands; b++) {
      const lg = g.createLinearGradient(b * bw, 0, (b + 1) * bw, 0);
      lg.addColorStop(0, '#2c2c2c'); lg.addColorStop(0.5, '#9a9a9a'); lg.addColorStop(1, '#e6e6e6');
      g.fillStyle = lg; g.fillRect(b * bw, 0, bw + 1, s);
    }
    for (let i = 0; i < 2600; i++) {
      const x = r() * s, y = r() * s, h = 30 + r() * 200, v = r() > 0.5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},${0.03 + r() * 0.07})`;
      g.fillRect(x, y, 1, h);
    }
  }), { repeat: 0.62 });
}

// Perlage: overlapping engine-turned circles, as on a mainplate.
export function perlage() {
  return tex(make(512, (g, s) => {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, s, s);
    const n = 8, d = s / n, rad = d * 0.72;
    for (let j = -1; j <= n; j++) {
      for (let i = -1; i <= n; i++) {
        const cx = (i + 0.5 + (j % 2 ? 0.5 : 0)) * d, cy = (j + 0.5) * d;
        const cg = g.createConicGradient((i * 7 + j * 3) * 0.4, cx, cy);
        ['#6f6f6f', '#e2e2e2', '#7c7c7c', '#d6d6d6', '#6f6f6f'].forEach((c, k) => cg.addColorStop(k / 4, c));
        g.fillStyle = cg;
        g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(40,40,40,.35)'; g.lineWidth = 1;
        g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.stroke();
      }
    }
  }), { srgb: true, repeat: 1.15 });
}

// Fine frosting for sandblasted and leather surfaces.
export function grain(seed = 5, contrast = 60) {
  return tex(make(256, (g, s) => {
    const r = rng(seed), img = g.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * contrast * 2;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }), { repeat: 6 });
}

// Everything printed on the dial: minute track, signature, origin.
export function dialPrint(radius, ink = '#f3ead8') {
  const size = 2048;
  const c = make(size, (g, s) => {
    const u = s / (2 * radius); // pixels per model unit
    g.translate(s / 2, s / 2);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'butt';
    for (let i = 0; i < 300; i++) {
      if (i % 5) continue;
      const m = i / 5, a = (m / 60) * Math.PI * 2, major = m % 5 === 0;
      const r0 = (major ? 1.565 : 1.585) * u, r1 = 1.64 * u;
      g.lineWidth = (major ? 0.02 : 0.011) * u;
      g.beginPath(); g.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); g.lineTo(Math.sin(a) * r1, -Math.cos(a) * r1); g.stroke();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${0.135 * u}px "Cormorant Garamond", Georgia, serif`;
    spaced(g, 'AUR\u00c8LE', 0, -1.15 * u, 0.034 * u);
    g.font = `500 ${0.066 * u}px "Jost", Arial, sans-serif`;
    spaced(g, 'GEN\u00c8VE', 0, 1.1 * u, 0.046 * u);
    g.font = `400 ${0.05 * u}px "Jost", Arial, sans-serif`;
    spaced(g, 'REMONTAGE MANUEL', 0, 1.212 * u, 0.026 * u);
  });
  const t = tex(c, { srgb: true, clamp: true });
  t.anisotropy = 16;
  return t;
}

function spaced(g, str, x, y, gap) {
  const widths = [...str].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (str.length - 1);
  let cx = x - total / 2;
  [...str].forEach((ch, i) => {
    g.fillText(ch, cx + widths[i] / 2, y);
    cx += widths[i] + gap;
  });
}
