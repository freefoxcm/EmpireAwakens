import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Battle, RULES, schedule, specs } from '../src/battle.ts';
import { isWalkable, MAP } from '../src/geometry.ts';

test('lower deployment validates region, energy and occupancy',()=>{
 const b=new Battle();b.deploy(135,200);assert.equal(b.units.length,0);
 b.deploy(135,500);assert.equal(b.units.length,1);assert.equal(b.energy,4);
 b.energy=10;b.deploy(135,500);assert.equal(b.units.length,1);assert.match(b.message,/已有部队/);
 b.status='paused';b.update(1);assert.equal(b.time,0);
});
test('both teams cross the horizontal river only on bridges',()=>{
 for(const [team,start,dest] of [['ally',410,200],['enemy',240,450]]){
  const b=new Battle(),u=b.spawn('warrior',team,200,start);
  for(let i=0;i<400;i++){b.move(u,200,dest,.05);if(u.y>=MAP.riverTop&&u.y<=MAP.riverBottom)assert.ok(MAP.bridges.some(x=>Math.abs(u.x-x)<=MAP.bridgeHalfWidth))}
  assert.ok(team==='ally'?u.y<MAP.riverTop:u.y>MAP.riverBottom);
 }
});
test('both bridge lanes can be traversed',()=>{
 for(const lane of MAP.bridges){const b=new Battle(),u=b.spawn('warrior','ally',lane,400);for(let i=0;i<100;i++)b.move(u,lane,250,.05);assert.ok(u.y<MAP.riverTop)}
});
test('monk approaches and heals an injured ally',()=>{
 const b=new Battle(),monk=b.spawn('monk','ally',180,550),ally=b.spawn('warrior','ally',135,420);ally.hp-=90;
 for(let i=0;i<300;i++){b.update(.05);if(ally.hp>specs.warrior.hp-90)break}
 assert.ok(monk.x!==180||monk.y!==550);assert.ok(ally.hp>specs.warrior.hp-90);assert.ok(b.events.some(e=>e.type==='heal'));
});
test('monk follows a healthy ally outside healing vision and then heals',()=>{
 const b=new Battle();b.next=schedule.length;b.towers.forEach(t=>t.hp=0);
 const monk=b.spawn('monk','ally',135,550),ally=b.spawn('warrior','ally',135,240);
 for(let i=0;i<200;i++)b.update(.05);
 assert.ok(monk.y<400,`monk did not follow: ${monk.x},${monk.y}`);
 ally.hp-=60;
 for(let i=0;i<120&&ally.hp<specs.warrior.hp-60+1;i++)b.update(.05);
 assert.ok(ally.hp>specs.warrior.hp-60,'monk heals after catching up');
});
test('units bypass their own tower from either side without getting stuck',()=>{
 for(const [team,x,y,targetY] of [['ally',65,600,130],['ally',135,645,200],['enemy',375,95,500]]){
  const b=new Battle(),u=b.spawn('warrior',team,x,y);
  for(let i=0;i<600;i++)b.move(u,x,targetY,.05);
  assert.ok(team==='ally'?u.y<300:u.y>358,`${team} stalled at ${u.x},${u.y}`);
 }
});
test('boss telegraphs and hits nearby units',()=>{
 const b=new Battle(),boss=b.spawn('troll','enemy',135,450),ally=b.spawn('warrior','ally',145,450);
 boss.special=0;b.update(.05);assert.ok(boss.windup>0);for(let i=0;i<30;i++)b.update(.05);
 assert.ok(ally.hp<specs.warrior.hp);assert.ok(b.events.some(e=>e.type==='boss'));
});
test('victory and defeat resolve',()=>{
 const loss=new Battle();loss.towers.filter(t=>t.team==='ally').forEach(t=>t.hp=0);loss.base=1;loss.spawn('goblin','enemy',240,565);loss.update(.05);assert.equal(loss.status,'lost');
 const win=new Battle();win.next=schedule.length;win.bossDefeated=true;win.update(.05);assert.equal(win.status,'won');
});
test('terrain rejects water and both building footprints',()=>{
 assert.equal(isWalkable(240,329),false);assert.equal(isWalkable(135,329),true);
 assert.equal(isWalkable(MAP.baseX,MAP.baseY),false);assert.equal(isWalkable(MAP.campX,MAP.campY),false);
});
test('full simulated encounter completes with all units in valid terrain',()=>{
 const b=new Battle();let nextDeploy=0;
 while(b.status==='playing'&&b.time<220){
  if(b.time>=nextDeploy){b.selected=Math.floor(nextDeploy/4)%3===0?'lancer':'archer';b.deploy(Math.floor(nextDeploy/4)%2?135:345,500);nextDeploy+=4}
  b.update(.05);for(const u of b.units)assert.ok(isWalkable(u.x,u.y),`${u.kind} outside terrain ${u.x},${u.y}`);b.events.length=0;
 }
 assert.ok(b.status==='won'||b.status==='lost',`unfinished at ${b.time}`);
 if(b.status==='won')assert.ok(b.bossSpawned&&b.bossDefeated,'victory requires the boss encounter');
});

test('defensive towers attack opponents, can be damaged and release their footprint when destroyed',()=>{
 const b=new Battle(), friendly=b.towers.find(t=>t.id==='a1'), foe=b.spawn('goblin','enemy',100,MAP.allyTowerY-45);
 const hp=foe.hp,towerHp=friendly.hp;b.update(.05);assert.ok(foe.hp<hp,'friendly tower fires');
 assert.ok(friendly.hp<towerHp,'monster attacks the tower');
 assert.equal(b.walkable(friendly.x,friendly.y),false);
 friendly.hp=0;assert.equal(b.walkable(friendly.x,friendly.y),true);
 const other=new Battle(),enemyTower=other.towers.find(t=>t.id==='e1');
 const soldier=other.spawn('warrior','ally',100,MAP.enemyTowerY+50),before=enemyTower.hp;
 other.update(.05);assert.ok(enemyTower.hp<before,'allies attack enemy towers');
 assert.ok(soldier.hp<specs.warrior.hp,'enemy tower returns fire');
});
test('both teams prioritize an enemy unit over a nearer tower',()=>{
 const a=new Battle(),archer=a.spawn('archer','ally',100,245),goblin=a.spawn('goblin','enemy',230,245);
 const enemyTower=a.towers.find(t=>t.id==='e1'),towerHp=enemyTower.hp;
 a.update(.05);assert.ok(goblin.hp<specs.goblin.hp);assert.equal(enemyTower.hp,towerHp);
 const b=new Battle(),shaman=b.spawn('shaman','enemy',100,500),warrior=b.spawn('warrior','ally',220,500);
 const friendlyTower=b.towers.find(t=>t.id==='a1'),friendlyHp=friendlyTower.hp;
 b.update(.05);assert.ok(warrior.hp<specs.warrior.hp);assert.equal(friendlyTower.hp,friendlyHp);
});
test('units attack towers before main bases, then can destroy either base',()=>{
 const b=new Battle(),archer=b.spawn('archer','ally',100,245),tower=b.towers.find(t=>t.id==='e1'),hp=tower.hp;
 b.update(.05);assert.ok(tower.hp<hp);assert.equal(b.enemyBase,b.maxEnemyBase);
 const a=new Battle();a.towers.filter(t=>t.team==='enemy').forEach(t=>t.hp=0);a.enemyBase=1;a.bossDefeated=true;a.spawn('archer','ally',135,160);a.update(.05);
 assert.equal(a.enemyBase,0);assert.equal(a.status,'won');
 const d=new Battle();d.towers.filter(t=>t.team==='ally').forEach(t=>t.hp=0);d.base=1;d.spawn('goblin','enemy',240,565);d.update(.05);
 assert.equal(d.base,0);assert.equal(d.status,'lost');
});
test('pursuit reaches a unit standing on a bridge',()=>{
 const b=new Battle();b.towers.forEach(t=>t.hp=0);const u=b.spawn('warrior','ally',200,390);
 for(let i=0;i<250;i++)b.move(u,135,330,.05);
 assert.ok(Math.hypot(u.x-135,u.y-330)<5, `stalled at ${u.x},${u.y}`);
});

test('towers align with bridges and units can move around a friendly tower',()=>{
 const b=new Battle();
 for(const tower of b.towers)assert.ok(MAP.bridges.includes(tower.x));
 for(const lane of MAP.bridges){
  const c=new Battle(),u=c.spawn('goblin','enemy',lane,Math.max(MAP.minY,MAP.enemyTowerY-35));
  for(let i=0;i<500;i++)c.move(u,lane,250,.05);
  assert.ok(u.y>230, `unit stalled behind tower at ${u.x},${u.y}`);
 }
});
test('waves enter directly in front of the enemy base and keep both lane assignments',()=>{
 const b=new Battle();b.time=schedule[0].time-.01;b.update(.02);
 const first=b.units.find(u=>u.team==='enemy');
 assert.ok(first);assert.equal(first.lane,0);
 assert.ok(Math.hypot(first.x-MAP.spawnX,first.y-MAP.spawnY)<2);
 assert.ok(first.x<MAP.spawnX,'left-lane wave initially moves toward the left bridge');
 b.units=[];b.time=schedule[1].time-.01;b.update(.02);
 const second=b.units.find(u=>u.team==='enemy');
 assert.ok(second);assert.equal(second.lane,1);
 assert.ok(Math.hypot(second.x-MAP.spawnX,second.y-MAP.spawnY)<2);
 assert.ok(second.x>MAP.spawnX,'right-lane wave initially moves toward the right bridge');
});
test('occupied spawn point queues waves and prevents premature victory',()=>{
 const b=new Battle(),blocker=b.spawn('goblin','enemy',MAP.spawnX,MAP.spawnY);
 b.time=schedule[0].time-.01;b.update(.02);
 assert.equal(b.pendingSpawns.length,1);assert.equal(b.units.length,1);
 b.units=[];b.update(.02);
 assert.equal(b.pendingSpawns.length,0);assert.equal(b.units.length,1);
 assert.ok(Math.hypot(b.units[0].x-MAP.spawnX,b.units[0].y-MAP.spawnY)<2);
 const c=new Battle();c.next=schedule.length;c.pendingSpawns.push(schedule[0]);
 c.spawn('warrior','ally',MAP.spawnX,MAP.spawnY);c.update(.01);
 assert.equal(c.status,'playing');assert.equal(c.pendingSpawns.length,1);
});
test('enemies leaving the central spawn can pass their own towers on either lane',()=>{
 for(const lane of [0,1]){
  const b=new Battle(),u=b.spawn('goblin','enemy',MAP.spawnX,MAP.spawnY,lane);
  for(let i=0;i<1500;i++)b.move(u,MAP.baseX,MAP.baseY,.05);
  assert.ok(u.y>MAP.riverBottom,`lane ${lane} blocked at ${u.x.toFixed(1)},${u.y.toFixed(1)}`);
 }
});

test('far-away enemies do not pull a unit away from a nearby tower',()=>{
 const b=new Battle(),archer=b.spawn('archer','ally',100,245),distant=b.spawn('goblin','enemy',310,245);
 const tower=b.towers.find(t=>t.id==='e1'),before=tower.hp;
 b.update(.05);assert.ok(tower.hp<before);assert.equal(distant.hp,specs.goblin.hp);
});
test('boss shield prevents early victory and opens after the boss dies',()=>{
 const b=new Battle();b.towers.filter(t=>t.team==='enemy').forEach(t=>t.hp=0);
 b.enemyBase=10;const archer=b.spawn('archer','ally',135,160);b.update(.05);
 assert.equal(b.enemyBase,1);assert.equal(b.status,'playing');assert.equal(b.bossDefeated,false);
 assert.ok(b.events.some(e=>e.type==='shield'));assert.ok(b.events.some(e=>e.type==='hit'&&e.amount===9));
 b.events=[];archer.cooldown=0;b.update(.05);assert.ok(!b.events.some(e=>e.type==='hit'),'shielded base shows no false damage');
 const boss=b.spawn('troll','enemy',300,160);boss.hp=0;b.update(.05);assert.equal(b.bossDefeated,true);
 archer.cooldown=0;b.update(.05);assert.equal(b.enemyBase,0);assert.equal(b.status,'won');
});
test('army limit and protected boss spawn area are enforced',()=>{
 const b=new Battle();
 for(let i=0;i<RULES.maxAllies;i++)b.spawn('warrior','ally',60+i*35,450);
 assert.equal(b.placementProblem(300,520),'场上部队已达上限');
 assert.equal(b.walkable(MAP.spawnX+20,MAP.spawnY,'ally'),false);
 assert.equal(b.walkable(MAP.spawnX+20,MAP.spawnY,'enemy'),true);
});
test('melee can clear an enemy occupying the protected spawn point',()=>{
 const b=new Battle();b.towers.forEach(t=>t.hp=0);
 const ally=b.spawn('warrior','ally',MAP.spawnX,MAP.spawnY+45);
 const enemy=b.spawn('shaman','enemy',MAP.spawnX,MAP.spawnY);
 for(let i=0;i<90&&enemy.hp>0;i++)b.update(.05);
 assert.ok(enemy.hp<specs.shaman.hp,'melee can reach and attack the spawn occupant');
 assert.ok(Math.hypot(ally.x-MAP.spawnX,ally.y-MAP.spawnY)>=RULES.spawnSafetyRadius-.01);
});
test('tower attacks only within its displayed range',()=>{
 const outside=new Battle(),out=outside.spawn('goblin','enemy',MAP.bridges[0],MAP.allyTowerY-RULES.towerRange-1);
 const hp=out.hp;outside.update(.01);assert.equal(out.hp,hp);
 const inside=new Battle(),near=inside.spawn('goblin','enemy',MAP.bridges[0],MAP.allyTowerY-RULES.towerRange+1);
 inside.update(.01);assert.ok(near.hp<specs.goblin.hp);
});
test('an all-melee siege cannot indefinitely block the boss wave',()=>{
 const b=new Battle();let nextDeploy=0;
 while(b.status==='playing'&&b.time<180){
  if(b.time>=nextDeploy){b.selected='warrior';b.deploy(Math.floor(nextDeploy/5)%2?135:345,480);nextDeploy+=5}
  b.update(.05);b.events.length=0;
 }
 assert.ok(b.bossSpawned,'boss must spawn even under a melee siege');
 assert.ok(b.bossDefeated,'the boss can be defeated');
 assert.equal(b.status,'won');
});
test('a lethal strike held by the boss shield is applied when the boss dies',()=>{
 const b=new Battle();b.towers.filter(t=>t.team==='enemy').forEach(t=>t.hp=0);
 b.enemyBase=10;b.spawn('archer','ally',135,160);b.update(.05);
 assert.equal(b.enemyBase,1);assert.equal(b.shieldLethalPending,true);assert.equal(b.status,'playing');
 const boss=b.spawn('troll','enemy',300,160);boss.hp=0;b.update(.05);
 assert.equal(b.bossDefeated,true);assert.equal(b.enemyBase,0);assert.equal(b.status,'won');
 assert.ok(b.events.some(e=>e.type==='hit'&&e.amount===1));
});
test('boss death does not damage the base without a pending lethal strike',()=>{
 const b=new Battle();b.enemyBase=1;const boss=b.spawn('troll','enemy',300,160);boss.hp=0;b.update(.05);
 assert.equal(b.bossDefeated,true);assert.equal(b.enemyBase,1);assert.equal(b.status,'playing');
});
