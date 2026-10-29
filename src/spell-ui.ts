import { SPELLS,type SpellKind } from './spells.ts';

/** Frame, illustration, caption and cost each get their own space. */
export function spellArtwork(kind:SpellKind,cooldown=0){
 const spec=SPELLS[kind];
 return `<span class="spell-face" aria-hidden="true"><span class="spell-illustration ${kind}"></span><span class="spell-cooldown${cooldown>0?'':' hidden'}">${Math.ceil(cooldown)}</span><span class="spell-cost">✦${spec.cost}</span></span><span class="spell-caption">${spec.name}</span>`;
}
