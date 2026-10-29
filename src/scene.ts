import Phaser from 'phaser';
import { Battle, RULES, specs, type Unit, type CombatEvent } from './battle.ts';
import { MAP } from './geometry.ts';
import { BUILDINGS } from './buildings.ts';
import { WorldProjection } from './projection.ts';
import { assetUrl, characterAssets, imageAssets, sheetAssets } from './assets.ts';
import { SPELLS } from './spells.ts';

export interface SceneHooks {
 battle:()=>Battle;ready:()=>void;progress:(amount:number)=>void;error:()=>void;
 pointer:(x:number,y:number)=>void;frame:()=>void;event:(event:CombatEvent)=>void;
}
type Art={image:Phaser.GameObjects.Image|Phaser.GameObjects.Sprite;x:number;y:number;width:number;height:number;offsetY?:number};
export class BattleScene extends Phaser.Scene {
 readonly projection=new WorldProjection();
 private ground!:Phaser.GameObjects.Container;
 private graphics!:Phaser.GameObjects.Graphics;
 private art:Art[]=[];
 private actors=new Map<number,Phaser.GameObjects.Sprite>();
 private towers=new Map<string,Phaser.GameObjects.Image>();
 private guards=new Map<string,Phaser.GameObjects.Sprite>();
 private camp!:Phaser.GameObjects.Image;
 private effects=new Set<Phaser.GameObjects.GameObject>();
 private floats=new Map<string,{text:Phaser.GameObjects.Text;amount:number;until:number}>();
 private zones:{x:number;y:number;radius:number;color:number;until:number}[]=[];
 private failed=false;private initialized=false;private elapsed=0;private paused=false;
 rangeTower:string|null=null;rangeUntil=0;
 constructor(private hooks:SceneHooks){super('battle')}
 preload(){
  this.load.on('progress',(p:number)=>this.hooks.progress(p));
  this.load.on('loaderror',()=>{this.failed=true;this.hooks.error()});
  for(const item of characterAssets())this.load.spritesheet(item.key,item.url,{frameWidth:item.size,frameHeight:item.size});
  for(const key of imageAssets)this.load.image(key,assetUrl(key));
  for(const item of sheetAssets)this.load.spritesheet(item.key,assetUrl(item.key),{frameWidth:item.width,frameHeight:item.height});
 }
 create(){
  if(this.failed)return;
  this.textures.get('bridge').add('vertical',0,0,80,64,160);
  for(const [name,x,y] of [['arena-grass',64,64],['lane-ground',384,64],['arena-sand',384,64]] as const)this.textures.get('terrain-flat').add(name,0,x,y,64,64);
  for(const item of characterAssets())this.anims.create({key:item.key,frames:this.anims.generateFrameNumbers(item.key),frameRate:item.key.endsWith('-attack')?12:8,repeat:item.key.endsWith('-attack')?0:-1});
  for(const item of sheetAssets)if(item.rate)this.anims.create({key:item.key,frames:this.anims.generateFrameNumbers(item.key),frameRate:item.rate,repeat:item.key==='tree'||item.key==='shaman-projectile'?-1:0});
  this.ground=this.add.container(0,0).setDepth(-40);this.graphics=this.add.graphics().setDepth(1000);
  this.initialized=true;this.scale.on('resize',()=>this.resizeWorld());this.rebuild();
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{const p=this.projection.inverse(pointer.x,pointer.y);this.hooks.pointer(p.x,p.y)});
  this.hooks.ready();
 }
 private clearEffects(){for(const effect of this.effects)effect.destroy();this.effects.clear();this.floats.clear();this.zones=[];this.tweens.killAll()}
 towerAt(x:number,y:number){const pos=this.projection.point(x,y);return this.hooks.battle().towers.find(t=>t.hp>0&&this.towers.get(t.id)?.getBounds().contains(pos.x,pos.y))}
 rebuild(){
  if(!this.initialized)return;this.elapsed=0;this.rangeTower=null;this.clearEffects();
  this.actors.forEach(v=>v.destroy());this.actors.clear();this.art.forEach(a=>a.image.destroy());this.art=[];this.towers.clear();this.guards.clear();
  const b=this.hooks.battle(),theme=BUILDINGS[b.level.id-1];
  const art=(key:string,x:number,y:number,width:number,height:number,frame?:number|string,offsetY=0)=>{
   const image=this.add.image(0,0,key,frame).setDepth(y);this.art.push({image,x,y,width,height,offsetY});return image;
  };
  this.camp=art(theme.camp,MAP.campX,MAP.campY,theme.campWidth,theme.campHeight,theme.campFrame,-8);
  art('barracks-rear',MAP.baseX,MAP.baseY,192*.55,256*.55,undefined,-28);
  for(const [x,y,scale] of [[25,175,.31],[455,190,.31],[25,500,.31],[455,520,.31],[26,80,.28],[454,80,.28]]){
   const image=this.add.sprite(0,0,'tree').setDepth(y).setTint(b.level.terrain).play('tree');this.art.push({image,x,y,width:192*scale,height:256*scale});
  }
  for(const [x,y] of [[26,255],[454,255],[26,590],[454,590]])art('bush',x,y,128*.48,128*.48).setTint(b.level.terrain);
  for(const x of [30,450])art('rock',x,390,64*.4,64*.4);
  for(const tower of b.towers){
   const ally=tower.team==='ally';const view=art(ally?'tower-ally-rear':theme.tower,tower.x,tower.y,ally?128*.47:theme.towerWidth,ally?256*.47:theme.towerHeight,ally?undefined:theme.towerFrame,-18);this.towers.set(tower.id,view);
   const idle=ally?'archer-idle':'shaman-idle',guard=this.add.sprite(0,0,idle).setDepth(tower.y+1).play(idle);
   this.art.push({image:guard,x:tower.x,y:tower.y,width:192*.42,height:192*.42,offsetY:-(ally?48:theme.guardOffset)});this.guards.set(tower.id,guard);
   guard.on('animationcomplete',()=>{if((this.hooks.battle().towers.find(t=>t.id===tower.id)?.hp??0)>0)guard.play(idle)});
  }
  this.resizeWorld();
 }
 private resizeWorld(){
  if(!this.initialized)return;this.projection.resize(this.scale.width,this.scale.height);this.clearEffects();
  const p=this.projection,s=p.artworkScale;
  for(const art of this.art){const pos=p.point(art.x,art.y);art.image.setPosition(pos.x,pos.y+(art.offsetY??0)*s).setDisplaySize(art.width*s,art.height*s)}
  this.drawGround();
 }
 private drawGround(){
  this.ground.removeAll(true);const p=this.projection,b=this.hooks.battle();
  const tile=(key:string,x:number,y:number,w:number,h:number,frame?:string)=>{const pos=p.point(x,y);const image=this.add.image(pos.x,pos.y,key,frame).setOrigin(0).setDisplaySize(w*p.sx,h*p.sy);this.ground.add(image);return image};
  for(let y=0;y<MAP.height;y+=64)for(let x=0;x<MAP.width;x+=64)tile('terrain-flat',x,y,64,64,b.level.id===3?'arena-sand':'arena-grass').setTint(b.level.terrain);
  const width=28;
  for(const x of MAP.bridges)for(let y=MAP.campY;y<MAP.baseY;y+=64)tile('terrain-flat',x-width/2,y,width,Math.min(64,MAP.baseY-y),'lane-ground').setAlpha(.78);
  for(const y of [MAP.campY,MAP.baseY])for(let x=MAP.bridges[0]-width/2;x<MAP.bridges[1]+width/2;x+=64)tile('terrain-flat',x,y-width/2,Math.min(64,MAP.bridges[1]+width/2-x),width,'lane-ground').setAlpha(.78);
  for(let x=0;x<MAP.width;x+=64)tile('river',x,MAP.riverTop,64,MAP.riverBottom-MAP.riverTop).setTint(b.level.water);
  const lines=this.add.graphics();this.ground.add(lines);
  lines.lineStyle(2,0xd2e9c7,.8);for(const y of [MAP.riverTop,MAP.riverBottom]){const a=p.point(0,y),z=p.point(MAP.width,y);lines.lineBetween(a.x,a.y,z.x,z.y)}
  for(const x of MAP.bridges){const pos=p.point(x,(MAP.riverTop+MAP.riverBottom)/2);this.ground.add(this.add.image(pos.x,pos.y,'bridge','vertical').setDisplaySize(82*p.sx,82*p.sy))}
  const dashed=(x1:number,y1:number,x2:number,y2:number)=>{
   const distance=Math.hypot(x2-x1,y2-y1);for(let t=0;t<distance;t+=18){const e=Math.min(t+10,distance),a=p.point(x1+(x2-x1)*t/distance,y1+(y2-y1)*t/distance),z=p.point(x1+(x2-x1)*e/distance,y1+(y2-y1)*e/distance);lines.lineBetween(a.x,a.y,z.x,z.y)}
  };
  for(const [size,color,alpha] of [[3,0x403526,.65],[1,0xf4d891,.95]]){
   lines.lineStyle(size,color,alpha);dashed(MAP.deployLeft,MAP.deployTop,MAP.deployRight,MAP.deployTop);dashed(MAP.deployLeft,MAP.deployTop,MAP.deployLeft,MAP.deployBottom);dashed(MAP.deployRight,MAP.deployTop,MAP.deployRight,MAP.deployBottom);
   const overlap=Math.sqrt(MAP.baseKeepOut**2-(MAP.baseY-MAP.deployBottom)**2);dashed(MAP.deployLeft,MAP.deployBottom,MAP.baseX-overlap,MAP.deployBottom);dashed(MAP.baseX+overlap,MAP.deployBottom,MAP.deployRight,MAP.deployBottom);
   const start=Math.acos(-overlap/MAP.baseKeepOut),end=Math.acos(overlap/MAP.baseKeepOut);
   for(let i=0;i<12;i+=2){const a=start+(end-start)*i/12,z=start+(end-start)*(i+1)/12;const v=p.point(MAP.baseX+Math.cos(a)*MAP.baseKeepOut,MAP.baseY-Math.sin(a)*MAP.baseKeepOut),w=p.point(MAP.baseX+Math.cos(z)*MAP.baseKeepOut,MAP.baseY-Math.sin(z)*MAP.baseKeepOut);lines.lineBetween(v.x,v.y,w.x,w.y)}
  }
 }
 private bar(x:number,y:number,width:number,percent:number,color:number){const s=this.projection.artworkScale,g=this.graphics;g.fillStyle(0x172522,.85);g.fillRoundedRect(x-width*s/2,y,width*s,6*s,2*s);g.fillStyle(color);g.fillRect(x-width*s/2+s,y+s,Math.max(0,(width-2)*s*percent),4*s)}
 private ellipse(x:number,y:number,radius:number,color:number,alpha:number){const p=this.projection,pos=p.point(x,y),r=p.radius(radius);this.graphics.fillStyle(color,alpha);this.graphics.fillEllipse(pos.x,pos.y,r.x*2,r.y*2);this.graphics.lineStyle(1.5,color,.9);this.graphics.strokeEllipse(pos.x,pos.y,r.x*2,r.y*2)}
 update(_time:number,delta:number){
  if(!this.initialized)return;const b=this.hooks.battle(),paused=b.status!=='playing';
  if(paused!==this.paused){this.paused=paused;if(paused){this.anims.pauseAll();this.tweens.pauseAll()}else{this.anims.resumeAll();this.tweens.resumeAll()}}
  if(!paused){this.elapsed+=Math.min(delta/1000,.1);while(this.elapsed>=.05){b.update(.05);this.elapsed-=.05}}else this.elapsed=0;
  this.graphics.clear();const p=this.projection,s=p.artworkScale,theme=BUILDINGS[b.level.id-1];
  if(b.enemyBase<=0&&this.camp.texture.key!==theme.campRuin){this.camp.setTexture(theme.campRuin).setDisplaySize(theme.campRuinWidth*s,theme.campRuinHeight*s)}
  if(this.rangeTower&&b.time<this.rangeUntil&&b.status==='playing'){const tower=b.towers.find(t=>t.id===this.rangeTower&&t.hp>0);if(tower)this.ellipse(tower.x,tower.y,RULES.towerRange,tower.team==='ally'?0xa0e3d0:0xffbfaa,.07)}
  for(const tower of b.towers){
   const ally=tower.team==='ally',view=this.towers.get(tower.id)!,key=tower.hp>0?(ally?'tower-ally-rear':theme.tower):(ally?'tower-ally-ruin':theme.ruin);
   this.guards.get(tower.id)!.setVisible(tower.hp>0);
   if(view.texture.key!==key)view.setTexture(key,tower.hp>0&&!ally?theme.towerFrame:undefined).setDisplaySize((ally?128*.47:tower.hp>0?theme.towerWidth:theme.ruinWidth)*s,(ally?256*.47:tower.hp>0?theme.towerHeight:theme.ruinHeight)*s);
   if(tower.hp>0){const pos=p.point(tower.x,tower.y);this.bar(pos.x,pos.y-9*s,48,tower.hp/tower.maxHp,ally?0x62d9d2:0xee8977)}
  }
  this.zones=this.zones.filter(zone=>zone.until>b.time);for(const zone of this.zones)this.ellipse(zone.x,zone.y,zone.radius,zone.color,.12);
  for(const u of b.units){
   if(u.windup>0){const aimed=['hexBoss','bear','minotaur'].includes(u.kind),x=aimed?(u.specialX??u.x):u.x,y=aimed?(u.specialY??u.y):u.y,radius=b.bossSkill(u).radius;this.ellipse(x,y,radius,0xffb65d,.23);const pos=p.point(x,y),r=p.radius(radius);this.graphics.lineStyle(3,0xffefc5,.95);this.graphics.beginPath();this.graphics.arc(pos.x,pos.y,Math.min(r.x,r.y)-4,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-u.windup/RULES.bossWindup));this.graphics.strokePath()}
   this.drawUnit(u);
  }
  const ids=new Set(b.units.map(u=>u.id));for(const [id,actor] of this.actors)if(!ids.has(id)){actor.destroy();this.actors.delete(id)}
  for(const event of b.events.splice(0)){this.showEvent(event);this.hooks.event(event)}
  this.hooks.frame();
 }
 private track<T extends Phaser.GameObjects.GameObject>(object:T){this.effects.add(object);object.once('destroy',()=>this.effects.delete(object));return object}
 private effect(key:string,x:number,y:number,size:number){const point=this.projection.point(x,y),effect=this.track(this.add.sprite(point.x,point.y,key).setDisplaySize(size*this.projection.artworkScale,size*this.projection.artworkScale).setDepth(1002));effect.play(key);effect.once('animationcomplete',()=>effect.destroy());return effect}
 showEvent(event:CombatEvent){
  const p=this.projection,s=p.artworkScale,pos=p.point(event.x,event.y),b=this.hooks.battle();
  if(event.type==='spawn'){this.effect('deployment-dust',event.x,event.y+8,64);return}
  if(event.type==='towerDown'){this.effect('impact-explosion',event.x,event.y,140);return}
  if(event.type==='death'){this.effect('deployment-dust',event.x,event.y,46);return}
  if(event.type==='boss'){this.effect('impact-explosion',event.x,event.y,165);return}
  if(event.type==='shield'){this.ellipse(event.x,event.y,35,0x84d9e5,.2);return}
  if(event.type==='phase'){this.effect('spell-fire',event.x,event.y,100);return}
  if(event.type==='spell'&&event.spell){
   this.zones.push({x:event.x,y:event.y,radius:SPELLS[event.spell].radius,color:event.spell==='fireball'?0xffb16b:0xa0edb3,until:b.time+.5});
   if(event.spell==='fireball'){const fire=this.effect('spell-fire',event.x,event.y,75);fire.y-=90*s;this.tweens.add({targets:fire,y:pos.y,duration:350})}return;
  }
  if(event.type==='spellImpact'){this.effect(event.spell==='fireball'?'impact-explosion':'heal-effect',event.x,event.y,event.spell==='fireball'?160:180);return}
  if(event.type==='heal'){this.effect('heal-effect',event.x,event.y,112)}
  else if(event.ranged&&event.fromX!==undefined&&event.fromY!==undefined){
   const tower=b.towers.find(t=>t.id===event.towerId),guard=event.towerId?this.guards.get(event.towerId):undefined;
   let from=p.point(event.fromX,event.fromY);
   if(tower&&guard){from={x:guard.x,y:guard.y};guard.setFlipX(event.x<event.fromX);guard.play(tower.team==='ally'?'archer-attack':'shaman-attack',true)}
   const source=b.units.find(u=>Math.hypot(u.x-event.fromX!,u.y-event.fromY!)<4),magic=tower?.team==='enemy'||(event.source?event.source!=='archer':source?.team==='enemy');
   const shot=this.track(magic?this.add.sprite(from.x,from.y,'shaman-projectile').play('shaman-projectile').setDisplaySize(40*s,40*s):this.add.image(from.x,from.y,'tower-arrow').setScale(.55*s));
   shot.setDepth(1002).setRotation(Math.atan2(pos.y-from.y,pos.x-from.x));this.tweens.add({targets:shot,x:pos.x,y:pos.y,duration:180,onComplete:()=>{shot.destroy();this.effect('impact-explosion',event.x,event.y,38)}});
  }
  if(!event.amount)return;
  const key=`${Math.round(event.x/28)}:${Math.round(event.y/28)}:${event.type}`,existing=this.floats.get(key);
  if(existing&&existing.until>b.time){existing.amount+=event.amount;existing.text.setText(`${event.type==='heal'?'+':'−'}${Math.round(existing.amount)}`);return}
  const label=this.track(this.add.text(pos.x,pos.y-35*s,`${event.type==='heal'?'+':'−'}${Math.round(event.amount)}`,{fontFamily:'Arial',fontSize:`${Math.max(10,14*s)}px`,fontStyle:'bold',color:event.type==='heal'?'#a8ffd1':'#fff1d4',stroke:'#24342c',strokeThickness:2}).setOrigin(.5).setDepth(1003));
  const record={text:label,amount:event.amount,until:b.time+.16};this.floats.set(key,record);this.tweens.add({targets:label,y:label.y-20*s,alpha:0,duration:600,onComplete:()=>{label.destroy();if(this.floats.get(key)===record)this.floats.delete(key)}});
 }
 private drawUnit(u:Unit){
  let actor=this.actors.get(u.id);if(!actor){actor=this.add.sprite(0,0,u.kind+'-idle');this.actors.set(u.id,actor)}
  const animation=u.kind+'-'+u.action;if(actor.anims.currentAnim?.key!==animation)actor.play(animation);
  const p=this.projection,pos=p.point(u.x,u.y),scale=(u.kind==='troll'?.65:u.kind==='batBoss'?.85:u.kind==='bear'?.72:u.kind==='minotaur'?.65:u.kind==='hexBoss'?.85:u.kind==='lancer'?.50:u.kind==='goblin'||u.kind==='spear'?.46:.58)*p.artworkScale;
  actor.setPosition(pos.x,pos.y).setDepth(u.y).setScale(scale).setFlipX(u.facing<0).setTint(u.flash>0?0xff9999:0xffffff);this.bar(pos.x,pos.y-35*p.artworkScale,40,u.hp/u.maxHp,u.team==='ally'?0x85d7c5:0xe87965);
 }
}
