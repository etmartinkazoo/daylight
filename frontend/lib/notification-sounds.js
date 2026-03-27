// Notification sounds using Web Audio API — no audio files needed.
// Three options: "chime" (default), "soft", and "subtle".

let audioCtx = null;

function getContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(frequency, duration, volume, type = "sine", detune = 0) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  if (detune) osc.detune.value = detune;

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

const sounds = {
  // Bright two-tone chime
  chime() {
    playTone(880, 0.15, 0.08, "sine");
    setTimeout(() => playTone(1174.66, 0.2, 0.06, "sine"), 100);
  },

  // Soft single-tone ping
  soft() {
    playTone(660, 0.25, 0.04, "sine");
  },

  // Very subtle low tap
  subtle() {
    playTone(440, 0.12, 0.025, "triangle");
  },
};

const STORAGE_KEY = "daylight:notification-sound";

export function getNotificationSound() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "chime";
  } catch {
    return "chime";
  }
}

export function setNotificationSound(name) {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {}
}

export function playNotificationSound(name) {
  const soundName = name || getNotificationSound();
  if (soundName === "none") return;
  try {
    (sounds[soundName] || sounds.chime)();
  } catch {}
}

export function previewSound(name) {
  try {
    (sounds[name] || sounds.chime)();
  } catch {}
}

export const soundOptions = [
  { value: "chime", label: "Chime" },
  { value: "soft", label: "Soft" },
  { value: "subtle", label: "Subtle" },
  { value: "none", label: "None" },
];
