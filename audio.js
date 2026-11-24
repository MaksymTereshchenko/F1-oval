(() => {
const STORAGE_KEY = 'f1_oval_volume_v1';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.delayNode = null;
    this.noiseBuffer = null;

    const saved = localStorage.getItem(STORAGE_KEY);
    this.volume = saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.45;
    if (Number.isNaN(this.volume)) this.volume = 0.45;
    this.muted = this.volume === 0;

    this.isPlaying = false;
    this.schedulerId = null;
    this.nextNoteTime = 0;
    this.currentStep = 0;
    this.tempo = 126; // BPM
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.getEffectiveGain();
      this.masterGain.connect(this.ctx.destination);

      // Gentle echo delay for synth melody
      this.delayNode = this.ctx.createDelay(0.5);
      this.delayNode.delayTime.value = (60 / this.tempo) * 0.75; // dotted 8th feel
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.value = 0.28;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1800;

      this.delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(this.delayNode);
      delayFilter.connect(this.masterGain);

      // Short white noise buffer for crisp hi-hats & snare
      const bufSize = Math.floor(this.ctx.sampleRate * 0.25);
      this.noiseBuffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.isPlaying) {
      this.startMusic();
    }
  }

  getEffectiveGain() {
    if (this.muted || this.volume <= 0) return 0;
    // Perceptual curve, comfortable max level
    return this.volume * this.volume * 0.48;
  }

  setVolume(vol01) {
    this.volume = Math.max(0, Math.min(1, vol01));
    this.muted = this.volume === 0;
    localStorage.setItem(STORAGE_KEY, String(this.volume));
    this.applyGain();
  }

  setMuted(muted) {
    this.muted = muted;
    this.applyGain();
  }

  applyGain() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.getEffectiveGain(),
        this.ctx.currentTime,
        0.03
      );
    }
  }

  startMusic() {
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.schedulerId = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    if (!this.ctx || !this.isPlaying) return;
    const stepDur = 60 / this.tempo / 4; // 16th note
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += stepDur;
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar loop
    }
  }

  playStep(step, time) {
    if (this.muted || this.volume <= 0) return;

    const bar = Math.floor(step / 16); // 0..3
    const beatStep = step % 16;

    // 4-bar progression: Em -> C -> D -> Bm
    const bassRoots = [82.41, 65.41, 73.42, 61.74]; // E2, C2, D2, B1
    const arpChords = [
      [329.63, 392.0, 493.88, 659.25], // Em
      [261.63, 329.63, 392.0, 523.25], // C
      [293.66, 369.99, 440.0, 587.33], // D
      [246.94, 293.66, 369.99, 493.88], // Bm
    ];

    // 1. Punchy soft kick on beats 0, 4, 8, 12
    if (beatStep % 4 === 0) {
      this.playKick(time);
    }

    // 2. Crisp snare on beats 4 & 12
    if (beatStep === 4 || beatStep === 12) {
      this.playSnare(time);
    }

    // 3. Light hi-hat on off-beats
    if (beatStep % 2 === 1) {
      this.playHiHat(time, beatStep % 4 === 2 ? 0.06 : 0.035);
    }

    // 4. Driving smooth triangle bass on 8th notes
    if (beatStep % 2 === 0) {
      const root = bassRoots[bar];
      const octave = beatStep % 4 === 2 ? root * 2 : root;
      this.playBass(octave, time);
    }

    // 5. Arcade synth pluck arpeggio
    const arpPattern = [0, 1, 2, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 0];
    const chord = arpChords[bar];
    const noteFreq = chord[arpPattern[beatStep]];
    this.playLeadPluck(noteFreq, time);
  }

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

    gain.gain.setValueAtTime(0.48, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  playSnare(time) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.9;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(time);
    src.stop(time + 0.12);
  }

  playHiHat(time, vol) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(time);
    src.stop(time + 0.04);
  }

  playBass(freq, time) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.exponentialRampToValueAtTime(170, time + 0.16);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.19);
  }

  playLeadPluck(freq, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.09, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.delayNode);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  update() {}

  playBeep(freq = 540, duration = 0.11) {
    if (this.muted || this.volume <= 0 || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }
}

window.F1 = window.F1 || {};
window.F1.SoundEngine = SoundEngine;
})();
