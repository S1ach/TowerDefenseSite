import { performance } from 'node:perf_hooks';
import { GameEngine } from '../src/game/core/GameEngine';
import { pointOnPath } from '../src/game/math/path';
for (const count of [100,300,500]) {
  const engine = new GameEngine(); engine.state.gold = 100000;
  for(let x=-11;x<12 && engine.state.towers.length<40;x+=2) for(let z=-8;z<9 && engine.state.towers.length<40;z+=2) engine.build('machine',{x,z});
  engine.state.status='wave';
  engine.state.enemies=Array.from({length:count},(_,i)=>({id:1000+i,type:'basic',...pointOnPath(i%20),hp:100000,maxHp:100000,speed:1,reward:1,damage:1,progress:i%20,previousProgress:i%20,state:'moving'}));
  const started=performance.now();
  for(let tick=0;tick<100;tick++) engine.advance(0.05);
  console.log(`${count} врагов / ${engine.state.towers.length} башен: ${((performance.now()-started)/100).toFixed(3)} мс на шаг (бюджет 50 мс). Только симуляция, без GPU.`);
}
