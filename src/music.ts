import { MUSIC,type MusicTrack } from './audio-assets.ts';

type Voice={track:MusicTrack;source:AudioBufferSourceNode;gain:GainNode;duration:number;at:number;offset:number};
export type MusicClock={set:(callback:()=>void,ms:number)=>number;clear:(id:number)=>void};
type Sequence={peek:()=>MusicTrack;next:()=>MusicTrack};
const defaultClock:MusicClock={set:(callback,ms)=>globalThis.setTimeout(callback,ms),clear:id=>globalThis.clearTimeout(id)};

/** Sample-accurate looping, cancellable loads and a maximum of two cached tracks. */
export class MusicPlayer {
 private cache=new Map<MusicTrack,AudioBuffer>();
 private pending=new Map<MusicTrack,Promise<AudioBuffer>>();
 private voices=new Set<Voice>();
 private current?:Voice;
 private generation=0;
 private offset=0;
 private wanted:MusicTrack|null=null;
 private paused=true;
 private disposed=false;
 private sequence:Sequence|null=null;private timer?:number;private clock:MusicClock;
 loading=false;
 private context:AudioContext;private output:AudioNode;private load:(track:MusicTrack)=>Promise<AudioBuffer>;
 constructor(context:AudioContext,output:AudioNode,load:(track:MusicTrack)=>Promise<AudioBuffer>,clock:MusicClock=defaultClock){this.context=context;this.output=output;this.load=load;this.clock=clock}
 get track(){return this.current?.track??this.wanted}
 get active(){return !!this.current}
 get cacheSize(){return this.cache.size}
 setTrack(track:MusicTrack|null){
  if(track===this.wanted||this.disposed)return;
  this.cancelTimer();
  this.wanted=track;this.offset=0;this.generation++;
  if(track===null){for(const voice of this.voices)this.retire(voice);this.current=undefined;this.loading=false}
  else if(!this.paused)void this.start();
 }
 setPaused(value:boolean){
  if(value===this.paused||this.disposed)return;this.paused=value;this.generation++;
  this.cancelTimer();
  if(value){
   const voice=this.current;if(voice&&voice.track===this.wanted)this.offset=(voice.offset+Math.max(0,this.context.currentTime-voice.at))%voice.duration;
   for(const active of [...this.voices])this.remove(active);this.current=undefined;this.loading=false;
  }else if(this.wanted)void this.start();
 }
 setSequence(sequence:Sequence|null){if(sequence===this.sequence||this.disposed)return;this.cancelTimer();this.sequence=sequence;if(this.current&&sequence&&!this.paused)this.scheduleNext(this.current)}
 retry(){if(this.paused||!this.wanted||this.loading)return;if(this.current?.track!==this.wanted)void this.start();else if(this.sequence)void this.buffer(this.sequence.peek()).catch(()=>{})}
 private cancelTimer(){if(this.timer!==undefined)this.clock.clear(this.timer);this.timer=undefined}
 private scheduleNext(voice:Voice){
  this.cancelTimer();const sequence=this.sequence;if(!sequence||this.paused||this.disposed)return;
  void this.buffer(sequence.peek()).catch(()=>{});
  const elapsed=(voice.offset+Math.max(0,this.context.currentTime-voice.at))%voice.duration;
  this.timer=this.clock.set(()=>{
   this.timer=undefined;if(this.sequence!==sequence||this.current!==voice||this.paused||this.disposed)return;
   this.setTrack(sequence.next());
  },Math.max(.01,voice.duration-elapsed-.6)*1000);
 }
 private async buffer(track:MusicTrack){
  const cached=this.cache.get(track);if(cached){this.cache.delete(track);this.cache.set(track,cached);return cached}
  const existing=this.pending.get(track);if(existing)return existing;
  while(this.cache.size>=2){const oldest=[...this.cache.keys()].find(key=>key!==this.current?.track);if(!oldest)break;this.cache.delete(oldest)}
  const request=this.load(track).then(buffer=>{
   if(!this.disposed){
    this.cache.set(track,buffer);
    while(this.cache.size>2){const oldest=[...this.cache.keys()].find(key=>key!==this.current?.track&&key!==track);if(!oldest)break;this.cache.delete(oldest)}
   }
   return buffer;
  }).finally(()=>this.pending.delete(track));
  this.pending.set(track,request);return request;
 }
 private async start(){
  const track=this.wanted;if(!track||this.paused||this.disposed)return;
  this.cancelTimer();
  const generation=++this.generation;this.loading=true;
  try{
   const buffer=await this.buffer(track);
   if(generation!==this.generation||track!==this.wanted||this.paused||this.disposed||this.context.state!=='running')return;
   for(const voice of [...this.voices])if(voice!==this.current)this.remove(voice);
   if(this.current)this.retire(this.current);
   const source=this.context.createBufferSource(),gain=this.context.createGain(),now=this.context.currentTime;
   const duration=Math.min(buffer.duration,MUSIC[track].loopEnd);
   source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=duration;source.connect(gain);gain.connect(this.output);
   gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.6);
   const voice:Voice={track,source,gain,duration,at:now,offset:this.offset%duration};this.voices.add(voice);this.current=voice;
   source.onended=()=>this.cleanup(voice);source.start(now,voice.offset);
   this.scheduleNext(voice);
  }catch{
   // Keep the current loop audible if a queued track is temporarily unavailable.
   if(this.sequence&&!this.paused&&this.current&&!this.disposed)this.timer=this.clock.set(()=>{this.timer=undefined;this.retry()},15000);
  }
  finally{if(generation===this.generation)this.loading=false}
 }
 private retire(voice:Voice){
  const now=this.context.currentTime;
  voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);voice.gain.gain.linearRampToValueAtTime(0,now+.6);
  try{voice.source.stop(now+.6)}catch{this.cleanup(voice)}
 }
 private cleanup(voice:Voice){voice.source.disconnect();voice.gain.disconnect();this.voices.delete(voice);if(this.current===voice)this.current=undefined}
 private remove(voice:Voice){try{voice.source.stop()}catch{}this.cleanup(voice)}
 dispose(){this.setPaused(true);this.disposed=true;this.generation++;this.wanted=null;this.cache.clear();this.pending.clear()}
 get title(){return this.track?MUSIC[this.track].title:''}
}
