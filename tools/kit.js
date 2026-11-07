// Shared look for the tool models: one set of materials and a few shape helpers,
// so every tool in the bag reads as the same kind of object. Units are millimetres.
import * as THREE from 'three';

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const std = (color, roughness, metalness, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

// ---------- materials ----------
export const M = {
  chrome:     () => once('chrome', () => std(0xc9ccd0, 0.1, 1, { envMapIntensity: 0.8 })),
  nickel:     () => once('nickel', () => std(0xdcd6cb, 0.2, 1)),
  stainless:  () => once('stainless', () => std(0xc9cbcd, 0.3, 1)),        // polished, not mirror
  satinSteel: () => once('satinSteel', () => std(0xa9abad, 0.45, 1)),
  darkSteel:  () => once('darkSteel', () => std(0x4a4c50, 0.4, 0.9)),      // blued or dark satin finish
  brass:      () => once('brass', () => std(0xd6aa50, 0.22, 1)),
  aluminium:  () => once('aluminium', () => std(0xd0d3d6, 0.35, 1)),
  anodized:   () => once('anodized', () => std(0x1d1e21, 0.5, 0.6)),       // black hard-anodized aluminium
  blackPlastic: () => once('blackPlastic', () => std(0x161616, 0.38, 0)),
  clearPlastic: () => once('clearPlastic', () => new THREE.MeshPhysicalMaterial({ color: 0xf4f6f8, roughness: 0.05, metalness: 0, transmission: 0.9, thickness: 4, transparent: true, opacity: 0.55 })),
  // wood colour lives in the grain texture; the material colour stays white so it isn't tinted twice
  beech:      () => once('beech', () => std(0xffffff, 0.55, 0, { map: woodTexture('#c9a878', '#a98658') })),
  maple:      () => once('maple', () => std(0xffffff, 0.5, 0, { map: woodTexture('#e6d0a8', '#cfb487') })),
  rosewood:   () => once('rosewood', () => std(0xffffff, 0.45, 0, { map: woodTexture('#6b3522', '#3f1d12') })),
  birchPly:   () => once('birchPly', () => std(0xe8d3a8, 0.6, 0)),
  plyDark:    () => once('plyDark', () => std(0x8f6c45, 0.6, 0)),
  ivory:      () => once('ivory', () => std(0xf2e9d1, 0.32, 0)),           // imitation-ivory acrylic keytop
  keyWhite:   () => once('keyWhite', () => std(0xf7f5ef, 0.3, 0)),
  keyBlack:   () => once('keyBlack', () => std(0x141312, 0.35, 0)),
  feltRed:    () => once('feltRed', () => std(0x9b2b2b, 0.95, 0)),
  feltGreen:  () => once('feltGreen', () => std(0x3c6b3d, 0.95, 0)),
  feltWhite:  () => once('feltWhite', () => std(0xefe9dc, 0.95, 0)),
  paper:      () => once('paper', () => std(0xf6f2e7, 0.85, 0)),
  card:       () => once('card', () => std(0xd8ccb2, 0.85, 0)),
  leather:    () => once('leather', () => std(0xb98e5e, 0.85, 0)),
};

// fine lengthwise grain, drawn once per colour pair; the texture wraps around a lathe or along a box
function woodTexture(base, grain) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 64);
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;   // fixed seed: every load looks the same
  for (let i = 0; i < 46; i++) {
    const y = rnd() * 64, w = 0.4 + rnd() * 1.4;
    g.strokeStyle = grain; g.globalAlpha = 0.15 + rnd() * 0.35; g.lineWidth = w;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 40 + i) * 1.5);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// a diamond knurl as a bump map, for grips and lock nuts; repeat sets the pitch on the part
export function knurl(repeatU = 24, repeatV = 8) {
  const base = once('knurlCanvas', () => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#000'; g.lineWidth = 6;
    for (let k = -64; k <= 128; k += 32) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.stroke();
      g.beginPath(); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke();
    }
    return c;
  });
  const t = new THREE.CanvasTexture(base);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatU, repeatV);
  return t;
}
// a copy of a material with a bump map on it (knurling on steel, aluminium or brass); made once per combination
export function knurled(material, repeatU, repeatV, depth = 0.6) {
  return once(`knurled:${material.uuid}:${repeatU}:${repeatV}:${depth}`, () => {
    const m = material.clone(); m.bumpMap = knurl(repeatU, repeatV); m.bumpScale = depth;
    return m;
  });
}

// ---------- shape helpers ----------
// a turned part: profile is [[radius, along], ...] from one end to the other; built along +X
export function lathe(profile, material, segments = 40) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateZ(-Math.PI / 2);          // lathe axis Y -> X
  return new THREE.Mesh(geo, material);
}
// a round rod between two points (a shank, a wire, a pin)
export function rod(a, b, radius, material, segments = 20) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, segments), material);
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  return mesh;
}
// a bent rod along a polyline with rounded corners: points [[x,y,z], ...], bend radius in mm
export function bentRod(points, radius, material, bendRadius = 3, segments = 16) {
  const P = points.map(p => new THREE.Vector3(...p));
  const path = new THREE.CurvePath();
  let start = P[0];
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const r1 = Math.min(bendRadius, a.distanceTo(b) / 2), r2 = Math.min(bendRadius, b.distanceTo(c) / 2);
    const p1 = b.clone().add(a.clone().sub(b).setLength(r1)), p2 = b.clone().add(c.clone().sub(b).setLength(r2));
    path.add(new THREE.LineCurve3(start, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b, p2));
    start = p2;
  }
  path.add(new THREE.LineCurve3(start, P[P.length - 1]));
  return new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(32, points.length * 24), radius, segments, false), material);
}
// a flat part cut from sheet or bar: outline [[x,y], ...] (holes: arrays of [[x,y], ...]), thickness along +Z from z0
export function plate(outline, thickness, material, { holes = [], z0 = 0, bevel = 0 } = {}) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness - 2 * bevel, curveSegments: 24,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
  geo.translate(0, 0, z0 + bevel);
  return new THREE.Mesh(geo, material);
}
// points around a circle or arc, for outlines and holes
export function arc(cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}
