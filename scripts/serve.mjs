// 추가 npm 패키지 없이 로컬 체험용 서버 제공.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' }
const port = Number(process.env.PORT || 4173)
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname)
    const file = resolve(root, '.' + path, path.endsWith('/') ? 'index.html' : '')
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end('Forbidden'); return }
    const info = await stat(file)
    if (!info.isFile()) throw Error('not a file')
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(body)
  } catch { res.writeHead(404); res.end('Not found') }
})
server.listen(port, '127.0.0.1', () => console.log(`비령 체험판 → http://localhost:${port}`))
