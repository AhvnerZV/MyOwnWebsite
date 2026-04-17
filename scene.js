// Three.js spatial scene for Ahvner's resume
// Each section is a symbolic floating object; camera orbits and teleports between them.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const PALETTES = {
  teal: { a: '#2DB8A8', b: '#3FD07A', accent: '#E8A861' },
  navy: { a: '#4FB8FF', b: '#7B5CFF', accent: '#FF7B7B' },
  mono: { a: '#E8E4DC', b: '#B8AE9C', accent: '#D97757' },
  purple: { a: '#B87BFF', b: '#FF6BD6', accent: '#FFB366' },
};

const SECTIONS = [
  { id: 'summary',    label: 'SUMMARY',        pos: [0, 0.5, 0],      geom: 'card' },
  { id: 'projects',   label: 'PROJECTS',       pos: [-7, 1.2, -3],    geom: 'stack' },
  { id: 'experience', label: 'EXPERIENCE',     pos: [7, -0.5, -4],    geom: 'laptop' },
  { id: 'education',  label: 'EDUCATION',      pos: [-6, -2, 5],      geom: 'diploma' },
  { id: 'certs',      label: 'CERTIFICATIONS', pos: [6, 2, 6],        geom: 'trophy' },
  { id: 'skills',     label: 'SKILLS',         pos: [0, -3, -8],      geom: 'orbit' },
  { id: 'volley',     label: 'VOLLEYBALL',     pos: [10, 4, 2],       geom: 'volleyball' },
];

let scene, camera, renderer, controls, raf;
let palette = PALETTES.teal;
let darkMode = true;
const sectionMeshes = {};
const clock = new THREE.Clock();
let onSectionClick = () => {};
let hoveredId = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initScene(canvas, opts = {}) {
  palette = PALETTES[opts.palette || 'teal'];
  darkMode = opts.dark ?? true;
  onSectionClick = opts.onSectionClick || (() => {});

  scene = new THREE.Scene();
  setBg();

  camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
  camera.position.set(0, 2, 14);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 40;

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(6, 10, 6);
  scene.add(dir);
  const rim = new THREE.DirectionalLight(new THREE.Color(palette.a), 0.8);
  rim.position.set(-8, 4, -6);
  scene.add(rim);
  rim.userData.isRim = true;

  buildScene();

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);

  animate();
}

function setBg() {
  scene.background = new THREE.Color(darkMode ? 0x0a1014 : 0xf4f6f5);
  scene.fog = new THREE.Fog(darkMode ? 0x0a1014 : 0xf4f6f5, 18, 60);
}

function gradientMat(opts = {}) {
  // Custom shader for teal→green gradient on meshes
  const c1 = new THREE.Color(palette.a);
  const c2 = new THREE.Color(palette.b);
  return new THREE.ShaderMaterial({
    uniforms: {
      c1: { value: c1 },
      c2: { value: c2 },
      time: { value: 0 },
      opacity: { value: opts.opacity ?? 1 },
      emissiveBoost: { value: opts.emissive ?? 0.3 },
    },
    transparent: opts.opacity !== undefined,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 c1;
      uniform vec3 c2;
      uniform float time;
      uniform float opacity;
      uniform float emissiveBoost;
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        float t = (vPos.y + 1.5) / 3.0;
        t = clamp(t + sin(time*0.5 + vPos.x)*0.1, 0.0, 1.0);
        vec3 col = mix(c1, c2, t);
        float fres = pow(1.0 - abs(dot(vNormal, vec3(0.0,0.0,1.0))), 2.0);
        col += fres * 0.4 * c2;
        col *= (0.6 + emissiveBoost);
        gl_FragColor = vec4(col, opacity);
      }
    `,
  });
}

function lineMat() {
  return new THREE.LineBasicMaterial({ color: new THREE.Color(palette.a), transparent: true, opacity: 0.6 });
}

function buildScene() {
  // clear
  Object.values(sectionMeshes).forEach(g => scene.remove(g));
  for (const k in sectionMeshes) delete sectionMeshes[k];

  SECTIONS.forEach(s => {
    const group = new THREE.Group();
    group.position.set(...s.pos);
    group.userData.sectionId = s.id;
    group.userData.label = s.label;
    group.userData.basePos = [...s.pos];

    switch (s.geom) {
      case 'card':    buildCard(group); break;
      case 'stack':   buildStack(group); break;
      case 'laptop':  buildLaptop(group); break;
      case 'diploma': buildDiploma(group); break;
      case 'trophy':  buildTrophy(group); break;
      case 'orbit':   buildOrbit(group); break;
      case 'volleyball': buildVolleyball(group); break;
    }

    // invisible hit sphere for reliable clicks
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.userData.sectionId = s.id;
    hit.userData.isHit = true;
    group.add(hit);

    scene.add(group);
    sectionMeshes[s.id] = group;
  });

  // Floating particles for ambience
  const pGeo = new THREE.BufferGeometry();
  const pCount = 200;
  const positions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 40;
    positions[i*3+1] = (Math.random() - 0.5) * 20;
    positions[i*3+2] = (Math.random() - 0.5) * 30;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({
    color: new THREE.Color(palette.b),
    size: 0.05,
    transparent: true,
    opacity: 0.5,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.userData.isParticles = true;
  scene.add(points);

  // Grid floor (dark mode only)
  const grid = new THREE.GridHelper(60, 30, new THREE.Color(palette.a), new THREE.Color(palette.a));
  grid.material.transparent = true;
  grid.material.opacity = darkMode ? 0.08 : 0.04;
  grid.position.y = -5;
  grid.userData.isGrid = true;
  scene.add(grid);
}

// ——— Symbolic geometries ———————————————————————————————————————

function buildCard(group) {
  // Summary = holographic card
  const geo = new THREE.BoxGeometry(3, 1.8, 0.08);
  const mesh = new THREE.Mesh(geo, gradientMat({ opacity: 0.85, emissive: 0.5 }));
  group.add(mesh);
  // Inner lines
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.04, 0.1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.b), transparent: true, opacity: 0.9 })
    );
    line.position.set(0, 0.5 - i * 0.3, 0.05);
    group.add(line);
  }
  group.userData.idleSpin = [0, 0.3, 0];
}

function buildStack(group) {
  // Projects = stack of floating tiles
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.BoxGeometry(2.4, 1.5, 0.08);
    const m = new THREE.Mesh(geo, gradientMat({ emissive: 0.3 + i * 0.1 }));
    m.position.set(i * 0.2 - 0.2, -i * 0.3 + 0.3, -i * 0.2);
    m.rotation.z = (i - 1) * 0.08;
    group.add(m);
  }
  group.userData.idleSpin = [0.05, 0.4, 0];
}

function buildLaptop(group) {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.12, 1.6),
    gradientMat({ emissive: 0.2 })
  );
  base.position.y = -0.3;
  group.add(base);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 1.5, 0.08),
    gradientMat({ emissive: 0.5 })
  );
  screen.position.set(0, 0.5, -0.75);
  screen.rotation.x = -0.15;
  group.add(screen);
  // code lines
  for (let i = 0; i < 5; i++) {
    const w = 1.4 + Math.random() * 0.4;
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.05, 0.01),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.b) })
    );
    line.position.set(-0.3 + (1.7 - w) / 2, 0.95 - i * 0.2, -0.7);
    line.rotation.x = -0.15;
    group.add(line);
  }
  group.userData.idleSpin = [0, 0.25, 0];
}

function buildDiploma(group) {
  // rolled scroll
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 2.2, 32),
    gradientMat({ emissive: 0.25 })
  );
  body.rotation.z = Math.PI / 2;
  group.add(body);
  const cap1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.2, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.b) })
  );
  cap1.rotation.z = Math.PI / 2;
  cap1.position.x = -1.1;
  group.add(cap1);
  const cap2 = cap1.clone();
  cap2.position.x = 1.1;
  group.add(cap2);
  // ribbon
  const ribbon = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.08, 16, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.accent) })
  );
  ribbon.rotation.y = Math.PI / 2;
  group.add(ribbon);
  group.userData.idleSpin = [0, 0.35, 0.1];
}

function buildTrophy(group) {
  const cup = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.0, 0),
      new THREE.Vector2(0.7, 0),
      new THREE.Vector2(0.8, 0.6),
      new THREE.Vector2(0.6, 0.9),
      new THREE.Vector2(0.65, 1.2),
      new THREE.Vector2(0.4, 1.25),
    ], 32),
    gradientMat({ emissive: 0.4 })
  );
  cup.position.y = 0.2;
  group.add(cup);
  // handles
  const h1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.06, 12, 24, Math.PI),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.b) })
  );
  h1.position.set(0.75, 0.9, 0);
  h1.rotation.z = Math.PI / 2;
  group.add(h1);
  const h2 = h1.clone();
  h2.position.x = -0.75;
  h2.rotation.z = -Math.PI / 2;
  group.add(h2);
  // base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.2, 1.0),
    gradientMat({ emissive: 0.2 })
  );
  base.position.y = -0.1;
  group.add(base);
  group.userData.idleSpin = [0, 0.4, 0];
}

function buildOrbit(group) {
  // Skills = torus knot with orbiting skill orbs
  const center = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16),
    gradientMat({ emissive: 0.4 })
  );
  group.add(center);
  const skills = ['SQL','PY','JS','GIT','LIN','C++','TBL','SHO'];
  skills.forEach((label, i) => {
    const angle = (i / skills.length) * Math.PI * 2;
    const r = 1.8;
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? palette.a : palette.b) })
    );
    orb.position.set(Math.cos(angle) * r, Math.sin(angle * 2) * 0.4, Math.sin(angle) * r);
    orb.userData.orbitAngle = angle;
    orb.userData.orbitRadius = r;
    orb.userData.isOrb = true;
    group.add(orb);
  });
  group.userData.idleSpin = [0.1, 0.2, 0];
}

function buildVolleyball(group) {
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0xf8f4e8, roughness: 0.5, metalness: 0.1 })
  );
  group.add(ball);
  // seams as rings
  for (let i = 0; i < 3; i++) {
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.015, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x222222 })
    );
    seam.rotation.x = (i * Math.PI) / 3;
    seam.rotation.z = (i * Math.PI) / 4;
    group.add(seam);
  }
  group.userData.idleSpin = [0.4, 0.3, 0.2];
}

// ——— Interaction ————————————————————————————————————————————

function onPointerMove(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function onClick() {
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(Object.values(sectionMeshes), true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.sectionId) o = o.parent;
    if (o) onSectionClick(o.userData.sectionId);
  }
}

function onResize() {
  const canvas = renderer.domElement;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

// ——— Loop ————————————————————————————————————————————

function animate() {
  raf = requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  // idle rotation per group
  Object.values(sectionMeshes).forEach(g => {
    const spin = g.userData.idleSpin || [0, 0.2, 0];
    g.rotation.x += spin[0] * dt;
    g.rotation.y += spin[1] * dt;
    g.rotation.z += spin[2] * dt;
    // gentle bob
    const base = g.userData.basePos;
    g.position.y = base[1] + Math.sin(t + base[0]) * 0.15;
    // scale pulse on hover
    const target = g.userData.sectionId === hoveredId ? 1.15 : 1;
    g.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    // shader time
    g.traverse(c => {
      if (c.material && c.material.uniforms && c.material.uniforms.time) {
        c.material.uniforms.time.value = t;
      }
      if (c.userData.isOrb) {
        c.userData.orbitAngle += dt * 0.5;
        const a = c.userData.orbitAngle;
        const r = c.userData.orbitRadius;
        c.position.set(Math.cos(a) * r, Math.sin(a * 2) * 0.4, Math.sin(a) * r);
      }
    });
  });

  // hover
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(Object.values(sectionMeshes), true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.sectionId) o = o.parent;
    hoveredId = o ? o.userData.sectionId : null;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    hoveredId = null;
    renderer.domElement.style.cursor = 'grab';
  }

  controls.update();
  renderer.render(scene, camera);

  // broadcast hover
  if (window.__onHoverChange) window.__onHoverChange(hoveredId);
}

export function flyTo(sectionId) {
  const g = sectionMeshes[sectionId];
  if (!g) return;
  const target = new THREE.Vector3(...g.userData.basePos);
  const camTarget = target.clone().add(new THREE.Vector3(0, 1.5, 5.5));
  const startCam = camera.position.clone();
  const startTarget = controls.target.clone();
  const duration = 1.0;
  let t0 = performance.now();
  function step() {
    const p = Math.min((performance.now() - t0) / (duration * 1000), 1);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    camera.position.lerpVectors(startCam, camTarget, e);
    controls.target.lerpVectors(startTarget, target, e);
    if (p < 1) requestAnimationFrame(step);
  }
  step();
}

export function setPalette(name) {
  palette = PALETTES[name] || PALETTES.teal;
  scene.traverse(obj => {
    if (obj.userData.isGrid) {
      obj.material.color.set(palette.a);
    }
    if (obj.userData.isParticles) {
      obj.material.color.set(palette.b);
    }
    if (obj.userData.isRim) {
      obj.color.set(palette.a);
    }
  });
  // rebuild meshes to pick up new shader colors (simpler than patching uniforms everywhere)
  buildScene();
}

export function setDark(on) {
  darkMode = on;
  setBg();
  scene.traverse(obj => {
    if (obj.userData.isGrid) {
      obj.material.opacity = darkMode ? 0.08 : 0.04;
    }
  });
}

export function getSections() { return SECTIONS; }
