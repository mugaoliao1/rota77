// scripts/generate-icons.mjs — gera ícones PNG para o PWA da MídiaCar
// Uso: node scripts/generate-icons.mjs

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

// M em pixel art 5×7
const M = [
  [1, 0, 0, 0, 1],
  [1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
]

// Tabela CRC32 (exigida pelo formato PNG)
const CRC = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(size) {
  const BG = [0xd7, 0x28, 0x2b]  // #D7282B vermelho
  const FG = [0xff, 0xff, 0xff]  // #FFFFFF branco

  // Calcula tamanho do M com margem de 15%
  const margin = Math.round(size * 0.15)
  const inner  = size - 2 * margin
  const cell   = Math.min(Math.floor(inner / 5), Math.floor(inner / 7))
  const mW     = 5 * cell
  const mH     = 7 * cell
  const x0     = Math.round((size - mW) / 2)
  const y0     = Math.round((size - mH) / 2)

  // Buffer RGB
  const px = new Uint8Array(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    px[i * 3] = BG[0]; px[i * 3 + 1] = BG[1]; px[i * 3 + 2] = BG[2]
  }
  // Desenha M
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (!M[row][col]) continue
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const x = x0 + col * cell + dx
          const y = y0 + row * cell + dy
          if (x >= size || y >= size) continue
          const i = (y * size + x) * 3
          px[i] = FG[0]; px[i + 1] = FG[1]; px[i + 2] = FG[2]
        }
      }
    }
  }

  // Monta PNG
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2  // 8-bit RGB

  // Dados brutos: 1 byte filtro (0=None) + size*3 bytes RGB por linha
  const stride = 1 + size * 3
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0  // filtro None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 3
      const dst = y * stride + 1 + x * 3
      raw[dst] = px[src]; raw[dst + 1] = px[src + 1]; raw[dst + 2] = px[src + 2]
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for (const s of sizes) {
  const path = `public/icons/icon-${s}.png`
  writeFileSync(path, makePNG(s))
  console.log(`✓ ${path}`)
}
console.log('\nÍcones gerados em public/icons/')
