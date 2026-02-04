import * as THREE from "https://unpkg.com/three@0.159.0/build/three.module.js";

const canvas = document.getElementById("game");
const login = document.getElementById("login");
const joinButton = document.getElementById("join");
const usernameInput = document.getElementById("username");
const loadoutSelect = document.getElementById("loadout");
const statusEl = document.getElementById("status");
const playerEl = document.getElementById("player");
const healthEl = document.getElementById("health");
const ammoEl = document.getElementById("ammo");
const targetsEl = document.getElementById("targets");

const MAX_AMMO = 30;
const RESPAWN_DELAY = 2200;
const TARGET_COUNT = 8;

const keys = new Set();
let isLocked = false;
let isRunning = false;
let ammo = MAX_AMMO;
let health = 100;
let targetsHit = 0;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1d);

const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1200);
camera.position.set(0, 1.6, 6);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

const clock = new THREE.Clock();

const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1b2a3f });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x223a4f, metalness: 0.2, roughness: 0.8 });
const wallGeo = new THREE.BoxGeometry(80, 12, 1);
const wallNorth = new THREE.Mesh(wallGeo, wallMat);
wallNorth.position.set(0, 6, -40);
scene.add(wallNorth);
const wallSouth = wallNorth.clone();
wallSouth.position.set(0, 6, 40);
scene.add(wallSouth);
const wallEast = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 80), wallMat);
wallEast.position.set(40, 6, 0);
scene.add(wallEast);
const wallWest = wallEast.clone();
wallWest.position.set(-40, 6, 0);
scene.add(wallWest);

const light = new THREE.DirectionalLight(0xffffff, 1.1);
light.position.set(12, 18, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0x9db4ff, 0.4));

const props = [];
for (let i = 0; i < 12; i += 1) {
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 2.5, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x3a5266 })
  );
  crate.position.set((Math.random() - 0.5) * 50, 1.25, (Math.random() - 0.5) * 50);
  props.push(crate);
  scene.add(crate);
}

const targetMaterial = new THREE.MeshStandardMaterial({ color: 0xff7b6e });
const targetGeometry = new THREE.CylinderGeometry(0.6, 0.6, 2.4, 24);
const targets = [];

function spawnTarget() {
  const target = new THREE.Mesh(targetGeometry, targetMaterial.clone());
  target.position.set((Math.random() - 0.5) * 50, 1.2, (Math.random() - 0.5) * 50);
  target.userData.active = true;
  targets.push(target);
  scene.add(target);
}

for (let i = 0; i < TARGET_COUNT; i += 1) {
  spawnTarget();
}

const raycaster = new THREE.Raycaster();

function updateHud() {
  healthEl.textContent = `Health: ${health}`;
  ammoEl.textContent = `Ammo: ${ammo}`;
  targetsEl.textContent = `Targets: ${targetsHit} / ${TARGET_COUNT}`;
}

function lockPointer() {
  if (!isLocked) {
    canvas.requestPointerLock();
  }
}

function onPointerLockChange() {
  isLocked = document.pointerLockElement === canvas;
  if (!isLocked && isRunning) {
    statusEl.textContent = "Paused - press J to resume.";
  }
}

function onMouseMove(event) {
  if (!isLocked) return;
  const movementX = event.movementX || 0;
  const movementY = event.movementY || 0;

  camera.rotation.y -= movementX * 0.0025;
  camera.rotation.x -= movementY * 0.0025;
  camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
}

function shoot() {
  if (!isLocked || ammo <= 0) {
    statusEl.textContent = ammo <= 0 ? "Reload needed." : "Press J to deploy.";
    return;
  }
  ammo -= 1;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const activeTargets = targets.filter((target) => target.userData.active);
  const hits = raycaster.intersectObjects(activeTargets, false);
  if (hits.length) {
    const hitTarget = hits[0].object;
    hitTarget.userData.active = false;
    hitTarget.visible = false;
    targetsHit += 1;
    statusEl.textContent = "Target down.";
    if (targetsHit >= TARGET_COUNT) {
      statusEl.textContent = "Range cleared! Targets reset.";
      setTimeout(() => {
        targetsHit = 0;
        targets.forEach((target) => {
          target.position.set((Math.random() - 0.5) * 50, 1.2, (Math.random() - 0.5) * 50);
          target.userData.active = true;
          target.visible = true;
        });
        updateHud();
      }, RESPAWN_DELAY);
    } else {
      setTimeout(() => {
        hitTarget.position.set((Math.random() - 0.5) * 50, 1.2, (Math.random() - 0.5) * 50);
        hitTarget.userData.active = true;
        hitTarget.visible = true;
        updateHud();
      }, RESPAWN_DELAY);
    }
  }
  updateHud();
}

function reload() {
  if (!isLocked) return;
  ammo = MAX_AMMO;
  statusEl.textContent = "Reloaded.";
  updateHud();
}

function updateMovement(delta) {
  direction.set(0, 0, 0);
  if (keys.has("KeyW")) direction.z -= 1;
  if (keys.has("KeyS")) direction.z += 1;
  if (keys.has("KeyA")) direction.x -= 1;
  if (keys.has("KeyD")) direction.x += 1;
  direction.normalize();

  const speed = keys.has("ShiftLeft") ? 12 : 7;
  velocity.x = direction.x * speed * delta;
  velocity.z = direction.z * speed * delta;

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

  camera.position.addScaledVector(forward, velocity.z);
  camera.position.addScaledVector(right, velocity.x);

  camera.position.x = Math.max(-36, Math.min(36, camera.position.x));
  camera.position.z = Math.max(-36, Math.min(36, camera.position.z));
}

function animate() {
  if (!isRunning) return;
  const delta = clock.getDelta();
  if (isLocked) {
    updateMovement(delta);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function handleResize() {
  const { clientWidth, clientHeight } = canvas;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

function startGame() {
  const username = usernameInput.value.trim() || "Operator";
  const loadout = loadoutSelect.value;
  playerEl.textContent = `Operator: ${username} (${loadout})`;
  login.classList.add("hidden");
  isRunning = true;
  lockPointer();
  updateHud();
  statusEl.textContent = "Training live.";
  requestAnimationFrame(animate);
}

joinButton.addEventListener("click", startGame);
usernameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    startGame();
  }
});

window.addEventListener("resize", handleResize);
window.addEventListener("pointerlockchange", onPointerLockChange);
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mousedown", shoot);

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "KeyJ" && !login.classList.contains("hidden")) {
    startGame();
  }
  if (event.code === "KeyR") {
    reload();
  }
  if (event.code === "Escape") {
    document.exitPointerLock();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

updateHud();
