import { mkdir } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

// Deterministic PRNG so re-running the seed produces the same demo images.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fluorophore-like marker channel colors layered over blue "nuclei".
const SEED_CHANNEL_COLORS = ["#00ff88", "#ff4d4d", "#4d9bff", "#ffd24d", "#c44dff", "#4dffe0"]

function blobLayer(
  w: number,
  h: number,
  color: string,
  rng: () => number,
  n: number,
  rMin: number,
  rMax: number,
): string {
  let s = ""
  for (let i = 0; i < n; i++) {
    const cx = Math.round(rng() * w)
    const cy = Math.round(rng() * h)
    const r = Math.round(rMin + rng() * (rMax - rMin))
    const o = (0.3 + rng() * 0.55).toFixed(2)
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${o}"/>`
  }
  return s
}

function blobSvg(w: number, h: number, color: string, rng: () => number): string {
  const nuclei = blobLayer(w, h, "#2f5fd0", rng, 55, 3, 9)
  const marker = blobLayer(w, h, color, rng, 16, 10, 30)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>
    <rect width="${w}" height="${h}" fill="#070710"/>
    <g filter="url(#b)">${nuclei}${marker}</g>
  </svg>`
}

const SEED_UPLOADS_DIR = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "./data/uploads")
const SEED_IMAGE_POOL_SIZE = 12
let imagePool: string[] = []

export async function generateSeedBlobImages(): Promise<string[]> {
  await mkdir(SEED_UPLOADS_DIR, { recursive: true })
  const urls: string[] = []
  for (let i = 0; i < SEED_IMAGE_POOL_SIZE; i++) {
    const rng = mulberry32(0x5eed_0000 + i)
    const color = SEED_CHANNEL_COLORS[i % SEED_CHANNEL_COLORS.length]
    const svg = blobSvg(640, 512, color, rng)
    const filename = `seed-blob-${i}.webp`
    await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(path.join(SEED_UPLOADS_DIR, filename))
    urls.push(`/uploads/${filename}`)
  }
  imagePool = urls
  return urls
}

export function getReportImages(index: number): string[] {
  if (imagePool.length === 0) return []
  const count = (index % 3) + 1
  const start = index % imagePool.length
  const images: string[] = []
  for (let i = 0; i < count; i++) {
    images.push(imagePool[(start + i) % imagePool.length])
  }
  return images
}
