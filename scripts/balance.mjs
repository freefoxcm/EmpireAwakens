import {Battle} from '../src/battle.ts';
import {LEVELS} from '../src/levels.ts';

// Fixed policies make changes comparable; they are not a substitute for human playtests.
const policies={
 '混合输出':{interval:4,card:n=>n%4===0?'lancer':'archer'},
 '纯战士':{interval:4,card:()=> 'warrior'},
 '前排治疗':{interval:3,card:n=>n%2?'monk':'lancer'},
 '不部署':null,
};
const rows=[];
for(const level of LEVELS)for(const [strategy,policy] of Object.entries(policies)){
 const battle=new Battle(level);let next=0,count=0,bossTime=null;
 while(battle.status==='playing'&&battle.time<240){
  if(policy&&battle.time>=next){battle.selected=policy.card(count);battle.deploy(count%2?135:345,480);count++;next+=policy.interval}
  battle.update(.05);if(bossTime===null&&battle.bossSpawned)bossTime=battle.time;battle.events.length=0;
 }
 rows.push({关卡:level.id,策略:strategy,结果:battle.status==='won'?'胜':battle.status==='lost'?'败':'未结束',用时秒:Math.round(battle.time),主城剩余:Math.ceil(battle.base),首领出场秒:bossTime===null?'—':Math.round(bossTime)});
}
console.log('固定策略模拟，仅用于比较版本；不是玩家胜率。');
console.table(rows);
