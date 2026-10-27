import type { Kind } from './battle.ts';
export type Spawn = {time:number;kind:Kind;lane:0|1};
export type Level = {id:number;name:string;region:string;description:string;boss:Kind;bossName:string;skill:string;terrain:number;water:number;waves:Spawn[];hpMultiplier:number;damageMultiplier:number;bossKills:number};
const timings=[5,12,19,22,30,33,40,43,54,58,63,68,95,103,111,119,127,135,143,151,159,167,175];
const lanes:(0|1)[]=[0,1,0,0,1,1,0,1,0,0,1,1,1,1,0,1,0,1,0,1,0,1,0];
const waves=(enemies:Kind[],count:number,pace:number):Spawn[]=>timings.slice(0,count).map((time,i)=>({time:time*pace,lane:lanes[i],kind:enemies[i%enemies.length]}));
export const LEVELS:Level[]=[
 {id:1,name:'边境警戒',region:'草原边境',description:'抵御哥布林与蜘蛛，击败巨魔。',boss:'troll',bossName:'巨魔',skill:'蓄力猛击',terrain:0xffffff,water:0xffffff,hpMultiplier:1.1,damageMultiplier:1.0,bossKills:7,waves:waves(['goblin','goblin','spider','spider','shaman'],15,0.95)},
 {id:2,name:'密林迷踪',region:'幽深密林',description:'蝙蝠从密林中袭来，击败巨蝙蝠。',boss:'batBoss',bossName:'巨蝙蝠',skill:'召唤蝙蝠',terrain:0x91c995,water:0x8bccb7,hpMultiplier:1.2,damageMultiplier:1.05,bossKills:8,waves:waves(['spider','bat','spider','bat','goblin'],17,0.9)},
 {id:3,name:'荒野突袭',region:'赤金荒野',description:'抵挡长矛兵与豺狼人，击败狂暴巨熊。',boss:'bear',bossName:'狂暴巨熊',skill:'蓄力冲锋',terrain:0xe6c78e,water:0xc9c5a3,hpMultiplier:1.3,damageMultiplier:1.1,bossKills:9,waves:waves(['spear','gnoll','goblin','spear','gnoll'],19,0.85)},
 {id:4,name:'暗影侵袭',region:'暮色暗影',description:'击退骷髅与萨满，击败咒术首领。',boss:'hexBoss',bossName:'咒术萨满',skill:'延迟咒术',terrain:0xa8a2c1,water:0x9796c3,hpMultiplier:1.45,damageMultiplier:1.15,bossKills:10,waves:waves(['shaman','gnoll','skull','spear','shaman'],21,0.8)},
 {id:5,name:'要塞决战',region:'敌军要塞',description:'击退各路怪物，击败牛头人并攻破要塞。',boss:'minotaur',bossName:'牛头人',skill:'蓄力冲撞',terrain:0xbaaaa0,water:0xa8a7af,hpMultiplier:1.6,damageMultiplier:1.2,bossKills:11,waves:waves(['spear','skull','gnoll','shaman','spider'],23,0.75)}
];
export function loadProgress(storage:Pick<Storage,'getItem'>):number {try{const data=JSON.parse(storage.getItem('empire-awakens-progress-v1')||'null');return Number.isInteger(data?.unlocked)&&data.unlocked>=1&&data.unlocked<=LEVELS.length?data.unlocked:1}catch{return 1}}
export function loadCompletion(storage:Pick<Storage,'getItem'>):number {try{const data=JSON.parse(storage.getItem('empire-awakens-progress-v1')||'null');return Number.isInteger(data?.completed)&&data.completed>=0&&data.completed<=LEVELS.length?data.completed:0}catch{return 0}}
export function saveProgress(storage:Pick<Storage,'setItem'>,unlocked:number,completed=unlocked-1):void {try{storage.setItem('empire-awakens-progress-v1',JSON.stringify({unlocked:Math.max(1,Math.min(LEVELS.length,unlocked)),completed:Math.max(0,Math.min(LEVELS.length,completed))}))}catch{}}
