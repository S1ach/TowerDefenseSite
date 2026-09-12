import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game/core/GameEngine';
import { GameLoop } from '../src/game/core/GameLoop';
import { pathLength, pointOnPath, placementError } from '../src/game/math/path';
import { selectTarget } from '../src/game/systems/TargetingSystem';
import type { Enemy, Tower } from '../src/game/entities/types';
import { TOWERS, investment } from '../src/game/config/balance';

function advance(engine: GameEngine, seconds: number, fps = 60) { for (let i = 0; i < Math.round(seconds * fps); i++) engine.advance(1 / fps); }
test('fixed timestep produces identical simulation at 30 and 144 FPS', () => {
  const a = new GameEngine(); const b = new GameEngine();
  a.startWave(); b.startWave(); advance(a, 10, 30); advance(b, 10, 144);
  assert.deepEqual(a.state, b.state);
});
test('speed scales simulation time; pause prevents all updates', () => {
  const a = new GameEngine(); const b = new GameEngine(); a.startWave(); b.startWave();
  b.state.speed = 4; advance(a, 8); advance(b, 2); b.state.speed = 1;
  assert.deepEqual(a.state, b.state);
  const before = structuredClone(a.state); a.state.paused = true; advance(a, 3); a.state.paused = false;
  assert.deepEqual(a.state, before);
});
test('catch-up is bounded after returning from a suspended tab', () => {
  const loop = new GameLoop(); let ticks = 0; loop.advance(600, 1, () => ticks++); assert.equal(ticks, 5);
});
test('path endpoints and corner movement are exact', () => {
  assert.deepEqual(pointOnPath(0), {x: -13, z: 5}); assert.deepEqual(pointOnPath(6), { x: -7, z: 5 });
  assert.deepEqual(pointOnPath(7), { x: -7, z: 4 }); assert.deepEqual(pointOnPath(pathLength + 10), { x: 13, z: -5 });
});
test('placement rejects road, edges, overlap and insufficient gold without mutation', () => {
  const engine = new GameEngine(); assert.ok(engine.build('machine', {x: -7, z: 0})); assert.equal(engine.state.gold, 500);
  assert.ok(placementError({x: 13, z: 8}, []));
  assert.equal(engine.build('cannon', {x: -4, z: 0}), null); assert.equal(engine.state.gold, 320);
  assert.ok(engine.build('machine', {x: -4, z: 0.5}));
  engine.state.gold = 10; assert.equal(engine.build('sniper', {x: 3, z: 0}), 'Недостаточно золота'); assert.equal(engine.state.towers.length, 1);
});
test('upgrade max level and sell value use total investment', () => {
  const engine = new GameEngine(); engine.state.gold = 1000; engine.build('machine', {x: -4, z: 0});
  const tower = engine.state.towers[0]; assert.equal(engine.upgrade(tower.id), null); assert.equal(engine.upgrade(tower.id), null);
  assert.equal(tower.level, 3); assert.ok(engine.upgrade(tower.id)); assert.equal(tower.invested, investment('machine', 3));
  engine.sell(tower.id); assert.equal(engine.state.gold, 1000 - tower.invested + Math.floor(tower.invested * 7 / 10)); assert.equal(engine.state.towers.length, 0);
});
test('targeting strategies filter range and state, then choose correctly', () => {
  const tower: Tower = {id:1,type:'sniper',x:0,z:0,level:1,cooldown:0,invested:250,strategy:'first'};
  const base: Enemy = {id:1,type:'basic',x:2,z:0,hp:10,maxHp:100,speed:1,reward:1,damage:1,progress:1,previousProgress:1,state:'moving'};
  const enemies = [base, {...base,id:2,x:3,hp:100,progress:8}, {...base,id:3,x:1,hp:40,progress:4}, {...base,id:4,x:20,hp:1000,progress:40}];
  assert.equal(selectTarget(tower,enemies)?.id,2);
  tower.strategy='closest'; assert.equal(selectTarget(tower,enemies)?.id,3);
  tower.strategy='weakest'; assert.equal(selectTarget(tower,enemies)?.id,1);
  tower.strategy='strongest'; assert.equal(selectTarget(tower,enemies)?.id,2);
});
test('combat rewards kills and completes a defended wave', () => {
  const engine = new GameEngine(); engine.state.gold = 5000;
  for (const p of [{x:-10,z:2},{x:-4,z:1},{x:3,z:0},{x:10,z:-1}]) { engine.build('sniper',p); const tower = engine.state.towers.at(-1)!; engine.upgrade(tower.id); engine.upgrade(tower.id); }
  let killed = 0; engine.events.subscribe(e => { if(e.type==='enemyKilled') killed++; });
  engine.startWave(); advance(engine, 60);
  assert.equal(engine.state.status,'ready'); assert.equal(engine.state.baseHp,20); assert.equal(engine.state.kills,10); assert.equal(killed,10); assert.equal(engine.state.projectiles.length,0);
});
test('unprotected base loses and simulation stops', () => {
  const engine = new GameEngine(); engine.state.baseHp=1; engine.startWave(); advance(engine, 60);
  assert.equal(engine.state.status,'defeat'); assert.equal(engine.state.baseHp,0); const before=structuredClone(engine.state); advance(engine,20); assert.deepEqual(engine.state,before);
});
test('save/load round-trip restores a valid between-wave state and rejects corrupted saves atomically', () => {
  const engine = new GameEngine(); engine.build('machine',{x:-4,z:0}); engine.upgrade(engine.state.towers[0].id);
  const save=engine.save(); const restored=new GameEngine(); restored.load(save); assert.deepEqual(restored.save(),save);
  assert.throws(() => restored.load({...save, gold:-100})); assert.deepEqual(restored.save(),save);
  assert.throws(() => restored.load({...save,towers:[{...save.towers[0],x:-7,z:0}]}));
  restored.startWave(); assert.throws(() => restored.save(), /между волнами/);
});
test('all twelve waves can reach victory with a strong legal defense', () => {
  const engine = new GameEngine(); engine.state.gold=100000;
  for(let x=-11;x<=11;x+=2) for(let z=-8;z<=8;z+=2) {
    if(!engine.build('sniper',{x,z})) { const t=engine.state.towers.at(-1)!; engine.upgrade(t.id); engine.upgrade(t.id); }
  }
  for(let wave=1;wave<=12;wave++) { assert.equal(engine.startWave(),true); advance(engine,120); assert.equal(engine.state.wave,wave); assert.notEqual(engine.state.status,'defeat'); }
  assert.equal(engine.state.status,'victory'); assert.equal(engine.startWave(),false); assert.equal(engine.save().wave,12);
});
test('automatic next wave waits twenty seconds and remains optional', () => {
  const engine=new GameEngine(); engine.state.wave=1; advance(engine,30); assert.equal(engine.state.status,'ready');
  engine.state.autoNext=true; advance(engine,19); assert.equal(engine.state.status,'ready'); advance(engine,1.1); assert.equal(engine.state.status,'wave');
});
test('initial affordable defense uses configured costs', () => { assert.equal(TOWERS.machine.cost,100); assert.equal(new GameEngine().state.gold,500); });
