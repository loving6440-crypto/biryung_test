/* 비령 전투·개척 독립 체험판: 실제 계정/원본 비령의 저장소와 완전히 분리한다. */
(() => {
  'use strict';
  const SAVE_KEY = 'biryeong-battle-pioneer-demo-v1';
  const STAT_KEYS = ['insight', 'aggression', 'endurance', 'control', 'agility', 'comprehension'];
  const STATS = Object.fromEntries(STAT_KEYS.map((k) => [k, 3]));
  const PROFILE = Object.freeze({
    name: '비령 견습생', age: 17, intro: '전투와 개척을 배우는 입산자.',
    stats: STATS, avatar: null,
  });

  function ensureDemoSave() {
    let data;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { data = null; }
    if (!data || typeof data !== 'object') data = {};
    // 다른 비령/초록동색 계정의 데이터는 절대 읽지 않는다.
    // 스탯 조작과 캐릭터 변경을 막되, 이 체험판의 전투/개척 기록은 보존한다.
    data.profile = { ...PROFILE, stats: { ...STATS } };
    if (data.game && typeof data.game === 'object') {
      data.game.stats = { ...STATS };
      data.game.name = PROFILE.name;
      data.game.greeting = PROFILE.intro;
    }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (error) {
      console.warn('[비령 체험판] 브라우저 저장을 사용할 수 없습니다.', error);
    }
  }

  // 빌드된 vC.05 플레이 코어가 사용하던 메인 페이지의 인증 인터페이스를
  // 로컬 전용으로 대체한다. 서버 요청이나 로그인 절차는 없다.
  window.BiryeongAuth = Object.freeze({
    saveKey: () => SAVE_KEY,
    isAdmin: () => false,
    session: () => null,
    server: false,
  });
  window.BiryeongPerk = () => null;
  window.BiryeongDemo = Object.freeze({ SAVE_KEY, PROFILE, STAT_KEYS, reset() { localStorage.removeItem(SAVE_KEY); } });
  ensureDemoSave();
})();
