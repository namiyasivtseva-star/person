import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ================= Кресты: вращение, вспышка, карточка ================= */
document.querySelectorAll('.slot').forEach(slot => {
  const cross = slot.querySelector('.cross');
  const card = slot.querySelector('.card');
  const stage = slot.querySelector('.stage');

  cross.addEventListener('click', () => {
    cross.classList.add('spin');
    const flash = document.createElement('div');
    flash.className = 'flash';
    stage.appendChild(flash);
    setTimeout(() => {
      cross.style.display = 'none';
      cross.classList.remove('spin');
      card.classList.add('show');
    }, 650);
    setTimeout(() => flash.remove(), 900);
  });

  slot.querySelector('.x').addEventListener('click', () => {
    card.classList.remove('show');
    cross.style.display = '';
  });
});

/* ================= 3D-сцена ================= */
if (!matchMedia('(max-width: 1023px), (pointer: coarse)').matches) initScene();

function initScene() {
  const canvas = document.getElementById('scene');
  const hero = document.querySelector('.hero');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  // окружение для отражений (PBR-материалы модели)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 8.2);

  // мрачный свет: холодный сверху-спереди и красные контровые
  scene.add(new THREE.AmbientLight(0x442222, 0.6));
  const key = new THREE.DirectionalLight(0xdfe6ff, 2.2);
  key.position.set(2, 4, 5);
  scene.add(key);
  const redL = new THREE.PointLight(0xff1a2a, 90, 14);
  redL.position.set(-3.5, 1, -2.5);
  scene.add(redL);
  const redR = new THREE.PointLight(0xc00a18, 70, 14);
  redR.position.set(3.5, -0.5, -2.5);
  scene.add(redR);

  // pivot вращается только вокруг вертикальной оси Y (влево-вправо)
  const pivot = new THREE.Group();
  scene.add(pivot);

  new GLTFLoader().load(
    'skeleton.glb',
    gltf => {
      const model = gltf.scene;
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      model.scale.setScalar(3.6 / size.y);          // высота модели
      box = new THREE.Box3().setFromObject(model);
      const c = box.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -c.y, -c.z);
      pivot.add(model);
      pivot.position.y = -0.25;
      document.getElementById('loader').classList.add('hidden');
    },
    undefined,
    err => {
      console.error(err);
      document.getElementById('loader').textContent =
        'Не удалось загрузить модель. Откройте сайт через Live Server.';
    }
  );

  /* ---- управление мышью ---- */
  let dragging = false, lastX = 0, velocity = 0, idleSince = performance.now();
  const AUTO_SPEED = 0.004;
  const IDLE_DELAY = 1500;

  canvas.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; velocity = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    pivot.rotation.y += dx * 0.01;
    velocity = dx * 0.01;
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    idleSince = performance.now();
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  renderer.setAnimationLoop(() => {
    if (!dragging) {
      if (Math.abs(velocity) > 0.0005) {
        pivot.rotation.y += velocity;
        velocity *= 0.94;
        idleSince = performance.now();
      } else if (performance.now() - idleSince > IDLE_DELAY) {
        pivot.rotation.y += AUTO_SPEED;
      }
    }
    renderer.render(scene, camera);
  });
}
