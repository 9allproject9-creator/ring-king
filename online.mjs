// 온라인 1:1 서버: WebSocket(/ws). 빠른 대전(아무나) + 방 코드(친구와). 경기 판정은 서버의 PvpMatch가 한다.
import { WebSocketServer } from 'ws';
import { PvpMatch } from './src/game/pvp.js';

const TICK = 1000 / 60;
const SEND_EVERY = 2; // 30Hz로 상태 전송
const rooms = new Map(); // code → room
let waitingQuick = null; // 빠른 대전 대기자

function code4() {
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  do { c = ''; for (let i = 0; i < 4; i++) c += ch[Math.floor(Math.random() * ch.length)]; } while (rooms.has(c));
  return c;
}

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function cleanName(n) {
  return String(n || '복서').replace(/[<>]/g, '').slice(0, 8) || '복서';
}

function cleanLook(l) {
  // 신뢰할 수 없는 입력: 필요한 값만, 짧은 문자열만 통과
  const col = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : d);
  const s = l && typeof l === 'object' ? l : {};
  const hair = s.hair && typeof s.hair === 'object' ? s.hair : {};
  const styles = ['slick', 'spiky', 'buzz', 'ponytail', 'bob', 'curly', 'bald', 'flattop', 'mohawk', 'afro', 'long', 'twinbuns'];
  return {
    build: { w: 0.95, h: 1.0, belly: 0, neck: 0.95, arm: 1, head: 1 },
    skin: col(s.skin, '#f0c8a0'),
    hair: { style: styles.includes(hair.style) ? hair.style : 'slick', color: col(hair.color, '#2a1a12') },
    trunks: col(s.trunks, '#e8e8e8'), trim: '#1a1a1a', gloves: col(s.gloves, '#2f7de1'),
    brow: 'normal', eyes: 'big', nose: 'small', extras: [], tellColor: '#ffe23a',
  };
}

function startRoom(room) {
  room.match = new PvpMatch({ seed: Math.floor(Math.random() * 1e9) });
  room.inputs = [{ p: 0, h: 0 }, { p: 0, h: 0 }];
  room.frame = 0;
  room.events = [];
  room.players.forEach((pl, i) => send(pl.ws, {
    t: 'start', you: i, code: room.code,
    names: room.players.map((x) => x.name), looks: room.players.map((x) => x.look),
  }));
  clearInterval(room.timer);
  room.timer = setInterval(() => tick(room), TICK);
}

function tick(room) {
  const m = room.match;
  if (!m) return;
  const ins = room.inputs.map((x) => { const v = x.p | x.h; x.p = 0; return v; });
  m.step(ins[0], ins[1]);
  if (m.events.length) room.events.push(...m.events.splice(0));
  room.frame++;
  if (room.frame % SEND_EVERY === 0 || m.over) {
    const snap = m.snapshot();
    snap.fr = room.frame;
    snap.ev = room.events;
    room.events = [];
    const msg = JSON.stringify({ t: 's', ...snap });
    for (const pl of room.players) if (pl.ws.readyState === 1) pl.ws.send(msg);
  }
  if (m.over) {
    clearInterval(room.timer);
    room.timer = null;
    room.rematch = [false, false];
  }
}

function closeRoom(room, leaver) {
  clearInterval(room.timer);
  for (const pl of room.players) if (pl !== leaver) send(pl.ws, { t: 'oppLeft' });
  rooms.delete(room.code);
  for (const pl of room.players) pl.room = null;
}

export function attachOnline(server) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
  wss.on('connection', (ws) => {
    const me = { ws, name: '복서', look: cleanLook(null), room: null, alive: true };
    ws.on('pong', () => { me.alive = true; });
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }
      if (!msg || typeof msg.t !== 'string') return;
      if (msg.t === 'in') {
        const r = me.room;
        if (!r || !r.match) return;
        const i = r.players.indexOf(me);
        if (i < 0) return;
        r.inputs[i].p |= (msg.p | 0) & 0xfff;
        r.inputs[i].h = (msg.h | 0) & 0xfff;
        return;
      }
      if (msg.t === 'ping') { send(ws, { t: 'pong', c: msg.c }); return; }
      if (msg.t === 'quick' || msg.t === 'create' || msg.t === 'join') {
        if (me.room) return;
        me.name = cleanName(msg.name);
        me.look = cleanLook(msg.look);
      }
      if (msg.t === 'quick') {
        if (waitingQuick && waitingQuick !== me && waitingQuick.ws.readyState === 1 && !waitingQuick.room) {
          const other = waitingQuick;
          waitingQuick = null;
          const room = { code: code4(), players: [other, me], quick: true };
          rooms.set(room.code, room);
          other.room = room;
          me.room = room;
          startRoom(room);
        } else {
          waitingQuick = me;
          send(ws, { t: 'wait', mode: 'quick' });
        }
      } else if (msg.t === 'create') {
        const room = { code: code4(), players: [me] };
        rooms.set(room.code, room);
        me.room = room;
        send(ws, { t: 'wait', mode: 'room', code: room.code });
      } else if (msg.t === 'join') {
        const room = rooms.get(String(msg.code || '').toUpperCase().trim());
        if (!room || room.players.length >= 2) { send(ws, { t: 'err', msg: '그 코드의 방을 찾을 수 없어요.' }); return; }
        room.players.push(me);
        me.room = room;
        startRoom(room);
      } else if (msg.t === 'rematch') {
        const r = me.room;
        if (!r || !r.match || !r.match.over) return;
        r.rematch[r.players.indexOf(me)] = true;
        for (const pl of r.players) if (pl !== me) send(pl.ws, { t: 'rematchAsk' });
        if (r.rematch.every(Boolean)) startRoom(r);
      } else if (msg.t === 'leave') {
        if (waitingQuick === me) waitingQuick = null;
        if (me.room) closeRoom(me.room, me);
      }
    });
    ws.on('close', () => {
      if (waitingQuick === me) waitingQuick = null;
      if (me.room) closeRoom(me.room, me);
    });
    ws.meRef = me;
  });
  // 끊긴 연결 정리
  const hb = setInterval(() => {
    for (const ws of wss.clients) {
      const me = ws.meRef;
      if (me && !me.alive) { ws.terminate(); continue; }
      if (me) me.alive = false;
      ws.ping();
    }
  }, 15000);
  wss.on('close', () => clearInterval(hb));
  return wss;
}

export function onlineStats() {
  return { rooms: rooms.size, waiting: waitingQuick ? 1 : 0 };
}
