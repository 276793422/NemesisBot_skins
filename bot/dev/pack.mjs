// 打包 bot 皮肤 → dist/bot.nbskin
//
// .nbskin = 单文件 ZIP（nbskin v1）：
//   manifest.json + skin/bot.css + skin/structure.html（CSS 载荷经
//   /skins/active.css 注入换色；结构载荷经 /skins/active/structure 供
//   声明式结构引擎渲染骨架）。皮肤 = 给当前应用原地换观感，同一 URL，
//   不打开任何新页面。
// 不用 tar -a：GNU tar 无 zip 写入器、bsdtar 按扩展名选格式（.nbskin 不认识
// 会静默产出裸 tar）；PowerShell 5.1 Compress-Archive 条目用反斜杠分隔。
// 三平台唯一确定的公共前提是 Node（web 构建本来就依赖），故零依赖手写
// ZIP（deflate via node:zlib，条目 / 分隔，无目录占位条目）。
import { deflateRawSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(pkgRoot, 'dist')
const outFile = join(outDir, 'bot.nbskin')

// 固定条目（theme 载荷 only）
const ENTRIES = ['manifest.json', 'skin/bot.css', 'skin/structure.html']

// --- CRC-32（IEEE 802.3，ZIP 规范多项式 0xEDB88320） ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// --- ZIP 装配（deflate，v2.0 结构，无 zip64——载荷远小于 4GB） ---
function u16(v) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(v)
  return b
}
function u32(v) {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(v >>> 0)
  return b
}

const locals = []
const centrals = []
let offset = 0

for (const name of ENTRIES) {
  const data = readFileSync(join(pkgRoot, name))
  const nameBytes = Buffer.from(name, 'utf8') // 条目一律 / 分隔（ZIP 规范）
  const deflated = deflateRawSync(data, { level: 9 })
  const useDeflate = deflated.length < data.length
  const payload = useDeflate ? deflated : data
  const method = useDeflate ? 8 : 0
  const crc = crc32(data)

  const local = Buffer.concat([
    u32(0x04034b50), // local file header signature
    u16(20), // version needed
    u16(0), // flags（无 data descriptor，尺寸先知）
    u16(method),
    u16(0), u16(0), // mod time / date（皮肤包不需要时间戳）
    u32(crc),
    u32(payload.length), // compressed
    u32(data.length), // uncompressed
    u16(nameBytes.length),
    u16(0), // extra len
    nameBytes,
    payload,
  ])
  locals.push(local)

  centrals.push(
    Buffer.concat([
      u32(0x02014b50), // central directory signature
      u16(20), // version made by
      u16(20), // version needed
      u16(0),
      u16(method),
      u16(0), u16(0),
      u32(crc),
      u32(payload.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), // extra/comment/disk/attrs
      u32(offset),
      nameBytes,
    ])
  )
  offset += local.length
}

const centralDir = Buffer.concat(centrals)
const eocd = Buffer.concat([
  u32(0x06054b50), // EOCD signature
  u16(0), u16(0), // disk numbers
  u16(ENTRIES.length), u16(ENTRIES.length),
  u32(centralDir.length),
  u32(offset), // central dir offset
  u16(0), // comment len
])

mkdirSync(outDir, { recursive: true })
const zip = Buffer.concat([...locals, centralDir, eocd])

// 自检：ZIP magic = "PK\x03\x04"（防回归——裸 tar 的 magic 是首文件名）
if (zip[0] !== 0x50 || zip[1] !== 0x4b) {
  console.error('FAILED: produced data is not a ZIP (bad magic)')
  process.exit(1)
}
writeFileSync(outFile, zip)
console.log(`OK: ${outFile} (${zip.length} bytes, ${ENTRIES.length} entries)`)
for (const e of ENTRIES) console.log(`  - ${e}`)
