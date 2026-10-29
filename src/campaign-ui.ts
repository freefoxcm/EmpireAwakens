import { LEVELS } from './levels.ts';
import { SPELLS, availableSpells,type Difficulty,type SpellKind } from './spells.ts';
import { challengeUnlocked,getRecord,type PlayerProfile } from './progress.ts';
import type { Battle } from './battle.ts';
import { $,hidden,text } from './ui.ts';
import { spellArtwork } from './spell-ui.ts';

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
 $('#spell-loadout').innerHTML=available.length?`<span>法术</span><button data-spell="" class="spell-none ${profile.equippedSpell===null?'active':''}">不装备</button>${available.map(kind=>`<button data-spell="${kind}" class="spell-choice ${profile.equippedSpell===kind?'active':''}" aria-label="装备${SPELLS[kind].name}，${SPELLS[kind].cost}能量" title="${SPELLS[kind].description}">${spellArtwork(kind)}</button>`).join('')}`:'通关第一关后解锁火球法术';
 document.querySelectorAll<HTMLButtonElement>('[data-spell]').forEach(button=>{button.setAttribute('aria-pressed',String((button.dataset.spell||null)===profile.equippedSpell));button.addEventListener('click',()=>actions.spell((button.dataset.spell||null) as SpellKind|null))});
}
export function renderResult(battle:Battle,stars:number,rewards:string[],profile:PlayerProfile){
 const won=battle.status==='won',record=getRecord(profile,battle.mode,battle.level.id),towers=battle.towers.filter(t=>t.team==='ally'&&t.hp>0).length,base=Math.floor(battle.base/battle.maxBase*100),hasNext=won&&battle.level.id<LEVELS.length;
 $('#result-layer').classList.toggle('is-victory',won);$('#result-layer').classList.toggle('is-defeat',!won);
 text('#result-context',`${battle.mode==='challenge'?'挑战征途':'普通征途'} · 第 ${battle.level.id} 关 · ${battle.level.name}`);text('#result-title',won?'战斗胜利':'重整旗鼓');text('#result-text',won?'首领已击败，敌方主城已被摧毁。':'试试保护远程、分散部署，并预留法术能量。');
 const goals=`<ul class="result-goals">${[[won,'赢得战斗',won?'已达成':'未达成'],[won&&base>=80,'主城生命 ≥ 80%',`${base}%`],[won&&towers===2,'两座我方箭塔均存活',`${towers} / 2`]].map(([done,label,value])=>`<li class="${done?'done':''}"><span class="goal-mark" aria-hidden="true">${done?'✓':'·'}</span><span>${label}</span><strong>${value}</strong></li>`).join('')}</ul>`;
 $('#result-record').innerHTML=`${won?`<div class="award-stars" role="img" aria-label="本局${stars}星">${[1,2,3].map(index=>`<span class="${index<=stars?'earned':''}" aria-hidden="true">★</span>`).join('')}</div>`:''}<dl class="result-metrics"><div><dt>本局用时</dt><dd>${formatTime(battle.time)}</dd></div><div><dt>最佳用时</dt><dd>${formatTime(record.bestTime)}</dd></div></dl>${won?goals:`<details class="result-review"><summary>查看本局目标</summary>${goals}</details>`}${rewards.length?`<section class="reward-block"><h3>解锁奖励</h3>${rewards.map(reward=>{const kind=reward.includes('火球')?'fireball':reward.includes('治疗')?'healing':null;return `<div class="reward-item"><span class="${kind?'spell-face':'menu-icon settings'}" aria-hidden="true">${kind?`<span class="spell-illustration ${kind}"></span>`:''}</span><span><strong>${reward}</strong><small>${kind?'下一关可在战前整备中选择':'在地图中切换，挑战更强的敌军'}</small></span></div>`}).join('')}</section>`:''}`;
 const next=$<HTMLButtonElement>('#next-level'),restart=$<HTMLButtonElement>('#restart'),back=$<HTMLButtonElement>('#back-map'),primary=hasNext?next:won?back:restart;
 for(const button of [next,restart,back])button.className=button===primary?'campaign-button panel-primary':'panel-secondary';hidden('#next-level',!hasNext);$('#result-actions').classList.toggle('one-secondary',!hasNext);$('#result-actions').replaceChildren(primary,...[next,restart,back].filter(button=>button!==primary));$('#result-layer .panel-body').scrollTop=0;
}
