// Chapter 2 (centrepiece): taming the pulse. Rev the engine, switch the silencer's three tricks
// in and out, and see the pressure pulses and the A-weighted spectrum before and after.
// Physics and sources: see silencer.js (expansion-chamber TL, Helmholtz side branch, Sabine's
// lined-duct formula, IEC 61672 A-weighting, c = √(γRT)).
import { THREE, M, rod, swarm, approach, clamp, smooth } from '../kit.js';
import {
  makeSilencer, GEO, TAU, analyse, waveform, BANDS, aWeight, firingHz, IDLE, fmtHz, loudnessRatio,
  board, panel, tint, TINT, makeLayout, compactReadout, narrowStage,
} from '../silencer.js';

const U = 10;                         // scene units per metre for the big cut-open silencer
const SHOWN = 1 / 12;                 // pulses shown 12 times slower than real

function drawWave(g, w, h, st) {
  panel(g, w, h, 'Pressure pulses at the tailpipe');
  const L = 30, R = w - 24, T = 70, B = h - 40, mid = (T + B) / 2, amp = (B - T) / 2 * 0.9;
  g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, mid); g.lineTo(R, mid); g.stroke();
  const line = (arr, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); arr.forEach((v, i) => { const x = L + (i / (arr.length - 1)) * (R - L), y = mid - v * amp; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
  line(st.wave.raw, 'rgba(200,205,215,.55)', 3);
  line(st.wave.out, '#ffb547', 5);
  // Moving cursor in step with the animation.
  const cx = L + (st.ph % 2) / 2 * (R - L);
  g.strokeStyle = 'rgba(142,240,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, T); g.lineTo(cx, B); g.stroke();
  g.font = '27px sans-serif'; g.fillStyle = 'rgba(200,205,215,.8)'; g.fillText('no silencer', L + 4, h - 12);
  g.fillStyle = '#ffb547'; g.fillText('after the silencer', L + 170, h - 12);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(`two pulses: ${(2000 / st.f1).toFixed(st.f1 > 40 ? 1 : 0)} ms`, R - 250, h - 12);
}

function drawSpectrum(g, w, h, st) {
  panel(g, w, h, 'Sound spectrum, A-weighted, 7.5 m away');
  const L = 90, R = w - 24, T = 74, B = h - 64, lo = 20, hi = 110;
  const Y = (db) => B - ((clamp(db, lo, hi) - lo) / (hi - lo)) * (B - T);
  g.font = '24px sans-serif';
  for (let d = 30; d <= 110; d += 40) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, Y(d)); g.lineTo(R, Y(d)); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText(String(d), 30, Y(d) + 8); }
  const n = BANDS.length, bw = (R - L) / n;
  const X = (f) => L + (Math.log(f / BANDS[0]) / Math.log(BANDS[n - 1] / BANDS[0])) * (R - L - bw) + bw / 2;
  BANDS.forEach((fc, i) => {
    const a = aWeight(fc), x = L + i * bw;
    const b0 = st.an.before[i] + a, b1 = st.an.after[i] + a;
    g.fillStyle = 'rgba(200,205,215,.22)'; g.fillRect(x + 3, Y(b0), bw - 6, B - Y(b0));
    g.fillStyle = '#ffb547'; g.fillRect(x + 7, Y(b1), bw - 14, B - Y(b1));
    if ([0, 6, 12, 18].includes(i)) { g.fillStyle = 'rgba(255,255,255,.55)'; const s = fmtHz(fc); g.fillText(s, x + bw / 2 - g.measureText(s).width / 2, B + 24); }
  });
  // Markers: the resonator's tuned note and the first chamber's first pass band.
  const mark = (f, col, text, row) => { if (f < BANDS[0] || f > BANDS[n - 1]) return; const x = X(f); g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(x, T); g.lineTo(x, B); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.font = 'bold 23px sans-serif'; g.fillText(text, clamp(x - 40, L, R - 230), T + 24 + row * 28); };
  if (st.on.resonator) mark(st.an.fres, '#ff8a5c', 'resonator ' + fmtHz(st.an.fres), 0);
  if (st.on.chambers) mark(st.an.c / (2 * (GEO.A[1] - GEO.A[0])), '#8ef0ff', 'chamber 1 pass band', 1);
  g.font = '24px sans-serif'; g.fillStyle = 'rgba(255,255,255,.65)';
  g.fillText(`grey: none ${st.an.LA0.toFixed(0)} dB(A)   orange: with it ${st.an.LA1.toFixed(0)} dB(A)`, L, h - 10);
}

export default {
  id: 'pulse',
  short: 'Taming the pulse',
  title: 'Taming the pulse',
  subtitle: 'Bounce it back, cancel one note, soak up the rest.',
  view: { pos: [0.4, 3.3, 8.6], target: [0.4, 2.85, 0] },
  learn: `<p>Each time the exhaust valve opens, a blast of hot gas at several times the pressure of the air bursts out. That is a <b>pressure pulse</b>. A single-cylinder four-stroke fires once every two turns, so it sends <b>rpm ÷ 120</b> pulses a second: 10 at a 1,200 rpm idle, 50 at 6,000 rpm. Each pulse is sharp, so besides that <b>firing frequency</b> it carries a ladder of <b>harmonics</b> at 2, 3, 4… times it. Without a silencer you would hear a deafening <b>bang-bang-bang</b>.</p>
    <p>The silencer can't stop the gas, so it attacks the sound in three ways:</p>
    <p><b>1. Reflect it (reactive).</b> Where a narrow pipe opens into a wide <b>expansion chamber</b>, most of the sound wave bounces back towards the engine, like an echo off a cliff (see <a href="https://glassbox.how/waveclear/">WaveClear</a>). The model uses the textbook formula <b>TL = 10 log₁₀[1 + ¼(m − 1/m)² sin²(kL)]</b>, where m is how many times wider the chamber is and L its length. It works best when the chamber is a quarter wavelength long and not at all at whole half wavelengths: the <b>pass bands</b>.</p>
    <p><b>2. Cancel one note (resonator).</b> A closed room joined by a neck is a <b>Helmholtz resonator</b>, like blowing across a bottle (see <a href="https://glassbox.how/resonanceclear/">ResonanceClear</a>). At its own note, <b>f = (c/2π)√(A ÷ (V·L))</b>, it swings so hard that it sends back a wave that cancels the incoming one. It is tuned to a troublesome low hum.</p>
    <p><b>3. Soak it up (absorptive).</b> In the <b>packing</b>, air squeezes back and forth through tiny gaps between fibres, and friction turns the sound into a little heat. It is great at high pitches and weak at low ones.</p>
    <p>All of this happens in very hot gas, where sound is faster: <b>c = √(γRT)</b> gives about <b>560 m/s</b> at 550 °C, against 343 m/s in a cool room. So every wavelength is longer and the chambers have to be sized for the hot gas, not for air.</p>
    <p class="tip"><b>Try it:</b> rev from idle to 9,000 rpm, then switch each trick off in turn. Watch which part of the spectrum jumps back up. (Switching parts off happens only in the model: on a real bike that is illegal.)</p>`,
  terms: [
    { t: 'Firing frequency', d: 'How many exhaust pulses leave each second. For a four-stroke: rpm ÷ 120 × the number of cylinders.' },
    { t: 'Harmonics', d: 'Sounds at 2, 3, 4… times the firing frequency that come from each pulse being short and sharp.' },
    { t: 'Transmission loss', d: 'How many decibels weaker sound is after passing through a silencer part.' },
    { t: 'Expansion chamber', d: 'A sudden widening of the pipe. The jump in size reflects much of the sound back.' },
    { t: 'Helmholtz resonator', d: 'A cavity with a neck that rings at one note. Fitted to a pipe, it cancels that note.' },
    { t: 'A-weighting', d: 'A correction that makes a sound meter hear like a human ear: it counts low and very high pitches less. Written dB(A).' },
  ],
  defaults: { rpm: 6000, chambers: true, resonator: true, packing: true },
  controls: [
    { key: 'rpm', type: 'range', label: 'Engine speed', min: IDLE, max: 9000, step: 50, ends: ['idle', 'revving hard'], fmt: (v) => Math.round(v).toLocaleString('en') + ' rpm' },
    { key: 'chambers', type: 'toggle', label: '1. Expansion chambers (reflect)' },
    { key: 'resonator', type: 'toggle', label: '2. Helmholtz resonator (cancel one note)' },
    { key: 'packing', type: 'toggle', label: '3. Packing (soak up)' },
  ],
  quiz: [
    { q: 'A single-cylinder four-stroke runs at 6,000 rpm. What is its firing frequency?', options: ['6,000 Hz', '100 Hz', '50 Hz', '12 Hz'], answer: 2, why: '6,000 rpm is 100 turns a second, and it fires every second turn: 50 pulses a second, 50 Hz.' },
    { q: 'Which silencer trick works best on high-pitched hiss and worst on low booms?', options: ['Expansion chambers', 'A Helmholtz resonator', 'Absorptive packing', 'The heat shield'], answer: 2, why: 'Fibrous packing absorbs well once the wavelength is short compared with its thickness, so it shines at high pitches.' },
    { q: 'Why is sound faster inside a silencer than in the street?', options: ['The gas is moving', 'The gas is very hot', 'The pipe is metal', 'It is not faster'], answer: 1, why: 'Sound speed grows with the square root of temperature: about 560 m/s in gas at 550 °C against 343 m/s in air at 20 °C.' },
  ],
  reel: [
    { ms: 5400, caption: 'Each firing sends a pressure pulse down the pipe: 50 a second at 6,000 rpm.', set: { chambers: false, resonator: false, packing: false }, anim: { rpm: [1500, 6000] }, spin: 0 },
    { ms: 5800, caption: 'Chambers reflect it, a resonator cancels one note and packing soaks up the rest.', set: { rpm: 6000, chambers: true, resonator: true, packing: true }, anim: {}, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const sil = makeSilencer();
    const sg = sil.group; sg.scale.setScalar(U); sg.position.set(-1.45, 3.15, 0); root.add(sg);
    sil.setCut(1); sil.shield.visible = false;
    // A stub of header pipe coming in from the engine side.
    sg.add(rod(-0.22, -0.06, GEO.pipeD / 2, GEO.pipeD / 2, M.metal(0x9ea3ab, { side: THREE.DoubleSide }), 24, true));
    // A ghost straight pipe that stands in when the chambers are switched off in the model.
    const ghost = rod(0.0, GEO.R[0], GEO.pipeD / 2, GEO.pipeD / 2, M.ghost(0x8ef0ff, 0.25), 24, true); sg.add(ghost);
    const L = (t, pos, col) => tint(stage.label(t, pos, sg), col);
    const tags = [
      L('From the engine', [-0.16, -0.035, 0]),
      L('1. Chambers reflect', [0.13, -0.075, 0], TINT.cool),
      L('2. Resonator cancels one note', [0.33, 0.075, 0], TINT.hot),
      L('3. Packing soaks up', [0.43, -0.075, 0], TINT.pack),
      L('Out', [0.53, -0.03, 0]),
    ];
    // Boards.
    const st = { an: analyse(6000), wave: waveform(6000, { chambers: true, resonator: true, packing: true }), on: {}, ph: 0, f1: 50 };
    const b1 = board(root, 4.2, 2.1, 1000, 500, (g, w, h) => drawWave(g, w, h, st)); b1.mesh.position.set(-1.6, 1.45, 0.2);
    const b2 = board(root, 4.2, 2.1, 1000, 500, (g, w, h) => drawSpectrum(g, w, h, st)); b2.mesh.position.set(2.75, 1.45, 0.2);
    // Gas dots: bunches, one per pulse, that smear out once the chambers are in.
    const N = 220, NB = 11;
    const dots = swarm(N, new THREE.SphereGeometry(0.0035, 8, 6), M.glow(0xff8a5c, { transparent: true, opacity: 0.9 }));
    dots.castShadow = false; sg.add(dots);
    const rnd = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9898) * 0.5 + 0.5, Math.sin(i * 78.233) * 0.5 + 0.5, Math.sin(i * 39.425) * 0.5 + 0.5]);
    const X0 = -0.22, X1 = GEO.len + 0.06;
    const fit = makeLayout(stage, { pos: [0.15, 4.9, 7.8], target: [0.15, 4.6, 0] });
    let phase = 0, key = '', rpmNow = 6000, drawn = 0;

    const api = {
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fit();
        sg.position.set(-1.45, narrow ? 8.3 : 3.15, 0);
        b1.mesh.position.set(narrow ? 0.15 : -1.6, narrow ? 5.4 : 1.45, 0.2); b1.mesh.scale.setScalar(narrow ? 1.55 : 1);
        b2.mesh.position.set(narrow ? 0.15 : 2.75, narrow ? 1.85 : 1.45, 0.2); b2.mesh.scale.setScalar(narrow ? 1.55 : 1);
        rpmNow = approach(rpmNow, s.rpm, 4, dt);
        const on = { chambers: s.chambers, resonator: s.resonator, packing: s.packing };
        const k = Math.round(rpmNow / 25) + '|' + +on.chambers + +on.resonator + +on.packing;
        if (k !== key) { key = k; st.an = analyse(rpmNow, on); st.wave = waveform(rpmNow, on); st.on = on; st.f1 = firingHz(rpmNow); b2.redraw(); }
        phase += st.f1 * SHOWN * dt;
        st.ph = phase;
        drawn += dt; if (drawn > 1 / 20) { drawn = 0; b1.redraw(); }
        // Parts in and out of the model.
        sil.baffles[0].visible = on.chambers; sil.inlet.children[1].visible = on.chambers;
        ghost.visible = !on.chambers;
        sil.neck.visible = on.resonator;
        sil.packing.visible = on.packing;
        // The resonator chamber glows when one of the harmonics sits near its note.
        let best = 99; for (let n = 1; n < 12; n++) best = Math.min(best, Math.abs(Math.log((n * st.f1) / st.an.fres)));
        sil.resGlow.material.opacity = on.resonator ? 0.08 + 0.3 * Math.exp(-best * best / 0.01) * (0.6 + 0.4 * Math.sin(phase * TAU)) : 0;
        tags[1].visible = on.chambers; tags[2].visible = on.resonator; tags[3].visible = on.packing;
        tags.forEach((l, i) => { if (narrow && (i === 0 || i === 4)) l.visible = false; });
        // Dots.
        for (let i = 0; i < N; i++) {
          const b = i % NB, base = ((phase + b) / NB) % 1;
          let x = X0 + base * (X1 - X0);
          const inA = x > 0.03, smear = on.chambers ? smooth((x - 0.03) / 0.12) : 0;
          x += (rnd[i][0] - 0.5) * (0.008 + smear * 0.09);
          const wide = on.chambers && x > 0.03 && x < 0.19 ? GEO.canD / 2 * 0.85 : on.chambers && x >= 0.19 && x < 0.21 ? GEO.canD / 2 * 0.6 : GEO.pipeD / 2 * 0.75;
          const a = rnd[i][1] * TAU + phase * 0.3, rr = wide * Math.sqrt(rnd[i][2]);
          const fade = inA && on.packing && x > GEO.C[0] ? 0.75 : 1;
          dots.place(i, [x, Math.cos(a) * rr, Math.sin(a) * rr], null, fade);
        }
        dots.done();
      },
      readout: (s) => {
        const an = st.an, dL = an.LA0 - an.LA1;
        return `<div class="big">${an.LA1.toFixed(0)} dB(A) with the silencer</div>
          <div class="row"><span>Without it</span><b>${an.LA0.toFixed(0)} dB(A), ${dL >= 1 ? 'about ' + loudnessRatio(dL).toFixed(dL > 20 ? 0 : 1) + '× as loud' : 'no quieter'}</b></div>
          <div class="row"><span>Firing frequency</span><b>${an.f1.toFixed(an.f1 < 20 ? 1 : 0)} Hz (${Math.round(s.rpm).toLocaleString('en')} ÷ 120)</b></div>
          <div class="row"><span>Gas ${Math.round(an.tC / 10) * 10} °C, sound speed</span><b>${Math.round(an.c)} m/s</b></div>
          <div class="row"><span>Resonator tuned to</span><b>${fmtHz(an.fres)}</b></div>
          <small>Sound 7.5 m away, from our labelled model; real bikes differ. Pulses shown 12× slower.</small>`;
      },
    };
    return compactReadout(stage, api);
  },
};
