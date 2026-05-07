import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import cors from 'cors'
import express from 'express'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT ?? 8787)
const DATA_PATH = path.join(__dirname, 'data.json')

async function readAll() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

async function writeAll(items) {
  await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2), 'utf8')
}

function nowIso() {
  return new Date().toISOString()
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '32kb' }))

app.get('/health', (_req, res) => res.json({ ok: true, time: nowIso() }))

app.get('/api/posts', async (_req, res) => {
  const all = await readAll()
  // newest first
  all.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  res.json({ items: all })
})

app.post('/api/posts', async (req, res) => {
  const content = String(req.body?.content ?? '')
  const uaFromBody = typeof req.body?.ua === 'string' ? req.body.ua : ''
  const uaFromHeader = String(req.get('user-agent') ?? '')
  const ua = (uaFromBody || uaFromHeader).slice(0, 2000)
  const enteredAtRaw =
    typeof req.body?.enteredAt === 'string' ? req.body.enteredAt.trim() : ''
  let enteredAtParsed = ''
  if (enteredAtRaw) {
    const t = Date.parse(enteredAtRaw)
    if (!Number.isNaN(t)) enteredAtParsed = new Date(t).toISOString()
  }

  if (!content.trim()) {
    res.status(400).json({ error: 'content_required' })
    return
  }
  if (content.length > 800) {
    res.status(400).json({ error: 'content_too_long' })
    return
  }

  const createdAt = nowIso()
  // 客户端未传或解析失败时，用提交时间兜底，保证每条都有 enteredAt 字段（旧前端/curl 也能入库）
  const enteredAt = enteredAtParsed || createdAt

  const item = {
    id: crypto.randomUUID(),
    content,
    createdAt,
    enteredAt,
    ua,
  }

  const all = await readAll()
  all.push(item)
  // cap
  const capped = all.slice(-2000)
  await writeAll(capped)

  res.json({ item })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] http://localhost:${PORT}`)
})

