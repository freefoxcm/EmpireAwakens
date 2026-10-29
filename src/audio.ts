import { audioUrl,MUSIC,SOUNDS,type MusicTrack,type SoundCue } from './audio-assets.ts';
import { MusicPlayer,type MusicClock } from './music.ts';
import { ShuffleBag } from './shuffle.ts';
export type { SoundCue } from './audio-assets.ts';

type Voice={source:AudioBufferSourceNode;gain:GainNode;cue:SoundCue;priority:number};
type Environment={createContext?:()=>AudioContext;fetch?:typeof fetch;baseUrl?:string;random?:()=>number;musicClock?:MusicClock};
const clamp=(value:number)=>Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;

/** One user-unlocked context mixes authored sound samples and looping music. */
export class GameAudio {
 private context?:AudioContext;
 private sfxBus?:GainNode;private musicBus?:GainNode;private duckBus?:GainNode;
 private music?:MusicPlayer;
 private voices=new Set<Voice>();
 private buffers=new Map<string,AudioBuffer>();
 private pending=new Map<string,Promise<AudioBuffer>>();
 private failures=new Map<string,number>();
 private last=new Map<SoundCue,number>();
 private variations=new Map<SoundCue,number>();
 private epoch=0;
 private _muted=false;private _volume=.35;private _musicMuted=false;private _musicVolume=.18;
 private wanted:MusicTrack|null=null;
 private musicMode:MusicTrack|'shuffle'|null=null;
 private bag:ShuffleBag<MusicTrack>;
 private sequence:{peek:()=>MusicTrack;next:()=>MusicTrack};
 paused=true;
 private environment:Environment;
 constructor(environment:Environment={}){this.environment=environment;this.bag=new ShuffleBag(Object.keys(MUSIC) as MusicTrack[],environment.random);this.sequence={peek:()=>this.bag.peek(),next:()=>this.bag.next()}}
 get muted(){return this._muted}
 set muted(value:boolean){this._muted=value;if(value)this.stop();else this.warm();this.applyVolumes()}
 get volume(){return this._volume}
 set volume(value:number){const previous=this._volume;this._volume=clamp(value);if(this._volume===0)this.stop();else if(previous===0)this.warm();this.applyVolumes()}
 get musicMuted(){return this._musicMuted}
 set musicMuted(value:boolean){this._musicMuted=value;this.applyVolumes();this.syncMusic()}
 get musicVolume(){return this._musicVolume}
 set musicVolume(value:number){this._musicVolume=clamp(value);this.applyVolumes();this.syncMusic()}
 get failed(){return this.failures.size>0}
 get musicTitle(){return this.music?.title??(this.wanted?MUSIC[this.wanted].title:'')}
 get status(){return !this.context||this.context.state!=='running'?'点击后启用声音':this.failed?'部分音频加载失败，重新开启声音可重试':this.paused?'声音已暂停':this.music?.loading?'配乐加载中…':'声音已就绪'}
 unlock(){
  try{
   if(!this.context){
    const create=this.environment.createContext??(()=>{const Audio=window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;return new Audio()});
    const c=this.context=create(),limiter=c.createDynamicsCompressor();
    limiter.threshold.value=-10;limiter.knee.value=2;limiter.ratio.value=20;limiter.attack.value=.002;limiter.release.value=.12;limiter.connect(c.destination);
    this.sfxBus=c.createGain();this.musicBus=c.createGain();this.duckBus=c.createGain();
    this.sfxBus.connect(limiter);this.musicBus.connect(this.duckBus);this.duckBus.connect(limiter);
    this.music=new MusicPlayer(c,this.musicBus,track=>this.loadFile(audioUrl('music',MUSIC[track].file,this.environment.baseUrl)),this.environment.musicClock);
    c.onstatechange=()=>{if(c.state!=='running')this.stop();this.syncMusic()};
    this.music.setSequence(this.musicMode==='shuffle'?this.sequence:null);this.music.setTrack(this.wanted);this.applyVolumes();
   }
   const c=this.context;this.warm();this.syncMusic();
   void c.resume().then(()=>{this.warm();this.syncMusic();this.music?.retry()}).catch(()=>{});
  }catch{/* Audio is optional on browsers that cannot create or resume a context. */}
 }
 private applyVolumes(){
  const c=this.context;if(!c)return;
  this.sfxBus!.gain.setTargetAtTime(this._muted?0:this._volume,c.currentTime,.015);
  this.musicBus!.gain.setTargetAtTime(this._musicMuted?0:this._musicVolume,c.currentTime,.025);
 }
 private syncMusic(){this.music?.setPaused(this.paused||this._musicMuted||this._musicVolume===0||this.context?.state!=='running')}
 setMusic(mode:MusicTrack|'shuffle'|null){
  if(mode===this.musicMode){this.syncMusic();return}
  this.musicMode=mode;this.wanted=mode==='shuffle'?this.bag.next():mode;
  this.music?.setSequence(mode==='shuffle'?this.sequence:null);this.music?.setTrack(this.wanted);this.syncMusic();
 }
 setPaused(value:boolean){if(value!==this.paused){this.paused=value;if(value)this.stop();this.syncMusic()}}
 stop(){this.epoch++;for(const voice of [...this.voices])this.removeVoice(voice)}
 private async loadFile(url:string){
  const c=this.context!;
  if((this.failures.get(url)??-1)>c.currentTime)throw Error('Audio retry is cooling down');
  try{
   const response=await (this.environment.fetch??fetch)(url);if(!response.ok)throw Error(`Audio HTTP ${response.status}`);
   const buffer=await c.decodeAudioData(await response.arrayBuffer());this.failures.delete(url);return buffer;
  }catch(error){this.failures.set(url,c.currentTime+15);throw error}
 }
 private loadSound(file:string){
  const cached=this.buffers.get(file);if(cached)return Promise.resolve(cached);
  const pending=this.pending.get(file);if(pending)return pending;
  const request=this.loadFile(audioUrl('sfx',file,this.environment.baseUrl)).then(buffer=>{this.buffers.set(file,buffer);return buffer}).finally(()=>this.pending.delete(file));
  this.pending.set(file,request);return request;
 }
 private warm(){
  if(!this.context||this._muted||this._volume===0)return;
  for(const file of new Set(Object.values(SOUNDS).flatMap(cue=>cue.files)))void this.loadSound(file).catch(()=>{});
 }
 play(cue:SoundCue){
  const c=this.context,spec=SOUNDS[cue];if(!c||!spec||c.state!=='running'||this.paused||this._muted||this._volume===0)return;
  const index=this.variations.get(cue)??0,file=spec.files[index%spec.files.length],buffer=this.buffers.get(file);
  if(buffer){this.startVoice(cue,buffer,index);return}
  const epoch=this.epoch,at=c.currentTime;
  void this.loadSound(file).then(ready=>{if(this.epoch===epoch&&c.currentTime-at<=.25)this.startVoice(cue,ready,index)}).catch(()=>{});
 }
 private startVoice(cue:SoundCue,buffer:AudioBuffer,index:number){
  const c=this.context!,spec=SOUNDS[cue],now=c.currentTime;
  if(this.paused||this._muted||this._volume===0||c.state!=='running'||now-(this.last.get(cue)??-100)<spec.gap)return;
  if([...this.voices].filter(v=>v.cue===cue).length>=spec.limit)return;
  if(this.voices.size>=8){const lowest=[...this.voices].sort((a,b)=>a.priority-b.priority)[0];if(lowest.priority>=spec.priority)return;this.removeVoice(lowest)}
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=cue==='hit'?(index%2?1.02:.98):1;
  gain.gain.setValueAtTime(spec.gain,now);source.connect(gain);gain.connect(this.sfxBus!);
  const voice:Voice={source,gain,cue,priority:spec.priority};this.voices.add(voice);this.last.set(cue,now);this.variations.set(cue,index+1);
  source.onended=()=>this.cleanup(voice);source.start();
  if(spec.priority>=3)this.duck();
 }
 private duck(){
  const c=this.context!,gain=this.duckBus!.gain,now=c.currentTime;
  gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);gain.linearRampToValueAtTime(.4,now+.025);gain.setValueAtTime(.4,now+.55);gain.linearRampToValueAtTime(1,now+.9);
 }
 private cleanup(voice:Voice){voice.source.disconnect();voice.gain.disconnect();this.voices.delete(voice)}
 private removeVoice(voice:Voice){try{voice.source.stop()}catch{}this.cleanup(voice)}
 finish(won:boolean){for(const voice of [...this.voices])if(voice.priority<3)this.removeVoice(voice);this.setMusic(null);this.play(won?'win':'loss')}
 retry(){this.failures.clear();this.unlock()}
 dispose(){this.stop();this.music?.dispose();void this.context?.close().catch(()=>{});this.context=undefined}
}
