// Chapter 5: silencers, safety and the law. A pass-by noise test in the style of IS 3028 / ISO 362:
// microphones 7.5 m either side of the lane, full throttle between two lines 10 m before and after
// them, and the loudest reading is compared with the limit.
// Sources:
//  - Limits at manufacture for two-wheelers: Environment (Protection) Rules, 1986, Schedule VI Part E,
//    as amended by G.S.R. 742(E) of 25 Sep 2000 (from 1 Jan 2003) and again in 2005 (from 1 April
//    2005): up to 80 cc 75 dB(A); over 80 cc up to 175 cc 77 dB(A); over 175 cc 80 dB(A). Test method
//    IS 3028:1998. (Values seen in MoEF notification copies via search; the IISc mirror failed TLS.)
//  - Pass-by geometry (7.5 m, ±10 m acceleration zone, 1.2 m mic height): ISO 362 family, which
//    IS 3028 follows (from memory; see the report).
//  - Enforcement: Motor Vehicles Act 1988 s.52 (alterations) and s.190(2) (noise and air pollution
//    standards; fines raised by the 2019 amendment, reported as up to ₹10,000), as described in news
//    reports of police drives in Bengaluru (2017), Hyderabad, Nagpur (Jan 2025) and Gurugram (Feb 2025).
//  - Burns: Jawaharlal Nehru Medical College, Aligarh: silencer burns were about 4.3% of 2,522 burn
//    admissions in 2008–2012, mostly pillion riders, more in hot months (abstract, via search).
//    Skin injury vs temperature: Moritz & Henriques, Am J Pathol 23:695 (1947): about 44 °C needs
//    hours, 70 °C burns in about a second.
//  - EV sound: Central Motor Vehicles (1st Amendment) Rules, 2026 (MoRTH, 6 Jan 2026): AVAS (AIS-173)
//    for electric M and N category vehicles, new models from 1 Oct 2026, all from 1 Oct 2027; two-
//    wheelers not covered so far (news summaries).
//  - Electric two-wheeler pass-by level: our estimate (tyre and motor noise only).
import { THREE, M, box, clamp } from '../kit.js';
import { makeBike, analyse, DESIGNS, INDIA_LIMITS, loudnessRatio, nioshHours, fmtTime, board, panel, tint, TINT, makeLayout, compactReadout } from '../silencer.js';

const RUN = { x0: -22, x1: 22, aa: -10, bb: 10, mic: 7.5 };
const LOUD = { packing: true, packL: 0.12 };          // an illustrative loud, tampered or aftermarket can
// Engine speed through the run: steady approach, then full throttle from AA′ to BB′ (our assumed gearing).
const rpmAtX = (x) => (x < RUN.aa ? 3600 : x < RUN.bb ? 3600 + (x - RUN.aa) / (RUN.bb - RUN.aa) * 2600 : 6200 - Math.min(2500, (x - RUN.bb) * 250));
const kmhAtX = (x) => (x < RUN.aa ? 50 : x < RUN.bb ? 50 + (x - RUN.aa) / (RUN.bb - RUN.aa) * 12 : 62);
function sourceLevel(kind, x) {
  const rpm = rpmAtX(x);
  if (kind === 'electric') return 62 + 30 * Math.log10(kmhAtX(x) / 50);
  return analyse(rpm, kind === 'loud' ? LOUD : DESIGNS.stock.on).LA1 - (x > RUN.bb ? 6 : 0);   // throttle shut after BB'
}
const micLevel = (kind, x) => sourceLevel(kind, x) + 20 * Math.log10(RUN.mic / Math.hypot(RUN.mic, x));

function drawTrace(g, w, h, st) {
  panel(g, w, h, 'Pass-by test: level at the microphone');
  const L = 90, R = w - 30, T = 80, B = h - 70, lo = 50, hi = 100;
  const X = (x) => L + ((x - RUN.x0) / (RUN.x1 - RUN.x0)) * (R - L), Y = (v) => B - ((clamp(v, lo, hi) - lo) / (hi - lo)) * (B - T);
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(X(RUN.aa), T, X(RUN.bb) - X(RUN.aa), B - T);
  g.font = '24px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)';
  [60, 80, 100].forEach((d) => { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, Y(d)); g.lineTo(R, Y(d)); g.stroke(); g.fillText(d, 30, Y(d) + 8); });
  g.fillText('AA′', X(RUN.aa) - 20, B + 32); g.fillText('mic', X(0) - 18, B + 32); g.fillText('BB′', X(RUN.bb) - 20, B + 32);
  g.fillText('full throttle', X(RUN.aa) + 40, T + 28);
  g.strokeStyle = '#ff5a6a'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(L, Y(st.limit)); g.lineTo(R, Y(st.limit)); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#ff5a6a'; g.font = 'bold 24px sans-serif'; g.fillText(`limit ${st.limit} dB(A)`, R - 190, Y(st.limit) - 10);
  g.strokeStyle = st.kind === 'loud' ? '#ff8a5c' : st.kind === 'electric' ? '#8ef0ff' : '#ffb547'; g.lineWidth = 5; g.beginPath();
  let started = false;
  for (let x = RUN.x0; x <= Math.min(st.x, RUN.x1); x += 0.5) { const y = Y(micLevel(st.kind, x)); started ? g.lineTo(X(x), y) : g.moveTo(X(x), y); started = true; }
  g.stroke();
  if (st.peak > 0) { g.fillStyle = '#ffffff'; g.font = 'bold 26px sans-serif'; g.fillText(`highest so far: ${st.peak.toFixed(1)} dB(A)`, L, h - 18); }
}

export default {
  id: 'law',
  short: 'Safety and the law',
  title: 'Loud silencers, hot pipes and the law',
  subtitle: 'How noise is tested, why loud cans are illegal, and why pipes burn.',
  view: { pos: [1.2, 10.5, 15.5], target: [1.2, 1.6, -2.5] },
  learn: `<p><b>The test.</b> Before a new two-wheeler can be sold in India it must pass a <b>pass-by noise test</b> (Indian Standard <b>IS 3028</b>). The bike rides down a lane, opens the throttle fully between two lines 10 m before and after a pair of microphones standing <b>7.5 m</b> to each side, and the loudest A-weighted reading counts. Under the <b>Environment (Protection) Rules, 1986</b>, the limits since 2003 are <b>75 dB(A)</b> up to 80 cc, <b>77 dB(A)</b> from 80 to 175 cc and <b>80 dB(A)</b> above 175 cc. Europe uses a similar test under UN Regulation 41.</p>
    <p><b>Why loud cans are illegal.</b> A bike is approved with its own silencer. Removing baffles or packing, or fitting a loud aftermarket silencer, changes an approved vehicle and breaks the noise standards. In India this is an offence under the <b>Motor Vehicles Act</b>, and police in cities such as Bengaluru, Hyderabad, Nagpur and Gurugram run drives that fine riders, reported at up to ₹10,000 under section 190(2), and crush seized silencers by the hundred. Tampering with the catalytic converter is illegal too. Beyond the fines, it <b>harms hearing</b>: the rider's, the pillion's and everyone's on the street. Each +10 dB sounds twice as loud, and the damage from loud noise is permanent.</p>
    <p><b>Hot pipes burn.</b> The header and silencer get hot enough to burn skin in an instant, and stay hot for a while after the ride. Skin is hurt slowly at about 44 °C and burns in about a second at 70 °C. A hospital in Aligarh found silencer burns were about 4% of its burn admissions, mostly <b>pillion riders</b> getting on or off. The perforated <b>heat shield</b> keeps a gap of air between leg and metal. Mount and dismount from the left, wear long trousers and keep children's legs clear.</p>
    <p><b>Electric bikes.</b> An electric two-wheeler has no exhaust at all: you hear mostly tyres and a faint whine (see <a href="https://glassbox.how/escooterclear/">EScooterClear</a>). Being so quiet can be risky for people on foot, so from October 2026 India requires new electric cars, buses and trucks to play a warning sound at low speed (AIS-173). Two-wheelers are not included yet.</p>
    <p class="tip"><b>Try it:</b> run the test with the stock silencer, then with a loud one, and compare the peak with the limit. Then try an electric bike.</p>`,
  terms: [
    { t: 'Pass-by test', d: 'A noise test where a vehicle accelerates past microphones 7.5 m away and the loudest reading is recorded.' },
    { t: 'dB(A)', d: 'Decibels with A-weighting, which counts pitches the way the human ear hears them.' },
    { t: 'Type approval', d: 'Testing a vehicle model against the rules before it may be sold. In India ARAI and ICAT do this.' },
    { t: 'Heat shield', d: 'A perforated cover with an air gap that keeps skin away from the hot pipe or silencer.' },
    { t: 'AVAS', d: 'Acoustic vehicle alerting system: a speaker that makes a quiet electric vehicle audible at low speed.' },
  ],
  defaults: { kind: 'stock', cc: 1, run: 0 },
  controls: [
    { key: 'kind', type: 'seg', label: 'Bike on test', options: [{ v: 'stock', label: 'Stock silencer' }, { v: 'loud', label: 'Loud, tampered' }, { v: 'electric', label: 'Electric' }] },
    { key: 'cc', type: 'seg', label: 'Engine class for the limit', options: INDIA_LIMITS.map((l, i) => ({ v: i, label: l.label })), fmt: (v) => INDIA_LIMITS[v].L + ' dB(A)' },
    { key: 'go', type: 'buttons', label: 'Test run', items: [{ label: '▶ Run the test again', act: (s, inst) => inst.restart?.() }] },
  ],
  quiz: [
    { q: 'How far from the lane are the microphones in a pass-by test?', options: ['0.5 m', '2 m', '7.5 m', '50 m'], answer: 2, why: 'They stand 7.5 m to each side of the vehicle’s path, about 1.2 m off the ground.' },
    { q: 'What is India’s noise limit for a new 150 cc motorcycle?', options: ['65 dB(A)', '77 dB(A)', '90 dB(A)', 'There is none'], answer: 1, why: 'Two-wheelers over 80 cc and up to 175 cc must stay at or below 77 dB(A) in the IS 3028 test.' },
    { q: 'Who gets silencer burns most often, according to an Indian hospital study?', options: ['The rider’s hands', 'Pillion riders’ legs', 'Mechanics', 'Pedestrians'], answer: 1, why: 'Pillion riders brush the hot can with their legs while getting on and off. Long trousers and the heat shield help.' },
  ],
  reel: [
    { ms: 5600, caption: 'In India a new 150 cc bike must stay under 77 dB(A) in a full-throttle pass-by test.', set: { kind: 'stock', cc: 1 }, anim: { run: [0, 1] }, spin: 0, act: (s, inst) => inst.restart?.() },
    { ms: 5400, caption: 'Loud, tampered silencers are illegal in India: they fail the test and damage hearing.', set: { kind: 'loud', cc: 1 }, anim: { run: [0, 1] }, spin: 0, act: (s, inst) => inst.restart?.() },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // Lane, lines AA′ and BB′, two microphones on stands.
    const lane = box(RUN.x1 - RUN.x0 + 8, 0.02, 3, M.matte(0x2a2f39)); lane.position.y = 0.01; lane.receiveShadow = true; root.add(lane);
    for (const x of [RUN.aa, RUN.bb]) { const ln = box(0.25, 0.03, 3.2, M.glow(0xffffff)); ln.position.set(x, 0.02, 0); root.add(ln); }
    const centre = box(RUN.x1 - RUN.x0 + 8, 0.025, 0.12, M.glow(0x6b7280)); centre.position.y = 0.015; root.add(centre);
    const mics = [];
    for (const z of [-RUN.mic, RUN.mic]) {
      const m = new THREE.Group(); m.position.set(0, 0, z); root.add(m);
      const pole = box(0.12, 1.2, 0.12, M.metal(0x9aa1ab)); pole.position.y = 0.6; m.add(pole);
      for (let k = 0; k < 3; k++) { const leg = box(0.08, 0.08, 1.0, M.metal(0x9aa1ab)); leg.position.set(Math.cos(k * 2.1) * 0.35, 0.05, Math.sin(k * 2.1) * 0.35); leg.rotation.y = -k * 2.1 + Math.PI / 2; m.add(leg); }
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.5, 16), M.matte(0x111318)); head.rotation.z = Math.PI / 2; head.position.y = 1.25; m.add(head);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 32), M.glow(0x5ce1a9, { transparent: true, opacity: 0.8 })); ring.position.y = 1.25; ring.rotation.y = Math.PI / 2; m.add(ring);
      mics.push(ring);
    }
    // Guide lines from the mics to the lane, 7.5 m.
    for (const z of [-RUN.mic, RUN.mic]) { const d = box(0.05, 0.02, RUN.mic - 1.5, M.ghost(0x8ef0ff, 0.4)); d.position.set(0, 0.03, z / 2 + Math.sign(z) * 0.75); root.add(d); }
    const L = (t, pos, col, parent = root) => tint(stage.label(t, pos, parent), col);
    L('Microphone, 1.2 m high', [0, 2.0, -RUN.mic], TINT.good);
    L('7.5 m', [0.8, 0.3, -RUN.mic / 2], TINT.cool);
    L('AA′: throttle wide open', [RUN.aa, 0.3, -2.4]);
    L('BB′', [RUN.bb, 0.3, -2.4]);
    const bikeG = new THREE.Group(); root.add(bikeG);
    const b = makeBike({ color: 0xd8332f }); bikeG.add(b.group); b.group.scale.setScalar(1.6);    // drawn 1.6× bigger so it reads at this distance
    const tag = L('', [0, 2.6, 0], TINT.hot, bikeG);
    // Sound rings from the tailpipe, sized and coloured by the level.
    const rings = [0, 1, 2, 3].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 48), M.glow(0xffb547, { transparent: true, opacity: 0 })); r.rotation.x = Math.PI / 2; root.add(r); return r; });
    const st = { kind: 'stock', limit: 77, x: RUN.x0, peak: 0 };
    const brd = board(root, 9, 4.6, 1000, 520, (g, w, h) => drawTrace(g, w, h, st)); brd.mesh.position.set(7.6, 3.4, -9); brd.mesh.rotation.x = -0.45; brd.mesh.scale.setScalar(1.05);
    const fit = makeLayout(stage, { pos: [-12.5, 5.2, 0.6], target: [2, 1.2, 0] });
    let x = RUN.x0, wait = 0, lastKind = '', ringT = [0, 0.25, 0.5, 0.75];
    const api = {
      restart() { x = RUN.x0; st.peak = 0; wait = 0; },
      update(dt, s) {
        dt = Math.max(0, dt);
        const portrait = fit();
        if (portrait) { brd.mesh.position.set(20, 7.5, 0); brd.mesh.rotation.set(0, -Math.PI / 2, 0); brd.mesh.scale.setScalar(1.15); }
        else { brd.mesh.position.set(7.6, 3.4, -9); brd.mesh.rotation.set(-0.45, 0, 0); brd.mesh.scale.setScalar(1.05); }
        const kind = ['stock', 'loud', 'electric'].includes(s.kind) ? s.kind : 'stock';
        if (kind !== lastKind) { lastKind = kind; api.restart(); }
        st.kind = kind; st.limit = INDIA_LIMITS[clamp(Math.round(s.cc), 0, 2)].L;
        if (x < RUN.x1) x = Math.min(RUN.x1, x + (kmhAtX(x) / 3.6) * dt * 0.6);   // shown at 0.6× real speed
        else if ((wait += dt) > 2.5) api.restart();
        st.x = x;
        const Lm = micLevel(kind, x);
        if (x > RUN.aa - 2) st.peak = Math.max(st.peak, Lm);
        bikeG.position.set(x, 0, 0);
        b.rear.rotation.z -= (kmhAtX(x) / 3.6) / 0.3 * dt * 0.6; b.front.rotation.z = b.rear.rotation.z;
        tag.element.textContent = kind === 'electric' ? 'Electric' : kind === 'loud' ? 'Loud, tampered silencer' : 'Stock silencer';
        const over = Lm > st.limit;
        mics.forEach((m) => m.material.color.setHex(over ? 0xff5a6a : 0x5ce1a9));
        const Ls = sourceLevel(kind, x), k = clamp((Ls - 55) / 45, 0, 1);
        rings.forEach((r, i) => { ringT[i] = (ringT[i] + dt * (0.6 + k)) % 1; const u = ringT[i]; r.position.set(x - 1.2, 0.6, 0.4); r.scale.setScalar(0.3 + u * (1 + 6 * k)); r.material.opacity = (1 - u) * (0.1 + 0.8 * k); r.material.color.setHex(over ? 0xff5a6a : kind === 'electric' ? 0x8ef0ff : 0xffb547); });
        brd.redraw();
      },
      readout: (s) => {
        const lim = st.limit, pk = st.peak, done = x >= RUN.x1;
        const verdict = !done ? 'Test running…' : pk <= lim ? `Pass: ${pk.toFixed(1)} dB(A)` : `Fail: ${pk.toFixed(1)} dB(A)`;
        const stock = Math.max(...Array.from({ length: 41 }, (_, i) => micLevel('stock', RUN.aa + i * 0.5)));
        const dL = pk - stock;
        return `<div class="big">${verdict}</div>
          <div class="row"><span>Limit for ${INDIA_LIMITS[clamp(Math.round(s.cc), 0, 2)].label}</span><b>${lim} dB(A)</b></div>
          <div class="row"><span>Compared with stock</span><b>${!done ? '…' : Math.abs(dL) < 1 ? 'same' : dL > 0 ? 'about ' + loudnessRatio(dL).toFixed(1) + '× as loud' : 'about ' + (1 / loudnessRatio(dL)).toFixed(1) + '× quieter'}</b></div>
          <div class="row"><span>Same level, 1 m away, NIOSH limit</span><b>${done ? fmtTime(nioshHours(pk + 20 * Math.log10(7.5))) : '…'}</b></div>
          <small>Levels from our labelled model; the electric bike is an estimate. Test layout after IS 3028.</small>`;
      },
    };
    return compactReadout(stage, api);
  },
};
