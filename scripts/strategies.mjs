import {Battle,specs} from '../src/battle.ts';
import {SPELLS} from '../src/spells.ts';

export const policies=[
 {name:'混合火力＋火球',spell:'fireball',heavy:true},
 {name:'低费分路＋火球',spell:'fireball',heavy:false},
 {name:'稳健防线＋治疗',spell:'healing',heavy:true},
 {name:'固定前排治疗',spell:null,legacy:true},
 {name:'不部署',spell:null,idle:true},
 {name:'蓄能反击＋治疗',spell:'healing',heavy:true,start:8,order:['lancer','archer','monk','lancer','archer']}
];
export function simulate(level,policy,mode='normal',limit=260){
 const spell=mode==='challenge'?policy.spell:level.id===1?null:level.id===2&&policy.spell==='healing'?'fireball':policy.spell;
 const b=new Battle(level,{mode,spell});let next=policy.start??0,deployed=0,bossTime=null;
 while(b.status==='playing'&&b.time<limit){
  if(!policy.idle&&b.time>=next){
   next=b.time+(policy.legacy?3:.4);
   const allies=b.units.filter(u=>u.team==='ally'),enemies=b.units.filter(u=>u.team==='enemy');
   if(policy.legacy){b.selected=deployed%2?'monk':'lancer';const before=b.id;b.deploy(deployed%2?135:345,480);if(b.id>before)deployed++}
   else{
    let saving=false;
    if(b.spell&&b.spellCooldown<=0){
     if(b.spell==='fireball'){
      const candidates=enemies.map(u=>({u,total:enemies.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<=65).reduce((sum,v)=>sum+Math.min(140,v.hp),0)})).sort((a,c)=>c.total-a.total);
      const best=candidates[0];if(best&&(best.total>=220||best.u.hp<=140&&best.u.kind===level.boss)){saving=b.energy<4&&allies.length>=2;if(b.energy>=4)b.castSpell(best.u.x,best.u.y)}
     }else{
      const best=allies.map(u=>({u,total:allies.filter(v=>Math.hypot(v.x-u.x,v.y-u.y)<=80).reduce((sum,v)=>sum+Math.min(70,v.maxHp-v.hp),0)})).sort((a,c)=>c.total-a.total)[0];
      if(best&&best.total>=105){saving=b.energy<3&&allies.length>=2;if(b.energy>=3)b.castSpell(best.u.x,best.u.y)}
     }
    }
    const count=kind=>allies.filter(u=>u.kind===kind).length,front=count('warrior')+count('lancer');
    let kind=front<2?(policy.heavy?'lancer':'warrior'):count('archer')<1?'archer':count('monk')<1?'monk':policy.heavy&&count('lancer')<2?'lancer':count('archer')<3?'archer':count('monk')<2?'monk':front<4?(policy.heavy?'lancer':'warrior'):'archer';
    if(policy.order)kind=policy.order[deployed%policy.order.length];
    if(b.energy<specs[kind].cost&&b.energy>=2&&front<1)kind='warrior';
    b.selected=kind;
    const danger=lane=>enemies.filter(u=>u.y>300&&(u.x<240?0:1)===lane).length-allies.filter(u=>(u.x<240?0:1)===lane).length*.45;
    const lane=policy.lane??(danger(0)>danger(1)?0:danger(1)>danger(0)?1:deployed%2);
    const center=lane?345:135;
    const rows=kind==='archer'||kind==='monk'?[510,550,470]:[440,480,520];
    const positions=rows.flatMap(y=>[center,center-38,center+38,240].map(x=>({x,y})));
    const position=positions.find(p=>b.placementProblem(p.x,p.y)===null);
    if(position&&!saving){b.deploy(position.x,position.y);deployed++}
   }
  }
  b.update(.05);if(bossTime===null&&b.bossSpawned)bossTime=Math.round(b.time);b.events.length=0;
 }
 const towers=b.towers.filter(t=>t.team==='ally'&&t.hp>0).length,stars=b.status==='won'?1+Number(b.base>=b.maxBase*.8)+Number(towers===2):0;
 return {battle:b,bossTime,stars,towers,deployed};
}
