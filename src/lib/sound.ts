/**
 * Rest-timer tone via the Web Audio API.
 *
 * iOS only allows audio after a user gesture, so `unlockAudio()` is called from
 * the "Log set" tap. iOS also suspends web apps in the background, so the tone
 * can only play while the app is open on screen.
 */
let ctx: AudioContext | null = null;

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    // Playing a silent buffer inside the gesture fully unlocks audio on iOS.
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Audio unavailable — the visual flash still works.
  }
}

/** Three short rising beeps. */
export function playRestTone(): void {
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.05;
    [880, 880, 1175].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t0 + i * 0.22;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  } catch {
    // ignore
  }
}
