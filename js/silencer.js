// SilencerClear's shared physics, models and helpers.
//
// Physics used across the chapters (all plane-wave, one-dimensional textbook acoustics):
//  - Firing frequency of a four-stroke: each cylinder fires once every two crank turns, so
//    f1 = rpm ÷ 120 × cylinders (Hz). A single at 1,200 rpm idles at 10 pulses a second.
//  - Speed of sound in hot exhaust: c = √(γ R T). Burnt petrol-air gas is mostly N₂, CO₂ and H₂O:
//    γ ≈ 1.35 and R ≈ 287 J/(kg·K) are the usual engineering values for hot exhaust.
//  - Simple expansion chamber, transmission loss (Davis et al. 1954; Munjal, "Acoustics of Ducts and
//    Mufflers", 2nd ed. 2014, ch. 3; also Wikipedia "Transmission loss (duct acoustics)"):
//    TL = 10 log10[1 + ¼ (m − 1/m)² sin²(kL)], m = chamber area ÷ pipe area, k = 2πf ÷ c.
//    It is zero whenever L is a whole number of half wavelengths: the chamber's pass bands.
//  - Helmholtz side-branch resonator (Kinsler, Frey et al., "Fundamentals of Acoustics", 4th ed.,
//    §10.10): power transmission 1 ÷ [1 + (c/2S)² ÷ (Rn² + (ωL′/A − c²/(ωV))²)], resonance at
//    f = (c/2π)·√(A ÷ (V·L′)) with L′ the neck length plus end corrections (≈ 1.7 × neck radius).
//    Rn is a small damping term we choose so the notch peaks near 25 dB, as measured notches do.
//  - Absorptive (packed) section: Sabine's empirical formula for a lined duct, attenuation per metre
//    ≈ 1.05 α^1.4 × P ÷ S (P lined perimeter, S open area; Sabine 1940, quoted in Beranek & Vér,
//    "Noise and Vibration Control Engineering", ch. 8). α(f) is a typical curve for about 25 mm of
//    glass fibre: small below 200 Hz, near 0.9 above 1 kHz (our smooth fit, approximate).
//  - A-weighting: IEC 61672-1 analytic formula.
// The engine's pulse spectrum is a labelled toy model (see pulseSpectrum).
import { THREE, M, rod, latheX, clamp, canvasTexture } from './kit.js';

export const TAU = Math.PI * 2;
export const GAS = { gamma: 1.35, R: 287 };
export const soundSpeed = (tC) => Math.sqrt(GAS.gamma * GAS.R * (tC + 273.15));
// Gas temperature inside the silencer: a few hundred °C at idle, hotter as the engine works harder.
// Our assumption, in line with typical small-engine exhaust gas temperatures of 300–700 °C.
export const exhaustTemp = (rpm) => clamp(330 + 0.045 * (rpm - 1200), 300, 700);
export const firingHz = (rpm, cyl = 1) => (rpm / 120) * cyl;
export const IDLE = 1300, REDLINE = 9000;

// Geometry of our generic commuter silencer, in metres (x runs from the inlet end to the tail).
export const GEO = {
  pipeD: 0.028, canD: 0.11, len: 0.48,
  A: [0, 0.17], B: [0.17, 0.29], R: [0.29, 0.37], C: [0.37, 0.48],
  neckD: 0.015, neckL: 0.05,
};
export const pipeS = Math.PI * (GEO.pipeD / 2) ** 2;
export const canS = Math.PI * (GEO.canD / 2) ** 2;
export const M_RATIO = canS / pipeS;                                 // ≈ 15

export function tlChamber(f, c, L, m = M_RATIO) {
  const s = Math.sin((TAU * f / c) * L), q = m - 1 / m;
  return 10 * Math.log10(1 + 0.25 * q * q * s * s);
}
const neckA = Math.PI * (GEO.neckD / 2) ** 2;
const neckLe = GEO.neckL + 1.7 * (GEO.neckD / 2);
const resV = canS * (GEO.R[1] - GEO.R[0]) - pipeS * (GEO.R[1] - GEO.R[0]);
export const resonatorHz = (c) => (c / TAU) * Math.sqrt(neckA / (resV * neckLe));
export function tlResonator(f, c) {
  const w = TAU * Math.max(1, f), X = (w * neckLe) / neckA - (c * c) / (w * resV), Z = c / (2 * pipeS);
  const Rn = Z / 17.8;                                                // caps the notch near 25 dB
  return 10 * Math.log10(1 + (Z * Z) / (Rn * Rn + X * X));
}
export const packAlpha = (f) => 0.95 * (1 - Math.exp(-f / 450));
export function tlPacking(f, L) {
  L ??= GEO.C[1] - GEO.C[0];
  return 1.05 * Math.pow(packAlpha(f), 1.4) * (4 / GEO.pipeD) * L;
}
export function aWeight(f) {
  const f2 = f * f;
  const ra = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2));
  return 20 * Math.log10(ra) + 2.0;
}
// Total transmission loss with the chosen parts switched in. Adding the dB of parts in series is
// a rough approximation (it ignores reflections between them), good enough to compare.
export function tlTotal(f, c, on) {
  let t = 0;
  if (on.chambers) t += tlChamber(f, c, GEO.A[1] - GEO.A[0]) + tlChamber(f, c, GEO.B[1] - GEO.B[0]);
  if (on.extra) t += tlChamber(f, c, 0.09);                         // a third chamber in a heavily baffled can
  if (on.resonator) t += tlResonator(f, c);
  if (on.packing) t += tlPacking(f, on.packL);
  return t;
}

// ---------------------------------------------------------------- the pulse train (toy model)
// Each time the exhaust valve opens, a "blowdown" pulse of hot gas leaves. We draw it as a half-sine
// lasting about 100 crank degrees, repeating at the firing frequency. Its harmonics fall at
// f1, 2f1, 3f1 … On top sits broadband flow noise that grows with rpm. The levels are calibrated
// so an open pipe on a single at 6,000 rpm reads about 100 dB(A) at 7.5 m and our stock silencer
// lands in the mid-70s, as real commuters must to pass the 77 dB(A) test. Real bikes vary.
export const BLOWDOWN_DEG = 100;
export const BANDS = [25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000];
// |c_n| ÷ (τ/T) for a half-sine pulse, with x = n·f1·τ: ∫₀¹ sin(πu) e^(−2πixu) du = (2/π)|cos πx| ÷ |1 − 4x²|.
const PULSE_K = (x) => (Math.abs(x - 0.5) < 1e-4 ? 0.5 : (2 / Math.PI) * Math.abs(Math.cos(Math.PI * x)) / Math.abs(1 - 4 * x * x));
const CAL = 121.0;                    // dB: sets the open-pipe single at 6,000 rpm to ~100 dB(A) at 7.5 m
// Returns the harmonics as [{ f, L }] (dB, unweighted, at 7.5 m) plus 1/3-octave band levels.
export function pulseSpectrum(rpm, cyl = 1, fmax = 5600) {
  const f1 = firingHz(rpm, cyl), tau = BLOWDOWN_DEG / (6 * rpm), duty = tau * f1;
  // Same total acoustic power for any number of cylinders, so only the pitch changes with them.
  // Pulses grow with engine speed (more gas, more pressure per second): amplitude ∝ rpm (our assumption).
  const amp = (rpm / 6000) / Math.sqrt(cyl);
  const harm = [];
  for (let n = 1; n * f1 <= fmax && n < 600; n++) {
    const a = 2 * duty * PULSE_K(n * f1 * tau) * amp;
    harm.push({ f: n * f1, L: CAL + 20 * Math.log10(Math.max(1e-9, a)) });
  }
  return harm;
}
// Broadband flow noise in a 1/3-octave band (toy): grows with rpm, rolls off above ~1.5 kHz.
export const flowNoise = (fc, rpm) => 70 + 50 * Math.log10(rpm / 6000) - 10 * Math.log10(1 + (fc / 1500) ** 2) + 4 * Math.log10(fc / 500);
const bandOf = (f) => { let best = 0; BANDS.forEach((b, i) => { if (Math.abs(Math.log(f / b)) < Math.abs(Math.log(f / BANDS[best]))) best = i; }); return best; };
const addDb = (a, b) => 10 * Math.log10(10 ** (a / 10) + 10 ** (b / 10));
// Full analysis: band levels before and after the silencer, A-weighted totals.
export function analyse(rpm, on = { chambers: true, resonator: true, packing: true }, cyl = 1) {
  const tC = exhaustTemp(rpm), c = soundSpeed(tC);
  const before = BANDS.map(() => -99), after = BANDS.map(() => -99);
  const harm = pulseSpectrum(rpm, cyl);
  for (const h of harm) {
    if (h.f < 22 || h.f > 5600) continue;
    const i = bandOf(h.f);
    before[i] = addDb(before[i], h.L);
    after[i] = addDb(after[i], h.L - tlTotal(h.f, c, on));
  }
  BANDS.forEach((fc, i) => { const n = flowNoise(fc, rpm); before[i] = addDb(before[i], n); after[i] = addDb(after[i], n - tlTotal(fc, c, on)); });
  let LA0 = -99, LA1 = -99;
  BANDS.forEach((fc, i) => { LA0 = addDb(LA0, before[i] + aWeight(fc)); LA1 = addDb(LA1, after[i] + aWeight(fc)); });
  return { tC, c, f1: firingHz(rpm, cyl), before, after, harm, LA0, LA1, fres: resonatorHz(c) };
}

// The pressure pulse train at the tailpipe, before and after the silencer, by adding up the
// harmonics (each reduced by the transmission loss at its frequency; phase shifts ignored).
// Returns two arrays over `periods` firing periods, normalised so the raw pulses peak at 1.
export function waveform(rpm, on, cyl = 1, n = 240, periods = 2) {
  const f1 = firingHz(rpm, cyl), tau = BLOWDOWN_DEG / (6 * rpm), c = soundSpeed(exhaustTemp(rpm));
  const H = [];
  for (let k = 1; k * f1 < 4000 && k < 200; k++) {
    const x = k * f1 * tau, d = Math.PI * (1 - 4 * x * x);
    let re, im;
    if (Math.abs(x - 0.5) < 1e-4) { re = 0; im = -0.5; } else { re = (1 + Math.cos(TAU * x)) / d; im = -Math.sin(TAU * x) / d; }
    H.push({ k, re, im, g: Math.pow(10, -tlTotal(k * f1, c, on) / 20) });
  }
  const raw = [], out = [];
  for (let i = 0; i < n; i++) {
    const ph = (i / n) * periods * TAU;
    let a = 0, b = 0;
    for (const h of H) { const cs = Math.cos(h.k * ph), sn = Math.sin(h.k * ph), v = h.re * cs - h.im * sn; a += v; b += v * h.g; }
    raw.push(a); out.push(b);
  }
  const pk = Math.max(...raw.map(Math.abs)) || 1;
  return { raw: raw.map((v) => v / pk), out: out.map((v) => v / pk), f1 };
}

// ---------------------------------------------------------------- back pressure (rough)
// Pressure needed to push the exhaust through: Δp ≈ K × ½ρv², with v the gas speed in the 28 mm pipe
// and K a loss coefficient for the whole system (sudden expansions, contractions, perforations).
// Gas flow for a 150 cc single at 85% volumetric efficiency, expanded by the exhaust temperature.
// K values are our rough assumptions to compare designs, not data for any real silencer.
export const DESIGNS = {
  open: { label: 'Open pipe', on: {}, K: 1 },
  straight: { label: 'Straight-through, packed', on: { packing: true, packL: 0.4 }, K: 4 },
  stock: { label: 'Chambers + resonator + packing', on: { chambers: true, resonator: true, packing: true }, K: 25 },
  baffled: { label: 'Extra baffles and chambers', on: { chambers: true, resonator: true, packing: true, extra: true }, K: 50 },
};
export function backPressure(rpm, K, cc = 150) {
  const T = exhaustTemp(rpm) + 273.15, Q = cc * 1e-6 * (rpm / 120) * 0.85 * (T / 300);
  const rho = 101325 / (GAS.R * T), v = Q / pipeS;
  return { kPa: (K * 0.5 * rho * v * v) / 1000, v };
}

// ---------------------------------------------------------------- hearing and loudness
// NIOSH REL: 85 dB(A) for 8 hours, half the time for every 3 dB more (CDC/NIOSH, "Understand Noise
// Exposure"). WHO–ITU H.870 safe listening: 80 dB(A) for 40 hours a week (adults), same 3 dB rule.
export const nioshHours = (L) => 8 / Math.pow(2, (L - 85) / 3);
export const loudnessRatio = (dL) => Math.pow(2, dL / 10);          // +10 dB sounds about twice as loud
export function fmtTime(h) {
  if (h >= 24) return 'all day';
  if (h >= 1) return (h >= 10 ? Math.round(h) : h.toFixed(1).replace(/\.0$/, '')) + ' h';
  const m = h * 60;
  if (m >= 1) return Math.round(m) + ' min';
  return Math.max(1, Math.round(m * 60)) + ' s';
}
export const fmtHz = (f) => (f >= 1000 ? (f / 1000).toFixed(f >= 9950 ? 0 : 1).replace(/\.0$/, '') + ' kHz' : Math.round(f) + ' Hz');

// India: noise limits at the manufacturing stage for two-wheelers, Environment (Protection) Rules,
// 1986, Schedule VI Part E (as amended by G.S.R. 742(E), 25 Sep 2000, for 1 Jan 2003, and G.S.R.
// 272(E), 2005, for 1 April 2005): up to 80 cc 75 dB(A); 80–175 cc 77 dB(A); above 175 cc 80 dB(A).
// Test method IS 3028:1998 (a full-throttle pass-by measured 7.5 m to the side).
export const INDIA_LIMITS = [{ upto: 80, L: 75, label: 'up to 80 cc' }, { upto: 175, L: 77, label: '80–175 cc' }, { upto: 9999, L: 80, label: 'above 175 cc' }];

// ---------------------------------------------------------------- scene helpers
export function board(parent, pw, ph, cw, chh, draw) {
  const c = canvasTexture(cw, chh, draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: c.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
  mesh.renderOrder = 5;
  parent.add(mesh);
  return { mesh, redraw: c.redraw };
}
export function panel(g, w, h, title) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,.9)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.stroke();
  if (title) { g.fillStyle = '#e8eef8'; g.font = 'bold 34px sans-serif'; g.fillText(title, 26, 48); }
}
export const narrowStage = (stage) => stage.host.clientWidth < 560;
export const recording = () => document.body.classList.contains('gb-reel');
// On a phone the readout covers the upper left: re-frame once, unless the viewer has orbited.
export function fitNarrow(stage, view) {
  let done = false;
  return () => {
    const narrow = narrowStage(stage);
    if (narrow && !done && !stage.moved && !recording()) { stage.setView(view.pos, view.target, 0.01); done = true; }
    return narrow;
  };
}
// Portrait stages (phones, and the 1080×1920 reel) get their own stacked layout and camera.
// Returns a function to call every frame: it reports whether the stage is portrait and, the first
// time it is, moves the camera to `pview` (unless the viewer has orbited).
export const isPortrait = (stage) => stage.camera.aspect < 0.8 || narrowStage(stage);
export function makeLayout(stage, pview) {
  let done = false;
  return () => {
    const p = isPortrait(stage);
    if (p && !done && !stage.moved) {
      let pos = pview.pos, target = pview.target;
      if (!recording()) {
        // A phone's stage is less tall than the reel's and its readout covers the top: back off to
        // the reel's framing, then shift the picture down a little.
        const k = Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, stage.camera.aspect))), f = (2.5 / k) * 1.08;
        const off = pos.map((v, i) => (v - target[i]) * f), d = Math.hypot(...off) * k, up = 0.16 * 2 * d * Math.tan((21 * Math.PI) / 180);
        target = [target[0], target[1] + up, target[2]]; pos = off.map((v, i) => v + target[i]);
      }
      stage.setView(pos, target, 0.01); done = true;
    }
    return p;
  };
}
// On a phone, keep only the headline and two rows of the readout.
export function compactReadout(stage, api) {
  const full = api.readout;
  if (!full) return api;
  api.readout = (s) => {
    const html = full(s);
    if (!narrowStage(stage) || !html) return html;
    let rows = 0;
    return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (++rows <= 2 ? m : ''));
  };
  return api;
}
export const TINT = { hot: '#ffb547', gas: '#ff8a5c', cool: '#8ef0ff', good: '#5ce1a9', bad: '#ff5a6a', pack: '#ffe08a' };
export function tint(l, col) { if (col) { l.element.style.borderColor = col; l.element.style.color = col; } return l; }

// Hot-metal colour for temperatures in °C (dull grey → straw → blue tint → dull red glow).
export function heatColor(tC) {
  const c = new THREE.Color(0x9ea3ab);
  if (tC > 250) c.lerp(new THREE.Color(0xb98a52), clamp((tC - 250) / 150, 0, 1));
  if (tC > 400) c.lerp(new THREE.Color(0x6a5a9a), clamp((tC - 400) / 120, 0, 1));
  if (tC > 520) c.lerp(new THREE.Color(0xd0401c), clamp((tC - 520) / 150, 0, 1));
  return c;
}

// A perforated-metal material: a hole pattern drawn on a canvas, cut out with alphaTest.
// Each call makes its own texture (the stage disposes it with the chapter).
export function perfMat(color = 0xb9bec8, repX = 20, repY = 12, opacity = 1) {
  const { tex } = canvasTexture(64, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(w / 2, h / 2, 13, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repX, repY);
  return new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.35, alphaMap: tex, alphaTest: 0.5, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
}

// A tube with its axis on X between x0 and x1, open ends.
const pipe = (x0, x1, r, mat, seg = 28) => rod(x0, x1, r, r, mat, seg, true);
// A thin disc in the YZ plane at x (a baffle or end cap), with an optional hole for a pipe.
function disc(x, r, mat, hole = 0) {
  const g = new THREE.RingGeometry(hole, r, 40, 1); g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.x = x; m.castShadow = true; return m;
}

// ---------------------------------------------------------------- the silencer model
// Built in metres along +X (inlet at x = 0, tail at x = GEO.len). Callers scale the group.
// Front half of the can (+z) is a separate mesh so it can be cut away.
export function makeSilencer({ cat = false } = {}) {
  const g = new THREE.Group();
  const R = GEO.canD / 2, r = GEO.pipeD / 2, L = GEO.len;
  const shellMat = M.metal(0x3d434d, { roughness: 0.38, side: THREE.DoubleSide });
  const shellCutMat = M.metal(0x3d434d, { roughness: 0.38, side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const prof = [[-0.005, r * 1.4], [0.0, R * 0.92], [0.012, R], [L - 0.012, R * 0.98], [L, R * 0.88], [L + 0.004, r * 1.3]];
  const back = latheX(prof, shellMat, { seg: 40, phiStart: Math.PI / 2, phiLength: Math.PI });
  const front = latheX(prof, shellCutMat, { seg: 40, phiStart: -Math.PI / 2, phiLength: Math.PI });
  g.add(back, front);
  // Inside: a light steel colour so it reads against the dark can.
  const steel = M.metal(0xc9ced6, { roughness: 0.3, side: THREE.DoubleSide });
  const inlet = new THREE.Group(); g.add(inlet);
  inlet.add(pipe(-0.06, 0.03, r, steel));
  const inPerf = pipe(0.03, 0.15, r, perfMat(0xc9ced6, 10, 4)); inlet.add(inPerf);
  const baffles = [disc(GEO.A[1], R * 0.97, perfMat(0xb7bdc6, 6, 6)), disc(GEO.B[1], R * 0.97, steel, r), disc(GEO.R[1], R * 0.97, steel, r)];
  baffles.forEach((b) => g.add(b));
  const outlet = new THREE.Group(); g.add(outlet);
  outlet.add(pipe(0.2, GEO.C[0] + 0.005, r, steel));
  outlet.add(pipe(GEO.C[0] + 0.005, L - 0.002, r, perfMat(0xc9ced6, 10, 4)));
  const tail = pipe(L - 0.002, L + 0.05, r * 1.05, M.metal(0xd7dce4, { roughness: 0.2, side: THREE.DoubleSide })); g.add(tail);
  // Helmholtz resonator: the closed chamber R, joined to the outlet tube by a short neck.
  const neck = new THREE.Group(); g.add(neck);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(GEO.neckD / 2, GEO.neckD / 2, 0.03, 20, 1, true), M.metal(0xffb547, { side: THREE.DoubleSide, roughness: 0.4 }));
  nk.position.set((GEO.R[0] + GEO.R[1]) / 2, -(r + 0.015), 0); neck.add(nk);
  const resGlow = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, GEO.R[1] - GEO.R[0] - 0.004, 40, 1, true), M.ghost(0xffb547, 0.0));
  resGlow.rotation.z = Math.PI / 2; resGlow.position.x = (GEO.R[0] + GEO.R[1]) / 2; neck.add(resGlow);
  // Packing: glass or steel wool around the perforated tail tube in chamber C.
  const packMat = new THREE.MeshStandardMaterial({ color: 0xe8d9a0, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const packing = latheX([[GEO.C[0] + 0.004, r * 1.1], [GEO.C[0] + 0.006, R * 0.94], [GEO.C[1] - 0.006, R * 0.94], [GEO.C[1] - 0.004, r * 1.1]], packMat, { seg: 32, phiStart: Math.PI / 2, phiLength: Math.PI });
  g.add(packing);
  const packFront = latheX([[GEO.C[0] + 0.004, r * 1.1], [GEO.C[0] + 0.006, R * 0.94], [GEO.C[1] - 0.006, R * 0.94], [GEO.C[1] - 0.004, r * 1.1]], packMat.clone(), { seg: 32, phiStart: -Math.PI / 2, phiLength: Math.PI });
  packFront.material.transparent = true; g.add(packFront);
  // Optional catalytic brick in the front of chamber A (many small bikes carry it there).
  let catBrick = null;
  if (cat) {
    catBrick = rod(0.035, 0.1, 0.03, 0.03, M.metal(0x8f8a7c, { roughness: 0.7 })); catBrick.position.x = 0.0675;
    g.add(catBrick);
  }
  // Heat shield: a perforated curved plate on the outside (+z, the side a leg touches).
  const shieldG = new THREE.CylinderGeometry(R * 1.28, R * 1.28, L * 0.78, 30, 1, true, -0.9, 1.8);
  shieldG.rotateZ(Math.PI / 2); shieldG.rotateX(Math.PI / 2);
  const shield = new THREE.Mesh(shieldG, perfMat(0xd2d6dc, 16, 7)); shield.position.x = L * 0.45; shield.castShadow = true;
  g.add(shield);
  const cutParts = [front, packFront];
  const setCut = (k) => {           // k: 0 solid, 1 front half fully cut away
    cutParts.forEach((p) => { p.material.opacity = 1 - k; p.material.transparent = k > 0; p.material.depthWrite = k < 0.5; p.visible = k < 0.98; });
  };
  return { group: g, back, front, inlet, baffles, outlet, tail, neck, resGlow, packing, packFront, shield, catBrick, shellMat, shellCutMat, setCut };
}

// The gas path through the silencer (metres): the largest radius a particle can wander to at x,
// and whether that stretch is inside a pipe (fast) or a chamber (slow, spread out).
export function gasRadius(x) {
  const R = GEO.canD / 2 * 0.88, r = GEO.pipeD / 2 * 0.8;
  if (x < 0.03) return r;
  if (x < 0.16) return r + (R - r) * clamp((x - 0.03) / 0.04, 0, 1);
  if (x < 0.2) return R;
  return r;                                               // into the outlet tube
}

// ---------------------------------------------------------------- a generic commuter motorcycle
// About 2 m long, built in metres: x forward, y up, z to the bike's right (exhaust side).
// No badges, logos or brand shapes: a plain tank, seat, single cylinder and two spoked wheels.
export function makeBike({ color = 0x2f6fd0 } = {}) {
  const bike = new THREE.Group();
  const paint = M.plastic(color, { roughness: 0.3, metalness: 0.2 });
  const black = M.matte(0x1c1f26), chrome = M.metal(0xd7dce4, { roughness: 0.18 }), alloy = M.metal(0x9aa1ab);
  const wheel = (x, rr) => {
    const w = new THREE.Group(); w.position.set(x, rr, 0); bike.add(w);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(rr - 0.045, 0.045, 14, 48), black); w.add(tyre);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(rr - 0.09, 0.012, 8, 48), alloy); w.add(rim);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, rr - 0.12, 4), alloy); sp.position.set(Math.cos(a) * (rr - 0.12) / 2, Math.sin(a) * (rr - 0.12) / 2, (i % 2 ? 1 : -1) * 0.012); sp.rotation.z = a - Math.PI / 2; w.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 20), alloy); hub.rotation.x = Math.PI / 2; w.add(hub);
    return w;
  };
  const rear = wheel(-0.66, 0.3), frontW = wheel(0.66, 0.3);
  const beamM = (a, b, r = 0.018, m = black) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 10), m); mesh.position.copy(A).add(B).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); mesh.castShadow = true; bike.add(mesh); return mesh; };
  // Frame: backbone from the steering head to the seat, down tube, swingarm.
  beamM([0.5, 0.95, 0], [-0.1, 0.82, 0], 0.024); beamM([-0.1, 0.82, 0], [-0.55, 0.78, 0], 0.018);
  beamM([0.5, 0.92, 0], [0.28, 0.32, 0], 0.022); beamM([0.28, 0.32, 0], [-0.15, 0.3, 0], 0.02);
  for (const z of [-0.07, 0.07]) beamM([-0.15, 0.36, z], [-0.66, 0.3, z], 0.016, alloy);
  for (const z of [-0.09, 0.09]) beamM([-0.62, 0.32, z], [-0.45, 0.78, z], 0.017, chrome);
  // Forks and handlebar.
  for (const z of [-0.06, 0.06]) beamM([0.66, 0.3, z], [0.47, 1.0, z], 0.018, chrome);
  beamM([0.47, 1.03, -0.33], [0.47, 1.03, 0.33], 0.012, chrome);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 12), chrome); lamp.position.set(0.56, 0.93, 0); bike.add(lamp);
  // Tank and seat: plain rounded shapes, no badges.
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 6, 16), paint); tank.rotation.z = Math.PI / 2 - 0.12; tank.scale.set(1, 1, 0.95); tank.position.set(0.22, 0.95, 0); tank.castShadow = true; bike.add(tank);
  const seat = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 6, 12), black); seat.rotation.z = Math.PI / 2 - 0.05; seat.scale.set(1, 0.7, 1.1); seat.position.set(-0.3, 0.86, 0); bike.add(seat);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), black); side.position.set(-0.2, 0.7, 0); bike.add(side);
  // Engine: crankcase and a single finned cylinder leaning forward.
  const engine = new THREE.Group(); engine.position.set(0.08, 0.38, 0); bike.add(engine);
  const crank = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.22), alloy); crank.castShadow = true; engine.add(crank);
  const cyl = new THREE.Group(); cyl.position.set(0.08, 0.12, 0); cyl.rotation.z = -0.3; engine.add(cyl);
  for (let i = 0; i < 7; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.17 - i * 0.004, 0.012, 0.17), M.metal(0x8c939d)); fin.position.y = 0.03 + i * 0.026; cyl.add(fin); }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 16), M.metal(0x8c939d)); barrel.position.y = 0.1; cyl.add(barrel);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.15), M.metal(0x9aa1ab)); head.position.y = 0.23; cyl.add(head);
  // The exhaust port sits at the front of the head, on the right.
  const port = new THREE.Vector3(0.235, 0.6, 0.06);
  return { group: bike, rear, front: frontW, engine, cyl, tank, seat, port };
}
