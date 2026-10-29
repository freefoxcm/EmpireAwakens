import type { Battle } from './battle.ts';

export type PauseReason='screen'|'user'|'dialog'|'background'|'tutorial';
export class PauseGate {
 readonly reasons=new Set<PauseReason>();
 set(reason:PauseReason,active:boolean){if(active)this.reasons.add(reason);else this.reasons.delete(reason)}
 sync(battle:Battle){if(battle.status==='won'||battle.status==='lost')return;battle.status=this.reasons.size?'paused':'playing'}
 reset(){this.reasons.clear()}
 get tutorialInputOnly(){return this.reasons.size===1&&this.reasons.has('tutorial')}
}

export type TutorialState={selected:boolean;deployed:boolean;bossSeen:boolean;skipped:boolean;spellHint:boolean};
export const freshTutorial=():TutorialState=>({selected:false,deployed:false,bossSeen:false,skipped:false,spellHint:false});
export class Tutorial {
 state:TutorialState;
 constructor(state:TutorialState){this.state=state}
 begin(level:number){return level===1&&!this.state.skipped&&!this.state.deployed}
 selectWarrior(){this.state.selected=true}
 deployed(){this.state.selected=true;this.state.deployed=true}
 skip(){this.state.skipped=true}
 get introText(){return this.state.selected?'点击下方金色虚线中的空地，部署战士。':'先点击「战士」卡牌，再在战场部署。'}
}

export type Preferences={muted:boolean;volume:number;musicMuted:boolean;musicVolume:number;tutorial:TutorialState};
