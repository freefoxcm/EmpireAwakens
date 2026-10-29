import {LEVELS} from '../src/levels.ts';
import {policies,simulate} from './strategies.mjs';
const rows=[];
for(const mode of ['normal','challenge'])for(const level of LEVELS)for(const policy of policies){
 const {battle:b,bossTime,stars,towers,deployed}=simulate(level,policy,mode);
 rows.push({模式:mode==='normal'?'普通':'挑战',关卡:level.id,策略:policy.name,结果:b.status==='won'?'胜':b.status==='lost'?'败':'未结束',秒:Math.round(b.time),主城:Math.ceil(b.base),存活箭塔:towers,星:stars,首领出场:bossTime??'—',施法:b.spellCasts,部署:deployed});
}
console.log('固定策略模拟，仅用于比较版本；不是玩家胜率。');console.table(rows);
