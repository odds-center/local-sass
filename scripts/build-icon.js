#!/usr/bin/env node
/**
 * HR 앱 아이콘 픽셀아트 생성기
 * 순수 Node.js (zlib만 사용) → build/icon.png + build/icon.icns
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const SIZE = 1024
const buf = Buffer.alloc(SIZE * SIZE * 4, 0)

// ── 픽셀 유틸 ──────────────────────────────────────────────

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  const sa = a / 255, da = buf[i + 3] / 255
  const oa = sa + da * (1 - sa)
  if (oa < 0.001) return
  buf[i]     = Math.round((r * sa + buf[i]     * da * (1 - sa)) / oa)
  buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa)
  buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa)
  buf[i + 3] = Math.round(oa * 255)
}

function fillRect(x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b, a)
}

function roundedRect(x0, y0, w, h, rad, r, g, b, a = 255) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      let inside = true
      const inL = x < x0 + rad, inR = x >= x0 + w - rad
      const inT = y < y0 + rad, inB = y >= y0 + h - rad
      if (inL && inT) {
        const dx = x - (x0 + rad), dy = y - (y0 + rad)
        inside = dx * dx + dy * dy <= rad * rad
      } else if (inR && inT) {
        const dx = x - (x0 + w - rad), dy = y - (y0 + rad)
        inside = dx * dx + dy * dy <= rad * rad
      } else if (inL && inB) {
        const dx = x - (x0 + rad), dy = y - (y0 + h - rad)
        inside = dx * dx + dy * dy <= rad * rad
      } else if (inR && inB) {
        const dx = x - (x0 + w - rad), dy = y - (y0 + h - rad)
        inside = dx * dx + dy * dy <= rad * rad
      }
      if (inside) setPixel(x, y, r, g, b, a)
    }
  }
}

// ── 픽셀 폰트 ──────────────────────────────────────────────

// H  (6×9)
const FONT_H = [
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
  [1,1,1,1,1,1],
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
]

// R  (6×9)
const FONT_R = [
  [1,1,1,1,1,0],
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
  [1,1,1,1,1,0],
  [1,0,0,1,0,0],
  [1,0,0,0,1,0],
  [1,0,0,0,0,1],
  [1,0,0,0,0,1],
]

function drawChar(font, sx, sy, scale, r, g, b) {
  for (let row = 0; row < font.length; row++)
    for (let col = 0; col < font[row].length; col++)
      if (font[row][col])
        fillRect(sx + col * scale, sy + row * scale, scale, scale, r, g, b)
}

// ── 도트 그리기 ─────────────────────────────────────────────

// 팔레트
const BG      = [9,   9,   11]   // #09090b  zinc-950
const VIO     = [109, 40,  217]  // #6d28d9  violet-700
const VIO_LT  = [139, 92,  246]  // #8b5cf6  violet-500
const VIO_DK  = [76,  29,  149]  // #4c1d95  violet-900
const WHITE   = [244, 244, 245]  // #f4f4f5
const DOT     = [167, 139, 250]  // #a78bfa  violet-400

// 1. 배경
fillRect(0, 0, SIZE, SIZE, BG[0], BG[1], BG[2])

// 2. 그림자 (라운드 박스 아래 약한 글로우)
for (let i = 12; i >= 1; i--) {
  roundedRect(60 - i, 60 - i, SIZE - 120 + i * 2, SIZE - 120 + i * 2,
    145 + i, VIO[0], VIO[1], VIO[2], Math.round(18 * (1 - i / 13)))
}

// 3. 메인 바이올렛 라운드 박스
roundedRect(60, 60, SIZE - 120, SIZE - 120, 145, VIO[0], VIO[1], VIO[2])

// 4. 상단 하이라이트 (밝은 1/3)
roundedRect(60, 60, SIZE - 120, Math.round((SIZE - 120) * 0.38), 145,
  VIO_LT[0], VIO_LT[1], VIO_LT[2], 55)

// 5. 하단 그라데이션 (어두운 1/4)
roundedRect(60, Math.round(60 + (SIZE - 120) * 0.72), SIZE - 120,
  Math.round((SIZE - 120) * 0.28), 145, VIO_DK[0], VIO_DK[1], VIO_DK[2], 80)

// 6. HR 픽셀 텍스트
const SC  = 52          // 한 픽셀 = 52×52
const CW  = 6           // 글자 너비 (픽셀 단위)
const CH  = 9           // 글자 높이
const GAP = 44          // H 와 R 사이 간격
const tw  = CW * SC * 2 + GAP
const th  = CH * SC
const tx  = Math.round((SIZE - tw) / 2)
const ty  = Math.round((SIZE - th) / 2)

drawChar(FONT_H, tx,            ty, SC, WHITE[0], WHITE[1], WHITE[2])
drawChar(FONT_R, tx + CW*SC + GAP, ty, SC, WHITE[0], WHITE[1], WHITE[2])

// 7. 장식 도트 (모서리 + 중간 포인트) — 픽셀아트 느낌
const DOT_SIZE = 10
const MARGIN   = 110
const dots = [
  // 모서리 4개
  [MARGIN, MARGIN],
  [SIZE - MARGIN, MARGIN],
  [MARGIN, SIZE - MARGIN],
  [SIZE - MARGIN, SIZE - MARGIN],
  // 각 면 중간 4개
  [SIZE / 2, MARGIN],
  [SIZE / 2, SIZE - MARGIN],
  [MARGIN,   SIZE / 2],
  [SIZE - MARGIN, SIZE / 2],
  // 대각선 사이 추가 4개
  [SIZE * 0.3, MARGIN + 20],
  [SIZE * 0.7, MARGIN + 20],
  [SIZE * 0.3, SIZE - MARGIN - 20],
  [SIZE * 0.7, SIZE - MARGIN - 20],
]
for (const [dx, dy] of dots) {
  fillRect(Math.round(dx) - DOT_SIZE/2, Math.round(dy) - DOT_SIZE/2,
    DOT_SIZE, DOT_SIZE, DOT[0], DOT[1], DOT[2], 200)
}

// 8. 테두리 얇은 라인
roundedRect(62, 62, SIZE - 124, SIZE - 124, 143,
  VIO_LT[0], VIO_LT[1], VIO_LT[2], 60)

// ── PNG 인코더 ─────────────────────────────────────────────

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(data) {
  let c = 0xFFFFFFFF
  for (const b of data) c = (c >>> 8) ^ crcTable[(c ^ b) & 0xFF]
  return (c ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii')
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length)
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])))
  return Buffer.concat([lb, tb, data, cb])
}

const raw = Buffer.alloc(SIZE * (1 + SIZE * 4))
for (let y = 0; y < SIZE; y++) {
  raw[y * (1 + SIZE * 4)] = 0
  buf.copy(raw, y * (1 + SIZE * 4) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8; ihdr[9] = 6

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0)),
])

// ── 파일 저장 ──────────────────────────────────────────────

const buildDir = path.join(__dirname, '..', 'build')
fs.mkdirSync(buildDir, { recursive: true })

const pngPath = path.join(buildDir, 'icon.png')
fs.writeFileSync(pngPath, png)
console.log('✓ build/icon.png 생성 완료')

// macOS: iconutil로 .icns 생성
if (process.platform === 'darwin') {
  const iconset = path.join(buildDir, 'icon.iconset')
  fs.mkdirSync(iconset, { recursive: true })

  const sizes = [16, 32, 128, 256, 512]
  for (const s of sizes) {
    execSync(`sips -z ${s} ${s} "${pngPath}" --out "${path.join(iconset, `icon_${s}x${s}.png`)}" 2>/dev/null`)
    execSync(`sips -z ${s*2} ${s*2} "${pngPath}" --out "${path.join(iconset, `icon_${s}x${s}@2x.png`)}" 2>/dev/null`)
  }

  execSync(`iconutil -c icns "${iconset}" -o "${path.join(buildDir, 'icon.icns')}"`)
  fs.rmSync(iconset, { recursive: true })
  console.log('✓ build/icon.icns 생성 완료')
}

console.log('✓ 아이콘 생성 완료!')
