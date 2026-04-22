import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const manager = new THREE.LoadingManager();

let camera, scene, renderer, stats, object, loader;
let mixer;

// Diccionario para almacenar nuestras animaciones
const actions = {};
let activeAction, previousAction;

// Usamos el Clock nativo de Three.js
const clock = new THREE.Clock();

// Configuración de archivos (Tu modelo base con piel)
const params = {
  baseModel: "character", 
};

// Lista de animaciones que descargaste "Without Skin"
const animations = [
  { key: '1', file: "Mma Kick" },
  { key: '2', file: "Boxing" },
  { key: '3', file: "Flair" },
  { key: '4', file: "Mutant punch" },
  { key: '5', file: "Running" }
];

init();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(100, 200, 300);

  // --- AMBIENTE OSCURO ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a); 
  scene.fog = new THREE.Fog(0x0f172a, 200, 1000);

  // Luces ajustadas para un ambiente más dramático
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 4);
  dirLight.position.set(0, 200, 100);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 180;
  dirLight.shadow.camera.bottom = -100;
  dirLight.shadow.camera.left = -120;
  dirLight.shadow.camera.right = 120;
  scene.add(dirLight);

  // Piso oscuro para que no deslumbre
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshPhongMaterial({ color: 0x1e293b, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Cuadrícula (Grid) en color azul neón
  const grid = new THREE.GridHelper(2000, 40, 0x38bdf8, 0x38bdf8);
  grid.material.opacity = 0.15;
  grid.material.transparent = true;
  scene.add(grid);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 100, 0);
  controls.update();

  window.addEventListener("resize", onWindowResize);
  
  // Escuchar eventos del teclado
  document.addEventListener("keydown", onKeyDown);

  // Estadísticas (FPS) 
  stats = new Stats();
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = '15px';
  stats.dom.style.left = '15px';
  container.appendChild(stats.dom);

  // Iniciar la carga del modelo
  loader = new FBXLoader(manager);
  loadBaseModelAndAnimations();
}

function loadBaseModelAndAnimations() {
  loader.load("./assets/models/fbx/" + params.baseModel + ".fbx", function (group) {
    object = group;
    
    object.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(object);
    mixer = new THREE.AnimationMixer(object);

    let loadedAnimations = 0;
    
    animations.forEach((anim) => {
      loader.load("./assets/models/fbx/" + anim.file + ".fbx", function (animGroup) {
        const clip = animGroup.animations[0];
        const action = mixer.clipAction(clip);
        
        actions[anim.key] = action;
        loadedAnimations++;

        // Si ya cargaron todas, iniciamos la primera animación y quitamos el loader
        if (loadedAnimations === animations.length) {
          fadeToAction('1', 0.5); // Inicia con Mma Kick
          
          const loadingEl = document.getElementById('loading');
          if(loadingEl) loadingEl.style.display = 'none';
        }
      });
    });
  });
}

// --- FUNCIÓN MEJORADA PARA TRANSICIÓN FLUIDA (CrossFade) ---
function fadeToAction(key, duration) {
  previousAction = activeAction;
  activeAction = actions[key];

  if (previousAction && previousAction !== activeAction) {
    // 1. Preparamos el nuevo movimiento
    activeAction.reset();
    activeAction.setEffectiveTimeScale(1);
    activeAction.setEffectiveWeight(1);
    
    // 2. Lo empezamos a reproducir "en el fondo"
    activeAction.play();
    
    // 3. Mezclamos suavemente el movimiento anterior hacia el nuevo
    previousAction.crossFadeTo(activeAction, duration, true);
    
  } else if (!previousAction) {
    // Solo para la primera vez que inicia la página
    activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  }

  updateUI(key);
}

// Función para capturar el teclado
function onKeyDown(event) {
  const key = event.key;
  if (actions[key] && actions[key] !== activeAction) {
    // Le damos 0.5 segundos al personaje para acomodarse entre animaciones
    fadeToAction(key, 0.5); 
  }
}

// Función para actualizar la interfaz
function updateUI(activeKey) {
  for(let i = 1; i <= 5; i++) {
    const el = document.getElementById(`ui-anim-${i}`);
    if (el) {
      if(i.toString() === activeKey) {
        el.classList.add('active-anim');
      } else {
        el.classList.remove('active-anim');
      }
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
  stats.update();
}