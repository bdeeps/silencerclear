// Chapter 3 (centrepiece): sound and flow. The back-pressure trade-off between silencer designs,
// why one cylinder thumps and four hum, and what decibels mean for your ears.
// Sources: back pressure and spectra from silencer.js (labelled models). Hearing: NIOSH REL 85 dB(A)
// for 8 h with a 3 dB exchange rate (CDC/NIOSH "Understand Noise Exposure"); WHO–ITU H.870 (2022)
// 80 dB(A) for 40 h a week. Distance: a small source spreads out, −6 dB per doubling of distance.
import { THREE, M, rod, tube, box, swarm, approach, clamp } from '../kit.js';
import {
  makeSilencer, GEO, TAU, analyse, waveform, pulseSpectrum, aWeight, firingHz, IDLE, fmtHz, fmtTime, nioshHours,
  loudnessRatio, DESIGNS, backPressure, board, panel, tint, TINT, makeLayout, compactReadout,
} from '../silencer.js';

const U = 5;                    // scene units per metre
const SHOWN = 1 / 12;
const ORDER = { 1: [0], 2: [0, 1], 4: [0, 2, 3, 1] };      // firing order: an inline four fires 1-3-4-2

const designLevel = (key, rpm, cyl) => analyse(rpm, DESIGNS[key].on, cyl).LA1;
const atDistance = (L75, d) => L75 + 20 * Math.log10(7.5 / d);

function drawTrade(g, w, h, st) {
  panel(g, w, h, 'The trade-off: quieter usually means more back pressure');
  const L = 90, R = w - 40, T = 120, B = h - 80;
  const keys = Object.keys(DESIGNS);
  const pts = keys.map((k) => ({ k, x: backPressure(st.rpm, DESIGNS[k].K).kPa, y: st.open - designLevel(k, st.rpm, st.cyl) }));
  const xmax = Math.max(2, ...pts.map((p) => p.x)) * 1.15, ymax = 35;
  const X = (v) => L + (v / xmax) * (R - L), Y = (v) => B - (clamp(v, 0, ymax) / ymax) * (B - T);
  g.font = '25px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)';
  for (let d = 0; d <= 30; d += 10) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, Y(d)); g.lineTo(R, Y(d)); g.stroke(); g.fillText(d + ' dB', 14, Y(d) + 8); }
  g.fillText('↑ quieter than an open pipe', L, T - 20);
  g.fillText(`back pressure, kPa →`, R - 260, B + 40);
  for (let k = 0; k <= xmax; k += xmax > 12 ? 5 : 2) { g.fillText(String(k), X(k) - 5, B + 22); }
  pts.forEach((p) => {
    const on = p.k === st.design;
    g.fillStyle = on ? '#ffb547' : 'rgba(200,205,215,.7)';
    g.beginPath(); g.arc(X(p.x), Y(p.y), on ? 14 : 9, 0, TAU); g.fill();
    g.font = (on ? 'bold ' : '') + '25px sans-serif';
    const t = DESIGNS[p.k].label, tw = g.measureText(t).width;
    g.fillText(t, clamp(X(p.x) + 16, L, R - tw), Y(p.y) - 14);
  });
  g.font = '23px sans-serif'; g.fillStyle = 'rgba(255,255,255,.5)';
  g.fillText('Rough model: loss factors are our assumptions.', 24, h - 12);
}

function drawPulses(g, w, h, st) {
  panel(g, w, h, st.cyl === 1 ? 'One cylinder: a slow, deep thump' : st.cyl === 2 ? 'Two cylinders: twice the beat' : 'Four cylinders: a smooth, higher hum');
  const L = 30, R = w - 30, T = 70, B = 250, mid = (T + B) / 2;
  const wv = st.wave;
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, mid); g.lineTo(R, mid); g.stroke();
  g.strokeStyle = '#ff8a5c'; g.lineWidth = 4; g.beginPath();
  wv.raw.forEach((v, i) => { const x = L + (i / (wv.raw.length - 1)) * (R - L), y = mid - v * (B - T) / 2 * 0.9; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
  g.font = '25px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('pressure, over four crank turns', L, B + 30);
  // Harmonic lines up to 1 kHz, A-weighted.
  const T2 = 340, B2 = h - 50, X = (f) => L + (f / 1000) * (R - L);
  const harm = pulseSpectrum(st.rpm, st.cyl, 1000);
  const top = Math.max(...harm.map((p) => p.L + aWeight(p.f)));
  harm.forEach((p, i) => { const v = clamp((p.L + aWeight(p.f) - (top - 40)) / 40, 0, 1), x = X(p.f); g.strokeStyle = i === 0 ? '#ffb547' : 'rgba(255,181,71,.6)'; g.lineWidth = i === 0 ? 5 : 3; g.beginPath(); g.moveTo(x, B2); g.lineTo(x, B2 - v * (B2 - T2)); g.stroke(); });
  g.fillStyle = 'rgba(255,255,255,.6)'; [0, 500, 1000].forEach((f) => g.fillText(f + ' Hz', clamp(X(f) - 24, L, R - 70), B2 + 24));
  g.fillStyle = '#ffb547'; g.font = 'bold 25px sans-serif'; g.fillText(`harmonics every ${fmtHz(firingHz(st.rpm, st.cyl))}`, L, T2 - 14);
}

export default {
  id: 'flow',
  short: 'Sound and flow',
  title: 'Sound, flow and your ears',
  subtitle: 'Quiet costs back pressure. Cylinders set the pitch. Decibels add up fast.',
  view: { pos: [0.4, 3.4, 7.9], target: [0.35, 2.9, 0] },
  learn: `<p><b>Back pressure.</b> Every wall, hole and bend that stops sound also gets in the way of the gas. The engine has to push a little harder to empty the cylinder, and that pressure is called <b>back pressure</b>. Roughly, the more a silencer quietens, the more it resists. An open pipe is the easiest path and by far the loudest. Engineers design the engine and its silencer <b>together</b>, as one tuned system that meets the noise and emission tests. Swapping the silencer upsets that tuning, and on a road bike in India it is illegal.</p>
    <p><b>Thump or hum?</b> A single-cylinder engine fires once every two turns, so at 3,000 rpm you hear 25 big pulses a second: a deep, slow <b>thump</b>, the sound of India's big singles. Four cylinders share the same work in four smaller pulses, evenly spaced, so the beat is four times faster and the sound becomes a smoother, higher <b>hum</b>. The firing frequency is <b>rpm ÷ 120 × cylinders</b>, and the harmonics stack up at whole-number multiples of it.</p>
    <p><b>Decibels.</b> Sound level uses a log scale: every <b>+10 dB</b> is ten times the sound power and sounds about <b>twice as loud</b> (more in <a href="https://glassbox.how/earclear/">EarClear</a>). Standing closer adds about <b>6 dB each time you halve the distance</b>. For workers, NIOSH sets <b>85 dB(A) for 8 hours</b> and halves the time for every 3 dB more. So at 100 dB(A), the limit is reached in about <b>15 minutes</b>. The damage to hearing is permanent.</p>
    <p class="tip"><b>Try it:</b> switch from one to four cylinders at the same rpm and watch the harmonic lines spread out. Then pick each silencer design and see where it lands on the trade-off. Last, walk closer to the bike with the distance slider.</p>`,
  terms: [
    { t: 'Back pressure', d: 'The extra pressure the engine must push against to drive its exhaust gas out through the pipe and silencer.' },
    { t: 'Firing order', d: 'The order in which the cylinders of a multi-cylinder engine fire, for example 1-3-4-2 for an inline four.' },
    { t: 'Decibel (dB)', d: 'A log scale for sound level. +10 dB is ten times the power and sounds about twice as loud.' },
    { t: 'Exchange rate', d: 'How many dB more halves the safe listening time. NIOSH and WHO use 3 dB.' },
    { t: 'Inverse square law', d: 'Sound from a small source spreads out, so each doubling of distance lowers the level by about 6 dB.' },
  ],
  defaults: { rpm: 3000, cyl: 1, design: 'stock', dist: 7.5 },
  controls: [
    { key: 'rpm', type: 'range', label: 'Engine speed', min: IDLE, max: 9000, step: 50, ends: ['idle', 'revving hard'], fmt: (v) => Math.round(v).toLocaleString('en') + ' rpm' },
    { key: 'cyl', type: 'seg', label: 'Cylinders', options: [{ v: 1, label: 'One' }, { v: 2, label: 'Two' }, { v: 4, label: 'Four' }], fmt: (v, s) => fmtHz(firingHz(s.rpm, v)) },
    { key: 'design', type: 'seg', label: 'Silencer design (in the model)', options: Object.entries(DESIGNS).map(([v, d]) => ({ v, label: { open: 'Open', straight: 'Straight', stock: 'Stock', baffled: 'Baffled' }[v] })) },
    { key: 'dist', type: 'log', label: 'Your distance from the bike', min: 0.5, max: 30, ends: ['0.5 m', '30 m'], fmt: (v) => (v < 2 ? v.toFixed(1) : Math.round(v)) + ' m' },
  ],
  quiz: [
    { q: 'A twin and a single both run at 4,800 rpm. How do their firing frequencies compare?', options: ['The same', 'The twin’s is double: 80 Hz against 40 Hz', 'The twin’s is half', 'The twin’s is four times'], answer: 1, why: 'f = rpm ÷ 120 × cylinders: 40 Hz for the single, 80 Hz for the twin.' },
    { q: 'Why can’t you simply make a silencer as quiet as you like?', options: ['It would get too cold', 'More silencing usually means more back pressure for the engine to push against', 'Sound can’t be reduced', 'It would weigh nothing'], answer: 1, why: 'The walls, holes and chambers that stop sound also resist the gas. Designers balance the two.' },
    { q: 'Under the NIOSH rule, 85 dB(A) is allowed for 8 hours. How long is 91 dB(A) allowed?', options: ['4 hours', '2 hours', '6 hours', '8 hours'], answer: 1, why: 'Each 3 dB halves the time: 88 dB(A) for 4 h, 91 dB(A) for 2 h.' },
  ],
  reel: [
    { ms: 5200, caption: 'One cylinder thumps; four cylinders share the work and hum four times faster.', set: { rpm: 3000, design: 'stock', dist: 7.5 }, anim: { cyl: [1, 4] }, spin: 0 },
    { ms: 5400, caption: 'Quieter usually means more back pressure, so engine and silencer are designed together.', set: { rpm: 6000, cyl: 1, dist: 7.5 }, anim: { design: ['open', 'baffled'] }, spin: 0 },
  ],
  onChange(s, key) { if (key === 'cyl') s.cyl = s.cyl < 1.5 ? 1 : s.cyl < 3 ? 2 : 4; },

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const row = new THREE.Group(); row.position.set(1.0, -0.15, 0); root.add(row);
    // Engines with 1, 2 or 4 cylinders, each with its own header, merging into one pipe.
    const engines = {};
    const pipeMat = M.metal(0xa9aeb6, { side: THREE.DoubleSide });
    for (const n of [1, 2, 4]) {
      const eg = new THREE.Group(); row.add(eg); engines[n] = eg;
      const W = 0.55 * n;
      const blk = box(0.8, 0.8, W + 0.2, M.metal(0x8c939d)); blk.position.set(-4.1, 3.2, 0); eg.add(blk);
      const paths = [];
      for (let j = 0; j < n; j++) {
        const z = (j - (n - 1) / 2) * 0.55;
        for (let fn = 0; fn < 5; fn++) { const fin = box(0.85, 0.04, 0.45, M.metal(0x9aa1ab)); fin.position.set(-4.1, 3.7 + fn * 0.1, z); eg.add(fin); }
        const pts = [[-3.7, 3.3, z], [-3.3, 3.0, z * 0.8], [-2.9, 2.75, z * 0.3], [-2.5, 2.7, 0], [-2.2, 2.7, 0]].map((p) => new THREE.Vector3(...p));
        eg.add(tube(pts, 0.07, pipeMat, false, 40));
        paths.push(new THREE.CatmullRomCurve3(pts));
      }
      eg.userData.paths = paths;
    }
    // The shared pipe and the silencer (cut open), 5 units per metre.
    const sil = makeSilencer(); const sg = sil.group; sg.scale.setScalar(U); sg.position.set(-1.6, 2.7, 0); row.add(sg);
    sil.setCut(1); sil.shield.visible = false;
    { const stub = rod(-2.25, -1.85, 0.07, 0.07, pipeMat, 20, true); stub.position.y = 2.7; row.add(stub); }
    const bare = rod(-1.9, 1.0, 0.07, 0.07, pipeMat, 20, true); bare.position.y = 2.7; row.add(bare);
    const extra = new THREE.Mesh(new THREE.RingGeometry(GEO.pipeD / 2, GEO.canD / 2 * 0.97, 40).rotateY(Math.PI / 2), M.metal(0xc9ced6, { side: THREE.DoubleSide })); extra.position.x = 0.09; sg.add(extra);
    const lab = tint(stage.label('', [0.24, 0.1, 0], sg), TINT.hot);
    const lEng = stage.label('', [-3.0, 3.35, 0.6], row);
    // Boards.
    const st = { rpm: 3000, cyl: 1, design: 'stock', open: 0, wave: waveform(3000, {}, 1, 300, 2) };
    const b1 = board(root, 3.6, 2.16, 1000, 600, (g, w, h) => drawTrade(g, w, h, st)); b1.mesh.position.set(2.25, 1.2, 0.2);
    const b2 = board(root, 3.6, 2.16, 1000, 600, (g, w, h) => drawPulses(g, w, h, st)); b2.mesh.position.set(-1.55, 1.2, 0.2);
    // Pulse dots: each cylinder sends a bunch down its own header at its turn, then the shared pipe.
    const N = 240;
    const dots = swarm(N, new THREE.SphereGeometry(0.035, 8, 6), M.glow(0xff8a5c, { transparent: true, opacity: 0.9 })); dots.castShadow = false; row.add(dots);
    const rnd = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9898) * 0.5 + 0.5, Math.sin(i * 78.233) * 0.5 + 0.5]);
    const fit = makeLayout(stage, { pos: [-0.3, 5.6, 8.0], target: [-0.3, 5.3, 0] });
    let cycle = 0, key = '', rpmNow = 3000;
    const v = new THREE.Vector3();

    const api = {
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fit();
        row.position.set(narrow ? 0.3 : 1.0, narrow ? 6.5 : -0.15, 0);
        b1.mesh.position.set(narrow ? -0.3 : 2.25, narrow ? 6.0 : 1.2, 0.2); b1.mesh.scale.setScalar(narrow ? 1.75 : 1);
        b2.mesh.position.set(narrow ? -0.3 : -1.55, narrow ? 2.0 : 1.2, 0.2); b2.mesh.scale.setScalar(narrow ? 1.75 : 1);
        rpmNow = approach(rpmNow, s.rpm, 4, dt);
        const cyl = s.cyl < 1.5 ? 1 : s.cyl < 3 ? 2 : 4;
        const design = DESIGNS[s.design] ? s.design : 'stock';
        const k = Math.round(rpmNow / 25) + '|' + cyl + design;
        if (k !== key) {
          key = k; Object.assign(st, { rpm: rpmNow, cyl, design, open: analyse(rpmNow, {}, cyl).LA0, wave: waveform(rpmNow, {}, cyl, 300, 2 * cyl) });
          b1.redraw(); b2.redraw();
        }
        for (const n of [1, 2, 4]) engines[n].visible = n === cyl;
        // Silencer shape for each design (in the model only).
        const on = DESIGNS[design].on;
        sg.visible = design !== 'open'; bare.visible = design === 'open';
        sil.baffles.forEach((b) => { b.visible = !!on.chambers; });
        sil.inlet.children[1].visible = !!on.chambers; sil.neck.visible = !!on.resonator; extra.visible = !!on.extra;
        sil.packing.visible = !!on.packing;
        lab.element.textContent = DESIGNS[design].label; lab.visible = design !== 'open';
        lEng.element.textContent = cyl === 1 ? 'Single: one pulse every 2 turns' : cyl === 2 ? 'Twin: a pulse every turn' : 'Four: a pulse every half turn';
        lEng.visible = !narrow;
        // Engine cycles (two crank turns each), shown slowed down.
        cycle += (rpmNow / 120) * SHOWN * dt;
        const paths = engines[cyl].userData.paths, per = Math.floor(N / 4);
        for (let i = 0; i < N; i++) {
          const b = Math.floor(i / 24) % 10;                     // ten bunches in flight
          const fire = ORDER[cyl];
          const slot = Math.floor(cycle * cyl) - b;              // which pulse this bunch is
          const j = fire[((slot % cyl) + cyl) % cyl];
          const age = (cycle * cyl - Math.floor(cycle * cyl) + b) / cyl;   // engine cycles since that pulse left
          const u = age * 0.5 + rnd[i][0] * 0.03;
          if (u < 0.3) { paths[j].getPointAt(clamp(u / 0.3, 0, 1), v); }
          else { const x = -2.2 + (u - 0.3) * 6.5; v.set(x, 2.7, 0); }
          const sp = 0.05;
          dots.place(i, [v.x, v.y + (rnd[i][1] - 0.5) * sp, v.z + (rnd[i][0] - 0.5) * sp], null, u > 0.95 || v.x > 1.3 ? 0.001 : 1);
        }
        dots.done();
        void per;
      },
      readout: (s) => {
        const cyl = st.cyl, d = DESIGNS[st.design], L75 = designLevel(st.design, st.rpm, cyl), Ld = atDistance(L75, s.dist);
        const bp = backPressure(st.rpm, d.K), stock = designLevel('stock', st.rpm, cyl), dL = L75 - stock;
        const rel = Math.abs(dL) < 1 ? 'same as stock' : dL > 0 ? `about ${loudnessRatio(dL).toFixed(1)}× as loud as stock` : `about ${(1 / loudnessRatio(dL)).toFixed(1)}× quieter than stock`;
        return `<div class="big">${Math.round(Ld)} dB(A) at ${s.dist < 10 ? s.dist.toFixed(1) : Math.round(s.dist)} m</div>
          <div class="row"><span>Firing frequency</span><b>${fmtHz(firingHz(st.rpm, cyl))} (${cyl} cyl.)</b></div>
          <div class="row"><span>${d.label}</span><b>${rel}</b></div>
          <div class="row"><span>Back pressure (rough)</span><b>${bp.kPa.toFixed(bp.kPa < 1 ? 2 : 1)} kPa</b></div>
          <div class="row"><span>NIOSH limit at this level</span><b>${Ld < 80 ? 'no limit needed' : fmtTime(nioshHours(Ld))}</b></div>
          <small>Labelled model: 150 cc in total, levels calibrated to typical values. Not tuning advice.</small>`;
      },
    };
    return compactReadout(stage, api);
  },
};
