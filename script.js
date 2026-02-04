import * as THREE from "https://unpkg.com/three@0.159.0/build/three.module.js";

const canvas = document.getElementById("game");
const login = document.getElementById("login");
const joinButton = document.getElementById("join");
const usernameInput = document.getElementById("username");
const loadoutSelect = document.getElementById("loadout");
const statusEl = document.getElementById("status");
const playerEl = document.getElementById("player");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("start");
const statusEl = document.getElementById("status");
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
scene.background = new THREE.Color(0x0b0e1d);

const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1200);
camera.position.set(0, 1.6, 6);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

const clock = new THREE.Clock();

const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1b2a3f });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1d2b3f });
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
    statusEl.textContent = "Paused - press join to resume.";
  }
  overlay.classList.toggle("hidden", isLocked);
  statusEl.textContent = isLocked ? "Training live." : "Paused - click deploy to resume.";
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
    statusEl.textContent = ammo <= 0 ? "Reload needed." : "Press join to deploy.";
    statusEl.textContent = ammo <= 0 ? "Reload needed." : "Deploy to fire.";
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
startButton.addEventListener("click", () => {
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
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");

const GRAVITY = 0.5;
const JUMP_VELOCITY = -11;
const MOVE_SPEED = 4.2;

const keyState = new Set();
let lastTime = 0;
let running = false;
let paused = false;

const levels = [
  {
    playerStart: { x: 70, y: 300 },
    platforms: [
      { x: 0, y: 460, w: 960, h: 80 },
      { x: 120, y: 380, w: 140, h: 22 },
      { x: 330, y: 320, w: 160, h: 20 },
      { x: 560, y: 270, w: 130, h: 20 },
      { x: 730, y: 210, w: 160, h: 20 },
    ],
    gems: [
      { x: 165, y: 340 },
      { x: 385, y: 280 },
      { x: 600, y: 230 },
      { x: 780, y: 170 },
      { x: 880, y: 420 },
    ],
    enemies: [
      { x: 420, y: 290, minX: 320, maxX: 520 },
      { x: 700, y: 180, minX: 680, maxX: 860 },
    ],
  },
  {
    playerStart: { x: 40, y: 300 },
    platforms: [
      { x: 0, y: 470, w: 960, h: 70 },
      { x: 80, y: 390, w: 200, h: 22 },
      { x: 320, y: 330, w: 120, h: 20 },
      { x: 500, y: 280, w: 160, h: 20 },
      { x: 720, y: 240, w: 200, h: 20 },
      { x: 620, y: 390, w: 120, h: 20 },
    ],
    gems: [
      { x: 140, y: 350 },
      { x: 350, y: 290 },
      { x: 550, y: 240 },
      { x: 760, y: 200 },
      { x: 640, y: 350 },
    ],
    enemies: [
      { x: 240, y: 350, minX: 120, maxX: 260 },
      { x: 560, y: 240, minX: 500, maxX: 640 },
      { x: 800, y: 200, minX: 720, maxX: 900 },
    ],
  },
];

const state = {
  levelIndex: 0,
  score: 0,
  lives: 3,
  player: null,
  gems: [],
  enemies: [],
};

function buildLevel(index) {
  const level = levels[index];
  state.player = {
    x: level.playerStart.x,
    y: level.playerStart.y,
    w: 32,
    h: 40,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
  };
  state.gems = level.gems.map((gem) => ({ ...gem, r: 8, collected: false }));
  state.enemies = level.enemies.map((enemy) => ({
    ...enemy,
    w: 32,
    h: 26,
    dir: 1,
    speed: 1.3 + Math.random() * 0.8,
  }));
}

function resetGame() {
  state.levelIndex = 0;
  state.score = 0;
  state.lives = 3;
  buildLevel(0);
  updateHud();
}

function updateHud() {
  scoreEl.textContent = `Score: ${state.score}`;
  livesEl.textContent = `Lives: ${state.lives}`;
  levelEl.textContent = `Level: ${state.levelIndex + 1}`;
}

function startGame() {
  if (!running) {
    running = true;
    resetGame();
    statusEl.textContent = "Collect all gems to clear the level!";
    requestAnimationFrame(loop);
  }
}

function togglePause() {
  if (!running) {
    return;
  }
  paused = !paused;
  statusEl.textContent = paused ? "Paused" : "Back in action!";
}

function loseLife() {
  state.lives -= 1;
  if (state.lives <= 0) {
    statusEl.textContent = "Game Over! Press Space to try again.";
    running = false;
    paused = false;
  } else {
    statusEl.textContent = "Ouch! Watch out for stompers.";
    buildLevel(state.levelIndex);
  }
  updateHud();
}

function completeLevel() {
  state.levelIndex += 1;
  if (state.levelIndex >= levels.length) {
    statusEl.textContent = "Victory! You collected every jumbo gem.";
    running = false;
  } else {
    statusEl.textContent = "Level cleared! Next up...";
    buildLevel(state.levelIndex);
  }
  updateHud();
}

function handleInput() {
  const player = state.player;
  let moving = false;
  if (keyState.has("ArrowLeft") || keyState.has("KeyA")) {
    player.vx = -MOVE_SPEED;
    player.facing = -1;
    moving = true;
  }
  if (keyState.has("ArrowRight") || keyState.has("KeyD")) {
    player.vx = MOVE_SPEED;
    player.facing = 1;
    moving = true;
  }
  if (!moving) {
    player.vx *= 0.8;
    if (Math.abs(player.vx) < 0.1) {
      player.vx = 0;
    }
  }
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function updatePlayer(dt, platforms) {
  const player = state.player;
  handleInput();
  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;
  player.grounded = false;

  platforms.forEach((plat) => {
    if (intersects(player, plat)) {
      const overlapY = player.y + player.h - plat.y;
      const prevY = player.y - player.vy;
      if (prevY + player.h <= plat.y + 4 && overlapY >= 0) {
        player.y = plat.y - player.h;
        player.vy = 0;
        player.grounded = true;
      } else if (player.y <= plat.y + plat.h) {
        if (player.x + player.w / 2 < plat.x + plat.w / 2) {
          player.x = plat.x - player.w;
        } else {
          player.x = plat.x + plat.w;
        }
        player.vx = 0;
      }
    }
  });

  if (player.y > canvas.height) {
    loseLife();
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
}

function updateEnemies() {
  const player = state.player;
  state.enemies.forEach((enemy) => {
    enemy.x += enemy.dir * enemy.speed;
    if (enemy.x <= enemy.minX || enemy.x + enemy.w >= enemy.maxX) {
      enemy.dir *= -1;
    }

    if (intersects(player, enemy)) {
      if (player.vy > 1 && player.y + player.h - enemy.y < 14) {
        enemy.hit = true;
        player.vy = JUMP_VELOCITY * 0.7;
        state.score += 120;
      } else {
        loseLife();
      }
    }
  });
  state.enemies = state.enemies.filter((enemy) => !enemy.hit);
}

function updateGems() {
  const player = state.player;
  state.gems.forEach((gem) => {
    const gemBox = { x: gem.x - gem.r, y: gem.y - gem.r, w: gem.r * 2, h: gem.r * 2 };
    if (!gem.collected && intersects(player, gemBox)) {
      gem.collected = true;
      state.score += 80;
    }
  });
  if (state.gems.every((gem) => gem.collected)) {
    completeLevel();
  }
}

function update(dt) {
  const level = levels[state.levelIndex];
  updatePlayer(dt, level.platforms);
  updateEnemies();
  updateGems();
  updateHud();
}

function drawBackground() {
  ctx.fillStyle = "rgba(11, 12, 20, 0.12)";
  for (let i = 0; i < 20; i += 1) {
    ctx.fillRect(i * 48, 50 + (i % 2) * 10, 30, 8);
  }
}

function drawPlatforms() {
  const level = levels[state.levelIndex];
  level.platforms.forEach((plat) => {
    ctx.fillStyle = "#2d5e36";
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.fillStyle = "#3d7a48";
    ctx.fillRect(plat.x, plat.y, plat.w, 6);
  });
}

function drawPlayer() {
  const player = state.player;
  ctx.fillStyle = "#ffcc6f";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = "#30231c";
  ctx.fillRect(player.x + 6, player.y + 10, 6, 6);
  ctx.fillRect(player.x + 18, player.y + 10, 6, 6);
  ctx.fillStyle = "#f07c5d";
  ctx.fillRect(player.x + 10, player.y + 26, 12, 6);
  ctx.fillStyle = "#e93d4b";
  ctx.fillRect(player.x + 4, player.y + 34, 24, 4);
  ctx.fillStyle = "#3b2f49";
  if (player.facing === 1) {
    ctx.fillRect(player.x + 22, player.y + 22, 6, 6);
  } else {
    ctx.fillRect(player.x + 4, player.y + 22, 6, 6);
  }
}

function drawGems() {
  state.gems.forEach((gem) => {
    if (gem.collected) return;
    ctx.beginPath();
    ctx.fillStyle = "#ffe27a";
    ctx.arc(gem.x, gem.y, gem.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6c7";
    ctx.beginPath();
    ctx.arc(gem.x - 2, gem.y - 2, gem.r / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  state.enemies.forEach((enemy) => {
    ctx.fillStyle = "#6a4c93";
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = "#f7f4f8";
    ctx.fillRect(enemy.x + 6, enemy.y + 6, 6, 6);
    ctx.fillRect(enemy.x + enemy.w - 12, enemy.y + 6, 6, 6);
    ctx.fillStyle = "#2b1d3a";
    ctx.fillRect(enemy.x + 8, enemy.y + 18, enemy.w - 16, 4);
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlatforms();
  drawGems();
  drawEnemies();
  drawPlayer();
}

function loop(timestamp) {
  if (!running) {
    return;
  }
  if (!paused) {
    const delta = (timestamp - lastTime) / 16.6;
    lastTime = timestamp;
    update(delta);
    draw();
  }
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (!running) {
      startGame();
      return;
    }
    if (state.player && state.player.grounded) {
      state.player.vy = JUMP_VELOCITY;
      state.player.grounded = false;
    }
  }
  if (event.code === "KeyP") {
    togglePause();
  }
  keyState.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keyState.delete(event.code);
});

statusEl.textContent = "Press Space to start!";
