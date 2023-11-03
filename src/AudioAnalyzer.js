export default class AudioAnalyser {
  constructor() {
    this.createAudio()

    this.audioCtx = new AudioContext()
    this.analyser = this.audioCtx.createAnalyser()
    this.audioSrc = this.audioCtx.createMediaElementSource(this.audio)

    this.audioSrc.connect(this.analyser)
    this.analyser.connect(this.audioCtx.destination)
    this.analyser.fftSize = 4096 // max 32768

    this.bufferLength = this.analyser.frequencyBinCount
    this.fbcArray = new Uint8Array(this.bufferLength)
  }

  createAudio() {
    this.audio = document.createElement('audio')
    this.audio.autoplay = true
    document.body.appendChild(this.audio)
  }

  setSource(src) {
    this.audio.src = src
  }

  update() {
    this.analyser.getByteFrequencyData(this.fbcArray)
  }
}