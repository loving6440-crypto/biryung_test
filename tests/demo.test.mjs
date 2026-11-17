import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')

test('별도 웹사이트 엔트리와 핵심 화면 번들이 존재한다', () => {
  for (const path of ['public/index.html','public/bootstrap.js','public/standalone.js','public/standalone.css','public/styles.css','public/play/play.js','public/play/play.css']) {
    assert.ok(existsSync(resolve(root,path)), path)
  }
})

test('원본 7개 실습 전투 중 1인 전투 세 가지만 고른다', () => {
  const js = read('public/play/play.js')
  assert.match(js, /\(ae\?\?rd\)\.filter\(e=>\["scarecrow","snake","wonhon"\]\.includes\(e\.id\)\)/)
  assert.match(js, /\bse=\(ae\?\?rd\)\.filter/)
  assert.match(read('public/standalone.css'), /\[data-battle-mode='extra'\]\{display:none!important\}/)
})

test('개척 코어 선택 목록은 산길 1~4까지만 유지한다', () => {
  const js = read('public/play/play.js')
  const start = js.indexOf('yo=[{id:"left"')
  const end = js.indexOf('],An=',start)
  assert.ok(start>0 && end>start, '선택 목록이 있어야 한다')
  const uiSites = js.slice(start,end)
  assert.match(uiSites, /\[1,2,3,4\]\.map/)
  assert.doesNotMatch(uiSites, /Fw\.map|left-lake|left-cemetery|left-cave/)
})

test('캐릭터 여섯 육조의 시작값은 모두 3이고 저장소가 분리된다', () => {
  const storage = new Map([['biryeong-save-v1', JSON.stringify({profile:{name:'본편 캐릭터'}})]])
  const localStorage = {getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}
  const window = {}
  vm.runInNewContext(read('public/bootstrap.js'),{window,localStorage,console})
  assert.notEqual(window.BiryeongAuth.saveKey(),'biryeong-save-v1')
  const saved = JSON.parse(storage.get(window.BiryeongAuth.saveKey()))
  assert.equal(saved.profile.name,'비령 견습생')
  assert.deepEqual(Object.values(saved.profile.stats).sort(),[3,3,3,3,3,3])
  assert.equal(JSON.parse(storage.get('biryeong-save-v1')).profile.name,'본편 캐릭터')
  assert.equal(window.BiryeongAuth.isAdmin(),false)
  assert.equal(window.BiryeongAuth.session(),null)
})

test('정적 배포 외 의존성이 없다', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.deepEqual(Object.keys(pkg.dependencies||{}),[])
  assert.deepEqual(Object.keys(pkg.devDependencies||{}),[])
  const html = read('public/index.html')
  assert.doesNotMatch(html, /auth\.js|server\.js|sync\.js|community\.js|quest\.js/)
  assert.match(html, /play\/play\.js/)
  assert.match(html, /id="profileDialog"/)
})
