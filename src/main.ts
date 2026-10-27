import Phaser from 'phaser';
import {Battle,RULES,specs,type Kind,type Unit,type CombatEvent} from './battle';
import {MAP} from './geometry';
import './style.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main class="shell"><div class="arena"><section class="game-frame"><div id="game"></div><div class="top-hud"><div class="wave-stat"><span>边境守卫</span><strong id="wave">第一波 · 试探</strong></div><div class="battle-clock"><span>战斗时间</span><strong id="timer">00:00</strong><button id="help" class="small-btn help-btn" aria-label="战斗规则">?</button><button id="pause" class="small-btn" aria-label="暂停游戏">Ⅱ</button></div></div><div class="enemy-base-stat"><span id="enemy-label">首领护盾</span><strong id="enemy-base">700 / 700</strong><div class="bar"><i id="enemy-base-bar"></i></div></div><div class="base-stat"><span>我方据点</span><strong id="base">600 / 600</strong><div class="bar"><i id="base-bar"></i></div></div><div id="boss-hud" class="boss-hud hidden"><span>巨魔首领</span><div class="bar"><i id="boss-bar"></i></div></div><div id="hint" class="hint" role="status" aria-live="polite">选择卡牌，再点击金色虚线范围</div><div id="rules" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="rules-title"><div class="modal rules-modal"><h2 id="rules-title">战斗规则</h2><p>部署部队守住兵营，箭塔守卫会自动攻击附近敌人；点击箭塔可查看射程。战斗单位优先攻击附近敌军，再推进攻击箭塔和主城。</p><p>修士会治疗附近友军；场上最多部署 10 名部队。巨魔蓄力时会显示红色范围，击败它才能解除敌方主城护盾；护盾挡下的致命伤会在解除时结算。</p><button id="close-rules">继续战斗</button></div></div><div id="overlay" class="overlay hidden"><div class="modal"><span class="eyebrow">BATTLE REPORT</span><h2 id="result-title"></h2><p id="result-text"></p><button id="restart">再战一次</button></div></div></section><section class="controls"><div class="deck-title"><span>部署部队</span><span id="selection">已选：战士</span></div><div id="cards" class="cards"></div><div class="energy-row"><span class="energy-label">✦ 能量 <strong id="energy">7.0</strong><span class="muted"> / 10</span></span><span>自动恢复</span></div><div class="energy-track"><i id="energy-bar"></i></div><p class="instruction">选择卡牌，点击金色虚线范围部署 · 1–4 切换 · 空格暂停</p></section></div></main>`;

const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
let battle=new Battle();let scene:BattleScene;let overlayShown=false;let resumeAfterRules=false;
const cards:Kind[]=['warrior','archer','lancer','monk'];
const TOWER_GUARD_OFFSET=48;
const cardInfo:Record<string,string>={warrior:'近战 · 均衡',archer:'远程 · 输出',lancer:'前排 · 坚韧',monk:'辅助 · 治疗'};
$('#cards').innerHTML=cards.map((k,i)=>`<button class="card" data-kind="${k}"><span class="card-index">0${i+1}</span><span class="portrait ${k}"></span><span class="card-title">${specs[k].name}</span><small>${cardInfo[k]}</small><b>✦ ${specs[k].cost}</b></button>`).join('');
function select(k:Kind){battle.selected=k;renderHud()}
document.querySelectorAll<HTMLButtonElement>('.card').forEach(b=>b.addEventListener('click',()=>select(b.dataset.kind as Kind)));
function pause(){if(!$('#rules').classList.contains('hidden'))return;if(battle.status==='playing')battle.status='paused';else if(battle.status==='paused')battle.status='playing';renderHud()}
$('#help').addEventListener('click',()=>{if(battle.status==='won'||battle.status==='lost')return;resumeAfterRules=battle.status==='playing';if(resumeAfterRules)battle.status='paused';$('.controls').inert=true;$('#rules').classList.remove('hidden');$('#close-rules').focus();renderHud()});
$('#close-rules').addEventListener('click',()=>{if(resumeAfterRules&&battle.status==='paused')battle.status='playing';$('#rules').classList.add('hidden');$('.controls').inert=false;$('#help').focus();renderHud()});
$('#pause').addEventListener('click',pause);$('#restart').addEventListener('click',()=>{battle=new Battle();overlayShown=false;$('#overlay').classList.add('hidden');scene.resetViews();renderHud()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#rules').classList.contains('hidden')){$('#close-rules').click();return}if(e.code==='Space'){if(e.target instanceof HTMLButtonElement)return;e.preventDefault();pause()}const n=Number(e.key);if(n>=1&&n<=4)select(cards[n-1])});
function renderHud(){
 $('#enemy-label').textContent=battle.bossDefeated?'敌方主城':'首领护盾';$('#enemy-base').textContent=`${Math.ceil(battle.enemyBase)} / ${battle.maxEnemyBase}`;$('#enemy-base-bar').style.width=`${battle.enemyBase/battle.maxEnemyBase*100}%`;$('#base').textContent=`${Math.ceil(battle.base)} / ${battle.maxBase}`;$('#base-bar').style.width=`${battle.base/battle.maxBase*100}%`;$('#energy').textContent=battle.energy.toFixed(1);$('#energy-bar').style.width=`${battle.energy*10}%`;$('#selection').textContent=`已选：${specs[battle.selected].name} · 部队 ${battle.units.filter(u=>u.team==='ally'&&u.hp>0).length}/${RULES.maxAllies}`;
 $('#timer').textContent=`${String(Math.floor(battle.time/60)).padStart(2,'0')}:${String(Math.floor(battle.time%60)).padStart(2,'0')}`;$('#wave').textContent=battle.time<30?'第一波 · 试探':battle.time<54?'第二波 · 集结':battle.time<RULES.bossTime?'第三波 · 猛攻':'最终波 · 首领';
 $('#hint').textContent=battle.status==='paused'?'战斗已暂停':battle.message;$('#hint').classList.toggle('quiet',battle.status!=='paused'&&battle.messageTime<=0);$('#pause').textContent=battle.status==='paused'?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',battle.status==='paused'?'继续游戏':'暂停游戏');
 document.querySelectorAll<HTMLButtonElement>('.card').forEach(b=>{const k=b.dataset.kind as Kind;b.classList.toggle('selected',k===battle.selected);b.setAttribute('aria-pressed',String(k===battle.selected));b.classList.toggle('poor',battle.energy<specs[k].cost)});
 const boss=battle.units.find(u=>u.kind==='troll');$('#boss-hud').classList.toggle('hidden',!boss);if(boss)$('#boss-bar').style.width=`${Math.max(0,boss.hp/specs.troll.hp*100)}%`;
 if((battle.status==='won'||battle.status==='lost')&&!overlayShown){overlayShown=true;$('#overlay').classList.remove('hidden');$('#result-title').textContent=battle.status==='won'?'边境守住了':'基地已失守';$('#result-text').textContent=battle.status==='won'?(battle.enemyBase<=0?`巨魔已被击败，敌方主城 0 / ${battle.maxEnemyBase}。`:'巨魔与怪物已经被击退。'):'调整部署时机和阵容，再试一次。'}
}

class BattleScene extends Phaser.Scene {
 views=new Map<number,Phaser.GameObjects.Sprite>(); towerViews=new Map<string,Phaser.GameObjects.Image>(); towerArchers=new Map<string,Phaser.GameObjects.Sprite>(); graphics!:Phaser.GameObjects.Graphics; preview!:Phaser.GameObjects.Graphics; rangeTower:string|null=null; rangeUntil=0; pausedVisuals=false;
 constructor(){super('battle')}
 preload(){
  const asset=(name:string)=>`${import.meta.env.BASE_URL}assets/${name}.png`;
  for(const [k,s] of Object.entries(specs)){
   for(const action of ['move','idle','attack']) this.load.spritesheet(k+'-'+action,asset(`${k}${action==='move'?'':'-'+action}`),{frameWidth:s.size,frameHeight:s.size});
  }
  for(const k of ['ground','water','barracks-rear','rock','terrain-flat','bridge','river','enemy-camp','tower-ally-rear','tower-ally-ruin','tower-enemy-ruin','tower-arrow'])this.load.image(k,asset(k));
  this.load.spritesheet('deployment-dust',asset('deployment-dust'),{frameWidth:64,frameHeight:64});
  this.load.spritesheet('tower-enemy',asset('tower-enemy'),{frameWidth:256,frameHeight:192});
  this.load.spritesheet('tree',asset('tree'),{frameWidth:192,frameHeight:256});
  this.load.spritesheet('bush',asset('bush'),{frameWidth:128,frameHeight:128});
 }
 create(){
  scene=this;
  this.textures.get('bridge').add('vertical',0,0,80,64,160);
  // Existing terrain atlas provides both the arena surface and the narrow lane paths.
  this.textures.get('terrain-flat').add('arena-grass',0,64,64,64,64);
  this.textures.get('terrain-flat').add('lane-ground',0,384,64,64,64);
  for(let y=0;y<MAP.height;y+=64)for(let x=0;x<MAP.width;x+=64)
   this.add.image(x,y,'terrain-flat','arena-grass').setOrigin(0).setDepth(-30);
  // One continuous rectangle runs under the two towers, both bridges and the main bases.
  const pathWidth=28, top=MAP.campY, bottom=MAP.baseY;
  for(const x of MAP.bridges)for(let y=top;y<bottom;y+=64)
   this.add.image(x-pathWidth/2,y,'terrain-flat','lane-ground').setOrigin(0).setDisplaySize(pathWidth,Math.min(64,bottom-y)).setDepth(-25).setAlpha(.78);
  for(const y of [top,bottom])for(let x=MAP.bridges[0]-pathWidth/2;x<MAP.bridges[1]+pathWidth/2;x+=64)
   this.add.image(x,y-pathWidth/2,'terrain-flat','lane-ground').setOrigin(0).setDisplaySize(Math.min(64,MAP.bridges[1]+pathWidth/2-x),pathWidth).setDepth(-25).setAlpha(.78);
  for(let x=0;x<MAP.width;x+=64)
   this.add.image(x,MAP.riverTop,'river').setOrigin(0).setDisplaySize(64,MAP.riverBottom-MAP.riverTop).setDepth(-20);
  const bank=this.add.graphics().setDepth(-19);
  bank.lineStyle(3,0xd2e9c7,.8);bank.lineBetween(0,MAP.riverTop,MAP.width,MAP.riverTop);bank.lineBetween(0,MAP.riverBottom,MAP.width,MAP.riverBottom);
  for(const x of MAP.bridges)this.add.image(x,(MAP.riverTop+MAP.riverBottom)/2,'bridge','vertical').setDisplaySize(82,82).setDepth(-18);
  // A warm dashed border leaves the terrain visible. Its lower edge bends around
  // the barracks keep-out circle, matching the placement validation.
  const zone=this.add.graphics().setDepth(-16);
  const segments:{x1:number;y1:number;x2:number;y2:number}[]=[];
  const addDashes=(x1:number,y1:number,x2:number,y2:number)=>{
   const length=Math.hypot(x2-x1,y2-y1),dx=(x2-x1)/length,dy=(y2-y1)/length;
   for(let t=0;t<length;t+=18){const end=Math.min(t+10,length);segments.push({x1:x1+dx*t,y1:y1+dy*t,x2:x1+dx*end,y2:y1+dy*end})}
  };
  addDashes(MAP.deployLeft,MAP.deployTop,MAP.deployRight,MAP.deployTop);
  addDashes(MAP.deployLeft,MAP.deployTop,MAP.deployLeft,MAP.deployBottom);
  addDashes(MAP.deployRight,MAP.deployTop,MAP.deployRight,MAP.deployBottom);
  const overlap=Math.sqrt(Math.max(0,MAP.baseKeepOut**2-(MAP.baseY-MAP.deployBottom)**2));
  addDashes(MAP.deployLeft,MAP.deployBottom,MAP.baseX-overlap,MAP.deployBottom);
  addDashes(MAP.baseX+overlap,MAP.deployBottom,MAP.deployRight,MAP.deployBottom);
  const start=Math.acos(-overlap/MAP.baseKeepOut),end=Math.acos(overlap/MAP.baseKeepOut);
  const arcPoints=12;
  for(let i=0;i<arcPoints;i+=2){
   const a=start+(end-start)*i/arcPoints,b=start+(end-start)*Math.min(i+1,arcPoints)/arcPoints;
   segments.push({x1:MAP.baseX+Math.cos(a)*MAP.baseKeepOut,y1:MAP.baseY-Math.sin(a)*MAP.baseKeepOut,x2:MAP.baseX+Math.cos(b)*MAP.baseKeepOut,y2:MAP.baseY-Math.sin(b)*MAP.baseKeepOut})
  }
  for(const [width,color,alpha] of [[4,0x403526,.65],[2,0xf4d891,.95]]){
   zone.lineStyle(width,color,alpha);for(const seg of segments)zone.lineBetween(seg.x1,seg.y1,seg.x2,seg.y2);
  }
  this.add.image(MAP.campX,MAP.campY-8,'enemy-camp').setScale(.58).setDepth(MAP.campY);
  this.add.image(MAP.baseX,MAP.baseY-28,'barracks-rear').setDisplaySize(192*.55,256*.55).setDepth(MAP.baseY);
  this.anims.create({key:'deployment-dust',frames:this.anims.generateFrameNumbers('deployment-dust',{start:0,end:7}),frameRate:18,repeat:0});
  this.anims.create({key:'tree-sway',frames:this.anims.generateFrameNumbers('tree',{start:0,end:7}),frameRate:5,repeat:-1});
  for(const [x,y,scale] of [[25,175,.31],[455,190,.31],[25,500,.31],[455,520,.31],[26,80,.28],[454,80,.28]]){
   const tree=this.add.sprite(x,y,'tree',0).setScale(scale).setDepth(y);tree.play('tree-sway');
  }
  for(const [x,y] of [[26,255],[454,255],[26,590],[454,590]])this.add.sprite(x,y,'bush',0).setScale(.48).setDepth(y);
  this.add.image(30,390,'rock').setScale(.4).setDepth(390);this.add.image(450,390,'rock').setScale(.4).setDepth(390);
  for(const tower of battle.towers){
   const key=tower.team==='ally'?'tower-ally-rear':'tower-enemy';
   const view=this.add.image(tower.x,tower.y-18,key,tower.team==='enemy'?0:undefined).setDepth(tower.y);
   if(tower.team==='ally')view.setDisplaySize(128*.47,256*.47);else view.setScale(.43);
   this.towerViews.set(tower.id,view);
  }
  this.graphics=this.add.graphics().setDepth(1000);
  this.preview=this.add.graphics().setDepth(999);
  for(const k of Object.keys(specs))for(const action of ['move','idle','attack']){
   const key=k+'-'+action;const count=this.textures.get(key).frameTotal-1;
   this.anims.create({key,frames:this.anims.generateFrameNumbers(key,{start:0,end:count-1}),frameRate:action==='attack'?12:8,repeat:action==='attack'?0:-1});
  }
  for(const tower of battle.towers){
   const idle=tower.team==='ally'?'archer-idle':'shaman-idle';
   const archer=this.add.sprite(tower.x,tower.y-TOWER_GUARD_OFFSET,idle).setScale(.42).setDepth(tower.y+1).play(idle);
   archer.on('animationcomplete',()=>{if((battle.towers.find(t=>t.id===tower.id)?.hp??0)>0)archer.play(idle)});
   this.towerArchers.set(tower.id,archer);
  }
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
   if(battle.status!=='playing')return;
   const tower=battle.towers.find(t=>t.hp>0&&Math.abs(p.x-t.x)<34&&p.y>t.y-75&&p.y<t.y+20);
   if(tower){this.rangeTower=tower.id;this.rangeUntil=battle.time+3;battle.notice(`${tower.team==='ally'?'我方':'敌方'}箭塔射程`)}
   else{this.rangeTower=null;battle.deploy(p.x,p.y)}
  });
 }
 resetViews(){this.views.forEach(v=>v.destroy());this.views.clear()}
 update(_t:number,delta:number){
  const paused=battle.status==='paused';
  if(paused!==this.pausedVisuals){this.pausedVisuals=paused;if(paused){this.anims.pauseAll();this.tweens.pauseAll()}else{this.anims.resumeAll();this.tweens.resumeAll()}}
  const dt=Math.min(delta/1000,.05);battle.update(dt);this.graphics.clear();this.preview.clear();
  if(this.rangeTower&&battle.time<this.rangeUntil&&battle.status==='playing'){
   const tower=battle.towers.find(t=>t.id===this.rangeTower&&t.hp>0);
   if(tower){this.preview.fillStyle(tower.team==='ally'?0x90ddc3:0xec927b,.07);this.preview.fillCircle(tower.x,tower.y,RULES.towerRange);this.preview.lineStyle(2,tower.team==='ally'?0xc9f1d2:0xffbfaa,.8);this.preview.strokeCircle(tower.x,tower.y,RULES.towerRange)}
  }
  for(const tower of battle.towers){
   const view=this.towerViews.get(tower.id)!;
   this.towerArchers.get(tower.id)!.setVisible(tower.hp>0);
   const key=tower.hp>0?(tower.team==='ally'?'tower-ally-rear':'tower-enemy'):(tower.team==='ally'?'tower-ally-ruin':'tower-enemy-ruin');
   if(view.texture.key!==key){const wasAlive=view.texture.key==='tower-ally-rear'||view.texture.key==='tower-enemy';view.setTexture(key,key==='tower-enemy'?0:undefined);if(tower.team==='ally')view.setDisplaySize(128*.47,256*.47);if(wasAlive&&tower.hp<=0)this.showEvent({type:'towerDown',x:tower.x,y:tower.y})}
   if(tower.hp>0){const g=this.graphics;g.fillStyle(0x172522,.85);g.fillRoundedRect(tower.x-24,tower.y-12,48,7,2);g.fillStyle(tower.team==='ally'?0x62d9d2:0xee8977);g.fillRoundedRect(tower.x-23,tower.y-11,46*tower.hp/tower.maxHp,5,2)}
  }
  for(const u of battle.units){if(u.windup>0){this.graphics.fillStyle(0xe94f3b,.27);this.graphics.fillCircle(u.x,u.y,RULES.bossRadius);this.graphics.lineStyle(3,0xffc685,.95);this.graphics.strokeCircle(u.x,u.y,RULES.bossRadius);this.graphics.lineStyle(4,0xffefc5,.95);this.graphics.beginPath();this.graphics.arc(u.x,u.y,RULES.bossRadius-7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-u.windup/RULES.bossWindup),false);this.graphics.strokePath()}this.drawUnit(u)}
  const ids=new Set(battle.units.map(u=>u.id));for(const [id,v] of this.views)if(!ids.has(id)){v.destroy();this.views.delete(id)}
  for(const e of battle.events.splice(0))this.showEvent(e);renderHud()
 }
 showEvent(e:CombatEvent){
  if(e.type==='spawn'){const dust=this.add.sprite(e.x,e.y+8,'deployment-dust').setDepth(e.y-1);dust.play('deployment-dust');dust.once('animationcomplete',()=>dust.destroy());return}
  if(e.type==='towerDown'){const ring=this.add.circle(e.x,e.y,20,0xe9b67a,.55).setDepth(1001);this.tweens.add({targets:ring,scale:2.5,alpha:0,duration:500,onComplete:()=>ring.destroy()});return}
  if(e.type==='shield'){const ring=this.add.circle(e.x,e.y,24,0x84d9e5,.5).setDepth(1001);this.tweens.add({targets:ring,scale:2,alpha:0,duration:500,onComplete:()=>ring.destroy()});return}
  if(e.type==='boss'){const ring=this.add.circle(e.x,e.y,20,0xf1aa58,.55).setDepth(1001);this.tweens.add({targets:ring,scale:5,alpha:0,duration:350,onComplete:()=>ring.destroy()});return}
  if(e.type==='death'){const puff=this.add.circle(e.x,e.y,12,0xf3e1b6,.65).setDepth(1001);this.tweens.add({targets:puff,scale:2,alpha:0,duration:280,onComplete:()=>puff.destroy()});return}
  if(e.towerId&&e.fromX!==undefined&&e.fromY!==undefined){
   const tower=battle.towers.find(t=>t.id===e.towerId),archer=this.towerArchers.get(e.towerId);
   if(tower&&archer&&tower.hp>0){archer.setFlipX(e.x<e.fromX);archer.play(tower.team==='ally'?'archer-attack':'shaman-attack',true)}
   const fromY=e.fromY-TOWER_GUARD_OFFSET;
   const shot=tower?.team==='enemy'?this.add.circle(e.fromX,fromY,5,0xd894ff).setStrokeStyle(2,0xffe0ff):this.add.image(e.fromX,fromY,'tower-arrow').setScale(.55).setRotation(Math.atan2(e.y-fromY,e.x-e.fromX));
   shot.setDepth(1002);
   this.tweens.add({targets:shot,x:e.x,y:e.y,duration:200,onComplete:()=>shot.destroy()});
  }else if(e.ranged&&e.fromX!==undefined&&e.fromY!==undefined){const shot=this.add.circle(e.fromX,e.fromY,4,0xffe4a1).setDepth(1002);this.tweens.add({targets:shot,x:e.x,y:e.y,duration:160,onComplete:()=>shot.destroy()})}
  const impact=this.add.circle(e.x,e.y,8,e.type==='heal'?0x8be7b4:0xffcf86,.55).setDepth(1001);this.tweens.add({targets:impact,scale:2,alpha:0,duration:240,onComplete:()=>impact.destroy()});
  const text=this.add.text(e.x,e.y-38,`${e.type==='heal'?'+':'−'}${Math.round(e.amount||0)}`,{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:e.type==='heal'?'#a8ffd1':'#fff1d4',stroke:'#24342c',strokeThickness:3}).setOrigin(.5).setDepth(1002);
  this.tweens.add({targets:text,y:text.y-22,alpha:0,duration:650,onComplete:()=>text.destroy()})
 }
 drawUnit(u:Unit){
  let v=this.views.get(u.id);if(!v){v=this.add.sprite(u.x,u.y,u.kind+'-idle');this.views.set(u.id,v)}
  const anim=u.kind+'-'+u.action;if(v.anims.currentAnim?.key!==anim)v.play(anim);
  v.setPosition(u.x,u.y);v.setDepth(u.y);v.setScale(u.kind==='troll'?.65:u.kind==='lancer'?.50:u.kind==='goblin'?.46:.58);v.setFlipX(u.facing<0);v.setTint(u.flash>0?0xff9999:0xffffff);
  const g=this.graphics;g.fillStyle(0x172522,.8);g.fillRoundedRect(u.x-20,u.y-35,40,5,2);g.fillStyle(u.team==='ally'?0x85d7c5:0xe87965);g.fillRoundedRect(u.x-20,u.y-35,40*Math.max(0,u.hp/specs[u.kind].hp),5,2)
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:MAP.width,height:MAP.height,backgroundColor:'#78945c',pixelArt:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:BattleScene});renderHud();
