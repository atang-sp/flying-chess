type SoundName = 'diceRoll' | 'pieceStep' | 'punishment' | 'bonus' | 'trap' | 'victory'

class AudioService {
  private context: AudioContext | null = null
  private _enabled: boolean = true
  private _volume: number = 0.5

  get enabled(): boolean {
    return this._enabled
  }

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext()
    }
    if (this.context.state === 'suspended') {
      this.context.resume()
    }
    return this.context
  }

  init(): void {
    const stored = localStorage.getItem('audio_enabled')
    if (stored !== null) {
      this._enabled = stored === 'true'
    }
    const vol = localStorage.getItem('audio_volume')
    if (vol !== null) {
      this._volume = parseFloat(vol) || 0.5
    }
  }

  toggle(): boolean {
    this._enabled = !this._enabled
    localStorage.setItem('audio_enabled', String(this._enabled))
    return this._enabled
  }

  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol))
    localStorage.setItem('audio_volume', String(this._volume))
  }

  play(name: SoundName): void {
    if (!this._enabled) return
    try {
      const ctx = this.getContext()
      switch (name) {
        case 'diceRoll':
          this.playDiceRoll(ctx)
          break
        case 'pieceStep':
          this.playPieceStep(ctx)
          break
        case 'punishment':
          this.playPunishment(ctx)
          break
        case 'bonus':
          this.playBonus(ctx)
          break
        case 'trap':
          this.playTrap(ctx)
          break
        case 'victory':
          this.playVictory(ctx)
          break
      }
    } catch {
      // Silently fail on audio issues (user may not have interacted yet)
    }
  }

  private createGain(ctx: AudioContext, volume: number = this._volume): GainNode {
    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(ctx.destination)
    return gain
  }

  private playDiceRoll(ctx: AudioContext): void {
    const now = ctx.currentTime
    const gain = this.createGain(ctx, this._volume * 0.4)

    // Short noise bursts simulating dice rattling
    for (let i = 0; i < 8; i++) {
      const bufferSize = 1200
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize)
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 2000 + Math.random() * 3000
      filter.Q.value = 2
      noise.connect(filter)
      filter.connect(gain)
      noise.start(now + i * 0.08)
      noise.stop(now + i * 0.08 + 0.06)
    }
  }

  private playPieceStep(ctx: AudioContext): void {
    const now = ctx.currentTime
    const gain = this.createGain(ctx, this._volume * 0.3)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1)

    gain.gain.setValueAtTime(this._volume * 0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.12)
  }

  private playPunishment(ctx: AudioContext): void {
    const now = ctx.currentTime
    const gain = this.createGain(ctx, this._volume * 0.5)

    // Descending warning tone
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.4)

    gain.gain.setValueAtTime(this._volume * 0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.5)

    // Second tone
    const osc2 = ctx.createOscillator()
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(300, now + 0.15)
    osc2.frequency.exponentialRampToValueAtTime(150, now + 0.5)

    const gain2 = this.createGain(ctx, this._volume * 0.2)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc2.connect(gain2)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.5)
  }

  private playBonus(ctx: AudioContext): void {
    const now = ctx.currentTime

    // Ascending cheerful notes
    const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const gain = this.createGain(ctx, this._volume * 0.3)
      gain.gain.setValueAtTime(this._volume * 0.3, now + i * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2)

      osc.connect(gain)
      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.2)
    })
  }

  private playTrap(ctx: AudioContext): void {
    const now = ctx.currentTime
    const gain = this.createGain(ctx, this._volume * 0.4)

    // Low rumble
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(80, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.6)

    gain.gain.setValueAtTime(this._volume * 0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.6)

    // High stinger
    const osc2 = ctx.createOscillator()
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(400, now)
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.3)

    const gain2 = this.createGain(ctx, this._volume * 0.25)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc2.connect(gain2)
    osc2.start(now)
    osc2.stop(now + 0.35)
  }

  private playVictory(ctx: AudioContext): void {
    const now = ctx.currentTime

    // Fanfare: ascending arpeggiated chord
    const notes = [523, 659, 784, 1047, 1319, 1568] // C major ascending
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = i < 4 ? 'sine' : 'triangle'
      osc.frequency.value = freq

      const gain = this.createGain(ctx, this._volume * 0.25)
      const start = now + i * 0.12
      gain.gain.setValueAtTime(this._volume * 0.25, start)
      gain.gain.setValueAtTime(this._volume * 0.2, start + 0.3)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8)

      osc.connect(gain)
      osc.start(start)
      osc.stop(start + 0.8)
    })
  }
}

export const audioService = new AudioService()
