// Input adapters dispatch game commands; game state is deliberately not kept here.
import { GAME_CONFIG as config } from './config.js';

export const INPUT = Object.freeze({
  MOVE_LEFT: 'MoveLeft',
  MOVE_RIGHT: 'MoveRight',
  FIRE: 'Fire',
});

export function createKeyboardAndMouseInput(target, onInput) {
  const keyToInput = new Map([
    ['a', INPUT.MOVE_LEFT],
    ['arrowleft', INPUT.MOVE_LEFT],
    ['d', INPUT.MOVE_RIGHT],
    ['arrowright', INPUT.MOVE_RIGHT],
    [' ', INPUT.FIRE],
    ['spacebar', INPUT.FIRE],
  ]);

  const activeMovementKeys = new Map([
    [INPUT.MOVE_LEFT, new Set()],
    [INPUT.MOVE_RIGHT, new Set()],
  ]);
  let movementTimer;

  function dispatchHeldMovement() {
    for (const [input, keys] of activeMovementKeys) {
      if (keys.size > 0) onInput(input);
    }
  }

  function onKeyDown(event) {
    const input = keyToInput.get(event.key.toLowerCase());
    if (!input) return;
    event.preventDefault();
    if (input === INPUT.FIRE || event.repeat) {
      if (input === INPUT.FIRE && !event.repeat) onInput(input);
      return;
    }
    const keys = activeMovementKeys.get(input);
    if (keys.has(event.code)) return;
    keys.add(event.code);
    onInput(input);
    if (!movementTimer) {
      movementTimer = window.setInterval(dispatchHeldMovement, config.input.movementRepeatIntervalMs);
    }
  }

  function onKeyUp(event) {
    const input = keyToInput.get(event.key.toLowerCase());
    const keys = activeMovementKeys.get(input);
    if (!keys) return;
    keys.delete(event.code);
    if ([...activeMovementKeys.values()].every((activeKeys) => activeKeys.size === 0)) {
      window.clearInterval(movementTimer);
      movementTimer = undefined;
    }
  }

  function onWindowBlur() {
    for (const keys of activeMovementKeys.values()) keys.clear();
    window.clearInterval(movementTimer);
    movementTimer = undefined;
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    onInput(INPUT.FIRE);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onWindowBlur);
  target.addEventListener('pointerdown', onPointerDown);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onWindowBlur);
    onWindowBlur();
    target.removeEventListener('pointerdown', onPointerDown);
  };
}
