export type SoundCue='shot'|'hit'|'heal'|'warning'|'collapse'|'win'|'loss'|'select';
const notes:Record<SoundCue,number[]>={shot:[850,400],hit:[180,80],heal:[450,650,850],warning:[320,180,320],collapse:[100,65,40],win:[392,494,587,784],loss:[350,280,175],select:[650]};
export class GameAudio {
 private context?:AudioContext;
 private voices=new Set<OscillatorNode>();
 private last=new Map<SoundCue,number>();
 muted=false;volume=.35;paused=true;
 unlock(){
  try{const Audio=window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!this.context)this.context=new Audio();void this.context.resume().catch(()=>{})}catch{/* Sound is optional when the browser blocks it. */}
 }
 setPaused(value:boolean){this.paused=value;if(value)this.stop()}
 stop(){for(const voice of this.voices){try{voice.stop()}catch{}}this.voices.clear()}
 play(cue:SoundCue){
  const c=this.context;if(!c||c.state!=='running'||this.muted||this.paused||this.volume<=0||this.voices.size>=6)return;
  const now=c.currentTime;if(now-(this.last.get(cue)??-10)<(cue==='hit'?.09:.06))return;this.last.set(cue,now);
  const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type=cue==='heal'||cue==='win'?'sine':'triangle';
  const sequence=notes[cue],length=sequence.length*.075;
  sequence.forEach((frequency,i)=>oscillator.frequency.setValueAtTime(frequency,now+i*.075));
  gain.gain.setValueAtTime(Math.max(.001,this.volume*.12),now);gain.gain.exponentialRampToValueAtTime(.001,now+length);
  oscillator.connect(gain);gain.connect(c.destination);this.voices.add(oscillator);
  oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect()};oscillator.start(now);oscillator.stop(now+length);
 }
}
