// 설정: 난이도, 소리, 접근성, 키 바꾸기, 화질, 저장(내보내기·가져오기·초기화)
import { el, toast } from './dom.js';
import { Screen, topBar } from './common.js';
import { CONFIG } from '../config.js';
import { DEFAULT_KEYS, ACTION_LABELS, keyName } from '../input/keyboard.js';

export class SettingsScreen extends Screen {
  enter() {
    this.app.backdrop.set({ venue: 'gym', opponent: null, mode: 'orbit' });
    this.render();
  }

  render() {
    const app = this.app;
    const s = app.settings;
    const save = () => { app.save.save(); app.applySettings(); };
    const check = (key, label, desc) => el('label', { class: 'chk' }, [
      el('input', { type: 'checkbox', checked: !!s[key], onchange: (e) => { s[key] = e.target.checked; save(); } }),
      el('span', {}, [label, desc ? el('div', { class: 'small' }, desc) : null]),
    ]);
    const slider = (key, label) => el('label', {}, [
      `${label}`,
      el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key], oninput: (e) => { s[key] = Number(e.target.value); app.audio.setVolumes(s.sfx, s.music); }, onchange: () => { save(); app.audio.sfx('ui'); } }),
    ]);
    const diff = el('div', { class: 'row', style: 'justify-content:flex-start;gap:6px' }, Object.entries(CONFIG.difficulty).map(([k, v]) => el('button', {
      class: 'btn sm ' + (s.difficulty === k ? '' : 'secondary'),
      onclick: () => { s.difficulty = k; save(); this.render(); },
    }, v.label)));
    const quality = el('div', { class: 'row', style: 'justify-content:flex-start;gap:6px' }, [['auto', '자동'], ['high', '선명하게'], ['low', '빠르게']].map(([k, v]) => el('button', {
      class: 'btn sm ' + (s.quality === k ? '' : 'secondary'),
      onclick: () => { s.quality = k; save(); this.render(); },
    }, v)));
    const touchSel = el('div', { class: 'row', style: 'justify-content:flex-start;gap:6px' }, [['auto', '자동'], ['on', '항상 보이기'], ['off', '숨기기']].map(([k, v]) => el('button', {
      class: 'btn sm ' + (s.showTouch === k ? '' : 'secondary'),
      onclick: () => { s.showTouch = k; save(); this.render(); },
    }, v)));
    const keys = { ...DEFAULT_KEYS, ...(s.keys || {}) };
    const keyRows = Object.keys(ACTION_LABELS).map((a) => el('tr', {}, [
      el('td', { style: 'text-align:left' }, ACTION_LABELS[a]),
      el('td', {}, el('button', {
        class: 'btn sm secondary',
        onclick: (e) => {
          const b = e.currentTarget;
          b.textContent = '키를 누르세요…';
          app.keyboard.capture = (code) => {
            const nk = { ...keys };
            // 다른 행동에 이미 쓰인 키면 빼 준다
            for (const k2 of Object.keys(nk)) nk[k2] = nk[k2].filter((c) => c !== code);
            nk[a] = [code, ...(keys[a] || []).filter((c) => c !== code).slice(0, 1)];
            s.keys = nk;
            app.keyboard.setKeys(nk);
            save();
            this.render();
          };
        },
      }, (keys[a] || []).map(keyName).join(' / ') || '-')),
    ]));
    const io = el('textarea', { rows: 3, placeholder: '여기에 저장 코드를 붙여 넣거나, 내보내기를 눌러 복사하세요.', style: 'font-size:13px' });
    const ok = app.save.ok;
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, '설정', () => app.go('gym')),
      el('div', { class: 'panel col fade-in', style: 'width:min(760px,96vw);margin-top:70px;max-height:calc(100vh - 90px);overflow:auto' }, [
        ok ? null : el('div', { class: 'bubble', style: 'background:#ffe0e0' }, '⚠ 저장 안 됨: 이 브라우저(사생활 보호 모드 등)에서는 진행 상황이 저장되지 않아요. 게임은 할 수 있고, 아래 "내보내기"로 코드를 복사해 두면 나중에 이어서 할 수 있어요.'),
        el('h3', {}, '난이도'),
        el('div', { class: 'small' }, '쉬움: 텔이 1.4배 길고 받는 피해 0.7배 · 어려움: 텔이 0.85배. 커리어 중에도 바꿀 수 있고 결과에 표시돼요.'),
        diff,
        el('h3', {}, '소리'),
        slider('sfx', '효과음 크기'), slider('music', '음악 크기'),
        el('h3', {}, '보기 · 접근성'),
        check('tellHighlight', '텔 강조 표시', '공격 직전 상대 테두리가 빛나고, 피할 방향이 화살표·방패 모양으로 나와요'),
        check('shake', '화면 흔들림', '끄면 맞거나 때릴 때 화면이 흔들리지 않아요'),
        check('reduceFlash', '깜빡임 줄이기', '카메라 플래시와 번쩍임을 줄여요'),
        check('reduceMotion', '움직임 줄이기', '슬로모션·카메라 연출·글자 애니메이션을 줄여요 (기기의 "동작 줄이기" 설정도 따라요)'),
        el('div', {}, '화질'), quality,
        el('div', {}, '터치 버튼'), touchSel,
        el('label', {}, ['터치 버튼 크기', el('input', { type: 'range', min: 0.8, max: 1.5, step: 0.05, value: s.touchSize, onchange: (e) => { s.touchSize = Number(e.target.value); save(); } })]),
        el('div', { class: 'small' }, '언어: 한국어'),
        el('h3', {}, '키 바꾸기 (키보드)'),
        el('table', { class: 'tbl' }, keyRows),
        el('button', { class: 'btn sm secondary', onclick: () => { s.keys = null; app.keyboard.setKeys(null); save(); this.render(); } }, '기본 키로 되돌리기'),
        el('h3', {}, '내 복서 · 튜토리얼'),
        el('div', { class: 'row', style: 'justify-content:flex-start' }, [
          el('button', { class: 'btn sm blue', onclick: () => app.go('create', { edit: true }) }, '이름·모습 바꾸기'),
          el('button', { class: 'btn sm blue', onclick: () => app.go('tutorial') }, '튜토리얼 다시 보기'),
        ]),
        el('h3', {}, '저장 데이터'),
        el('div', { class: 'small' }, `상태: ${ok ? '자동 저장 중 ✅' : '저장 안 됨 ⚠'}`),
        io,
        el('div', { class: 'row', style: 'justify-content:flex-start' }, [
          el('button', { class: 'btn sm', onclick: async () => {
            io.value = app.save.exportText();
            io.select();
            try { await navigator.clipboard.writeText(io.value); toast('복사했어요! 다른 기기에서 가져오기에 붙여 넣으세요.'); } catch (e) { toast('코드를 길게 눌러 복사하세요.'); }
          } }, '내보내기(복사)'),
          el('button', { class: 'btn sm secondary', onclick: () => {
            try {
              app.save.importText(io.value);
              app.settings = app.save.data.settings;
              app.applySettings();
              toast('가져왔어요!');
              this.render();
            } catch (e) { toast(e.message); app.audio.sfx('error'); }
          } }, '가져오기'),
          el('button', { class: 'btn sm red', onclick: () => this.confirmReset() }, '처음부터 다시(초기화)'),
        ]),
      ]),
    ]));
  }

  confirmReset() {
    const app = this.app;
    const box = el('div', { class: 'screen dim', style: 'z-index:20' }, el('div', { class: 'panel col', style: 'width:min(420px,92vw);text-align:center' }, [
      el('h2', {}, '정말 초기화할까요?'),
      el('p', {}, '별, 코인, 꾸미기, 도전 과제, 기록이 모두 지워져요. 되돌릴 수 없어요!'),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn secondary', onclick: () => box.remove() }, '아니요'),
        el('button', { class: 'btn red', onclick: () => {
          app.save.reset();
          app.settings = app.save.data.settings;
          app.applySettings();
          box.remove();
          toast('초기화했어요.');
          app.go('title');
        } }, '네, 지울래요'),
      ]),
    ]));
    this.root.appendChild(box);
  }

  onUi(code) {
    if (code === 'Escape' && !this.app.keyboard.capture) this.app.go('gym');
  }
}
