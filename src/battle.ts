import { MAP, isWalkable } from './geometry.ts';
import { LEVELS, type Level, type Spawn } from './levels.ts';
export type Kind = 'warrior'|'archer'|'lancer'|'monk'|'goblin'|'spider'|'shaman'|'troll'|'bat'|'batBoss'|'bear'|'minotaur'|'hexBoss'|'gnoll'|'skull'|'spear';
export const RULES={vision:180,healVision:200,towerRange:125,energyRegen:.6,bossTime:88,bossRadius:95,bossWindup:1.4,maxAllies:10,spawnSafetyRadius:26} as const;
type Spec = { name:string; hp:number; speed:number; damage:number; range:number; interval:number; cost:number; size:number };
export const specs:Record<Kind,Spec> = {
 warrior:{name:'战士',hp:210,speed:43,damage:30,range:30,interval:0.85,cost:3,size:192},
 archer:{name:'弓手',hp:80,speed:39,damage:20,range:160,interval:1.05,cost:3,size:192},
 lancer:{name:'枪骑士',hp:330,speed:49,damage:40,range:38,interval:1.15,cost:4,size:320},
 monk:{name:'修士',hp:105,speed:55,damage:27,range:110,interval:1.35,cost:3,size:192},
 goblin:{name:'哥布林',hp:110,speed:40,damage:18,range:27,interval:1,cost:0,size:256},
 spider:{name:'蜘蛛',hp:75,speed:62,damage:16,range:24,interval:0.8,cost:0,size:192},
 shaman:{name:'萨满',hp:110,speed:30,damage:20,range:125,interval:1.4,cost:0,size:192},
 troll:{name:'巨魔',hp:1350,speed:24,damage:46,range:38,interval:1.35,cost:0,size:384},
 bat:{name:'蝙蝠',hp:75,speed:58,damage:14,range:26,interval:.9,cost:0,size:192},
 batBoss:{name:'巨蝙蝠',hp:1250,speed:30,damage:38,range:36,interval:1.25,cost:0,size:192},
 bear:{name:'狂暴巨熊',hp:1500,speed:28,damage:42,range:36,interval:1.2,cost:0,size:256},
 minotaur:{name:'牛头人',hp:1800,speed:26,damage:48,range:40,interval:1.25,cost:0,size:320},
 hexBoss:{name:'咒术萨满',hp:1300,speed:26,damage:32,range:125,interval:1.3,cost:0,size:192},
 gnoll:{name:'豺狼人',hp:105,speed:34,damage:19,range:110,interval:1.3,cost:0,size:192},
 skull:{name:'骷髅',hp:95,speed:48,damage:17,range:27,interval:.9,cost:0,size:192},
 spear:{name:'长矛哥布林',hp:130,speed:38,damage:21,range:40,interval:1,cost:0,size:256}
};
export interface Unit { id:number; kind:Kind; team:'ally'|'enemy'; x:number;y:number;hp:number;cooldown:number; flash:number; windup:number; special:number; action:'idle'|'move'|'attack'; actionTime:number; facing:number; lane:0|1; specialX?:number; specialY?:number }
export interface Tower {id:string;team:'ally'|'enemy';x:number;y:number;hp:number;maxHp:number;cooldown:number}
export type CombatEvent={type:'hit'|'heal'|'death'|'boss'|'spawn'|'towerDown'|'shield';x:number;y:number;fromX?:number;fromY?:number;amount?:number;ranged?:boolean;towerId?:string};
export const schedule:Spawn[]=LEVELS[0].waves;
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
export class Battle {
 readonly level:Level;
 constructor(level:Level=LEVELS[0]){this.level=level}
 towers:Tower[]=[{id:'a1',team:'ally',x:MAP.bridges[0],y:MAP.allyTowerY,hp:350,maxHp:350,cooldown:0},{id:'a2',team:'ally',x:MAP.bridges[1],y:MAP.allyTowerY,hp:350,maxHp:350,cooldown:0},{id:'e1',team:'enemy',x:MAP.bridges[0],y:MAP.enemyTowerY,hp:250,maxHp:250,cooldown:0},{id:'e2',team:'enemy',x:MAP.bridges[1],y:MAP.enemyTowerY,hp:250,maxHp:250,cooldown:0}];
 units:Unit[]=[]; pendingSpawns:Spawn[]=[]; events:CombatEvent[]=[]; time=0; energy=7; base=600; maxBase=600; enemyBase=700; maxEnemyBase=700; bossSpawned=false; bossDefeated=false; shieldLethalPending=false; selected:Kind='warrior'; status:'playing'|'paused'|'won'|'lost'='playing'; next=0; id=0; message='选择卡牌，再点击金色虚线范围'; messageTime=5;
 walkable(x:number,y:number,team?:'ally'|'enemy'){return isWalkable(x,y)&&!(team==='ally'&&Math.hypot(x-MAP.spawnX,y-MAP.spawnY)<RULES.spawnSafetyRadius)&&!this.towers.some(t=>t.hp>0&&Math.hypot(t.x-x,t.y-y)<32)}
 spawn(kind:Kind,team:'ally'|'enemy',x:number,y:number,lane:0|1=x<MAP.campX?0:1){const u:Unit={id:++this.id,kind,team,x,y,hp:specs[kind].hp,cooldown:0,flash:0,windup:0,special:kind===this.level.boss?2:7,action:'idle',actionTime:0,facing:team==='ally'?1:-1,lane};this.units.push(u);return u}
 placementProblem(x:number,y:number):string|null{
  if(this.status!=='playing')return '战斗未进行';
  if(x<MAP.deployLeft||x>MAP.deployRight||y<MAP.deployTop||y>MAP.deployBottom||!isWalkable(x,y))return '请在金色虚线范围内部署';
  if(!this.walkable(x,y,'ally'))return '防御塔附近无法部署';
  if(this.units.some(u=>u.team==='ally'&&u.hp>0&&Math.hypot(u.x-x,u.y-y)<30))return '这里已有部队，请选择空地';
  if(this.units.filter(u=>u.team==='ally'&&u.hp>0).length>=RULES.maxAllies)return '场上部队已达上限';
  if(this.energy<specs[this.selected].cost)return '能量不足';
  return null;
 }
 deploy(x:number,y:number){
  if(this.status!=='playing')return;
  const problem=this.placementProblem(x,y);if(problem){this.notice(problem);return}
  this.energy-=specs[this.selected].cost;this.spawn(this.selected,'ally',x,y);
  this.events.push({type:'spawn',x,y});this.notice(`${specs[this.selected].name}已部署`);
 }
 notice(s:string){this.message=s;this.messageTime=2}
 attack(u:Unit,target:Unit){const s=specs[u.kind];u.cooldown=s.interval;u.actionTime=.45;u.facing=target.x<u.x?-1:1;
 if(u.kind==='monk'){const healed=Math.min(s.damage,specs[target.kind].hp-target.hp);target.hp+=healed;this.events.push({type:'heal',x:target.x,y:target.y,fromX:u.x,fromY:u.y,amount:healed})}
 else{target.hp-=s.damage;target.flash=.18;this.events.push({type:'hit',x:target.x,y:target.y,fromX:u.x,fromY:u.y,amount:s.damage,ranged:s.range>60})}}
 move(u:Unit,tx:number,ty:number,dt:number){
 // Align with a bridge before entering the horizontal river, including targets on a bridge.
 const destinationY=ty;
 const inRiver=u.y>=MAP.riverTop&&u.y<=MAP.riverBottom;
 const targetInRiver=ty>=MAP.riverTop&&ty<=MAP.riverBottom;
 const crossing=(!inRiver&&((u.y<MAP.riverTop&&ty>=MAP.riverTop)||(u.y>MAP.riverBottom&&ty<=MAP.riverBottom)))||(inRiver&&!targetInRiver);
 if(crossing){
  const middle=(MAP.bridges[0]+MAP.bridges[1])/2;
  const bridge=!targetInRiver&&u.team==='enemy'&&Math.abs(u.x-middle)<8?MAP.bridges[u.lane]:(targetInRiver?tx:u.x)<middle?MAP.bridges[0]:MAP.bridges[1];
  if(!inRiver){
   if(Math.abs(u.x-bridge)>18){tx=bridge;ty=u.y}
   else{tx=bridge;if(!targetInRiver)ty=u.y<MAP.riverTop?MAP.riverBottom+8:MAP.riverTop-8}
  }else{tx=bridge;ty=ty>(MAP.riverTop+MAP.riverBottom)/2?MAP.riverBottom+8:MAP.riverTop-8}
  // Bypass on the side the unit is already on, so it never tries to walk
  // through the tower (or the base behind it) to reach a waypoint.
  const direction=destinationY>u.y?1:-1;
  const tower=this.towers.find(t=>t.hp>0&&t.team===u.team&&t.x===bridge&&
   (t.y-u.y)*direction>=-40&&(t.y-u.y)*direction<=60);
  if(tower){
   const bypassX=bridge+(u.x<bridge?-46:u.x>bridge?46:bridge<middle?-46:46);
   if(Math.abs(u.x-bypassX)>3){tx=bypassX;ty=u.y}
   else{tx=bypassX;ty=tower.y+direction*45}
  }
 }
 const d=Math.hypot(tx-u.x,ty-u.y);if(d<=2)return false;
 const step=Math.min(d,specs[u.kind].speed*dt), dx=(tx-u.x)/d*step, dy=(ty-u.y)/d*step;
 // Reject obstructed moves; nearby allies try a small sidestep instead of overlapping.
 for(const [mx,my] of [[dx,dy],[dx*.65-dy*.55,dy*.65+dx*.55],[dx*.65+dy*.55,dy*.65-dx*.55],[-dy,dx],[dy,-dx]]){
  const nx=u.x+mx,ny=u.y+my;if(!this.walkable(nx,ny,u.team))continue;
  if(this.units.some(v=>v!==u&&v.team===u.team&&v.hp>0&&Math.hypot(v.x-nx,v.y-ny)<30&&Math.hypot(v.x-nx,v.y-ny)<distance(v,u)))continue;
  u.x=nx;u.y=ny;if(Math.abs(mx)>.01)u.facing=mx<0?-1:1;return true;
 }return false
 }
 update(dt:number){if(this.status!=='playing')return;this.time+=dt;this.energy=Math.min(10,this.energy+dt*RULES.energyRegen);this.messageTime=Math.max(0,this.messageTime-dt);
 for(const tower of this.towers){
  tower.cooldown-=dt;if(tower.hp<=0||tower.cooldown>0)continue;
  const target=this.units.filter(u=>u.hp>0&&u.team!==tower.team&&distance(u,tower)<RULES.towerRange).sort((a,b)=>distance(a,tower)-distance(b,tower))[0];
  if(target){target.hp-=14;target.flash=.18;tower.cooldown=1.1;this.events.push({type:'hit',x:target.x,y:target.y,fromX:tower.x,fromY:tower.y,amount:14,ranged:true,towerId:tower.id})}
 }
 while(this.next<this.level.waves.length&&this.time>=this.level.waves[this.next].time)this.pendingSpawns.push(this.level.waves[this.next++]);
 // One shared spawn point just in front of the enemy base; defer when occupied.
 if(this.pendingSpawns.length&&this.walkable(MAP.spawnX,MAP.spawnY)&&!this.units.some(u=>u.hp>0&&Math.hypot(u.x-MAP.spawnX,u.y-MAP.spawnY)<(u.team==='enemy'?30:24))){
  const e=this.pendingSpawns.shift()!;this.spawn(e.kind,'enemy',MAP.spawnX,MAP.spawnY,e.lane);
  this.events.push({type:'spawn',x:MAP.spawnX,y:MAP.spawnY});
  if(e.kind===this.level.boss){this.bossSpawned=true;this.notice(`${this.level.bossName}来袭！击败首领解除主城护盾`);}
 }
 for(const u of this.units){if(u.hp<=0)continue;const s=specs[u.kind];u.cooldown-=dt;u.flash=Math.max(0,u.flash-dt);u.actionTime=Math.max(0,u.actionTime-dt);u.action='idle';
 if(u.kind===this.level.boss&&u.team==='enemy'){
  u.special-=dt;
  if(u.windup>0){
   u.action='attack';u.windup-=dt;
   if(u.windup<=0){
    const x=u.specialX??u.x,y=u.specialY??u.y;
    if(u.kind==='batBoss'){
     for(const [dx,dy] of [[-38,0],[38,0],[0,38],[0,-38]]){
      const px=u.x+dx,py=u.y+dy;
      if(this.walkable(px,py,'enemy')&&!this.units.some(v=>v.hp>0&&Math.hypot(v.x-px,v.y-py)<30)){this.spawn('bat','enemy',px,py,u.lane);this.events.push({type:'spawn',x:px,y:py});if(this.units.filter(v=>v.kind==='bat'&&v.team==='enemy'&&distance(v,u)<75).length>=2)break}
     }
    }else{
     if(u.kind==='bear'||u.kind==='minotaur'){for(let i=0;i<18;i++)this.move(u,x,y,.06)}
     const center=u.kind==='hexBoss'?{x,y}:u;const radius=u.kind==='hexBoss'?60:95;
     for(const a of this.units)if(a.team==='ally'&&a.hp>0&&distance(a,center)<radius){a.hp-=u.kind==='hexBoss'?65:80;a.flash=.2;this.events.push({type:'hit',x:a.x,y:a.y,amount:u.kind==='hexBoss'?65:80})}
     for(const t of this.towers)if(t.team==='ally'&&t.hp>0&&distance(t,center)<radius){t.hp=Math.max(0,t.hp-80);this.events.push({type:'hit',x:t.x,y:t.y,amount:80})}
     if(distance(center,{x:MAP.baseX,y:MAP.baseY})<MAP.baseKeepOut+radius-35)this.base-=80;
     this.events.push({type:'boss',x:center.x,y:center.y});
    }
    u.special=9;
   }
   continue;
  }
  const targets=[...this.units.filter(a=>a.team==='ally'&&a.hp>0),...this.towers.filter(t=>t.team==='ally'&&t.hp>0)];
  const target=targets.filter(a=>distance(a,u)<(u.kind==='hexBoss'?180:115)).sort((a,b)=>distance(a,u)-distance(b,u))[0];
  if(u.special<=0&&(u.kind==='batBoss'||target||distance(u,{x:MAP.baseX,y:MAP.baseY})<MAP.baseKeepOut+60)){
   u.specialX=target?.x??u.x;u.specialY=target?.y??u.y;u.windup=RULES.bossWindup;this.notice(`${this.level.bossName}正在施展${this.level.skill}！`);continue
  }
 }
 if(u.kind==='monk'){const injured=this.units.filter(v=>v.team==='ally'&&v.hp>0&&v.hp<specs[v.kind].hp&&v.id!==u.id&&distance(u,v)<=RULES.healVision).sort((a,b)=>distance(u,a)-distance(u,b))[0];
 if(injured){if(distance(u,injured)<=s.range){if(u.cooldown<=0)this.attack(u,injured)}else if(this.move(u,injured.x,injured.y,dt))u.action='move'}
 else{const ally=this.units.filter(v=>v.team==='ally'&&v.hp>0&&v.kind!=='monk').sort((a,b)=>distance(u,a)-distance(u,b))[0];
  if(ally&&distance(u,ally)>s.range*.8&&this.move(u,ally.x,ally.y,dt))u.action='move'}
 if(u.actionTime>0)u.action='attack';continue}
 // Units always select living enemy units first, then towers, then the main base.
 // Within each category the nearest target wins. Healing monks do not attack.
 const target=this.units.filter(v=>v.hp>0&&v.team!==u.team&&distance(u,v)<=Math.max(RULES.vision,s.range)).sort((a,b)=>distance(u,a)-distance(u,b))[0];
 const towerTarget=target?undefined:this.towers.filter(t=>t.hp>0&&t.team!==u.team).sort((a,b)=>distance(u,a)-distance(u,b))[0];
 if(target){
  if(distance(u,target)<=s.range){if(u.cooldown<=0)this.attack(u,target)}
  else if(this.move(u,target.x,target.y,dt))u.action='move';
 }else if(towerTarget){
  if(distance(u,towerTarget)<=s.range+32){
   if(u.cooldown<=0){towerTarget.hp=Math.max(0,towerTarget.hp-s.damage);u.cooldown=s.interval;u.actionTime=.45;u.facing=towerTarget.x<u.x?-1:1;this.events.push({type:'hit',x:towerTarget.x,y:towerTarget.y,fromX:u.x,fromY:u.y,amount:s.damage,ranged:s.range>60})}
  }else if(this.move(u,towerTarget.x,towerTarget.y,dt))u.action='move';
 }else{
  const base=u.team==='enemy'?{x:MAP.baseX,y:MAP.baseY,radius:MAP.baseKeepOut}:{x:MAP.campX,y:MAP.campY,radius:MAP.campKeepOut};
  if(distance(u,base)<=s.range+base.radius){
   if(u.cooldown<=0){
    let applied:number;
    if(u.team==='enemy'){const previous=this.base;this.base=Math.max(0,this.base-s.damage);applied=previous-this.base}
    else{
     const minimum=this.bossDefeated?0:1;
     const previous=this.enemyBase;this.enemyBase=Math.max(minimum,this.enemyBase-s.damage);applied=previous-this.enemyBase;
     if(!this.bossDefeated&&previous-s.damage<=0)this.shieldLethalPending=true;
     if(!this.bossDefeated&&this.enemyBase===1&&(previous>1||this.messageTime<=0)){
      this.notice('主城受到护盾保护，击败首领后解除');this.events.push({type:'shield',x:MAP.campX,y:MAP.campY+25});
     }
    }
    u.cooldown=s.interval;u.actionTime=.45;u.facing=base.x<u.x?-1:1;
    if(applied>0)this.events.push({type:'hit',x:base.x,y:base.y+(u.team==='enemy'?-35:25),fromX:u.x,fromY:u.y,amount:applied,ranged:s.range>60});
   }
  }else if(this.move(u,base.x,base.y,dt))u.action='move';
 }
 if(u.actionTime>0)u.action='attack';
 }
 for(const u of this.units)if(u.hp<=0){
  this.events.push({type:'death',x:u.x,y:u.y});
  if(u.kind===this.level.boss&&u.team==='enemy'){
   this.bossDefeated=true;
   this.shieldLethalPending=false;this.notice(`${this.level.bossName}已被击败，主城护盾解除！`);
  }
 }
 this.units=this.units.filter(u=>u.hp>0);if(this.base<=0){this.base=0;this.status='lost'}else if(this.bossDefeated&&this.enemyBase<=0)this.status='won';
 }
}


