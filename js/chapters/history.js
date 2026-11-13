// Chapter 6: how silencers changed, in six models on a timeline. Dates and sources are in
// history.json; the shapes are simplified sketches of each idea, not copies of real parts.
//  - 1897: Reeves brothers' exhaust muffler, US patent 582,485 (11 May 1897): concentric
//    perforated shells (Google Patents).
//  - 1909: Hiram Percy Maxim's firearm silencer, US patent 916,885 (30 Mar 1909), with curved vanes
//    that swirl the gas; he made engine mufflers on the same idea (Wikipedia).
//  - 20th century: chambers, baffles and packing become the standard silencer.
//  - 1975: catalytic converters on most new US petrol cars (Houdry's patent 2,742,437, 1956).
//  - 1987: a computer-worked exhaust valve on a four-stroke motorcycle (Yamaha's EXUP, FZR400R).
//  - 2020: India's BS-VI bikes: fuel injection, an oxygen sensor and a three-way converter.
import { THREE, M, latheX, rod, box, approach, clamp, smooth } from '../kit.js';
import { makeSilencer, GEO, perfMat, tint, TINT, makeLayout, compactReadout } from '../silencer.js';

const ERAS = [
  { year: 1897, title: 'Nested perforated shells', who: 'Milton and Marshal Reeves, Columbus, Indiana', text: 'Their patented muffler sent exhaust through a series of perforated shells, one inside another, so the gas expanded and cooled step by step.' },
  { year: 1909, title: 'Swirling vanes', who: 'Hiram Percy Maxim, Hartford, USA', text: 'Maxim’s silencer for guns used curved vanes to swirl and slow the gas. He used the same ideas for engine mufflers.' },
  { year: 1950, title: 'Chambers, baffles and packing', who: 'Many makers, through the 20th century', text: 'The modern silencer settles down: perforated tubes, baffles, expansion chambers, resonators and fibre packing, sized for each engine.' },
  { year: 1975, title: 'The catalytic converter', who: 'USA; patent by Eugene Houdry, 1956', text: 'Most new US petrol cars get a catalytic converter to meet clean-air rules. It later spreads to motorcycles and to India.' },
  { year: 1987, title: 'The exhaust valve', who: 'Japan', text: 'A motorcycle gets a valve in its exhaust worked by a motor, opening and closing with rpm to change how the pulses behave.' },
  { year: 2020, title: 'BS-VI in India', who: 'India, from 1 April 2020', text: 'Every new bike must meet BS-VI: fuel injection, an oxygen sensor and a three-way converter, inside a silencer that must still pass the noise test.' },
];
const GAP = 2.3;

function vanes(mat) {
  const g = new THREE.Group();
  g.add(rod(-0.75, 0.75, 0.32, 0.32, M.clear(0xcfd6e0, 0.18), 32, true));
  for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24, 0, Math.PI * 1.6), mat); d.rotation.set(0, Math.PI / 2 + 0.5, i * 0.9); d.position.x = -0.6 + i * 0.2; g.add(d); }
  return g;
}

export default {
  id: 'history',
  short: 'A short history',
  title: 'From perforated shells to BS-VI',
  subtitle: 'A century of making engines quieter and cleaner.',
  view: { pos: [0.8, 3.0, 8.2], target: [0.8, 1.9, 0] },
  learn: `<p>The first cars and motorcycles were very loud. In <b>1897</b> the brothers <b>Milton and Marshal Reeves</b> of Columbus, Indiana, patented an <b>exhaust muffler</b> for their noisy “motocycle”, an early car: the gas wound through shells full of holes, one inside another. Around <b>1909</b>, <b>Hiram Percy Maxim</b>, son of the machine-gun inventor, patented a gun silencer with curved vanes and built engine mufflers on the same idea. That is why the British still say “silencer”.</p>
    <p>Through the 20th century the parts you met in this box became standard: chambers, baffles, resonators and packing. Then came cleaner air. <b>Eugene Houdry</b> patented a catalytic converter in 1956, and from <b>1975</b> most new US petrol cars carried one. Europe set motorcycle noise limits in <b>1978</b>. In <b>1987</b> a motorcycle got a motor-driven <b>exhaust valve</b> that changes the pipe with rpm; many big bikes and cars now use valves like it, which are approved as part of the bike.</p>
    <p>India treated noise as pollution in the <b>Environment (Protection) Act, 1986</b>, set vehicle noise limits from <b>1990</b> and today's two-wheeler limits from <b>2003</b>, and leapt from <b>BS-IV straight to BS-VI</b> on <b>1 April 2020</b>. The full timeline is on the history page.</p>
    <p class="tip"><b>Try it:</b> slide through the years and look at how each idea is built.</p>`,
  terms: [
    { t: 'Muffler', d: 'The American word for a silencer, from its job of muffling sound.' },
    { t: 'Patent', d: 'A government grant that lets an inventor stop others copying an invention for a number of years.' },
    { t: 'Exhaust valve (in the pipe)', d: 'A flap in the exhaust, worked by a motor, that changes the pipe’s behaviour with engine speed. Not the engine’s own exhaust valve.' },
    { t: 'Bharat Stage', d: 'India’s emission rules for vehicles, stepped up from BS-I (2000) to BS-VI (2020).' },
  ],
  defaults: { year: 2020 },
  controls: [
    { key: 'year', type: 'range', label: 'Year', min: 1895, max: 2026, step: 1, ends: ['1895', '2026'], fmt: (v) => String(Math.round(v)) },
  ],
  quiz: [
    { q: 'What did the Reeves brothers patent in 1897?', options: ['A catalytic converter', 'An exhaust muffler of nested perforated shells', 'A motorcycle', 'A gun silencer'], answer: 1, why: 'US patent 582,485 describes exhaust passing through concentric perforated shells.' },
    { q: 'Why do the British call a muffler a “silencer”?', options: ['Because of Maxim’s gun silencer, whose ideas went into engine mufflers', 'Because it removes all sound', 'Because of a law', 'It was named by the Reeves brothers'], answer: 0, why: 'Hiram Percy Maxim sold “silencers” for guns and engines; the name stuck for exhausts in British English.' },
    { q: 'When did BS-VI become compulsory for new vehicles in India?', options: ['1 April 2010', '1 April 2017', '1 April 2020', '1 January 2026'], answer: 2, why: 'India skipped BS-V and went from BS-IV to BS-VI on 1 April 2020, ordered by the Supreme Court.' },
  ],
  reel: [
    { ms: 5600, caption: 'From perforated shells in 1897 to catalytic converters and BS-VI in 2020.', set: {}, anim: { year: [1897, 2020] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const items = [];
    const steel = M.metal(0xc9ced6, { side: THREE.DoubleSide });
    const add = (obj, i) => { const g = new THREE.Group(); g.position.set((i - 2.5) * GAP, 0.9, 0); g.add(obj); root.add(g); items.push(g); return g; };
    // 1897: nested perforated shells (cut in half).
    { const g = new THREE.Group(); [0.42, 0.3, 0.18].forEach((r, k) => g.add(latheX([[-0.75 + k * 0.08, r], [0.75 - k * 0.08, r]], perfMat(k ? 0xc9ced6 : 0x8c939d, 14, 8), { seg: 36, phiStart: Math.PI / 2, phiLength: Math.PI }))); g.add(rod(-1.0, -0.7, 0.08, 0.08, steel, 16, true)); add(g, 0); }
    // 1909: swirling vanes.
    add(vanes(M.metal(0xb7a07a, { side: THREE.DoubleSide })), 1);
    // 20th century: our chambered silencer, cut open.
    { const s = makeSilencer(); s.setCut(1); s.shield.visible = false; s.group.scale.setScalar(3.2); s.group.position.x = -0.8; add(s.group, 2); }
    // 1975: catalytic converter can with a honeycomb face.
    { const g = new THREE.Group(); g.add(latheX([[-0.85, 0.1], [-0.5, 0.38], [0.5, 0.38], [0.85, 0.1]], M.metal(0x8c939d, { side: THREE.DoubleSide }), { seg: 36, phiStart: Math.PI / 2, phiLength: Math.PI }));
      for (let a = -3; a <= 3; a++) for (let b = -3; b <= 0; b++) { if (a * a + b * b > 10) continue; const c = box(1.0, 0.09, 0.09, M.matte(0x9a978c)); c.position.set(0, a * 0.1, b * 0.1); g.add(c); }
      add(g, 3); }
    // 1987: a pipe with a butterfly valve worked by a small motor.
    { const g = new THREE.Group(); g.add(rod(-0.8, 0.8, 0.16, 0.16, M.clear(0xcfd6e0, 0.25), 28, true));
      const flap = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), M.metal(0xffb547, { side: THREE.DoubleSide })); flap.rotation.y = Math.PI / 2; g.add(flap); g.userData.flap = flap;
      const mot = box(0.25, 0.22, 0.22, M.matte(0x2a2f39)); mot.position.set(0, 0.35, 0); g.add(mot); add(g, 4); }
    // 2020: silencer with a converter brick and an oxygen sensor.
    { const s = makeSilencer({ cat: true }); s.setCut(1); s.shield.visible = false; s.group.scale.setScalar(3.2); s.group.position.x = -0.8;
      const sensor = rod(0, 0.12, 0.012, 0.012, M.metal(0xffb547)); sensor.rotation.z = Math.PI / 2; sensor.position.set(-0.03, GEO.pipeD / 2, 0); s.group.add(sensor);
      add(s.group, 5); }
    const tags = ERAS.map((e, i) => tint(stage.label(`<b>${e.year === 1950 ? '20th c.' : e.year}</b> ${e.title}`, [0, -0.75, 0.4], items[i]), TINT.hot));
    // A timeline bar under the models.
    const bar = box(GAP * 6, 0.04, 0.1, M.glow(0x3a4050)); bar.position.set(0, 0.05, 0.6); root.add(bar);
    const fit = makeLayout(stage, { pos: [0.9, 2.7, 4.6], target: [0.9, 2.0, 0] });
    let t = 0, sel = 5;
    const api = {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fit();
        sel = 0; ERAS.forEach((e, i) => { if (s.year >= e.year) sel = i; });
        items.forEach((g, i) => {
          const on = i === sel, past = i <= sel;
          g.position.y = approach(g.position.y, on ? 2.0 : 0.8, 5, dt);
          const k = approach(g.scale.x, on ? 1.9 : 0.75, 5, dt); g.scale.setScalar(k);
          g.visible = true;
          g.traverse((o) => { if (o.material && o.material.userData.base === undefined) o.material.userData.base = o.material.opacity; if (o.material) { o.material.transparent = true; o.material.opacity = (o.material.userData.base ?? 1) * (past ? 1 : 0.25); } });
          tags[i].visible = on || (!narrow && Math.abs(i - sel) <= 2);
          const e = ERAS[i], yr = e.year === 1950 ? '20th c.' : e.year;
          tags[i].element.innerHTML = on ? `<b>${yr}</b> ${e.title}` : String(yr);
          tags[i].element.style.opacity = on ? '1' : '0.6';
        });
        const flap = items[4].children[0].userData.flap; if (flap) flap.rotation.y = Math.PI / 2 + 0.7 * Math.sin(t * 1.2);
        root.position.x = approach(root.position.x, -(sel - 2.5) * GAP * (narrow ? 1 : 0.8) + 0.9, 3, dt);
      },
      readout: (s) => {
        const e = ERAS[sel];
        return `<div class="big">${e.year === 1950 ? '20th century' : e.year}: ${e.title}</div>
          <div class="row"><span>Who and where</span><b>${e.who}</b></div>
          <small>${e.text}</small>`;
      },
    };
    return compactReadout(stage, api);
  },
};
