import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,RULES,specs} from '../src/battle.ts';
import {LEVELS} from '../src/levels.ts';
import {MAP} from '../src/geometry.ts';
import {SPELLS,availableSpells} from '../src/spells.ts';
import {simulate,policies} from '../scripts/strategies.mjs';
const empty=(spell='fireball',level=LEVELS[0])=>{const b=new Battle(level,{spell});b.next=level.waves.length;b.bossTriggered=true;b.bossSpawned=true;return b};

test('fireball charges once, delays damage, respects its radius and friendly units',()=>{
 const b=empty(),enemy=b.spawn('troll','enemy',240,420),outside=b.spawn('troll','enemy',330,420),ally=b.spawn('warrior','ally',235,420);
 b.units.forEach(u=>u.cooldown=100);b.towers.forEach(t=>t.cooldown=100);
 const hp=enemy.hp,other=outside.hp,friendly=ally.hp;b.energy=10;assert.equal(b.castSpell(240,420).ok,true);assert.equal(b.energy,6);assert.equal(enemy.hp,hp);assert.equal(b.spellCooldown,12);assert.equal(b.castSpell(240,420).ok,false);assert.equal(b.energy,6);
 b.update(.3);assert.equal(enemy.hp,hp);b.update(.05);assert.equal(enemy.hp,hp-140);assert.equal(outside.hp,other);assert.equal(ally.hp,friendly);assert.equal(b.spellCasts,1);
});
test('invalid, unaffordable, paused and unequipped casts never spend energy',()=>{
 for(const point of [[-1,10],[100,741],[NaN,100],[100,Infinity]]){const b=empty(),before=b.energy;assert.equal(b.castSpell(...point).ok,false);assert.equal(b.energy,before)}
 const b=empty();b.energy=3;assert.equal(b.castSpell(10,10).ok,false);assert.equal(b.energy,3);b.energy=10;b.status='paused';assert.equal(b.castSpell(10,10).ok,false);assert.equal(b.energy,10);assert.equal(new Battle().castSpell(100,100).ok,false);
});
test('a spell may miss, and its cooldown and pending damage stop during pause',()=>{
 const b=empty();assert.equal(b.castSpell(0,0).ok,true);const before=[b.time,b.spellCooldown,b.pendingSpells.length,b.energy];b.status='paused';b.update(20);assert.deepEqual([b.time,b.spellCooldown,b.pendingSpells.length,b.energy],before);b.status='playing';b.update(.35);assert.equal(b.pendingSpells.length,0);assert.ok(b.spellCooldown>11);
});
test('healing caps at max HP, excludes enemies, dead units and buildings',()=>{
 const b=empty('healing'),ally=b.spawn('lancer','ally',130,500),full=b.spawn('warrior','ally',150,500),dead=b.spawn('warrior','ally',130,510),enemy=b.spawn('goblin','enemy',140,500);ally.hp-=110;dead.hp=0;
 const tower=b.towers.find(t=>t.team==='ally');tower.hp=20;const before=enemy.hp;b.base=500;b.energy=10;
 b.castSpell(135,500);assert.equal(ally.hp,ally.maxHp-40);assert.equal(full.hp,full.maxHp);assert.equal(dead.hp,0);assert.equal(enemy.hp,before);assert.equal(tower.hp,20);assert.equal(b.base,500);assert.equal(b.energy,7);
});
test('fireball damages enemy buildings but cannot bypass the boss shield in the killing blast',()=>{
 const b=empty();b.energy=10;b.enemyBase=1;const boss=b.spawn('troll','enemy',MAP.campX,MAP.campY+25);boss.hp=100;boss.cooldown=100;boss.special=100;b.castSpell(MAP.campX,MAP.campY);b.update(.35);assert.equal(b.bossDefeated,true);assert.equal(b.enemyBase,1);assert.equal(b.status,'playing');b.time=b.spellReadyAt;b.energy=10;b.castSpell(MAP.campX,MAP.campY);b.update(.35);assert.equal(b.enemyBase,0);assert.equal(b.status,'won');
 const c=empty();const tower=c.towers.find(t=>t.team==='enemy'),hp=tower.hp;c.castSpell(tower.x,tower.y);c.update(.35);assert.equal(tower.hp,hp-49);
});
test('spells unlock at completed-level milestones',()=>{assert.deepEqual(availableSpells(0),[]);assert.deepEqual(availableSpells(1),['fireball']);assert.deepEqual(availableSpells(2),['fireball','healing']);assert.equal(SPELLS.healing.cooldown,16)});
test('every boss changes phase once and gives a full warning after the transition',()=>{
 for(const level of LEVELS){const b=empty(null,level),u=b.spawn(level.boss,'enemy',135,450);u.hp=u.maxHp*.49;u.special=0;b.spawn('lancer','ally',135,510);b.update(.01);assert.equal(u.phase,2);assert.ok(u.windup>=RULES.bossWindup-.01);assert.equal(b.events.filter(e=>e.type==='phase').length,1);b.events=[];b.update(.01);assert.equal(b.events.filter(e=>e.type==='phase').length,0);assert.equal(b.bossSkill(u).cooldown,7)}
});
test('hex and minotaur phase two bursts each have an independent warning',()=>{
 for(const level of [LEVELS[3],LEVELS[4]]){const b=empty(null,level),u=b.spawn(level.boss,'enemy',135,450);u.hp=u.maxHp*.49;u.special=0;const ally=b.spawn('lancer','ally',135,500);ally.hp=ally.maxHp=2000;ally.cooldown=100;b.towers.forEach(t=>t.cooldown=100);b.update(.01);for(let i=0;i<29;i++)b.update(.05);assert.equal(b.events.filter(e=>e.type==='warning').length,2);assert.ok(u.windup>1.2);for(let i=0;i<29;i++)b.update(.05);assert.equal(b.events.filter(e=>e.type==='boss').length,2)}
});
test('summons are capped and do not count toward wave kills',()=>{
 const b=empty(null,LEVELS[1]),boss=b.spawn('batBoss','enemy',240,450);boss.hp=boss.maxHp*.49;boss.special=0;for(let i=0;i<5;i++)b.spawn('bat','enemy',70+i*32,200).summoned=true;
 b.update(.01);for(let i=0;i<29;i++)b.update(.05);assert.ok(b.units.filter(u=>u.summoned&&u.hp>0).length<=6);for(const u of b.units.filter(u=>u.summoned))u.hp=0;b.update(.01);assert.equal(b.waveKills,0);
});
test('boss battle holds wave scheduling instead of dumping overdue groups afterwards',()=>{
 const b=new Battle();b.next=2;b.time=10;b.bossTriggered=true;b.bossSpawned=true;for(let i=0;i<200;i++)b.update(.05);assert.ok(Math.abs(b.time-b.waveDelay-10)<1e-6);assert.equal(b.next,2);assert.equal(b.pendingSpawns.length,0);b.bossDefeated=true;b.update(.05);assert.equal(b.next,2);
});
test('challenge scales enemies without altering ally stats, buildings or base level data',()=>{
 const level=LEVELS[2],before=JSON.stringify(level),b=new Battle(level,{mode:'challenge'}),enemy=b.spawn('goblin','enemy',100,250),ally=b.spawn('warrior','ally',100,300);
 assert.equal(enemy.maxHp,Math.round(specs.goblin.hp*level.hpMultiplier*1.25));assert.equal(ally.maxHp,specs.warrior.hp);assert.equal(b.damage(enemy,20),Math.round(20*level.damageMultiplier*1.15));assert.equal(b.maxEnemyBase,700);assert.equal(JSON.stringify(level),before);
});
test('late normal levels admit multiple policies and fixed healing cannot sweep perfect victories',()=>{
 for(const level of LEVELS.slice(2)){const victories=policies.slice(0,3).map(p=>simulate(level,p)).filter(r=>r.battle.status==='won');assert.ok(victories.length>=2,level.name)}
 const sweep=LEVELS.map(l=>simulate(l,policies[3]));assert.ok(sweep.some(r=>r.stars<3));
});
test('every challenge level has a viable resource-and-spell deployment policy',()=>{
 for(const level of LEVELS){const wins=policies.filter(p=>!p.idle).map(p=>simulate(level,p,'challenge',300)).filter(r=>r.battle.status==='won');assert.ok(wins.length>=1,`${level.name} challenge is not finishable by any reference policy`)}
});
