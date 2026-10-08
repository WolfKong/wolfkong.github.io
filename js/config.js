// Central place for values that tune the game.
export const GAME_CONFIG = Object.freeze({
  canvas: { width: 960, height: 720 },
  input: {
    movementRepeatIntervalMs: 70,
  },
  background: {
    starCount: 85,
    colors: ['#26375f', '#3c4e76', '#5a6684'],
  },
  player: {
    size: 34,
    bottomOffset: 42,
    moveStep: 24,
    color: '#79d9ff',
    startingLives: 3,
    hudShipSize: 26,
    hudShipGap: 10,
    hudMargin: 24,
    explosion: {
      particleCount: 16,
      particleSpeed: 150,
      particleLifetime: 0.35,
      particleSize: 5,
      color: '#d8f7ff',
    },
  },
  projectile: {
    width: 6,
    height: 18,
    speed: 520, // pixels per second
    spawnOffsetY: 12,
    color: '#f5fbff',
  },
  armada: {
    startY: 72,
    speed: 105, // pixels per second
    enemySize: 36,
    horizontalGap: 18,
    verticalGap: 18,
    // One string per row; 1 creates an enemy and 0 leaves the slot empty.
    layout: [
      '000101000',
      '001111100',
      '011111110',
      '111111111',
      '111111111',
      '111111111',
    ],
    colors: { firstRow: '#f4df4e', thirdRow: '#58d66c', otherRows: '#ef4d58' },
  },
  attackingEnemy: {
    launchIntervalMinimum: 2.5,
    launchIntervalMaximumIncrement: 3.5,
    downwardSpeed: 95,
    horizontalSpeed: 128,
    directionChangeIntervalMinimum: 0.6,
    directionChangeIntervalMaximumIncrement: 1.2,
    fireInterval: 1.1,
  },
  enemyProjectile: {
    width: 6,
    height: 16,
    speed: 310,
    spawnOffsetY: 8,
    color: '#ffad42',
  },
  score: {
    enemyDestroyed: 10,
  },
  sound: {
    ambienceVolume: 0.025,
    effectVolume: 0.09,
  },
  // These values are applied once for every wave after the first.
  waveIncrements: {
    armadaSpeed: 20,
    attackingEnemyDownwardSpeed: 22,
    attackingEnemyHorizontalSpeed: 18,
    attackingEnemyFireInterval: -0.13,
    attackingEnemyLaunchIntervalMinimum: -0.25,
    attackingEnemyLaunchIntervalMaximumIncrement: -0.3,
    minimumFireInterval: 0.35,
    minimumLaunchInterval: 0.55,
    minimumLaunchIntervalIncrement: 0.6,
  },
});
