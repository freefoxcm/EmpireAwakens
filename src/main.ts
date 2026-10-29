import Phaser from 'phaser';
import { Battle, RULES, specs, type Kind, type CombatEvent } from './battle.ts';
import { MAP } from './geometry.ts';
import { LEVELS } from './levels.ts';
import { BattleScene } from './scene.ts';
import { observeViewport } from './projection.ts';
import { GameAudio } from './audio.ts';
import { PauseGate, Tutorial, freshTutorial } from './session.ts';
import { $, cards, cardInfo, hidden, mountUI, text } from './ui.ts';
import { SPELLS,type Difficulty } from './spells.ts';
import { loadProfile,saveProfile,recordVictory,challengeUnlocked } from './progress.ts';
import { renderCampaign,renderResult } from './campaign-ui.ts';
import './style.css';

mountUI();observeViewport($('.shell'));
let selectedLevel=1,mode:Difficulty='normal',storage:Storage|undefined;try{storage=localStorage}catch{}
const profile=loadProfile(storage),preferences=profile.settings,audio=new GameAudio(),gate=new PauseGate();let tutorial=new Tutorial(preferences.tutorial);
audio.muted=preferences.muted;audio.volume=preferences.volume;
let battle=new Battle(),screen:'title'|'map'|'battle'='title',ready=false,loadFailed=false,overlayShown=false,dialogOpen=false,tutorialIntro=false;
let dialogReturn:HTMLElement|null=null;
let spellSelected=false;
gate.set('screen',true);gate.sync(battle);
const savePreferences=()=>{if(!saveProfile(storage,profile)){hidden('#storage-warning',false);if(screen==='battle')battle.notice('本局可正常游玩，但浏览器无法保存进度。')}};
savePreferences();

function syncPause(){gate.sync(battle);audio.setPaused(document.hidden||screen!=='battle'||battle.status==='paused')}
function syncInteraction(){
 for(const selector of ['.battle-header','.game-frame','.controls'])$(selector).inert=screen!=='battle'||dialogOpen||overlayShown;
 $('#title-screen').inert=dialogOpen;$('#map-screen').inert=dialogOpen;
}
function openDialog(title:string,body:string,closeLabel='继续战斗'){
 dialogReturn=document.activeElement as HTMLElement;dialogOpen=true;text('#dialog-title',title);$('#dialog-body').innerHTML=body;text('#close-dialog',closeLabel);hidden('#dialog-layer',false);gate.set('dialog',true);syncPause();syncInteraction();$('#close-dialog').focus();
}
function closeDialog(){dialogOpen=false;hidden('#dialog-layer',true);gate.set('dialog',false);syncPause();syncInteraction();dialogReturn?.focus();renderHud()}
$('#close-dialog').addEventListener('click',closeDialog);
function settings(){
 openDialog('行军设置',`<label class="settings-row">关闭音效<input id="mute-sound" type="checkbox" ${preferences.muted?'checked':''}></label><label class="settings-row">音量<input id="sound-volume" type="range" min="0" max="100" value="${Math.round(preferences.volume*100)}"></label><p>切换到后台将自动暂停，返回后点击继续。</p><button id="replay-tutorial" class="text-button">重新体验第一关教学</button>${screen==='battle'?'<button id="leave-battle" class="text-button">返回地图</button>':''}`,'返回');
 $('#mute-sound').addEventListener('change',()=>{preferences.muted=$<HTMLInputElement>('#mute-sound').checked;audio.muted=preferences.muted;audio.stop();savePreferences()});
 $('#sound-volume').addEventListener('input',()=>{preferences.volume=Number($<HTMLInputElement>('#sound-volume').value)/100;audio.volume=preferences.volume;savePreferences()});
 $('#replay-tutorial').addEventListener('click',()=>{preferences.tutorial=freshTutorial();tutorial=new Tutorial(preferences.tutorial);mode='normal';savePreferences();closeDialog();startLevel(1)});
 document.querySelector('#leave-battle')?.addEventListener('click',()=>{closeDialog();showMap()});
}
$('#settings').addEventListener('click',settings);$('#map-settings').addEventListener('click',settings);
$('#help').addEventListener('click',()=>openDialog('战斗规则','<p>选择卡牌，再点击金色虚线内的空地部署。单位优先攻击附近敌军，再进攻箭塔和主城。</p><p>修士治疗附近友军。场上最多部署 10 名部队；箭塔守卫与箭塔共用生命值。</p><p>击败波次怪物或摧毁箭塔会引出首领；击败首领解除护盾，再摧毁主城即可通关。预警区域内请避免继续堆叠部队。</p>'));
function showCard(kind:Kind){const spec=specs[kind];openDialog(spec.name,`<p>${cardInfo[kind]}</p><p>能量 ${spec.cost} · 生命 ${spec.hp}<br>${kind==='monk'?'治疗':'伤害'} ${spec.damage} · 间隔 ${spec.interval} 秒<br>射程 ${spec.range} · 移速 ${spec.speed}</p>`)}
function select(kind:Kind){
 if(screen!=='battle'||dialogOpen||overlayShown)return;
 spellSelected=false;battle.selected=kind;if(tutorialIntro&&kind==='warrior'){tutorial.selectWarrior();savePreferences()}audio.play('select');renderHud();
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-kind]')){
 let pressTimer:ReturnType<typeof setTimeout>|undefined,startX=0,startY=0,suppressUntil=0;
 const cancel=()=>{if(pressTimer)clearTimeout(pressTimer);pressTimer=undefined};
 button.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY;cancel();pressTimer=setTimeout(()=>{suppressUntil=performance.now()+700;showCard(button.dataset.kind as Kind)},350)});
 button.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>10)cancel()});
 for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,cancel);
 button.addEventListener('contextmenu',e=>e.preventDefault());button.addEventListener('click',()=>{if(performance.now()>suppressUntil)select(button.dataset.kind as Kind)});
}
document.querySelectorAll<HTMLButtonElement>('[data-info]').forEach(button=>button.addEventListener('click',()=>showCard(button.dataset.info as Kind)));
function togglePause(){if(screen!=='battle'||dialogOpen||overlayShown||tutorialIntro)return;gate.set('user',!gate.reasons.has('user'));gate.set('background',false);syncPause();renderHud()}
$('#pause').addEventListener('click',togglePause);
$('#skip-tutorial').addEventListener('click',()=>{tutorial.skip();tutorialIntro=false;gate.set('tutorial',false);savePreferences();syncPause();renderHud()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='battle'){gate.set('background',true);syncPause();renderHud()}});
document.addEventListener('pointerdown',()=>audio.unlock(),{capture:true});
window.addEventListener('keydown',event=>{
 audio.unlock();
 const overlay=dialogOpen?$('#dialog-layer'):overlayShown?$('#result-layer'):null;
 if(overlay&&event.key==='Tab'){
  const focusable=[...overlay.querySelectorAll<HTMLElement>('button:not([disabled]):not(.hidden),input')];const index=focusable.indexOf(document.activeElement as HTMLElement);if(event.shiftKey&&index<=0){event.preventDefault();focusable.at(-1)?.focus()}else if(!event.shiftKey&&index===focusable.length-1){event.preventDefault();focusable[0]?.focus()}return;
 }
 if(event.key==='Escape'&&dialogOpen){closeDialog();return}if(screen!=='battle'||dialogOpen||overlayShown)return;
 if(event.key==='Escape'){spellSelected=false;renderHud();return}
 if(event.code==='Space'&&!(event.target instanceof HTMLButtonElement)){event.preventDefault();togglePause()}
 const n=Number(event.key);if(n>=1&&n<=4)select(cards[n-1]);
});

function showMap(){screen='map';gate.set('screen',true);syncPause();overlayShown=false;hidden('#result-layer',true);hidden('#title-screen',true);hidden('#map-screen',false);renderMap();syncInteraction()}
function renderMap(){
 renderCampaign(profile,selectedLevel,mode,{level:id=>{selectedLevel=id;renderMap()},spell:spell=>{profile.equippedSpell=spell;savePreferences();renderMap()},mode:value=>{if(value==='challenge'&&!challengeUnlocked(profile))return;mode=value;renderMap()}});$<HTMLButtonElement>('#enter-level').disabled=!ready;
}
function startLevel(id:number){
 if(!ready||id<1||id>LEVELS.length||mode==='normal'&&id>profile.unlocked||mode==='challenge'&&!challengeUnlocked(profile))return;selectedLevel=id;battle=new Battle(LEVELS[id-1],{spell:profile.equippedSpell,mode});spellSelected=false;screen='battle';gate.reset();gate.set('background',document.hidden);overlayShown=false;hidden('#result-layer',true);hidden('#title-screen',true);hidden('#map-screen',true);
 tutorialIntro=mode==='normal'&&tutorial.begin(id);gate.set('tutorial',tutorialIntro);syncPause();scene.rebuild();syncInteraction();renderHud();
 if(profile.equippedSpell&&!tutorial.state.spellHint){tutorial.state.spellHint=true;savePreferences();battle.notice('点击法术，再点战场施放；切换兵种取消。');battle.messageTime=5}
}
$('#spell-action').addEventListener('click',()=>{if(battle.status!=='playing'||!battle.spell)return;spellSelected=!spellSelected;battle.notice(spellSelected?`点击战场施放${SPELLS[battle.spell].name}，再次点击技能取消`:'已取消法术');renderHud()});
$('#start-game').addEventListener('click',showMap);$('#enter-level').addEventListener('click',()=>startLevel(selectedLevel));$('#restart').addEventListener('click',()=>startLevel(selectedLevel));$('#back-map').addEventListener('click',showMap);
$('#back-title').addEventListener('click',()=>{screen='title';hidden('#map-screen',true);hidden('#title-screen',false);syncPause();syncInteraction()});
$('#next-level').addEventListener('click',()=>{selectedLevel=Math.min(LEVELS.length,selectedLevel+1);showMap()});$('#load-retry').addEventListener('click',()=>location.reload());
function worldInput(x:number,y:number){
 if(screen!=='battle'||dialogOpen||overlayShown)return;
 if(tutorialIntro){
  if(!tutorial.state.selected){battle.notice('先选择战士卡牌');return}
  if(!gate.tutorialInputOnly)return;const before=battle.id;battle.status='playing';battle.deploy(x,y);
  if(battle.id>before){tutorial.deployed();tutorialIntro=false;gate.set('tutorial',false);savePreferences();battle.notice('能量会自动恢复。用前排保护弓手，修士负责治疗。')}syncPause();renderHud();return;
 }
 if(battle.status!=='playing')return;
 if(spellSelected){if(battle.castSpell(x,y).ok)spellSelected=false;renderHud();return}
 const tower=scene.towerAt(x,y);
 if(tower){scene.rangeTower=tower.id;scene.rangeUntil=battle.time+3;battle.notice(`${tower.team==='ally'?'我方':'敌方'}箭塔射程`)}else{scene.rangeTower=null;battle.deploy(x,y)}
}
function feedback(event:CombatEvent){
 if(event.type==='heal')audio.play('heal');else if(event.type==='towerDown')audio.play('collapse');else if(event.type==='warning'||event.type==='phase')audio.play('warning');else if(event.type==='spell')audio.play(event.spell==='healing'?'heal':'shot');else if(event.type==='hit')audio.play(event.ranged?'shot':'hit');
}
function renderHud(){
 text('#level-name',battle.level.name);text('#timer',`${String(Math.floor(battle.time/60)).padStart(2,'0')}:${String(Math.floor(battle.time%60)).padStart(2,'0')}`);const waveClock=battle.time-battle.waveDelay,wave=Math.max(1,battle.level.groups.filter(g=>5+(g.time-5)*(battle.mode==='challenge'?.9:1)<=waveClock).length);text('#wave',battle.bossTriggered?(battle.bossDefeated?'攻破敌方主城':'首领来袭'):`第 ${wave} / ${battle.level.groups.length} 波`);
 text('#base',`${Math.ceil(battle.base)} / ${battle.maxBase}`);$('#base-bar').style.width=`${battle.base/battle.maxBase*100}%`;text('#enemy-label',battle.bossDefeated?'敌方主城':'首领护盾');text('#enemy-base',`${Math.ceil(battle.enemyBase)} / ${battle.maxEnemyBase}`);$('#enemy-base-bar').style.width=`${battle.enemyBase/battle.maxEnemyBase*100}%`;
 text('#energy',battle.energy.toFixed(1));$('#energy-bar').style.width=`${battle.energy*10}%`;text('#selection',`已选：${specs[battle.selected].name} · ${battle.units.filter(u=>u.team==='ally').length}/${RULES.maxAllies}`);
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-kind]')){const kind=button.dataset.kind as Kind;button.classList.toggle('selected',!spellSelected&&kind===battle.selected);button.classList.toggle('poor',battle.energy<specs[kind].cost);button.setAttribute('aria-pressed',String(!spellSelected&&kind===battle.selected))}
 hidden('#spell-action',!battle.spell);if(battle.spell){const spec=SPELLS[battle.spell],button=$<HTMLButtonElement>('#spell-action'),content=`<span class="spell-glyph ${battle.spell}" aria-hidden="true"></span>${spec.name}<small>${battle.spellCooldown>0?`${Math.ceil(battle.spellCooldown)}秒`:`✦ ${spec.cost}`}</small>`;if(button.innerHTML!==content)button.innerHTML=content;button.disabled=battle.status!=='playing'||battle.spellCooldown>0||battle.energy<spec.cost;button.classList.toggle('selected',spellSelected);button.setAttribute('aria-pressed',String(spellSelected));button.setAttribute('aria-label',`施放${spec.name}，${spec.cost}能量${battle.spellCooldown>0?'，冷却中':''}`)}
 const boss=battle.units.find(u=>u.kind===battle.level.boss&&u.team==='enemy');hidden('#boss-hud',!boss);if(boss){const percent=Math.max(0,Math.min(100,boss.hp/boss.maxHp*100));$('#boss-bar').style.width=`${percent}%`;$('#boss-hud').setAttribute('aria-valuenow',String(Math.round(percent)))}
 const paused=battle.status==='paused';text('#pause',paused?'▶':'Ⅱ');$('#pause').setAttribute('aria-label',paused?'继续游戏':'暂停游戏');text('#hint',paused&&!tutorialIntro?'战斗已暂停，点击右上方继续':battle.message);$('#hint').classList.toggle('quiet',!paused&&battle.messageTime<=0);
 hidden('#tutorial-coach',!tutorialIntro||screen!=='battle');if(tutorialIntro)text('#tutorial-text',tutorial.introText);
 if(ready){const p=scene.projection,base=p.point(MAP.baseX,MAP.allyTowerY-52);$('.base-stat').style.left=`${base.x}px`;$('.base-stat').style.top=`${base.y}px`;$('#hint').style.top=`${p.point(0,MAP.riverBottom).y+5}px`}
 if(screen==='battle'&&mode==='normal'&&battle.level.id===1&&boss&&!tutorial.state.skipped&&!tutorial.state.bossSeen&&!dialogOpen){tutorial.state.bossSeen=true;savePreferences();audio.play('warning');openDialog('首领来袭','<p>先击败首领，才能解除敌方主城的护盾。</p><p>技能蓄力时地面会出现预警。避免继续在危险区域集中部署，用治疗保护承伤部队。</p>')}
 if(screen==='battle'&&(battle.status==='won'||battle.status==='lost')&&!overlayShown){
  overlayShown=true;const won=battle.status==='won',result=recordVictory(profile,{levelId:selectedLevel,mode,won,time:battle.time,base:battle.base,maxBase:battle.maxBase,towersRemaining:battle.towers.filter(t=>t.team==='ally'&&t.hp>0).length});if(won)savePreferences();
  renderResult(battle,result.stars,result.rewards,profile);hidden('#result-layer',false);syncInteraction();audio.play(won?'win':'loss');$('#restart').focus();
 }
}
const scene=new BattleScene({battle:()=>battle,ready:()=>{ready=true;hidden('#load-progress',true);text('#load-status','战场已准备就绪');$<HTMLButtonElement>('#start-game').disabled=false;$<HTMLButtonElement>('#enter-level').disabled=false;syncInteraction();renderHud()},progress:value=>{$<HTMLProgressElement>('#load-progress').value=value;if(!loadFailed)text('#load-status',`准备战场 ${Math.round(value*100)}%`)},error:()=>{loadFailed=true;text('#load-status','部分素材加载失败，请检查网络后重试。');hidden('#load-retry',false)},pointer:worldInput,frame:renderHud,event:feedback});
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:Math.max(1,$('#game').clientWidth),height:Math.max(1,$('#game').clientHeight),backgroundColor:'#78945c',pixelArt:true,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.NO_CENTER},scene:[scene]});
new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;if(width>0&&height>0&&(Math.round(width)!==game.scale.width||Math.round(height)!==game.scale.height))game.scale.setParentSize(Math.round(width),Math.round(height))}).observe($('#game'));
syncInteraction();
