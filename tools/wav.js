// Minimal 16-bit PCM WAV reader (mono mix) used for durations and validation.
const fs = require('fs');

function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file} is not a WAV file`);
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4), size = b.readUInt32LE(pos + 4), body = pos + 8;
    if (id === 'fmt ') fmt = { format: b.readUInt16LE(body), channels: b.readUInt16LE(body + 2), rate: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
    if (id === 'data') data = { start: body, size: Math.min(size, b.length - body) };
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`${file}: missing fmt/data chunk`);
  const bytes = fmt.bits / 8, frames = Math.floor(data.size / (bytes * fmt.channels));
  const duration = frames / fmt.rate;
  return {
    rate: fmt.rate, channels: fmt.channels, duration,
    samples() {
      if (fmt.bits !== 16) throw new Error(`${file}: only 16-bit WAV can be analysed`);
      const out = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let s = 0;
        for (let c = 0; c < fmt.channels; c++) s += b.readInt16LE(data.start + (i * fmt.channels + c) * 2);
        out[i] = s / fmt.channels / 32768;
      }
      return out;
    },
  };
}
module.exports = { readWav };
