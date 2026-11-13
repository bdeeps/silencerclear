// Chapter 1: the whole exhaust of a generic single-cylinder commuter, then the silencer cut open.
import { THREE, M, tube, latheX, rod, swarm, exploder, approach, clamp, smooth } from '../kit.js';
import { makeBike, makeSilencer, GEO, TAU, firingHz, exhaustTemp, soundSpeed, IDLE, heatColor, tint, TINT, makeLayout, compactReadout, recording } from '../silencer.js';

const S = 4;                       // scene units per metre
const SHOWN = 1 / 10;              // pulses shown 10 times slower than real

export default {
  id: 'anatomy',
  short: 'Inside the exhaust',
  title: 'Inside a motorcycle exhaust',
  subtitle: 'A valve, a pipe, a cleaner and a can full of tubes and walls.',
  view: { pos: [-0.4, 3.0, 9.8], target: [-1.4, 1.65, 1.2] },
  learn: `<p>Every time the engine fires, burnt gas has to get out. On a typical Indian <b>100–150 cc commuter</b> it leaves the cylinder through the <b>exhaust valve</b> and <b>port</b>, runs down the <b>header pipe</b>, passes the <b>catalytic converter</b>, and ends in the <b>silencer</b> (Americans say <b>muffler</b>), the fat can beside the back wheel.</p>
    <p>Cut the silencer open and it is a little maze. A <b>perforated tube</b> lets the gas spread into a big <b>expansion chamber</b>. Walls called <b>baffles</b>, some full of holes, split the can into rooms. One closed room, joined by a short <b>neck</b>, is a <b>resonator</b>. Near the end, the last tube is wrapped in <b>packing</b>: glass or steel wool that soaks up sound. A perforated <b>heat shield</b> on the outside keeps legs off the hot can, and the gas leaves through the <b>tailpipe</b>.</p>
    <p>Designs differ a lot from bike to bike. Some hide the catalytic converter inside the silencer, some use more chambers and no packing. Ours is a generic one that shows all three tricks. The engine and the rest of the bike are explained in <a href="https://glassbox.how/motorcycleclear/">MotorcycleClear</a>.</p>
    <p class="tip"><b>Try it:</b> pull the exhaust off the bike, cut the silencer open, then rev the engine and watch the pulses speed up.</p>`,
  terms: [
    { t: 'Exhaust valve', d: 'A mushroom-shaped valve in the cylinder head that opens once every two turns of the crank to let burnt gas out.' },
    { t: 'Header pipe', d: 'The bent pipe from the engine’s exhaust port to the silencer.' },
    { t: 'Catalytic converter', d: 'A honeycomb coated with precious metals that turns poisonous gases into less harmful ones.' },
    { t: 'Silencer (muffler)', d: 'The can that makes the engine’s exhaust quieter without blocking the gas too much.' },
    { t: 'Baffle', d: 'A wall inside the silencer that splits it into chambers and turns the gas.' },
    { t: 'Packing', d: 'Glass or steel wool around a perforated tube. It turns sound into a tiny bit of heat.' },
    { t: 'Heat shield', d: 'A cover on the outside of the hot pipe or can so a leg or hand cannot touch the metal underneath.' },
  ],
  defaults: { explode: 0, cut: false, rpm: IDLE },
  controls: [
    { key: 'explode', type: 'range', label: 'Take the exhaust off', min: 0, max: 1, step: 0.01, ends: ['on the bike', 'laid out'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'cut', type: 'toggle', label: 'Cut the silencer open' },
    { key: 'rpm', type: 'range', label: 'Engine speed', min: IDLE, max: 9000, step: 50, ends: ['idle', 'revving hard'], fmt: (v) => Math.round(v).toLocaleString('en') + ' rpm' },
  ],
  quiz: [
    { q: 'Which part of the exhaust cleans up poisonous gases?', options: ['The heat shield', 'The catalytic converter', 'The tailpipe', 'The baffles'], answer: 1, why: 'The catalytic converter’s coated honeycomb turns carbon monoxide, unburnt fuel and nitrogen oxides into less harmful gases.' },
    { q: 'What is the packing inside some silencers made of?', options: ['Rubber', 'Glass or steel wool', 'Sand', 'Water'], answer: 1, why: 'Fibrous glass or steel wool around a perforated tube turns some of the sound into heat.' },
    { q: 'A single-cylinder four-stroke idles at 1,200 rpm. How many exhaust pulses leave each second?', options: ['10', '20', '1,200', '600'], answer: 0, why: 'It fires once every two turns: 1,200 ÷ 60 ÷ 2 = 10 pulses a second.' },
  ],
  reel: [
    { ms: 5200, caption: 'A motorcycle exhaust is a valve, a pipe, a catalytic converter and a silencer.', set: { cut: false, rpm: 2500 }, anim: { explode: [0, 0.05] }, spin: 0.25 },
    { ms: 5600, caption: 'Cut the silencer open: perforated tubes, walls, chambers and a wrap of wool.', set: { cut: true, rpm: 2500 }, anim: { explode: [0, 1] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.scale.setScalar(S); stage.root.add(root);
    const b = makeBike(); root.add(b.group);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x9ea3ab, metalness: 0.85, roughness: 0.3 });

    // Exhaust valve: a small mushroom in the head, seen through the fins.
    const valve = new THREE.Group(); valve.position.copy(b.port).add(new THREE.Vector3(-0.03, 0.02, -0.03)); valve.rotation.z = -0.3 - 0.9; b.group.add(valve);
    const stem = rod(0, 0.07, 0.003, 0.003, M.metal(0xd7dce4)); valve.add(stem);
    const headV = rod(-0.004, 0.0, 0.014, 0.014, M.metal(0xffb547, { roughness: 0.4 })); valve.add(headV);

    // Header pipe from the port down under the engine to the converter, then on to the silencer.
    const header = new THREE.Group(); b.group.add(header);
    const P = b.port;
    header.add(tube([[P.x, P.y, P.z], [P.x + 0.06, P.y - 0.12, P.z + 0.04], [0.29, 0.28, 0.12], [0.2, 0.17, 0.15], [0.13, 0.17, 0.15]], 0.016, pipeMat, false, 60));
    const cat = new THREE.Group(); cat.position.set(0.055, 0.17, 0.15); b.group.add(cat);
    cat.add(latheX([[-0.075, 0.016], [-0.055, 0.038], [0.055, 0.038], [0.075, 0.016]], pipeMat, { seg: 32 }));
    const link = new THREE.Group(); b.group.add(link);
    link.add(tube([[-0.02, 0.17, 0.15], [-0.1, 0.19, 0.17], [-0.16, 0.255, 0.19], [-0.18, 0.27, 0.19]], 0.016, pipeMat, false, 30));

    // The silencer: built along +X in metres, turned to point backwards (rotated half a turn about Z,
    // which keeps its heat shield on the outside, +z) and tilted up a little.
    const sil = makeSilencer();
    const silHome = new THREE.Group(); silHome.position.set(-0.18, 0.27, 0.19); silHome.rotation.z = Math.PI - 0.16; b.group.add(silHome);
    silHome.add(sil.group);
    const shieldHome = sil.shield; // exploded separately, outwards
    const L = (text, parent, pos, col) => tint(stage.label(text, pos, parent), col);
    const tags = {
      outside: [
        L('Exhaust port and valve', valve, [0.02, 0.09, 0.05], TINT.hot),
        L('Header pipe', header, [0.33, 0.33, 0.14]),
        L('Catalytic converter', cat, [0, -0.07, 0.03], TINT.good),
        L('Silencer (muffler)', sil.group, [0.24, -0.12, 0.02]),
        L('Heat shield', sil.shield, [0.0, 0, 0.09]),
        L('Tailpipe', sil.tail, [0.03, 0.03, 0.02]),
      ],
      inside: [
        L('Perforated inlet tube', sil.group, [0.07, 0.008, 0.02], TINT.cool),
        L('Expansion chamber 1', sil.group, [0.11, -0.062, 0], TINT.cool),
        L('Perforated baffle', sil.group, [GEO.A[1], 0.075, 0]),
        L('Expansion chamber 2', sil.group, [0.235, -0.062, 0], TINT.cool),
        L('Resonator and neck', sil.group, [0.33, 0.075, 0], TINT.hot),
        L('Packing (glass or steel wool)', sil.group, [0.425, -0.07, 0], TINT.pack),
      ],
    };
    const setExplode = exploder([
      { obj: header, off: [0, 0, 0.18] },
      { obj: cat, off: [0, -0.04, 0.34] },
      { obj: link, off: [0, 0, 0.3] },
      { obj: silHome, off: [0.42, -0.06, 0.62] },
      { obj: shieldHome, off: [0, 0, 0.0] },
    ]);

    // Hot gas puffs along the whole path: port → header → converter → silencer → out of the tail.
    const pathPts = [[P.x, P.y, P.z], [P.x + 0.06, P.y - 0.12, P.z + 0.04], [0.29, 0.28, 0.12], [0.2, 0.17, 0.15], [0.055, 0.17, 0.15], [-0.1, 0.19, 0.17], [-0.18, 0.27, 0.19]].map((p) => new THREE.Vector3(...p));
    const path = new THREE.CatmullRomCurve3(pathPts);
    const N = 160;
    const dots = swarm(N, new THREE.SphereGeometry(0.008, 8, 6), M.glow(0xff8a5c, { transparent: true, opacity: 0.85 }));
    dots.castShadow = false; b.group.add(dots);
    const silDots = swarm(90, new THREE.SphereGeometry(0.0045, 8, 6), M.glow(0xff8a5c, { transparent: true, opacity: 0.85 }));
    silDots.castShadow = false; sil.group.add(silDots);
    const seed = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9898) * 0.5 + 0.5, Math.sin(i * 78.233) * 0.5 + 0.5, Math.sin(i * 39.425) * 0.5 + 0.5]);
    const fit = makeLayout(stage, { pos: [0.6, 3.2, 8.2], target: [-0.9, 2.6, 0.9] });
    let phase = 0, rpmNow = IDLE, cutK = 0, ex = 0;
    const v = new THREE.Vector3();

    const api = {
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fit();
        ex = recording() ? s.explode : approach(ex, s.explode, 8, dt);
        setExplode(ex);
        // The silencer grows as it comes out, so its insides are big enough to see.
        silHome.scale.setScalar(1 + 1.3 * smooth(ex));
        if (narrow) silHome.position.y += 1.15 * smooth(ex);       // on a tall screen, lift it above the bike
        cutK = approach(cutK, s.cut ? 1 : 0, 5, dt);
        sil.setCut(cutK);
        sil.shield.visible = cutK < 0.5;
        tags.outside.forEach((l, i) => { l.visible = (!narrow || i % 2 === 0) && !((i >= 3 || i === 2) && ex > 0.5 && cutK > 0.5); });
        tags.inside.forEach((l, i) => { l.visible = cutK > 0.6 && ex > 0.5 && (!narrow || i % 2 === 1); });
        rpmNow = approach(rpmNow, s.rpm, 3, dt);
        const f = firingHz(rpmNow);
        phase += f * SHOWN * dt;
        const ph = phase % 1;
        // Valve lift: open for a part of each cycle (about 240 of 720 crank degrees).
        const lift = ph < 0.33 ? Math.sin((ph / 0.33) * Math.PI) : 0;
        valve.position.copy(b.port).add(new THREE.Vector3(-0.03 + 0.008 * lift, 0.02 + 0.006 * lift, -0.03));
        // Pipe colour from gas temperature (the header runs hottest).
        pipeMat.color.copy(heatColor(exhaustTemp(rpmNow) * 0.85));
        // Puffs: each pulse sends a bunch of dots down the pipe.
        for (let i = 0; i < N; i++) {
          // Dots travel in 8 bunches, one bunch per pulse, spaced one pulse apart along the pipe.
          const bunch = Math.floor(i / 20), u = (((phase + bunch) / 8 + seed[i][1] * 0.03) % 1);
          path.getPointAt(u, v);
          const spread = 0.012;
          dots.place(i, [v.x + (seed[i][2] - 0.5) * spread, v.y + (seed[i][1] - 0.5) * spread, v.z + (seed[i][0] - 0.5) * spread], null, 1 - 0.6 * u);
        }
        dots.done();
        dots.visible = ex < 0.15;
        // Inside the silencer, gas wanders through chambers then squeezes into the tail tube.
        for (let i = 0; i < 90; i++) {
          const k = (phase * 0.5 + i / 90) % 1, x = -0.02 + k * (GEO.len + 0.08);
          const wide = x > 0.04 && x < 0.2 ? GEO.canD / 2 * 0.8 : GEO.pipeD / 2 * 0.7;
          const a = i * 2.39996, rr = wide * Math.sqrt((i * 0.618) % 1);
          silDots.place(i, [x, Math.cos(a + phase) * rr, Math.sin(a + phase) * rr]);
        }
        silDots.done();
        silDots.visible = cutK > 0.5;
      },
      readout: (s) => {
        const f = firingHz(s.rpm), T = exhaustTemp(s.rpm), c = soundSpeed(T);
        return `<div class="big">${f.toFixed(f < 20 ? 1 : 0)} exhaust pulses a second</div>
          <div class="row"><span>Engine</span><b>single cylinder, four-stroke</b></div>
          <div class="row"><span>Speed</span><b>${Math.round(s.rpm).toLocaleString('en')} rpm ÷ 120</b></div>
          <div class="row"><span>Gas in the silencer (model)</span><b>about ${Math.round(T / 10) * 10} °C</b></div>
          <div class="row"><span>Speed of sound in that gas</span><b>${Math.round(c)} m/s (air: 343)</b></div>
          <small>Pulses shown 10× slower than real. Generic bike, no particular make.</small>`;
      },
    };
    return compactReadout(stage, api);
  },
};
