import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import { db } from '../server/db';
import { GameEngine } from '../src/game/core/GameEngine';
const origin = 'http://127.0.0.1:3001';
const createdUsers: string[] = [];
const sockets: Socket[] = [];
async function request(path: string, body?: unknown, cookie?: string, extraHeaders?: Record<string,string>) {
  return fetch(`${origin}/api${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(cookie ? { cookie } : {}), ...extraHeaders }, body: body === undefined ? undefined : JSON.stringify(body) });
}
function event<T>(socket: Socket, name: string): Promise<T> {
  return new Promise((resolve,reject) => {
    const timeout=setTimeout(() => { socket.off(name,handler); reject(new Error(`Timeout: ${name}`)); },5000);
    const handler=(value:T) => { clearTimeout(timeout); resolve(value); };
    socket.once(name,handler);
  });
}
async function connect(cookie?: string) {
  const socket=io(origin,{autoConnect:false,transports:['websocket'],extraHeaders:cookie ? {cookie}:undefined}); sockets.push(socket);
  const ready=event(socket,'connect'); socket.connect(); await ready; return socket;
}
try {
  assert.equal((await request('/health')).status,200);
  const email=`test-${randomUUID()}@example.invalid`; const password=randomUUID();
  const registration=await request('/auth/register',{email,password,name:'Тест Sentinel'}); assert.equal(registration.status,201);
  const user=await registration.json() as {id:string}; createdUsers.push(user.id);
  const cookie=registration.headers.get('set-cookie')!.split(';')[0]; assert.ok(cookie.startsWith('sentinel_token='));
  assert.equal((await request('/auth/login',{email,password:'incorrect-password'})).status,401);
  assert.equal((await request('/auth/login',{email,password})).status,200);
  assert.equal((await request('/auth/me',undefined,cookie)).status,200);
  assert.equal((await request('/games')).status,401);
  const game=new GameEngine(); game.build('machine',{x:-4,z:0}); const save=game.save();
  const created=await request('/games',save,cookie); assert.equal(created.status,201); const {id}=await created.json() as {id:string};
  assert.equal((await request(`/games/${id}/save`,save,cookie)).status,200);
  assert.deepEqual(await (await request(`/games/${id}`,undefined,cookie)).json(),save);
  assert.equal((await request(`/games/${id}/save`,{...save,gold:-1},cookie)).status,400);
  assert.equal((await request(`/games/${id}/save`,save,cookie,{Origin:'https://untrusted.example'})).status,403);
  const second=await request('/auth/register',{email:`test-${randomUUID()}@example.invalid`,password:randomUUID(),name:'Второй тест'}); assert.equal(second.status,201);
  createdUsers.push((await second.json() as {id:string}).id); const secondCookie=second.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await request(`/games/${id}`,undefined,secondCookie)).status,404);
  assert.equal((await request(`/games/${id}/save`,save,secondCookie)).status,404);
  const leaderboard=await (await request('/leaderboard')).json() as {user:{name:string}}[]; assert.ok(leaderboard.some(row=>row.user.name==='Тест Sentinel'));
  const owner=await connect(cookie); const viewer=await connect(); const attacker=await connect(secondCookie);
  const denied=event<string>(attacker,'streamError'); attacker.emit('host',id); assert.match(await denied,/Войдите/);
  const hosting=event<string>(owner,'hosting'); owner.emit('host',id); assert.equal(await hosting,id);
  const watching=event<string>(viewer,'watching'); viewer.emit('watch',id); assert.equal(await watching,id);
  const received=event<{wave:number}>(viewer,'snapshot'); owner.emit('snapshot',{gold:400,baseHp:20,wave:1,score:0,enemies:[],towers:[]}); assert.equal((await received).wave,1);
  const ended=event(viewer,'streamEnded'); owner.emit('stop'); await ended;
  assert.equal((await request('/auth/logout',{},cookie)).status,200);
  console.log('API и WebSocket: регистрация, вход, сохранение/загрузка, валидация, изоляция пользователей, рейтинг, трансляция и остановка — OK');
} finally {
  sockets.forEach(socket=>socket.disconnect());
  if(createdUsers.length) await db.user.deleteMany({where:{id:{in:createdUsers}}});
  await db.$disconnect();
}
