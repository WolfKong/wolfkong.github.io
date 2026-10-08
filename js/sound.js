import { GAME_CONFIG as config } from './config.js';

let audioContext;
let ambienceStarted = false;

function context() {
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

function playTone({ frequency, endFrequency = frequency, duration, type = 'sine', volume = config.sound.effectVolume }) {
  const audio = context();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), audio.currentTime + duration);
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

export function startAmbience() {
  const audio = context();
  if (audio.state === 'suspended') audio.resume();
  if (ambienceStarted) return;
  ambienceStarted = true;

  const drone = audio.createOscillator();
  const wobble = audio.createOscillator();
  const wobbleGain = audio.createGain();
  const gain = audio.createGain();
  drone.type = 'sine';
  drone.frequency.value = 54;
  wobble.type = 'sine';
  wobble.frequency.value = 0.08;
  wobbleGain.gain.value = 9;
  gain.gain.value = config.sound.ambienceVolume;
  wobble.connect(wobbleGain).connect(drone.frequency);
  drone.connect(gain).connect(audio.destination);
  wobble.start();
  drone.start();
}

export function playPlayerFire() {
  playTone({ frequency: 540, endFrequency: 920, duration: 0.09, type: 'square', volume: config.sound.effectVolume * 0.45 });
}

export function playEnemyDestroyed() {
  playTone({ frequency: 220, endFrequency: 80, duration: 0.16, type: 'sawtooth', volume: config.sound.effectVolume });
}

export function playPlayerDestroyed() {
  playTone({ frequency: 170, endFrequency: 30, duration: 0.38, type: 'sawtooth', volume: config.sound.effectVolume * 1.5 });
}
