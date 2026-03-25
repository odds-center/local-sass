#!/usr/bin/env node
/**
 * HR 앱 아이콘 생성기 — SDF 기반 안티앨리어싱
 * 순수 Node.js (zlib만 사용)
 * 출력: build/icon.png + build/icon.icns
 */
const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const S = 1024
const buf = Buffer.alloc(S * S * 4, 0)

// ── 픽셀 블렌딩 ────────────────────────────────────────────
function blend(x, y, r, g, b, a) {
  if (x < 0 || x >= S || y < 0 || y >= S) return
  const i = (y * S + x) * 4
  const sa = a / 255, da = buf[i + 3] / 255
  const oa = sa + da * (1 - sa)
  if (oa < 0.001) return
  buf[i]     = Math.round((r * sa + buf[i]     * da * (1 - sa)) / oa)
  buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa)
  buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa)
  buf[i + 3] = Math.round(oa * 255)
}

// ── SDF 함수들 ────────────────────────────────────────────
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r
  const qy = Math.abs(py - cy) - hh + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
       + Math.min(Math.max(qx, qy), 0) - r
}

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r
}

// 선분 캡슐 SDF (두꺼운 선)
function sdCapsule(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay
  const bax = bx - ax, bay = by - ay
  const t = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)))
  return Math.hypot(pax - t * bax, pay - t * bay)
}

// ── 범용 SDF 렌더러 ───────────────────────────────────────
// sdfFn(x, y) → distance (음수=내부, 양수=외부)
// aa=1이면 1px 안티앨리어싱
function fillShape(sdfFn, r, g, b, a = 255, x0 = 0, y0 = 0, x1 = S, y1 = S) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = sdfFn(x, y)
      if (d > 1.5) continue
      const alpha = Math.round(a * Math.max(0, Math.min(1, 0.5 - d)))
      if (alpha > 0) blend(x, y, r, g, b, alpha)
    }
  }
}

// ── 그라디언트 헬퍼 ───────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ═══════════════════════════════════════════════════════════
// 아이콘 그리기
// ═══════════════════════════════════════════════════════════

const cx = S / 2, cy = S / 2

// ── 1. 어두운 배경 ─────────────────────────────────────────
for (let i = 0; i < S * S; i++) {
  buf[i * 4]     = 9
  buf[i * 4 + 1] = 9
  buf[i * 4 + 2] = 11
  buf[i * 4 + 3] = 255
}

// ── 2. 메인 그라디언트 라운드 박스 ────────────────────────
// 대각선 그라디언트: 좌상단 밝은 바이올렛 → 우하단 어두운 보라
const MARGIN = 52
const RADIUS = 160

for (let y = MARGIN; y < S - MARGIN; y++) {
  for (let x = MARGIN; x < S - MARGIN; x++) {
    const d = sdRoundRect(x, y, cx, cy, cx - MARGIN, cy - MARGIN, RADIUS)
    if (d > 1.5) continue

    // 대각선 t: 0=좌상단, 1=우하단
    const t = clamp((x + y) / (S * 2 - MARGIN * 2), 0, 1)
    // 밝은 바이올렛 #a78bfa → 어두운 보라 #4c1d95
    const r = Math.round(lerp(167, 76,  t))
    const g = Math.round(lerp(139, 29,  t))
    const b = Math.round(lerp(250, 149, t))

    // 살짝 중앙을 더 밝게 (방사형 보정)
    const distCenter = Math.hypot(x - cx, y - cy) / (S * 0.5)
    const boost = Math.round((1 - distCenter * 0.5) * 18)

    const alpha = Math.round(255 * clamp(0.5 - d, 0, 1))
    blend(x, y, Math.min(255, r + boost), Math.min(255, g + boost), Math.min(255, b + boost), alpha)
  }
}

// ── 3. 상단 유리 광택 (white highlight arc) ────────────────
// 좌상단 1/4 원 영역에 반투명 흰색 → 유리느낌
for (let y = MARGIN; y < cy; y++) {
  for (let x = MARGIN; x < cx; x++) {
    const d = sdRoundRect(x, y, cx, cy, cx - MARGIN, cy - MARGIN, RADIUS)
    if (d > 1.5 || d < -120) continue // 가장자리 20px만
    const dist = Math.hypot(x - (MARGIN + 30), y - (MARGIN + 30))
    const glow = clamp(1 - dist / 380, 0, 1)
    const alpha = Math.round(glow * 38 * clamp(0.5 - d, 0, 1))
    blend(x, y, 255, 255, 255, alpha)
  }
}

// ── 4. 체크마크 (큰, 두꺼운 흰색) ────────────────────────
// 체크 꼭짓점: (330,555) → (490,730) → (760,390)
const CK_T = 78   // 두께 반지름
const [ax, ay] = [330, 555]
const [mx, my] = [490, 730]
const [bx, by] = [760, 390]

fillShape(
  (x, y) => sdCapsule(x, y, ax, ay, mx, my) - CK_T,
  255, 255, 255, 255,
  200, 350, 830, 830
)
fillShape(
  (x, y) => sdCapsule(x, y, mx, my, bx, by) - CK_T,
  255, 255, 255, 255,
  350, 250, 850, 830
)

// ── 5. 체크 아래 얇은 선 장식 (가로) ─────────────────────
// 하단 작은 라인 두 개 → 문서/카드 느낌
const LY1 = 800, LY2 = 840
const LX0 = 240, LX1 = S - 240
const LT  = 14

fillShape((x, y) => sdCapsule(x, y, LX0, LY1, LX1 * 0.62, LY1) - LT,
  255, 255, 255, 120, LX0 - 10, LY1 - 20, LX1, LY1 + 20)
fillShape((x, y) => sdCapsule(x, y, LX0, LY2, LX1 * 0.45, LY2) - LT,
  255, 255, 255, 80, LX0 - 10, LY2 - 20, LX1, LY2 + 20)

// ── 6. 하단 그림자 (깊이감) ───────────────────────────────
for (let y = S - MARGIN - 80; y < S - MARGIN + 1; y++) {
  for (let x = MARGIN; x < S - MARGIN; x++) {
    const d = sdRoundRect(x, y, cx, cy, cx - MARGIN, cy - MARGIN, RADIUS)
    if (d > 1.5 || d < -40) continue
    const fade = clamp((y - (S - MARGIN - 80)) / 80, 0, 1)
    const alpha = Math.round(fade * 55 * clamp(0.5 - d, 0, 1))
    blend(x, y, 0, 0, 0, alpha)
  }
}

// ═══════════════════════════════════════════════════════════
// PNG 인코더 (순수 Node.js)
// ═══════════════════════════════════════════════════════════
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(d) {
  let c = 0xFFFFFFFF
  for (const b of d) c = (c >>> 8) ^ CRC[(c ^ b) & 0xFF]
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii')
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length)
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])))
  return Buffer.concat([lb, tb, data, cb])
}

const rows = Buffer.alloc(S * (1 + S * 4))
for (let y = 0; y < S; y++) {
  rows[y * (1 + S * 4)] = 0
  buf.copy(rows, y * (1 + S * 4) + 1, y * S * 4, (y + 1) * S * 4)
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8; ihdr[9] = 6

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

// ── 파일 저장 ──────────────────────────────────────────────
const buildDir = path.join(__dirname, '..', 'build')
fs.mkdirSync(buildDir, { recursive: true })

const pngPath = path.join(buildDir, 'icon.png')
fs.writeFileSync(pngPath, png)
console.log('✓ build/icon.png')

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
  console.log('✓ build/icon.icns')
}

console.log('완료!')
