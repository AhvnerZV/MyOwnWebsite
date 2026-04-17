// Sunset beach volleyball scene for Resume v2
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// Sunset palette
const SKY = {
  top: '#1a1443',     // deep indigo
  upper: '#5e2c7d',   // violet
  mid: '#e8568a',     // fuchsia pink
  low: '#f79969',     // coral
  horizon: '#ffc878', // marigold
};
const SAND_A = '#f4c987';
const SAND_B = '#d9975a';
const SUN = '#ffe3a3';
const NET_COLOR = '#2a1a3d';
const PALM = '#1a0f2e';

let scene, camera, renderer, controls, clock;
let sectionMarkers = {};
let volleyballCursor;
let sun, sunGlow;
let sandParticles;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let onSectionClick = () => {};
let hoveredId = null;

// Seven court zones — positions are [x, y, z]. Court runs along X axis.
// Ahvner's side is negative X, "opportunity" side is positive X.
const ZONES = [
  { id: 'summary',    pos: [-11, 0.2,  0],   label: 'SERVE / SUMMARY',        zone: 'serve' },
  { id: 'projects',   pos: [ -5, 0.2, -3],   label: 'BACK ROW / PROJECTS',    zone: 'backrow' },
  { id: 'experience', pos: [ -2, 0.2,  3],   label: '10-FT LINE / EXPERIENCE',zone: 'tenft' },
  { id: 'education',  pos: [  2, 0.2, -3],   label: 'FRONT ROW / EDUCATION',  zone: 'frontrow' },
  { id: 'certs',      pos: [  5, 0.2,  3],   label: 'NET / CERTS',            zone: 'net' },
  { id: 'skills',     pos: [ 10, 0.2, -2],   label: 'OPPONENT / SKILLS',      zone: 'opponent' },
  { id: 'volley',     pos: [  0, 4.2,  0],   label: 'ABOVE NET / OFF-CLOCK',  zone: 'above' },
];

export function initScene(canvas, opts = {}) {
  onSectionClick = opts.onSectionClick || (() => {});
  clock = new THREE.Clock();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 400);
  camera.position.set(-16, 7, 18);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1.5, 0);
  controls.minDistance = 8;
  controls.maxDistance = 45;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.minPolarAngle = Math.PI / 6;

  buildSky();
  buildSun();
  buildOcean();
  buildBeach();
  buildCourt();
  buildNet();
  buildPalms();
  buildMarkers();
  buildVolleyballCursor();
  buildSandParticles();
  buildLights();

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);

  animate();
}

function buildSky() {
  // gradient sky via big inverted sphere
  const geom = new THREE.SphereGeometry(180, 40, 40);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top:     { value: new THREE.Color(SKY.top) },
      upper:   { value: new THREE.Color(SKY.upper) },
      mid:     { value: new THREE.Color(SKY.mid) },
      low:     { value: new THREE.Color(SKY.low) },
      horizon: { value: new THREE.Color(SKY.horizon) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top, upper, mid, low, horizon;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 col;
        if (h > 0.6)      col = mix(upper, top, smoothstep(0.6, 1.0, h));
        else if (h > 0.3) col = mix(mid,   upper, smoothstep(0.3, 0.6, h));
        else if (h > 0.1) col = mix(low,   mid,   smoothstep(0.1, 0.3, h));
        else if (h > 0.0) col = mix(horizon, low, smoothstep(0.0, 0.1, h));
        else              col = horizon * (1.0 + h * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geom, mat);
  scene.add(sky);
}

function buildSun() {
  const geom = new THREE.CircleGeometry(4.5, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(SUN),
    transparent: true,
    opacity: 0.95,
  });
  sun = new THREE.Mesh(geom, mat);
  sun.position.set(0, 4, -90);
  scene.add(sun);

  // glow halo
  const glowGeom = new THREE.CircleGeometry(10, 64);
  const glowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { color: { value: new THREE.Color('#ffbf78') } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying vec2 vUv;
      void main() {
        float d = distance(vUv, vec2(0.5));
        float a = pow(1.0 - d * 2.0, 2.5);
        gl_FragColor = vec4(color, a * 0.65);
      }
    `,
  });
  sunGlow = new THREE.Mesh(glowGeom, glowMat);
  sunGlow.position.copy(sun.position);
  sunGlow.position.z = -89.5;
  scene.add(sunGlow);
}

function buildOcean() {
  // simple ocean plane behind the court
  const geom = new THREE.PlaneGeometry(400, 80, 60, 20);
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      uniform float time;
      varying vec3 vPos;
      void main() {
        vec3 p = position;
        p.z += sin(p.x * 0.3 + time * 1.5) * 0.15;
        p.z += cos(p.y * 0.4 + time) * 0.08;
        vPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        vec3 deep = vec3(0.18, 0.08, 0.32);
        vec3 glow = vec3(1.0, 0.6, 0.45);
        float t = smoothstep(-5.0, 5.0, vPos.z);
        vec3 col = mix(deep, glow, t * 0.6);
        // streaks of sunlight
        float streak = pow(abs(sin(vPos.x * 0.2)), 8.0);
        col += streak * vec3(1.0, 0.75, 0.45) * 0.3;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const ocean = new THREE.Mesh(geom, mat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.3, -50);
  ocean.userData.isOcean = true;
  scene.add(ocean);
}

function buildBeach() {
  const geom = new THREE.PlaneGeometry(120, 120, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(SAND_B),
    roughness: 1,
  });
  const beach = new THREE.Mesh(geom, mat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.y = -0.05;
  scene.add(beach);
}

function buildCourt() {
  // Court is 16 x 8 (scaled from real 16m x 8m beach court)
  const courtW = 16, courtH = 8;

  // sand (slightly different color)
  const geom = new THREE.PlaneGeometry(courtW + 2, courtH + 2);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(SAND_A),
    roughness: 1,
  });
  const court = new THREE.Mesh(geom, mat);
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0;
  scene.add(court);

  // court lines via thin boxes
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const lineHeight = 0.02;
  const lineW = 0.1;

  // boundary lines
  const makeLine = (w, d) => new THREE.Mesh(new THREE.BoxGeometry(w, lineHeight, d), lineMat);
  const top = makeLine(courtW, lineW); top.position.set(0, 0.02, -courtH/2); scene.add(top);
  const bot = makeLine(courtW, lineW); bot.position.set(0, 0.02,  courtH/2); scene.add(bot);
  const lft = makeLine(lineW, courtH); lft.position.set(-courtW/2, 0.02, 0); scene.add(lft);
  const rgt = makeLine(lineW, courtH); rgt.position.set( courtW/2, 0.02, 0); scene.add(rgt);
  // center net line
  const mid = makeLine(lineW, courtH); mid.position.set(0, 0.02, 0); scene.add(mid);
  // ghost 10ft lines (faint) for reference
  const g1 = makeLine(lineW * 0.7, courtH); g1.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }); g1.position.set(-3, 0.02, 0); scene.add(g1);
  const g2 = g1.clone(); g2.position.set(3, 0.02, 0); scene.add(g2);
}

function buildNet() {
  // net posts
  const postMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(NET_COLOR), roughness: 0.6 });
  const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.2, 12), postMat);
  p1.position.set(0, 2.1, -4.5);
  scene.add(p1);
  const p2 = p1.clone(); p2.position.z = 4.5; scene.add(p2);

  // net — grid of lines
  const netGroup = new THREE.Group();
  const netW = 9, netH = 1.2, netTop = 3.2;
  // top tape
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(netW, 0.08, 0.03),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  tape.rotation.y = Math.PI / 2;
  tape.position.y = netTop;
  netGroup.add(tape);

  const netMat = new THREE.LineBasicMaterial({ color: 0xf0e0c0, transparent: true, opacity: 0.7 });
  // horizontal strings
  for (let i = 0; i <= 8; i++) {
    const y = netTop - (i / 8) * netH;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, y, -netW/2),
      new THREE.Vector3(0, y,  netW/2),
    ]);
    netGroup.add(new THREE.Line(geom, netMat));
  }
  // vertical strings
  for (let i = 0; i <= 20; i++) {
    const z = -netW/2 + (i / 20) * netW;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, netTop,       z),
      new THREE.Vector3(0, netTop - netH, z),
    ]);
    netGroup.add(new THREE.Line(geom, netMat));
  }
  netGroup.userData.isNet = true;
  scene.add(netGroup);
}

function buildPalms() {
  // Stylized silhouette palms flanking court
  const positions = [
    [-14, 0, -8], [14, 0, -9], [-18, 0, 4], [17, 0, 6],
    [-22, 0, -3], [22, 0, -2], [-10, 0, -14], [10, 0, -14],
  ];
  positions.forEach(([x, y, z]) => {
    const palm = buildPalm();
    palm.position.set(x, y, z);
    palm.rotation.y = Math.random() * Math.PI;
    palm.scale.setScalar(0.85 + Math.random() * 0.35);
    scene.add(palm);
  });
}

function buildPalm() {
  const g = new THREE.Group();
  // trunk — curved via segments
  const trunkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALM) });
  const segs = 8;
  const h = 5;
  for (let i = 0; i < segs; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 - i * 0.008, 0.17 - i * 0.008, h / segs, 8),
      trunkMat
    );
    const lean = Math.sin((i / segs) * Math.PI) * 0.3;
    seg.position.set(lean, (i + 0.5) * (h / segs), 0);
    seg.rotation.z = lean * 0.1;
    g.add(seg);
  }
  // fronds
  const frondMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALM) });
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.35),
      frondMat
    );
    frond.position.set(0.3, h + 0.1, 0);
    const angle = (i / 7) * Math.PI * 2;
    frond.rotation.y = angle;
    frond.rotation.z = -0.3 - Math.random() * 0.2;
    frond.translateX(1);
    g.add(frond);
  }
  return g;
}

function buildMarkers() {
  // Each section gets a floating totem on the court
  ZONES.forEach(z => {
    const group = new THREE.Group();
    group.position.set(...z.pos);
    group.userData.sectionId = z.id;
    group.userData.label = z.label;
    group.userData.basePos = [...z.pos];

    // floor ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.1, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.18;
    group.add(ring);

    // floating beacon — colored orb
    const orbColor = z.id === 'volley' ? '#f4c987' : ['#ff6b8b','#ffa659','#ffd16e','#8866c9','#4ab8b0','#ff9e7a','#f4c987'][ZONES.indexOf(z) % 7];
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 24, 24),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(orbColor),
        emissive: new THREE.Color(orbColor),
        emissiveIntensity: 0.6,
        roughness: 0.4,
      })
    );
    orb.position.y = 1.4;
    orb.userData.isOrb = true;
    group.add(orb);

    // light beam rising
    const beamGeom = new THREE.CylinderGeometry(0.02, 0.25, 1.5, 12, 1, true);
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { color: { value: new THREE.Color(orbColor) } },
      vertexShader: `
        varying float vY;
        void main() {
          vY = uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vY;
        void main() {
          gl_FragColor = vec4(color, (1.0 - vY) * 0.5);
        }
      `,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = 0.7;
    group.add(beam);

    // invisible hit target
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 1;
    hit.userData.sectionId = z.id;
    group.add(hit);

    scene.add(group);
    sectionMarkers[z.id] = group;
  });
}

function buildVolleyballCursor() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xf8f4e8, roughness: 0.5, metalness: 0.05 })
  );
  g.add(ball);
  // seams
  for (let i = 0; i < 3; i++) {
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.012, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0x2a1a3d })
    );
    seam.rotation.x = (i * Math.PI) / 3;
    seam.rotation.z = (i * Math.PI) / 4;
    g.add(seam);
  }
  g.position.set(0, 2, 6);
  volleyballCursor = g;
  scene.add(g);
}

function buildSandParticles() {
  const count = 300;
  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 60;
    pos[i*3+1] = Math.random() * 8;
    pos[i*3+2] = (Math.random() - 0.5) * 30;
    vel[i*3]   = 0.3 + Math.random() * 0.4;
    vel[i*3+1] = -0.05 + Math.random() * 0.1;
    vel[i*3+2] = (Math.random() - 0.5) * 0.1;
  }
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('velocity', new THREE.BufferAttribute(vel, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color('#ffd9a8'),
    size: 0.05,
    transparent: true,
    opacity: 0.55,
  });
  sandParticles = new THREE.Points(geom, mat);
  scene.add(sandParticles);
}

function buildLights() {
  const ambient = new THREE.AmbientLight(0xffb585, 0.45);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(new THREE.Color('#ffb078'), 1.3);
  dir.position.set(-20, 8, -10);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(new THREE.Color('#8a5dbd'), 0.3);
  fill.position.set(10, 4, 10);
  scene.add(fill);
}

// ——— Interaction ———
function onPointerMove(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function onClick() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(Object.values(sectionMarkers), true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.sectionId) o = o.parent;
    if (o) onSectionClick(o.userData.sectionId);
  }
}

function onResize() {
  const c = renderer.domElement;
  camera.aspect = c.clientWidth / c.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(c.clientWidth, c.clientHeight, false);
}

// ——— Loop ———
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  // hover
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(Object.values(sectionMarkers), true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.sectionId) o = o.parent;
    hoveredId = o ? o.userData.sectionId : null;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    hoveredId = null;
    renderer.domElement.style.cursor = 'grab';
  }
  if (window.__onHoverChange) window.__onHoverChange(hoveredId);

  // markers idle animation + hover pulse
  Object.values(sectionMarkers).forEach(g => {
    const base = g.userData.basePos;
    g.traverse(c => {
      if (c.userData.isOrb) {
        c.position.y = 1.4 + Math.sin(t * 1.5 + base[0]) * 0.2;
        c.rotation.y = t * 0.5;
      }
    });
    const target = g.userData.sectionId === hoveredId ? 1.25 : 1;
    g.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
  });

  // volleyball cursor — lerp toward pointer position projected onto a plane near camera
  if (volleyballCursor) {
    const target = new THREE.Vector3(pointer.x, pointer.y, 0.7).unproject(camera);
    const dir = target.sub(camera.position).normalize();
    const dist = 12;
    const dest = camera.position.clone().add(dir.multiplyScalar(dist));
    dest.y += Math.sin(t * 3) * 0.2; // bounce
    volleyballCursor.position.lerp(dest, 0.1);
    volleyballCursor.rotation.x += dt * 1.2;
    volleyballCursor.rotation.y += dt * 0.8;
  }

  // sand particles drift
  if (sandParticles) {
    const pos = sandParticles.geometry.attributes.position;
    const vel = sandParticles.geometry.attributes.velocity;
    for (let i = 0; i < pos.count; i++) {
      pos.array[i*3]   += vel.array[i*3] * dt;
      pos.array[i*3+1] += vel.array[i*3+1] * dt;
      pos.array[i*3+2] += vel.array[i*3+2] * dt;
      if (pos.array[i*3] > 30) pos.array[i*3] = -30;
      if (pos.array[i*3+1] < 0) pos.array[i*3+1] = 8;
    }
    pos.needsUpdate = true;
  }

  // ocean shimmer
  scene.traverse(o => {
    if (o.userData.isOcean && o.material.uniforms) {
      o.material.uniforms.time.value = t;
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

export function flyTo(sectionId) {
  const g = sectionMarkers[sectionId];
  if (!g) return;
  const target = new THREE.Vector3(...g.userData.basePos);
  target.y = 1.5;
  // camera offset depending on zone
  const offset = new THREE.Vector3(
    target.x < 0 ? -8 : 8,
    5,
    target.z + 7,
  );
  const camTarget = target.clone().add(offset);
  const startCam = camera.position.clone();
  const startT = controls.target.clone();
  const dur = 1.2;
  const t0 = performance.now();
  function step() {
    const p = Math.min((performance.now() - t0) / (dur * 1000), 1);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    camera.position.lerpVectors(startCam, camTarget, e);
    controls.target.lerpVectors(startT, target, e);
    if (p < 1) requestAnimationFrame(step);
  }
  step();
}

export function getZones() { return ZONES; }
