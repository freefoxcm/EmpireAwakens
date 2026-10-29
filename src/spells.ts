export type SpellKind='fireball'|'healing';
export type Difficulty='normal'|'challenge';
export const SPELLS={
 fireball:{name:'火球',cost:4,cooldown:12,radius:65,delay:.35,unlock:1,description:'范围内敌军受到 140 伤害，敌方建筑受到 49 伤害。'},
 healing:{name:'治疗',cost:3,cooldown:16,radius:80,delay:0,unlock:2,description:'范围内友军恢复 70 生命，不治疗建筑。'}
} as const;
export const availableSpells=(completed:number)=>(Object.keys(SPELLS) as SpellKind[]).filter(kind=>completed>=SPELLS[kind].unlock);
