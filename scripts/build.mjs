import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'public')
const dest = resolve(root, 'dist')
await rm(dest, { force: true, recursive: true })
await mkdir(dest, { recursive: true })
await cp(src, dest, { recursive: true })
for (const file of ['index.html', 'bootstrap.js', 'standalone.js', 'standalone.css', 'play/play.js', 'play/play.css']) {
  const info = await stat(resolve(dest, file))
  if (info.size === 0) throw new Error(`출력 파일이 비어 있습니다: ${file}`)
}
console.log('비령 전투·개척 독립판 빌드 성공 → dist/ (정적 호스팅 파일)')
console.log('로그인·Supabase·Render 백엔드 · npm 패키지 설치 불필요')
