import type { Kind } from './battle.ts';
export type Spawn = {time:number;kind:Kind;lane:0|1};
export type WaveGroup={time:number;enemies:Kind[];lanes:(0|1)[]};
export type BossPhase={radius:number;damage:number;summons:number;bursts:number;cooldown:number};
export type Level = {id:number;name:string;region:string;description:string;boss:Kind;bossName:string;skill:string;terrain:number;water:number;waves:Spawn[];groups:WaveGroup[];phase:BossPhase;hpMultiplier:number;damageMultiplier:number;bossKills:number};
const group=(time:number,enemies:Kind[],lanes:(0|1)[]):WaveGroup=>({time,enemies,lanes});
const groups:WaveGroup[][]=[
 [group(5,['goblin','goblin'],[0,0]),group(23,['goblin','spider'],[1,1]),group(41,['goblin','spider','goblin'],[0,0,0]),group(59,['spider','goblin','spider'],[1,1,1]),group(77,['goblin','spider','shaman'],[0,0,0]),group(95,['spider','goblin','shaman'],[1,1,1])],
 [5,22,39,56,73,90,107].map((time,i)=>group(time,['spider','bat','bat'],i%2?[1,1,0]:[0,0,1])),
 [5,21,37,53,69,85,101,117].map((time,i)=>group(time,['spear','gnoll','goblin'],i%2?[1,0,1]:[0,1,0])),
 [5,20,35,50,65,80,95,110,125].map((time,i)=>group(time,['skull','skull','shaman','gnoll'],i%2?[1,0,1,0]:[0,1,0,1])),
 [5,19,33,47,61,75,89,103,117,131].map((time,i)=>group(time,i<3?['goblin','skull','spider','shaman']:['spear','skull','gnoll','shaman'],i%2?[1,0,1,0]:[0,1,0,1]))
];
const phase=(radius=95,damage=80,summons=2,bursts=1):BossPhase=>({radius,damage,summons,bursts,cooldown:7});
type LevelDefinition=Omit<Level,'groups'|'waves'>;
const define=(value:LevelDefinition):Level=>({...value,groups:groups[value.id-1],waves:groups[value.id-1].flatMap(g=>g.enemies.map((kind,i)=>({kind,time:g.time+i*.8,lane:g.lanes[i]})))});
export const LEVELS:Level[]=[
 define({id:1,name:'边境警戒',region:'草原边境',description:'敌军交替进攻两路，使用前排保护远程部队。',boss:'troll',bossName:'巨魔',skill:'蓄力猛击',terrain:0xffffff,water:0xffffff,hpMultiplier:1.1,damageMultiplier:1.0,bossKills:7,phase:phase(110)}),
 define({id:2,name:'密林迷踪',region:'幽深密林',description:'蝙蝠成群来袭，保留火球清理密集敌军。',boss:'batBoss',bossName:'巨蝙蝠',skill:'召唤蝙蝠',terrain:0x91c995,water:0x8bccb7,hpMultiplier:1.2,damageMultiplier:1.05,bossKills:9,phase:phase(95,80,3)}),
 define({id:3,name:'荒野突袭',region:'赤金荒野',description:'长矛兵与豺狼人分路施压，留意冲锋预警。',boss:'bear',bossName:'狂暴巨熊',skill:'蓄力冲锋',terrain:0xe6c78e,water:0xc9c5a3,hpMultiplier:1.3,damageMultiplier:1.1,bossKills:11,phase:phase(95,100)}),
 define({id:4,name:'暗影侵袭',region:'暮色暗影',description:'骷髅掩护远程怪物，分散部署应对连续咒术。',boss:'hexBoss',bossName:'咒术萨满',skill:'延迟咒术',terrain:0xa8a2c1,water:0x9796c3,hpMultiplier:1.45,damageMultiplier:1.15,bossKills:13,phase:phase(60,65,2,2)}),
 define({id:5,name:'要塞决战',region:'敌军要塞',description:'两路混合敌军轮番进攻，预留能量应对连续冲撞。',boss:'minotaur',bossName:'牛头人',skill:'蓄力冲撞',terrain:0xbaaaa0,water:0xa8a7af,hpMultiplier:1.6,damageMultiplier:1.2,bossKills:15,phase:phase(95,80,2,2)})
];
export function loadProgress(storage:Pick<Storage,'getItem'>):number {try{const data=JSON.parse(storage.getItem('empire-awakens-progress-v1')||'null');return Number.isInteger(data?.unlocked)&&data.unlocked>=1&&data.unlocked<=LEVELS.length?data.unlocked:1}catch{return 1}}
export function loadCompletion(storage:Pick<Storage,'getItem'>):number {try{const data=JSON.parse(storage.getItem('empire-awakens-progress-v1')||'null');return Number.isInteger(data?.completed)&&data.completed>=0&&data.completed<=LEVELS.length?data.completed:0}catch{return 0}}
export function saveProgress(storage:Pick<Storage,'setItem'>,unlocked:number,completed=unlocked-1):void {try{storage.setItem('empire-awakens-progress-v1',JSON.stringify({unlocked:Math.max(1,Math.min(LEVELS.length,unlocked)),completed:Math.max(0,Math.min(LEVELS.length,completed))}))}catch{}}
