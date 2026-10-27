import type { Kind } from './battle.ts';
export type Spawn = {time:number;kind:Kind;lane:0|1};
export type Level = {id:number;name:string;region:string;description:string;boss:Kind;bossName:string;skill:string;terrain:number;water:number;waves:Spawn[]};
const timings=[5,12,19,22,30,33,40,43,54,58,63,68,88,95,103,111];
const lanes:(0|1)[]=[0,1,0,0,1,1,0,1,0,0,1,1,0,1,1,0];
const waves=(enemies:Kind[],boss:Kind):Spawn[]=>timings.map((time,i)=>({time,lane:lanes[i],kind:i===12?boss:enemies[(i<12?i:i-1)%enemies.length]}));
export const LEVELS:Level[]=[
 {id:1,name:'边境警戒',region:'草原边境',description:'抵御哥布林与蜘蛛，击败巨魔。',boss:'troll',bossName:'巨魔',skill:'蓄力猛击',terrain:0xffffff,water:0xffffff,waves:waves(['goblin','goblin','spider','spider','shaman'], 'troll')},
 {id:2,name:'密林迷踪',region:'幽深密林',description:'蝙蝠从密林中袭来，击败巨蝙蝠。',boss:'batBoss',bossName:'巨蝙蝠',skill:'召唤蝙蝠',terrain:0x91c995,water:0x8bccb7,waves:waves(['spider','bat','spider','bat','goblin'], 'batBoss')},
 {id:3,name:'荒野突袭',region:'赤金荒野',description:'抵挡长矛兵与豺狼人，击败狂暴巨熊。',boss:'bear',bossName:'狂暴巨熊',skill:'蓄力冲锋',terrain:0xe6c78e,water:0xc9c5a3,waves:waves(['spear','gnoll','goblin','spear','gnoll'], 'bear')},
 {id:4,name:'暗影侵袭',region:'暮色暗影',description:'击退骷髅与萨满，击败咒术首领。',boss:'hexBoss',bossName:'咒术萨满',skill:'延迟咒术',terrain:0xa8a2c1,water:0x9796c3,waves:waves(['skull','shaman','bat','skull','gnoll'], 'hexBoss')},
 {id:5,name:'要塞决战',region:'敌军要塞',description:'击退各路怪物，击败牛头人并攻破要塞。',boss:'minotaur',bossName:'牛头人',skill:'蓄力冲撞',terrain:0xbaaaa0,water:0xa8a7af,waves:waves(['spear','skull','gnoll','shaman','spider'], 'minotaur')}
];
export function loadProgress(storage:Pick<Storage,'getItem'>):number {try{const data=JSON.parse(storage.getItem('empire-awakens-progress-v1')||'null');return Number.isInteger(data?.unlocked)&&data.unlocked>=1&&data.unlocked<=LEVELS.length?data.unlocked:1}catch{return 1}}
export function loadCompletion(storage:Pick<Storage,'getItem'>):number {try{const data=JSON.parse(storage.getItem('empire-awakens-progress-v1')||'null');return Number.isInteger(data?.completed)&&data.completed>=0&&data.completed<=LEVELS.length?data.completed:0}catch{return 0}}
export function saveProgress(storage:Pick<Storage,'setItem'>,unlocked:number,completed=unlocked-1):void {try{storage.setItem('empire-awakens-progress-v1',JSON.stringify({unlocked:Math.max(1,Math.min(LEVELS.length,unlocked)),completed:Math.max(0,Math.min(LEVELS.length,completed))}))}catch{}}
