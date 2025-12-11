import { WeaponType } from '../types';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicInterval: number | null = null;
  private musicNote: number = 0;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.ctx.destination);
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- MUSIC SYSTEM ---

  startMusic() {
    if (this.musicInterval) return; // Already playing
    this.init();
    
    // 110 BPM approx
    const tempo = 136; 
    this.musicNote = 0;

    this.musicInterval = window.setInterval(() => {
        this.playMusicStep();
    }, 60000 / tempo / 4); // 16th notes
  }

  stopMusic() {
    if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
    }
  }

  private playMusicStep() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const beat = this.musicNote % 32;

    // Bass Line (Kick-ish)
    if (beat % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        // Low pass filter for thud
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Hi-hats
    if (beat % 2 === 0) {
        this.createNoise(0.03, 0.05); // Closed hat
    }

    // Dark Arpeggio
    if (beat % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        
        // Minor scale-ish sequence
        const notes = [110, 130, 164, 130, 110, 98, 82, 98]; 
        const freq = notes[Math.floor(this.musicNote / 4) % notes.length];

        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    // Snare / Clap
    if (beat % 8 === 4) {
         this.createNoise(0.1, 0.15);
    }

    this.musicNote++;
  }

  // --- SFX SYSTEM ---

  private createOscillator(type: OscillatorType, freq: number, duration: number, vol: number = 1) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private createNoise(duration: number, vol: number = 1) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  playJump() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playShoot(weapon: WeaponType) {
    if (!this.ctx) return;

    if (weapon === WeaponType.PISTOL) {
      this.createOscillator('triangle', 600, 0.1, 0.5);
      this.createNoise(0.05, 0.2);
    } else if (weapon === WeaponType.SMG) {
      this.createOscillator('sawtooth', 800, 0.05, 0.3);
      this.createNoise(0.02, 0.2);
    } else if (weapon === WeaponType.SHOTGUN) {
      this.createNoise(0.3, 0.8);
      this.createOscillator('sawtooth', 100, 0.2, 0.5);
    }
  }

  playDryFire() {
    if (!this.ctx) return;
    // Short high pitched click
    this.createOscillator('square', 800, 0.05, 0.2);
  }

  playReload() {
    if (!this.ctx) return;
    // Slide sound
    this.createNoise(0.2, 0.5);
    // Click sound at end (scheduled)
    setTimeout(() => {
        if(this.ctx) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        }
    }, 200);
  }

  playCollect() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Coin/Item pickup sound (Arpeggio)
    const notes = [600, 800, 1000];
    notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.1, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.1);
    });
  }

  playDamage() {
    // Low punch
    this.createOscillator('sawtooth', 100, 0.2, 0.5);
    this.createOscillator('square', 50, 0.2, 0.5);
  }

  playZombieHit() {
    // Wet thud
    this.createNoise(0.1, 0.3);
    this.createOscillator('sawtooth', 200, 0.1, 0.2);
  }

  playClang() {
      // Metal hit sound (for tank deflection)
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
  }

  playZombieGroan() {
      // Random low frequency modulation
      if (!this.ctx || Math.random() > 0.3) return; // Don't play too often
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100 + Math.random() * 50, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
  }

  playZombieScream() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    // High pitch screach
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playHordeAlert() {
      if (!this.ctx) return;
      // Alarm Siren: Low to High frequency modulation loop
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.5);
      osc.frequency.linearRampToValueAtTime(400, now + 1.0);
      osc.frequency.linearRampToValueAtTime(600, now + 1.5);
      osc.frequency.linearRampToValueAtTime(400, now + 2.0);
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 1.8);
      gain.gain.linearRampToValueAtTime(0, now + 2.0);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(now + 2.0);
  }
}

export const soundManager = new SoundManager();