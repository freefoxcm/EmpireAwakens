import { LEVELS } from './levels.ts';
import { SPELLS, availableSpells,type Difficulty,type SpellKind } from './spells.ts';
import { challengeUnlocked,getRecord,type PlayerProfile } from './progress.ts';
import type { Battle } from './battle.ts';
import { $,hidden,text } from './ui.ts';

export const formatTime=(seconds:number|null)=>seconds===null?'—':`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export function renderCampaign(profile:PlayerProfile,selected:number,mode:Difficulty,actions:{level:(id:number)=>void;spell:(spell:SpellKind|null)=>void;mode:(mode:Difficulty)=>void}){
 $('#map-nodes').innerHTML=LEVELS.map(level=>{
  const record=getRecord(profile,mode,level.id),locked=mode==='challenge'?!challengeUnlocked(profile):level.id>profile.unlocked;
  return `<button class="map-node node-${level.id} ${level.id===selected?'active':''} ${record.stars?'completed':''}" data-level="${level.id}" ${locked?'disabled':''} aria-label="${locked?'未解锁：':''}第${level.id}关 ${level.name}，${record.stars}星"><span class="landmark" aria-hidden="true"></span><span class="node-badge" aria-hidden="true">${locked?'🔒':level.id}</span><span class="node-stars" aria-hidden="true">${'★'.repeat(record.stars)}</span></button>`;
 }).join('');
 document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(button=>button.addEventListener('click',()=>actions.level(Number(button.dataset.level))));
 const level=LEVELS[selected-1],record=getRecord(profile,mode,selected);text('#map-region',`${mode==='challenge'?'挑战征途':'普通征途'} · 第 ${level.id} 关 · ${level.region}`);text('#map-level-name',level.name);text('#map-description',level.description);text('#map-boss',`首领：${level.bossName} · ${level.skill}`);
 hidden('#map-record',false);text('#map-record',record.stars?`${'★'.repeat(record.stars)} · 最快 ${formatTime(record.bestTime)} · 最佳主城 ${record.bestBaseRatio>0?Math.round(record.bestBaseRatio*100)+'%':'—'}`:'首次通关可获得星级与解锁奖励');
 hidden('#mode-choice',false);for(const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')){const value=button.dataset.mode as Difficulty;button.disabled=value==='challenge'&&!challengeUnlocked(profile);button.textContent=value==='normal'?'普通征途':button.disabled?'挑战 · 通关五关解锁':'挑战征途';button.classList.toggle('active',mode===value);button.setAttribute('aria-pressed',String(mode===value));button.title=value==='challenge'?'通关普通五关后解锁；敌军更强、波次更快':'';button.onclick=()=>actions.mode(value)}
 const available=availableSpells(profile.completed);hidden('#spell-loadout',false);
 $('#spell-loadout').innerHTML=available.length?`<span>法术</span><button data-spell="" class="${profile.equippedSpell===null?'active':''}">不装备</button>${available.map(kind=>`<button data-spell="${kind}" class="${profile.equippedSpell===kind?'active':''}" title="${SPELLS[kind].description}">${SPELLS[kind].name} · ${SPELLS[kind].cost}✦</button>`).join('')}`:'通关第一关后解锁火球法术';
 document.querySelectorAll<HTMLButtonElement>('[data-spell]').forEach(button=>{button.setAttribute('aria-pressed',String((button.dataset.spell||null)===profile.equippedSpell));button.addEventListener('click',()=>actions.spell((button.dataset.spell||null) as SpellKind|null))});
}
export function renderResult(battle:Battle,stars:number,rewards:string[],profile:PlayerProfile){
 const won=battle.status==='won',record=getRecord(profile,battle.mode,battle.level.id),intact=battle.towers.filter(t=>t.team==='ally'&&t.hp>0).length===2;
 text('#result-title',won?'战斗胜利':'基地已失守');text('#result-text',won?`${battle.level.bossName}已被击败，敌方主城被摧毁。`:'试试分散部署、预留法术能量，或调整前排与远程的比例。');
 $('#result-record').innerHTML=`<div class="stars" aria-label="本局${stars}星">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><p>${battle.mode==='challenge'?'挑战':'普通'} · 本局 ${formatTime(battle.time)}${won?` · 最快 ${formatTime(record.bestTime)}`:''}</p><p class="criteria">${won?'✓':'○'} 获得胜利<br>${won&&battle.base>=battle.maxBase*.8?'✓':'○'} 主城剩余生命不少于 80%<br>${won&&intact?'✓':'○'} 两座我方箭塔均存活</p>${rewards.map(reward=>`<p class="reward">${reward}</p>`).join('')}`;
 hidden('#next-level',!won||battle.level.id===LEVELS.length);
}
