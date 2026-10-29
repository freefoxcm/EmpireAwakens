import type { CombatEvent,Tower } from './battle.ts';
import type { SoundCue } from './audio-assets.ts';

export function soundtrack(screen:'title'|'map'|'battle',status:string):'shuffle'|null{
 if(screen!=='battle')return 'shuffle';
 if(status==='won'||status==='lost')return null;
 return 'shuffle';
}

/** A spell has one cast/impact sound; individual AOE recipients stay quiet. */
export function combatSound(event:CombatEvent,towers:Pick<Tower,'id'|'team'>[]):SoundCue|null{
 switch(event.type){
  case 'spell':return event.spell==='fireball'?'fireCast':null;
  case 'spellImpact':return event.spell==='healing'?'healSpell':'explosion';
  case 'heal':return event.amount&&!event.spell?'heal':null;
  case 'warning':case 'phase':return 'warning';
  case 'boss':return 'explosion';
  case 'towerDown':case 'result':return 'collapse';
  case 'shield':return 'magic';
  case 'hit':{
   if(!event.amount||event.spell)return null;
   if(event.ranged)return event.source==='archer'||towers.find(t=>t.id===event.towerId)?.team==='ally'?'arrow':'magic';
   return event.source||event.fromX!==undefined?'hit':null;
  }
  default:return null;
 }
}
