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

// 원본 전투 튜토리얼 3단계의 realItems 이벤트는
// document.capture에서 [data-tutorial-real-items-btn] 클릭만 감지한다.
test('튜토리얼 3단계 소지품 클릭은 실습 코어의 이벤트 조건과 연결된다', () => {
  const html = read('public/index.html')
  const outer = read('public/standalone.js')
  const core = read('public/play/play.js')
  assert.match(core, /data-tutorial-real-items-btn/)
  assert.match(core, /allow!=="realItems"/)
  assert.match(html, /<button\s+id="inventoryOpen"[^>]*\bdata-tutorial-real-items-btn\b/)
  assert.match(outer, /id="profileInventory"\s+data-tutorial-real-items-btn/)
  assert.match(outer, /\$\('inventoryOpen'\)\.addEventListener\('click', openInventory\)/)
})

test('초기화는 이전 저장 데이터가 pagehide에서 다시 기록돼도 다음 시작에서 새 캐릭터로 복구한다', () => {
  const SAVE_KEY = 'biryeong-battle-pioneer-demo-v1'
  const previous = JSON.stringify({
    profile: {name:'비령 견습생'},
    game: {hp:1, hpMax:100, mp:3, inventory:{'old-potion':2}, tutorialSnap:{hp:1}},
    counts: {battles:11}, playLog: [{message:'old'}]
  })
  const local = new Map([[SAVE_KEY,previous], ['biryeong-save-v1','original-character']])
  const session = new Map()
  const localStorage = {getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)}
  const sessionStorage = {getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)}
  const boot = () => {
    const window = {}
    vm.runInNewContext(read('public/bootstrap.js'), {window,localStorage,sessionStorage,console})
    return window
  }
  const oldPage = boot()
  assert.equal(JSON.parse(local.get(SAVE_KEY)).game.hp,1)
  oldPage.BiryeongDemo.reset()
  assert.equal(oldPage.BiryeongDemo.isResetInProgress(),true)
  assert.equal(local.has(SAVE_KEY),false)
  assert.equal(session.get(`${SAVE_KEY}:reset-pending`),'1')
  // 수정 전에는 기존 React pagehide 핸들러가 이전 HP를 그대로 다시 저장했다.
  localStorage.setItem(SAVE_KEY,previous)
  const freshPage = boot()
  const resetData = JSON.parse(local.get(SAVE_KEY))
  assert.equal(resetData.profile.name,'비령 견습생')
  assert.deepEqual(Object.values(resetData.profile.stats).sort(), [3,3,3,3,3,3])
  assert.equal('game' in resetData,false,'이전 체력과 소지품은 삭제되어야 한다')
  assert.equal('counts' in resetData,false)
  assert.equal('playLog' in resetData,false)
  assert.equal(session.has(`${SAVE_KEY}:reset-pending`),false,'새 시작 후 플래그 해제')
  assert.equal(freshPage.BiryeongDemo.isResetInProgress(),false)
  assert.equal(local.get('biryeong-save-v1'),'original-character','원본 비령 저장값은 그대로')
  // 이후 다시 새로고침하더라도 정상 플레이 중 새로 기록된 상태는 유지해야 한다.
  resetData.game = {hp:90,hpMax:100}
  localStorage.setItem(SAVE_KEY,JSON.stringify(resetData))
  boot()
  assert.equal(JSON.parse(local.get(SAVE_KEY)).game.hp,90)
})

test('전투 코어의 자동 저장은 초기화 도중 막혀야 한다', () => {
  const core = read('public/play/play.js')
  assert.match(core, /function H8\(e\)\{if\(window\.BiryeongDemo\?\.isResetInProgress\?\.\(\)\)return!0;/)
  const html = read('public/index.html')
  assert.match(html, /src="bootstrap\.js\?v=reset-fix2"/)
  assert.match(html, /src="play\/play\.js\?v=reset-fix2"/)
})


test('초기화는 해시만 이동하지 않고 한 번의 전체 새로고침을 수행한다', () => {
  const outer = read('public/standalone.js')
  assert.match(outer, /demo\.reset\(\);\s*\/\/[^\n]*\n\s*history\.replaceState\(null, '', location\.pathname \+ location\.search \+ '#\/battle'\);\s*location\.reload\(\)/)
  assert.doesNotMatch(outer, /location\.href = location\.pathname/)
})
