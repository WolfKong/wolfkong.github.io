import { GAME_CONFIG as config } from './config.js';
import { INPUT, createKeyboardAndMouseInput } from './input.js';
import { playEnemyDestroyed, playPlayerDestroyed, playPlayerFire, startAmbience } from './sound.js';

const canvas = document.querySelector('#game-canvas');
const startScreen = document.querySelector('#start-screen');
const gameOverScreen = document.querySelector('#game-over-screen');
const gameOverSummary = document.querySelector('#game-over-summary');
canvas.width = config.canvas.width;
canvas.height = config.canvas.height;
const context = canvas.getContext('2d');

const { enemySize, horizontalGap, verticalGap, layout } = config.armada;
const armadaWidth = layout[0].length * enemySize + (layout[0].length - 1) * horizontalGap;
const centerPlayer = () => (canvas.width - config.player.size) / 2;
const randomAfter = (minimum, maximumIncrement) => minimum + Math.random() * maximumIncrement;

function createEnemies() {
  return layout.flatMap((row, rowIndex) => [...row].flatMap((occupied, columnIndex) => (
    occupied === '1' ? [{ row: rowIndex, column: columnIndex, attacking: false }] : []
  )));
}

function createStars() {
  return Array.from({ length: config.background.starCount }, () => ({
    x: Math.floor(Math.random() * canvas.width),
    y: Math.floor(Math.random() * canvas.height),
    size: Math.random() < 0.13 ? 2 : 1,
    color: config.background.colors[Math.floor(Math.random() * config.background.colors.length)],
  }));
}

const game = {
  status: 'start',
  time: 0,
  wave: 1,
  score: 0,
  player: { x: centerPlayer(), y: canvas.height - config.player.bottomOffset - config.player.size, lives: config.player.startingLives },
  projectiles: [],
  enemyProjectiles: [],
  explosionParticles: [],
  enemies: [],
  armada: { x: 0, direction: 1 },
  nextEnemyLaunch: 0,
  stars: createStars(),
};

function waveSettings() {
  const multiplier = game.wave - 1;
  const increment = config.waveIncrements;
  return {
    armadaSpeed: config.armada.speed + multiplier * increment.armadaSpeed,
    downwardSpeed: config.attackingEnemy.downwardSpeed + multiplier * increment.attackingEnemyDownwardSpeed,
    horizontalSpeed: config.attackingEnemy.horizontalSpeed + multiplier * increment.attackingEnemyHorizontalSpeed,
    fireInterval: Math.max(increment.minimumFireInterval, config.attackingEnemy.fireInterval + multiplier * increment.attackingEnemyFireInterval),
    launchMinimum: Math.max(increment.minimumLaunchInterval, config.attackingEnemy.launchIntervalMinimum + multiplier * increment.attackingEnemyLaunchIntervalMinimum),
    launchIncrement: Math.max(increment.minimumLaunchIntervalIncrement, config.attackingEnemy.launchIntervalMaximumIncrement + multiplier * increment.attackingEnemyLaunchIntervalMaximumIncrement),
  };
}

function enemyHomePosition(enemy) {
  return {
    x: game.armada.x + enemy.column * (enemySize + horizontalGap),
    y: config.armada.startY + enemy.row * (enemySize + verticalGap),
  };
}

function enemyColor(enemy) {
  if (enemy.row === 0) return config.armada.colors.firstRow;
  if (enemy.row === 2) return config.armada.colors.thirdRow;
  return config.armada.colors.otherRows;
}

function scheduleEnemyLaunch() {
  const settings = waveSettings();
  game.nextEnemyLaunch = game.time + randomAfter(settings.launchMinimum, settings.launchIncrement);
}

function resetGame() {
  startAmbience();
  game.status = 'playing';
  game.time = 0;
  game.wave = 1;
  game.score = 0;
  game.player.x = centerPlayer();
  game.player.lives = config.player.startingLives;
  game.explosionParticles = [];
  beginWave();
  startScreen.classList.add('is-hidden');
  gameOverScreen.classList.add('is-hidden');
}

function beginWave() {
  game.enemies = createEnemies();
  game.projectiles = [];
  game.enemyProjectiles = [];
  game.armada.x = (canvas.width - armadaWidth) / 2;
  game.armada.direction = 1;
  scheduleEnemyLaunch();
}

function handleInput(input) {
  if (game.status !== 'playing' || game.player.lives <= 0) return;
  if (input === INPUT.MOVE_LEFT) game.player.x -= config.player.moveStep;
  if (input === INPUT.MOVE_RIGHT) game.player.x += config.player.moveStep;
  if (input === INPUT.FIRE) {
    game.projectiles.push({
      x: game.player.x + (config.player.size - config.projectile.width) / 2,
      y: game.player.y - config.projectile.spawnOffsetY,
    });
    playPlayerFire();
  }
  game.player.x = Math.max(0, Math.min(canvas.width - config.player.size, game.player.x));
}

createKeyboardAndMouseInput(canvas, handleInput);
document.querySelector('#start-button').addEventListener('click', resetGame);
document.querySelector('#restart-button').addEventListener('click', resetGame);

function update(deltaSeconds) {
  game.time += deltaSeconds;
  updateArmada(deltaSeconds);
  launchEnemyIfDue();
  updateAttackingEnemies(deltaSeconds);
  updateProjectiles(deltaSeconds);
  updateExplosionParticles(deltaSeconds);
  resolveCollisions();
}

function updateArmada(deltaSeconds) {
  const nextX = game.armada.x + game.armada.direction * waveSettings().armadaSpeed * deltaSeconds;
  if (nextX <= 0) {
    game.armada.x = 0;
    game.armada.direction = 1;
  } else if (nextX + armadaWidth >= canvas.width) {
    game.armada.x = canvas.width - armadaWidth;
    game.armada.direction = -1;
  } else {
    game.armada.x = nextX;
  }
}

function hasAllFourNeighbours(enemy) {
  const positions = new Set(game.enemies.filter((other) => !other.attacking)
    .map((other) => other.row + ',' + other.column));
  return [[-1, 0], [1, 0], [0, -1], [0, 1]]
    .every(([rowOffset, columnOffset]) => positions.has((enemy.row + rowOffset) + ',' + (enemy.column + columnOffset)));
}

function launchEnemyIfDue() {
  if (game.time < game.nextEnemyLaunch) return;
  const exposedEnemies = game.enemies.filter((enemy) => !enemy.attacking && !hasAllFourNeighbours(enemy));
  const candidates = exposedEnemies.length > 0 ? exposedEnemies : game.enemies.filter((enemy) => !enemy.attacking);
  if (candidates.length > 0) {
    const enemy = candidates[Math.floor(Math.random() * candidates.length)];
    const home = enemyHomePosition(enemy);
    enemy.attacking = true;
    enemy.x = home.x;
    enemy.y = home.y;
    enemy.direction = enemy.column < 4 ? -1 : enemy.column > 4 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    enemy.nextDirectionChange = game.time + randomAfter(
      config.attackingEnemy.directionChangeIntervalMinimum,
      config.attackingEnemy.directionChangeIntervalMaximumIncrement,
    );
    enemy.nextFire = game.time + waveSettings().fireInterval;
  }
  scheduleEnemyLaunch();
}

function updateAttackingEnemies(deltaSeconds) {
  const settings = waveSettings();
  for (const enemy of game.enemies) {
    if (!enemy.attacking) continue;
    enemy.y += settings.downwardSpeed * deltaSeconds;
    enemy.x += enemy.direction * settings.horizontalSpeed * deltaSeconds;
    if (enemy.x <= 0 || enemy.x + enemySize >= canvas.width) {
      enemy.x = Math.max(0, Math.min(canvas.width - enemySize, enemy.x));
      enemy.direction *= -1;
    }
    if (game.time >= enemy.nextDirectionChange) {
      enemy.direction = directionTowardsPlayer(enemy);
      enemy.nextDirectionChange = game.time + randomAfter(
        config.attackingEnemy.directionChangeIntervalMinimum,
        config.attackingEnemy.directionChangeIntervalMaximumIncrement,
      );
    }
    if (game.time >= enemy.nextFire) {
      game.enemyProjectiles.push({
        x: enemy.x + (enemySize - config.enemyProjectile.width) / 2,
        y: enemy.y + enemySize + config.enemyProjectile.spawnOffsetY,
      });
      enemy.nextFire += settings.fireInterval;
    }
    if (enemy.y + enemySize >= canvas.height) enemy.attacking = false;
  }
}

function directionTowardsPlayer(enemy) {
  const playerCenter = game.player.x + config.player.size / 2;
  const enemyCenter = enemy.x + enemySize / 2;
  return Math.sign(playerCenter - enemyCenter) || enemy.direction;
}

function updateProjectiles(deltaSeconds) {
  for (const projectile of game.projectiles) projectile.y -= config.projectile.speed * deltaSeconds;
  for (const projectile of game.enemyProjectiles) projectile.y += config.enemyProjectile.speed * deltaSeconds;
  game.projectiles = game.projectiles.filter((projectile) => projectile.y + config.projectile.height >= 0);
  game.enemyProjectiles = game.enemyProjectiles.filter((projectile) => projectile.y <= canvas.height);
}

function updateExplosionParticles(deltaSeconds) {
  for (const particle of game.explosionParticles) {
    particle.x += particle.velocityX * deltaSeconds;
    particle.y += particle.velocityY * deltaSeconds;
    particle.life -= deltaSeconds;
  }
  game.explosionParticles = game.explosionParticles.filter((particle) => particle.life > 0);
}

function overlaps(first, second) {
  return first.x < second.x + second.width && first.x + first.width > second.x
    && first.y < second.y + second.height && first.y + first.height > second.y;
}

function enemyBounds(enemy) {
  const position = enemy.attacking ? enemy : enemyHomePosition(enemy);
  return { x: position.x, y: position.y, width: enemySize, height: enemySize };
}

function resolveCollisions() {
  const hitEnemyIndexes = new Set();
  const hitPlayerProjectileIndexes = new Set();
  game.projectiles.forEach((projectile, projectileIndex) => {
    const projectileBounds = { ...projectile, width: config.projectile.width, height: config.projectile.height };
    const enemyIndex = game.enemies.findIndex((enemy, index) => !hitEnemyIndexes.has(index)
      && overlaps(projectileBounds, enemyBounds(enemy)));
    if (enemyIndex !== -1) {
      hitEnemyIndexes.add(enemyIndex);
      hitPlayerProjectileIndexes.add(projectileIndex);
    }
  });
  if (hitEnemyIndexes.size > 0) {
    game.score += hitEnemyIndexes.size * config.score.enemyDestroyed;
    playEnemyDestroyed();
  }
  game.enemies = game.enemies.filter((_, index) => !hitEnemyIndexes.has(index));
  game.projectiles = game.projectiles.filter((_, index) => !hitPlayerProjectileIndexes.has(index));

  if (game.enemies.length === 0) {
    game.wave += 1;
    beginWave();
    return;
  }

  const playerBounds = { x: game.player.x, y: game.player.y, width: config.player.size, height: config.player.size };
  const hitEnemyProjectile = game.enemyProjectiles.findIndex((projectile) => overlaps(playerBounds, {
    ...projectile, width: config.enemyProjectile.width, height: config.enemyProjectile.height,
  }));
  if (hitEnemyProjectile !== -1) {
    game.enemyProjectiles.splice(hitEnemyProjectile, 1);
    destroyPlayer();
    return;
  }

  const collidingEnemyIndex = game.enemies.findIndex((enemy) => enemy.attacking && overlaps(playerBounds, enemyBounds(enemy)));
  if (collidingEnemyIndex !== -1) {
    game.enemies.splice(collidingEnemyIndex, 1);
    destroyPlayer();
  }
}

function destroyPlayer() {
  createPlayerExplosion();
  playPlayerDestroyed();
  game.player.lives -= 1;
  game.player.x = centerPlayer();
  if (game.player.lives === 0) endGame();
}

function createPlayerExplosion() {
  const { particleCount, particleSpeed, particleLifetime } = config.player.explosion;
  const centerX = game.player.x + config.player.size / 2;
  const centerY = game.player.y + config.player.size / 2;
  for (let index = 0; index < particleCount; index += 1) {
    const angle = (Math.PI * 2 * index) / particleCount + (Math.random() - 0.5) * 0.25;
    const speed = particleSpeed * (0.5 + Math.random() * 0.5);
    game.explosionParticles.push({
      x: centerX,
      y: centerY,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      life: particleLifetime,
    });
  }
}

function endGame() {
  game.status = 'game-over';
  gameOverSummary.textContent = 'Score: ' + game.score + ' · Wave: ' + game.wave;
  gameOverScreen.classList.remove('is-hidden');
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();
  drawHud();
  drawEnemies();
  drawProjectiles();
  drawExplosionParticles();
  if (game.status === 'playing' && game.player.lives > 0) drawShip(game.player.x, game.player.y, config.player.size);
}

function drawHud() {
  context.fillStyle = '#f3f7ff';
  context.font = 'bold 34px system-ui';
  context.textBaseline = 'top';
  context.fillText('Score: ' + game.score, 24, 20);
  context.font = 'bold 26px system-ui';
  context.textBaseline = 'bottom';
  context.fillText('Wave ' + game.wave, 24, canvas.height - 24);
  const { hudShipSize, hudShipGap, hudMargin } = config.player;
  const width = game.player.lives * hudShipSize + Math.max(0, game.player.lives - 1) * hudShipGap;
  for (let index = 0; index < game.player.lives; index += 1) {
    drawShip(canvas.width - hudMargin - width + index * (hudShipSize + hudShipGap), canvas.height - hudMargin - hudShipSize, hudShipSize);
  }
}

function drawStars() {
  for (const star of game.stars) {
    context.fillStyle = star.color;
    context.fillRect(star.x, star.y, star.size, star.size);
  }
}

function drawShip(x, y, size) {
  context.fillStyle = config.player.color;
  const pixel = size / 8;
  const pattern = ['00011000', '00111100', '01111110', '11111111', '11111111', '01100110', '00100100', '01000010'];
  pattern.forEach((row, rowIndex) => {
    [...row].forEach((filled, columnIndex) => {
      if (filled === '1') context.fillRect(x + columnIndex * pixel, y + rowIndex * pixel, pixel + 0.5, pixel + 0.5);
    });
  });
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    const bounds = enemyBounds(enemy);
    drawAlien(bounds.x, bounds.y, bounds.width, enemy);
  }
}

function drawAlien(x, y, size, enemy) {
  const color = enemyColor(enemy);
  const pixel = size / 8;
  const pattern = enemy.attacking
    ? ['00111100', '01111110', '11111111', '10111101', '11111111', '01111110', '01011010', '10000001']
    : enemy.column % 2 === 0
      ? ['00111100', '01111110', '11111111', '11011011', '11111111', '00100100', '01000010', '10000001']
      : ['00011000', '00111100', '01111110', '11011011', '11111111', '01111110', '01011010', '10100101'];
  context.fillStyle = color;
  pattern.forEach((row, rowIndex) => {
    [...row].forEach((filled, columnIndex) => {
      if (filled === '1') context.fillRect(x + columnIndex * pixel, y + rowIndex * pixel, pixel + 0.5, pixel + 0.5);
    });
  });
}

function drawProjectiles() {
  context.fillStyle = config.projectile.color;
  for (const projectile of game.projectiles) {
    context.fillRect(projectile.x, projectile.y, config.projectile.width, config.projectile.height);
  }
  context.fillStyle = config.enemyProjectile.color;
  for (const projectile of game.enemyProjectiles) {
    context.fillRect(projectile.x, projectile.y, config.enemyProjectile.width, config.enemyProjectile.height);
  }
}

function drawExplosionParticles() {
  const { particleLifetime, particleSize, color } = config.player.explosion;
  context.fillStyle = color;
  for (const particle of game.explosionParticles) {
    context.globalAlpha = particle.life / particleLifetime;
    context.fillRect(particle.x - particleSize / 2, particle.y - particleSize / 2, particleSize, particleSize);
  }
  context.globalAlpha = 1;
}

let lastFrameTime = performance.now();
function gameLoop(now) {
  const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.1);
  lastFrameTime = now;
  if (game.status === 'playing') update(deltaSeconds);
  else updateExplosionParticles(deltaSeconds);
  draw();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
