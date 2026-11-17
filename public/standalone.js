/* 비령 vC.05의 React 실습 코어를 로그인·서버 없이 구동하는 전용 메인 화면. */
(() => {
  'use strict';
  const demo = window.BiryeongDemo;
  const allowedPaths = new Set([
    'battle', 'battle/scarecrow', 'battle/snake', 'battle/wonhon',
    'pioneer', 'pioneer/left-trail-1', 'pioneer/left-trail-2',
    'pioneer/left-trail-3', 'pioneer/left-trail-4',
  ]);
  const statNames = { insight: '안목', aggression: '호전', endurance: '인내', control: '절제', agility: '신속', comprehension: '이해' };
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, Number(n) || 0));
  let currentPath = null;
  let toastTimer;

  function readPath() {
    let path = 'battle';
    try { path = decodeURIComponent(location.hash.replace(/^#\/?/, '')) || 'battle'; }
    catch { return 'battle'; }
    return allowedPaths.has(path) ? path : 'battle';
  }
  function routeTo(hashPath) {
    const path = allowedPaths.has(hashPath) ? hashPath : 'battle';
    if (location.hash !== '#/' + path) location.hash = '#/' + path;
    else updateRoute();
  }
  function updateRoute() {
    const path = readPath();
    const kind = path.startsWith('pioneer') ? 'pioneer' : 'battle';
    if (location.hash !== '#/' + path) history.replaceState(null, '', '#/' + path);
    if (currentPath !== path) {
      window.BiryeongPlay?.show(path);
      currentPath = path;
    }
    $('panelTitle').textContent = kind === 'battle' ? '퇴마 실습' : '개척 · 뒷산 산길';
    $('screenDescription').textContent = kind === 'battle'
      ? '전투 안내로 네 단계의 튜토리얼을 확인하거나, 아래의 1인 전투 세 가지 중 하나를 선택하세요.'
      : '10×10 산길에서 이동·채집·수렵을 체험하세요. 아래에서 산길 1~4를 선택할 수 있습니다.';
    $('switchContent').textContent = kind === 'battle' ? '개척으로 이동' : '퇴마 실습으로 이동';
    $('switchContent').href = kind === 'battle' ? '#/pioneer' : '#/battle';
    for (const a of document.querySelectorAll('.demo-nav-link')) {
      if (a.dataset.route === kind) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  }

  function getPlayer() { return window.BiryeongPlay?.api?.()?.player || null; }
  function makeBar(cls, title, value, max) {
    const v = Math.round(clamp(value, 0, Number.MAX_SAFE_INTEGER));
    const maximum = Math.max(1, max || 100);
    return `<div class="status-bar ${cls}"><div class="status-bar-top"><span>${title}</span><b>${v} / ${maximum}</b></div><div class="status-bar-track"><i style="width:${clamp(v / maximum * 100, 0, 100)}%"></i></div></div>`;
  }
  function refreshStatus() {
    const p = getPlayer();
    const stats = p?.stats ?? demo.PROFILE.stats;
    $('statusName').textContent = demo.PROFILE.name;
    $('statusBars').innerHTML = makeBar('bar-hp', '체력', p?.hp ?? 100, p?.hpMax ?? 100)
      + makeBar('bar-mp', '의지력', p?.mp ?? 100, p?.mpMax ?? 100)
      + makeBar('bar-spirit', '영력', p?.spirit ?? 100, 500);
    $('statusStats').innerHTML = demo.STAT_KEYS.map((k) => `<div class="status-stat"><span>${statNames[k]}</span><b>${Number(stats[k]) || 3}</b></div>`).join('');
    if ($('profileDialog').open) showProfileBody();
  }

  function showProfileBody() {
    const p = getPlayer();
    const base = p?.stats ?? demo.PROFILE.stats;
    $('profileContent').innerHTML = `<div class="demo-profile-top">
      <div class="demo-profile-face" aria-hidden="true">人</div>
      <div><div class="demo-profile-name">${escapeHtml(demo.PROFILE.name)}</div><div class="demo-profile-intro">${escapeHtml(demo.PROFILE.intro)}</div></div>
    </div>
    <span class="panel-eyebrow">六祖 · SIX ROOTS</span>
    <div class="demo-profile-grid">${demo.STAT_KEYS.map(k => `<div class="demo-profile-detail"><span>${statNames[k]}</span><b>${Number(base[k]) || 3}</b></div>`).join('')}</div>
    <p class="demo-profile-meta">나이 <strong>17세</strong> · 학년 <strong>1학년</strong> · 체험 캐릭터<br>
      체력 <strong>${Math.ceil(p?.hp ?? 100)} / ${p?.hpMax ?? 100}</strong> · 의지력 <strong>${Math.floor(p?.mp ?? 100)} / ${p?.mpMax ?? 100}</strong><br>
      영력 <strong>${Math.floor(p?.spirit ?? 100)}</strong> · 소지금 <strong>${Math.floor(p?.money ?? 50)}냥</strong><br>
      기본 육조 스탯은 모두 3으로 고정되어 있으며, 다른 서버의 프로필과 연동되지 않습니다.</p>
    <div class="demo-profile-controls"><button type="button" id="profileInventory" data-tutorial-real-items-btn>소지품 열기</button><button type="button" id="profileDone">닫기</button></div>`;
    $('profileDone').onclick = () => $('profileDialog').close();
    $('profileInventory').onclick = () => { $('profileDialog').close(); openInventory(); };
  }
  function openProfile() {
    showProfileBody();
    if (!$('profileDialog').open) $('profileDialog').showModal();
  }
  function openInventory() {
    const api = window.BiryeongPlay?.api?.();
    if (api?.openInventory) api.openInventory();
    else showToast('소지품', '캐릭터 데이터를 불러온 뒤 다시 시도해 주세요.');
  }
  function showToast(title, text) {
    const el = document.createElement('div');
    el.className = 'demo-toast';
    const head = document.createElement('strong');
    head.textContent = title || '알림';
    const message = document.createElement('span');
    message.textContent = text || '';
    el.append(head, message);
    $('toastStack').replaceChildren(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 4400);
  }

  function init() {
    if (!window.BiryeongPlay?.mount || !demo) {
      $('playRoot').textContent = '전투·개척 실행 파일을 불러올 수 없습니다. 압축을 모두 해제하고 로컬 서버에서 다시 실행해 주세요.';
      return;
    }
    window.BiryeongPlay.mount($('playRoot'));
    updateRoute();
    refreshStatus();
    addEventListener('hashchange', updateRoute);
    addEventListener('biryeong:nav', (event) => {
      const { path, back } = event.detail || {};
      if (back) routeTo('battle');
      else if (typeof path === 'string') routeTo(path);
    });
    addEventListener('biryeong:saved', refreshStatus);
    addEventListener('biryeong:toast', (event) => {
      const { head, text } = event.detail || {};
      showToast(head, text);
    });
    setInterval(refreshStatus, 1200);
    for (const id of ['profileOpen', 'statusWho', 'viewProfile']) $(id).addEventListener('click', openProfile);
    $('profileClose').addEventListener('click', () => $('profileDialog').close());
    $('profileDialog').addEventListener('click', (event) => {
      if (event.target === $('profileDialog')) $('profileDialog').close();
    });
    $('inventoryOpen').addEventListener('click', openInventory);
    $('resetSave').addEventListener('click', () => {
      if (!window.confirm('체험판 전투·개척 기록과 소지품을 모두 초기화할까요? 비령 본편 계정에는 영향을 주지 않습니다.')) return;
      demo.reset();
      // 동일 문서 해시 이동과 전체 새로고침을 중복 실행하지 않는다.
      history.replaceState(null, '', location.pathname + location.search + '#/battle');
      location.reload();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
