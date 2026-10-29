export type SoundCue='hit'|'arrow'|'magic'|'fireCast'|'explosion'|'collapse'|'heal'|'healSpell'|'warning'|'win'|'loss'|'select';
export type MusicTrack='menu'|'battle'|'boss'|'forest'|'preparation';
export type SoundSpec={files:string[];gain:number;gap:number;limit:number;priority:number};

export const SOUNDS:Record<SoundCue,SoundSpec>={
 hit:{files:['attack-1','attack-2'],gain:.85,gap:.12,limit:2,priority:1},
 arrow:{files:['arrow'],gain:.8,gap:.12,limit:2,priority:1},
 magic:{files:['magic'],gain:.8,gap:.16,limit:2,priority:1},
 fireCast:{files:['fire-cast'],gain:.9,gap:.18,limit:1,priority:3},
 explosion:{files:['explosion'],gain:1,gap:.18,limit:2,priority:4},
 collapse:{files:['collapse'],gain:1,gap:.18,limit:2,priority:4},
 heal:{files:['heal'],gain:.7,gap:.4,limit:1,priority:1},
 healSpell:{files:['heal-spell'],gain:.9,gap:.4,limit:1,priority:3},
 warning:{files:['warning'],gain:.8,gap:.8,limit:1,priority:4},
 win:{files:['win'],gain:.9,gap:1,limit:1,priority:5},
 loss:{files:['loss'],gain:.9,gap:1,limit:1,priority:5},
 select:{files:['select'],gain:.6,gap:.09,limit:1,priority:0},
};
export const MUSIC:Record<MusicTrack,{file:string;title:string;loopEnd:number}>={
 menu:{file:'menu',title:'JRPG Theme',loopEnd:4387319/44100},
 battle:{file:'battle',title:'Army Approaching',loopEnd:5478777/44100},
 boss:{file:'boss',title:'Epic Boss Battle',loopEnd:5443201/44100},
 forest:{file:'forest',title:'Encounter With The Witches',loopEnd:5007484/44100},
 preparation:{file:'preparation',title:'Preparing For Battle',loopEnd:2419201/44100},
};
export const audioUrl=(channel:'music'|'sfx',file:string,base=import.meta.env?.BASE_URL??'./')=>`${base}assets/audio/${channel}/${file}.mp3`;
