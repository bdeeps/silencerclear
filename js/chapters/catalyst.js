// Chapter 4: the catalytic converter. A honeycomb coated with precious metals turns CO, unburnt
// hydrocarbons and nitrogen oxides into CO₂, water and nitrogen, but only when it is hot and the
// fuel mixture is just right.
// Sources: Wikipedia "Catalytic converter" (cordierite or metal-foil honeycomb; Pt, Pd and Rh;
// three-way reactions; "require a temperature of 400 °C to operate effectively"). The conversion
// curves are an illustrative model of a three-way catalyst's narrow window around λ = 1 and its
// light-off with temperature, shaped after the textbook curves in Heywood, "Internal Combustion
// Engine Fundamentals" (1988), ch. 11. Two-wheeler BS-VI limits (from 1 April 2020): CO 1.0,
// HC 0.10, NOx 0.06 g/km, matching Euro 5 (ICCT, "India BS VI policy update"; Supreme Court of
// India order in M.C. Mehta v. Union of India, 24 Oct 2018).
import { THREE, M, latheX, box, swarm, approach, clamp } from '../kit.js';
import { board, panel, tint, TINT, makeLayout, compactReadout, narrowStage } from '../silencer.js';

const sig = (x) => 1 / (1 + Math.exp(-x));
const lightOff = (T, T50) => sig((T - T50) / 22);
export function conversion(T, lam) {
  return {
    CO: 0.99 * sig((lam - 0.985) / 0.005) * lightOff(T, 240),
    HC: 0.97 * sig((lam - 0.99) / 0.006) * lightOff(T, 270),
    NOx: 0.99 * sig(-(lam - 1.004) / 0.003) * lightOff(T, 260),
  };
}
const COL = { CO: 0xff6b6b, HC: 0xd99a4e, NOx: 0xffd166, CO2: 0xdfe6ee, H2O: 0x6fd3ff, N2: 0xb9a6ff };
const css = (h) => '#' + new THREE.Color(h).getHexString();

function drawWindow(g, w, h, st) {
  panel(g, w, h, 'How much gets cleaned, by fuel mixture');
  const L = 90, R = w - 30, T = 80, B = h - 80, l0 = 0.95, l1 = 1.05;
  const X = (l) => L + ((l - l0) / (l1 - l0)) * (R - L), Y = (v) => B - v * (B - T);
  g.fillStyle = 'rgba(92,225,169,.12)'; g.fillRect(X(0.995), T, X(1.005) - X(0.995), B - T);
  g.font = '24px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)';
  [0, 50, 100].forEach((p) => { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, Y(p / 100)); g.lineTo(R, Y(p / 100)); g.stroke(); g.fillText(p + '%', 20, Y(p / 100) + 8); });
  [0.96, 1.0, 1.04].forEach((l) => g.fillText(l.toFixed(2), X(l) - 24, B + 30));
  g.fillText('← rich (more fuel)', L, B + 64); g.fillText('lean (more air) →', R - 200, B + 64);
  for (const k of ['CO', 'HC', 'NOx']) {
    g.strokeStyle = css(COL[k]); g.lineWidth = 5; g.beginPath();
    for (let i = 0; i <= 100; i++) { const l = l0 + (i / 100) * (l1 - l0), v = conversion(st.T, l)[k]; i ? g.lineTo(X(l), Y(v)) : g.moveTo(X(l), Y(v)); }
    g.stroke();
  }
  const x = X(clamp(st.lam, l0, l1));
  g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(x, T); g.lineTo(x, B); g.stroke(); g.setLineDash([]);
  g.font = 'bold 24px sans-serif';
  [['CO', 0], ['HC', 1], ['NOx', 2]].forEach(([k, i]) => { g.fillStyle = css(COL[k]); g.fillText(k, R - 90, T + 30 + i * 30); });
  g.fillStyle = '#5ce1a9'; g.font = '22px sans-serif'; g.fillText('the window', X(1.0) - 50, T + 26);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(`at ${Math.round(st.T)} °C (illustrative curves)`, L, T - 12);
}

export default {
  id: 'catalyst',
  short: 'Catalytic converter',
  title: 'The catalytic converter',
  subtitle: 'A hot honeycomb that turns three poisons into harmless gases.',
  view: { pos: [0.5, 3.8, 8.4], target: [0.4, 2.85, 0] },
  learn: `<p>An engine never burns its fuel perfectly. Its exhaust carries three harmful gases: <b>carbon monoxide (CO)</b>, a poison; unburnt <b>hydrocarbons (HC)</b>, bits of fuel; and <b>nitrogen oxides (NOx)</b>, made when air's nitrogen and oxygen meet in the hot flame. Both HC and NOx help make smog. (How burning works is in <a href="https://glassbox.how/combustionclear/">CombustionClear</a>.)</p>
    <p>The <b>catalytic converter</b> is a block of thousands of tiny parallel channels: a <b>honeycomb</b> of ceramic or thin metal foil. Its walls are coated with a rough layer sprinkled with precious metals: <b>platinum, palladium and rhodium</b>. Gas molecules land on the metal, react and leave changed. A <b>catalyst</b> speeds a reaction up without being used up.</p>
    <p>A <b>three-way</b> converter does three jobs at once:<br>2 CO + O₂ → 2 CO₂<br>hydrocarbons + O₂ → CO₂ + H₂O<br>2 NO + 2 CO → N₂ + 2 CO₂</p>
    <p>There are two catches. It only works <b>hot</b>: it "lights off" at a few hundred degrees and works well from about <b>400 °C</b>, so the first minutes after a cold start are the dirtiest. And the mixture must be <b>just right</b>: with too much fuel there is no spare oxygen to burn CO and HC; with too much air, NOx can't give its oxygen away. That is why India's <b>BS-VI</b> rules, in force for all new vehicles from <b>1 April 2020</b>, pushed bikes to <b>fuel injection</b> with an <b>oxygen sensor</b> that keeps the mix in the window. For motorcycles the limits are about <b>1.0 g of CO, 0.1 g of HC and 0.06 g of NOx per km</b>.</p>
    <p>A converter also takes some sound out, but it is not a silencer. Removing or bypassing one is illegal and lets the poisons straight out into the street.</p>
    <p class="tip"><b>Try it:</b> start cold and warm the converter up. Then slide the mixture from rich to lean and watch NOx and CO swap places.</p>`,
  terms: [
    { t: 'Catalyst', d: 'A substance that speeds up a chemical reaction without being used up itself.' },
    { t: 'Three-way converter', d: 'A catalytic converter that cuts CO, HC and NOx at the same time.' },
    { t: 'Light-off', d: 'The temperature at which a converter starts working well, a few hundred degrees Celsius.' },
    { t: 'Lambda (λ)', d: 'The air-to-fuel ratio compared with the perfect amount: λ = 1 is just right, below 1 rich, above 1 lean.' },
    { t: 'Oxygen sensor', d: 'A probe in the exhaust that tells the engine computer whether the mixture is rich or lean.' },
    { t: 'BS-VI', d: 'Bharat Stage VI, India’s emission rules for new vehicles since 1 April 2020, close to Europe’s Euro 6 (cars) and Euro 5 (bikes).' },
  ],
  defaults: { T: 450, lam: 1.0 },
  controls: [
    { key: 'T', type: 'range', label: 'Converter temperature', min: 50, max: 700, step: 5, ends: ['cold start', 'hot'], fmt: (v) => Math.round(v) + ' °C' },
    { key: 'lam', type: 'range', label: 'Fuel mixture (lambda)', min: 0.95, max: 1.05, step: 0.001, ends: ['rich', 'lean'], fmt: (v) => 'λ = ' + v.toFixed(3) },
  ],
  quiz: [
    { q: 'Which metals coat the inside of a catalytic converter?', options: ['Iron and copper', 'Platinum, palladium and rhodium', 'Lead and tin', 'Aluminium and zinc'], answer: 1, why: 'These precious metals let CO, HC and NOx react at much lower temperatures than they would on their own.' },
    { q: 'Why is a bike dirtiest just after a cold start?', options: ['The tank is full', 'The converter has not reached its light-off temperature', 'The tyres are cold', 'The silencer is full of water'], answer: 1, why: 'The catalyst hardly works until it is a few hundred degrees hot.' },
    { q: 'What does a three-way converter turn nitrogen oxides into?', options: ['Ozone', 'Nitrogen gas', 'Petrol', 'Carbon monoxide'], answer: 1, why: 'On rhodium, NO gives up its oxygen (often to CO) and leaves as harmless N₂.' },
  ],
  reel: [
    { ms: 5400, caption: 'A hot honeycomb of platinum, palladium and rhodium turns CO, HC and NOx into CO₂, water and nitrogen.', set: { lam: 1.0 }, anim: { T: [120, 520] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const X0 = -2.6, X1 = 2.0, Y = 3.25, R = 0.95;
    const g = new THREE.Group(); g.position.set(0.3, Y, 0); root.add(g);
    // Can: back half solid, cones at each end.
    const prof = [[X0 - 0.5, 0.22], [X0, R], [X1, R], [X1 + 0.5, 0.22]];
    g.add(latheX(prof, M.metal(0x6c727c, { side: THREE.DoubleSide }), { seg: 40, phiStart: Math.PI / 2, phiLength: Math.PI }));
    g.add(latheX(prof, M.clear(0xcfd6e0, 0.08), { seg: 40, phiStart: -Math.PI / 2, phiLength: Math.PI }));
    // Honeycomb, cut in half: walls of thin plates in the back half (z ≤ 0).
    const B0 = X0 + 0.3, B1 = X1 - 0.3, len = B1 - B0, r = R * 0.95, n = 9, pitch = (2 * r) / n;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x9a978c, roughness: 0.85, metalness: 0.1, emissive: new THREE.Color(0xff4a1a), emissiveIntensity: 0 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x9a978c, roughness: 0.85, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const lanes = [];
    for (let i = 0; i <= n; i++) {
      const c = -r + i * pitch, half = Math.sqrt(Math.max(0, r * r - c * c));
      if (half < 0.05) continue;
      const v = box(len, 2 * half, 0.012, sideMat); v.position.set((B0 + B1) / 2, 0, -Math.min(r, Math.abs(c)) * 0 + (c <= 0 ? c : 99)); if (c <= 0) g.add(v);
      const hz = box(len, 0.012, half, wallMat); hz.position.set((B0 + B1) / 2, c, -half / 2); g.add(hz);
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const y = -r + (i + 0.5) * pitch, z = -r + (j + 0.5) * pitch;
      if (z > 0 || y * y + z * z > (r - pitch * 0.5) ** 2) continue;
      lanes.push([y, z]);
    }
    const L = (t, pos, col) => tint(stage.label(t, pos, g), col);
    const lab = [
      L('Ceramic or metal honeycomb', [1.3, R + 0.2, -0.3]),
      L('Walls coated with Pt, Pd, Rh', [0.6, -R - 0.25, -0.2], TINT.good),
      L('In: CO, HC, NOx', [X0 - 0.5, 0.55, 0], TINT.bad),
      L('Out: CO₂, H₂O, N₂', [X1 + 0.5, 0.55, 0], TINT.cool),
    ];
    // Molecules.
    const N = 360;
    const mol = swarm(N, new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    mol.castShadow = false; g.add(mol);
    const rnd = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9898) * 0.5 + 0.5, Math.sin(i * 78.233) * 0.5 + 0.5, Math.sin(i * 39.425) * 0.5 + 0.5, Math.sin(i * 93.989) * 0.5 + 0.5]);
    const kind = rnd.map((q) => (q[0] < 0.4 ? 'CO' : q[0] < 0.65 ? 'HC' : 'NOx'));
    const prod = (k, q) => (k === 'CO' ? 'CO2' : k === 'NOx' ? 'N2' : q < 0.5 ? 'CO2' : 'H2O');
    const col = new THREE.Color();
    const st = { T: 450, lam: 1 };
    const brd = board(root, 3.6, 2.23, 1000, 620, (gg, w, h) => drawWindow(gg, w, h, st)); brd.mesh.position.set(-1.55, 1.2, 0.4);
    const legend = board(root, 2.9, 2.25, 800, 620, (gg, w, h) => {
      panel(gg, w, h, 'What goes in, what comes out');
      const rows = [['CO', 'carbon monoxide', 'CO2', 'carbon dioxide'], ['HC', 'unburnt fuel', 'H2O', 'water'], ['NOx', 'nitrogen oxides', 'N2', 'nitrogen']];
      rows.forEach(([a, an, b, bn], i) => {
        const y = 130 + i * 150;
        gg.fillStyle = css(COL[a]); gg.beginPath(); gg.arc(60, y, 22, 0, 7); gg.fill();
        gg.fillStyle = css(COL[b]); gg.beginPath(); gg.arc(440, y, 22, 0, 7); gg.fill();
        gg.fillStyle = '#e8eef8'; gg.font = 'bold 30px sans-serif'; gg.fillText(a.replace('x', 'ₓ'), 95, y - 4); gg.fillText(b.replace('2', '₂'), 475, y - 4);
        gg.font = '24px sans-serif'; gg.fillStyle = 'rgba(255,255,255,.65)'; gg.fillText(an, 95, y + 28); gg.fillText(bn, 475, y + 28);
        gg.fillStyle = 'rgba(255,255,255,.5)'; gg.font = 'bold 34px sans-serif'; gg.fillText('→', 350, y + 10);
      });
    });
    legend.mesh.position.set(1.9, 1.2, 0.4);
    const fit = makeLayout(stage, { pos: [0.3, 5.4, 7.8], target: [0.3, 5.0, 0] });
    let t = 0, key = '';
    const api = {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fit();
        g.position.y = narrow ? 8.7 : Y;
        brd.mesh.position.set(narrow ? 0.3 : -1.55, narrow ? 5.3 : 1.2, 0.4); brd.mesh.scale.setScalar(narrow ? 1.7 : 1);
        legend.mesh.position.set(narrow ? 0.3 : 1.9, narrow ? 1.45 : 1.2, 0.4); legend.mesh.scale.setScalar(narrow ? 1.4 : 1);
        st.T = approach(st.T, s.T, 3, dt); st.lam = s.lam;
        const k = Math.round(st.T) + '|' + s.lam.toFixed(3);
        if (k !== key) { key = k; brd.redraw(); }
        wallMat.emissiveIntensity = clamp((st.T - 350) / 500, 0, 0.6);
        lab.forEach((l, i) => { l.visible = !narrow || i >= 2; });
        const eff = conversion(st.T, s.lam);
        for (let i = 0; i < N; i++) {
          const q = rnd[i], lane = lanes[i % lanes.length];
          const u = (t * 0.12 + q[1]) % 1, x = X0 - 0.7 + u * (X1 - X0 + 1.4);
          let y, z;
          if (x < B0) { const a = (x - (X0 - 0.7)) / (B0 - X0 + 0.7); y = lane[0] * a + (q[2] - 0.5) * 0.3 * (1 - a); z = lane[1] * a + (q[3] - 0.5) * 0.3 * (1 - a); }
          else if (x > B1) { const a = (x - B1) / (X1 + 0.7 - B1); y = lane[0] * (1 - a) + (q[2] - 0.5) * 0.3 * a; z = lane[1] * (1 - a) + (q[3] - 0.5) * 0.3 * a; }
          else { y = lane[0]; z = lane[1]; }
          // A molecule changes at a point inside the brick if it is one of the converted share.
          const changeAt = B0 + (0.15 + 0.7 * q[2]) * len;
          const conv = q[3] < eff[kind[i]] && x > changeAt;
          col.setHex(COL[conv ? prod(kind[i], q[1]) : kind[i]]);
          mol.setColorAt(i, col);
          mol.place(i, [x, y, z]);
        }
        mol.done(); if (mol.instanceColor) mol.instanceColor.needsUpdate = true;
      },
      readout: (s) => {
        const e = conversion(st.T, s.lam), p = (v) => Math.round(v * 100) + '%';
        const state = st.T < 220 ? 'Too cold: almost nothing cleaned' : s.lam < 0.99 ? 'Too rich: CO and HC slip through' : s.lam > 1.01 ? 'Too lean: NOx slips through' : e.CO > 0.9 && e.NOx > 0.9 ? 'In the window: all three cleaned' : 'Warming up';
        return `<div class="big">${state}</div>
          <div class="row"><span>Carbon monoxide removed</span><b>${p(e.CO)}</b></div>
          <div class="row"><span>Hydrocarbons removed</span><b>${p(e.HC)}</b></div>
          <div class="row"><span>Nitrogen oxides removed</span><b>${p(e.NOx)}</b></div>
          <div class="row"><span>BS-VI bike limits, g/km</span><b>1.0 · 0.1 · 0.06</b></div>
          <small>Illustrative curves for a typical three-way converter, not a particular one.</small>`;
      },
    };
    return compactReadout(stage, api);
  },
};
