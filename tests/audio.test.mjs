import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {GameAudio} from '../src/audio.ts';
import {MusicPlayer} from '../src/music.ts';
import {SOUNDS,MUSIC,audioUrl} from '../src/audio-assets.ts';
import {combatSound,soundtrack} from '../src/audio-events.ts';
import {Battle} from '../src/battle.ts';
import {LEVELS} from '../src/levels.ts';
import {ShuffleBag} from '../src/shuffle.ts';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve}};
class Clock{
 now=0;nextId=0;tasks=new Map();
 set=(callback,ms)=>{const id=++this.nextId;this.tasks.set(id,{at:this.now+ms,callback});return id};
 clear=id=>this.tasks.delete(id);
 advance(ms){this.now+=ms;for(const [id,task] of [...this.tasks])if(task.at<=this.now){this.tasks.delete(id);task.callback()}}
}
class Param{
 value=1;events=[];
 setValueAtTime(value,at){this.value=value;this.events.push(['set',value,at])}
 setTargetAtTime(value,at,constant){this.value=value;this.events.push(['target',value,at,constant])}
 linearRampToValueAtTime(value,at){this.value=value;this.events.push(['ramp',value,at])}
 cancelScheduledValues(at){this.events.push(['cancel',at])}
}
class Gain{gain=new Param();connect(){return this}disconnect(){}}
class Compressor extends Gain{threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param()}
class Source{
 playbackRate=new Param();loop=false;ended=false;
 constructor(context){this.context=context}
 connect(){return this}disconnect(){}
 start(at=this.context.currentTime,offset=0){this.at=at;this.offset=offset;this.context.started.push(this)}
 stop(at=this.context.currentTime){this.stopAt=at;if(at<=this.context.currentTime)this.end()}
 end(){if(this.ended)return;this.ended=true;this.onended?.()}
}
class Context{
 state='suspended';currentTime=0;destination={};started=[];gains=[];
 createGain(){const gain=new Gain();this.gains.push(gain);return gain}
 createDynamicsCompressor(){return new Compressor()}
 createBufferSource(){return new Source(this)}
 async decodeAudioData(data){return {duration:10,file:new TextDecoder().decode(data)}}
 async resume(){this.state='running';this.onstatechange?.()}
 async close(){this.state='closed'}
 advance(seconds){this.currentTime+=seconds;for(const source of this.started)if(source.stopAt<=this.currentTime||!source.loop&&source.at+source.buffer.duration/source.playbackRate.value<=this.currentTime)source.end()}
 get active(){return this.started.filter(source=>!source.ended)}
}
const response=url=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer});
function mixer(fetcher){
 const context=new Context(),requests=[];let creations=0;
 const audio=new GameAudio({baseUrl:'/EmpireAwakens/',createContext:()=>{creations++;return context},fetch:async url=>{requests.push(url);return fetcher?fetcher(url):response(url)}});
 return {audio,context,requests,creations:()=>creations};
}

test('audio remains locked until a gesture and reuses one context and asset requests',async()=>{
 const m=mixer();m.audio.setPaused(false);m.audio.setMusic('menu');m.audio.play('hit');assert.equal(m.creations(),0);assert.equal(m.requests.length,0);
 m.audio.unlock();m.audio.unlock();await tick();assert.equal(m.creations(),1);assert.equal(m.requests.length,new Set(m.requests).size);assert.equal(m.context.active.filter(s=>s.loop).length,1);assert.equal(m.context.active.find(s=>s.loop).buffer.file,'/EmpireAwakens/assets/audio/music/menu.mp3');
 m.audio.dispose();
});

test('sample attacks alternate, rapid repetitions are merged, and pause stops all effects',async()=>{
 const {audio,context}=mixer();audio.setPaused(false);audio.unlock();await tick();
 audio.play('hit');audio.play('hit');assert.equal(context.active.length,1);assert.match(context.active[0].buffer.file,/attack-1/);
 context.advance(.13);audio.play('hit');assert.equal(context.active.length,2);assert.match(context.active[1].buffer.file,/attack-2/);
 audio.setPaused(true);assert.equal(context.active.length,0);audio.play('explosion');assert.equal(context.active.length,0);audio.dispose();
});

test('effects and music have independent mute and volume controls',async()=>{
 const {audio,context}=mixer();audio.setPaused(false);audio.setMusic('menu');audio.unlock();await tick();
 audio.play('hit');audio.muted=true;assert.equal(context.active.filter(s=>!s.loop).length,0);assert.equal(context.active.filter(s=>s.loop).length,1);
 audio.musicMuted=true;assert.equal(context.active.length,0);audio.musicVolume=.42;audio.musicMuted=false;await tick();assert.equal(context.active.filter(s=>s.loop).length,1);assert.equal(context.gains[1].gain.value,.42);
 audio.volume=.62;assert.equal(context.gains[0].gain.value,0);audio.muted=false;assert.equal(context.gains[0].gain.value,.62);audio.play('arrow');assert.equal(context.active.filter(s=>!s.loop).length,1);audio.dispose();
});

test('a browser context interruption silences the graph until the next unlock gesture',async()=>{
 const {audio,context}=mixer();audio.setPaused(false);audio.setMusic('menu');audio.unlock();await tick();audio.play('hit');context.advance(1);context.state='suspended';context.onstatechange();assert.equal(context.active.length,0);assert.equal(audio.status,'点击后启用声音');
 audio.unlock();await tick();assert.equal(context.active.filter(s=>s.loop).length,1);audio.setPaused(true);context.state='suspended';context.onstatechange();audio.unlock();await tick();assert.equal(context.active.length,0);audio.dispose();
});

test('a loaded effect never leaks out after pausing or muting during its request',async()=>{
 const gate=deferred(),{audio,context}=mixer(async url=>{await gate.promise;return response(url)});audio.setPaused(false);audio.unlock();audio.play('explosion');audio.setPaused(true);gate.resolve();await tick();assert.equal(context.started.length,0);
 audio.setPaused(false);assert.equal(context.started.length,0);audio.play('explosion');assert.equal(context.started.length,1);audio.dispose();
});

test('voice limits retain explosions and make room by dropping an unimportant cue',async()=>{
 const {audio,context}=mixer();audio.setPaused(false);audio.unlock();await tick();
 for(const cue of ['hit','hit','arrow','arrow','magic','magic','heal','select']){audio.play(cue);context.advance(.2)}
 assert.equal(context.active.length,8);audio.play('explosion');assert.equal(context.active.length,8);assert.ok(context.active.some(s=>s.buffer.file.endsWith('explosion.mp3')));assert.ok(!context.active.some(s=>s.buffer.file.endsWith('select.mp3')));audio.dispose();
});

test('failed audio stays optional, limits retries, and can be explicitly retried',async()=>{
 let working=false;const m=mixer(url=>working?response(url):{ok:false,status:404});m.audio.setPaused(false);m.audio.unlock();await tick();assert.equal(m.audio.failed,true);const count=m.requests.length;
 m.audio.unlock();m.audio.play('explosion');await tick();assert.equal(m.requests.length,count);working=true;m.audio.retry();await tick();assert.equal(m.audio.failed,false);m.audio.play('explosion');assert.equal(m.context.active.length,1);m.audio.dispose();
});

test('a late menu response cannot replace the requested battle music',async()=>{
 const c=new Context();c.state='running';const menu=deferred(),battle=deferred();const music=new MusicPlayer(c,c.destination,track=>track==='menu'?menu.promise:battle.promise);
 music.setTrack('menu');music.setPaused(false);music.setTrack('battle');menu.resolve({duration:20});await tick();assert.equal(c.started.length,0);battle.resolve({duration:30});await tick();assert.equal(music.track,'battle');assert.equal(c.started.length,1);assert.equal(c.started[0].loop,true);music.dispose();
});

test('pausing freezes music offset and resume creates one loop from that offset',async()=>{
 const c=new Context();c.state='running';const music=new MusicPlayer(c,c.destination,async()=>({duration:20}));music.setTrack('menu');music.setPaused(false);await tick();c.advance(3);music.setPaused(true);assert.equal(c.active.length,0);c.advance(9);music.setPaused(false);await tick();assert.equal(c.active.length,1);assert.equal(c.active[0].offset,3);
 music.setTrack('battle');await tick();assert.equal(c.active.length,2);c.advance(.7);assert.equal(c.active.length,1);assert.equal(c.active[0].offset,0);music.dispose();
});

test('music cache and crossfading voices stay bounded throughout repeated transitions',async()=>{
 const c=new Context();c.state='running';const music=new MusicPlayer(c,c.destination,async track=>({duration:30,track}));music.setPaused(false);
 for(const track of ['menu','battle','boss','menu','boss','battle','menu']){music.setTrack(track);await tick();assert.ok(music.cacheSize<=2);assert.ok(c.active.length<=2)}
 const count=c.started.length;music.setTrack('menu');await tick();assert.equal(c.started.length,count);music.setTrack(null);c.advance(.7);assert.equal(c.active.length,0);music.dispose();
});

test('the original loop endpoint excludes codec padding and pause offsets wrap to that endpoint',async()=>{
 const c=new Context();c.state='running';const music=new MusicPlayer(c,c.destination,async()=>({duration:125}));music.setTrack('boss');music.setPaused(false);await tick();
 assert.equal(c.active[0].loopEnd,5443201/44100);c.advance(MUSIC.boss.loopEnd+2);music.setPaused(true);music.setPaused(false);await tick();assert.ok(Math.abs(c.active[0].offset-2)<1e-8);music.dispose();
});

test('music disposed during loading neither starts nor repopulates its cache',async()=>{
 const c=new Context();c.state='running';const request=deferred(),music=new MusicPlayer(c,c.destination,()=>request.promise);music.setTrack('menu');music.setPaused(false);music.dispose();request.resolve({duration:20});await tick();assert.equal(c.started.length,0);assert.equal(music.cacheSize,0);
});

test('the accepted sample manifest ships locally and works at a Pages project path',()=>{
 for(const spec of Object.values(SOUNDS))for(const file of spec.files)assert.ok(statSync(new URL(`../public/assets/audio/sfx/${file}.mp3`,import.meta.url)).size>1000);
 for(const spec of Object.values(MUSIC))assert.ok(statSync(new URL(`../public/assets/audio/music/${spec.file}.mp3`,import.meta.url)).size>100000);
 assert.equal(audioUrl('music','boss','/EmpireAwakens/'),'/EmpireAwakens/assets/audio/music/boss.mp3');
});

test('scenes use automatic shuffle without manual selection or forced track changes',()=>{
 assert.equal(soundtrack('title','paused'),'shuffle');assert.equal(soundtrack('map','won'),'shuffle');assert.equal(soundtrack('battle','playing'),'shuffle');assert.equal(soundtrack('battle','paused'),'shuffle');assert.equal(soundtrack('battle','won'),null);assert.equal(soundtrack('battle','lost'),null);
});

test('shuffle visits every track before repeating and never repeats across round boundaries',()=>{
 const tracks=Object.keys(MUSIC),bag=new ShuffleBag(tracks,()=>0),output=[];
 assert.equal(bag.peek(),bag.peek());assert.equal(bag.next(),tracks[1]);
 for(let i=0;i<100;i++)output.push(bag.next());
 for(let i=1;i<output.length;i++)assert.notEqual(output[i],output[i-1]);
 let turns=0;const boundary=new ShuffleBag(['a','b'],()=>turns++===0?.999:0);assert.deepEqual(Array.from({length:4},()=>boundary.next()),['a','b','a','b']);
 const rounds=new ShuffleBag(tracks,()=>.999);
 for(let round=0;round<10;round++)assert.equal(new Set(Array.from({length:tracks.length},()=>rounds.next())).size,tracks.length);
});

test('automatic playback prefetches and crossfades to the next random track by itself',async()=>{
 const c=new Context();c.state='running';const clock=new Clock(),bag=new ShuffleBag(['menu','battle','boss'],()=>.999),loaded=[];
 const music=new MusicPlayer(c,c.destination,async track=>{loaded.push(track);return {duration:10,track}},clock);
 music.setSequence(bag);music.setTrack(bag.next());music.setPaused(false);await tick();assert.equal(music.track,'menu');assert.deepEqual(loaded,['menu','battle']);assert.equal(clock.tasks.size,1);
 c.advance(9.4);clock.advance(9400);await tick();assert.equal(music.track,'battle');assert.ok(loaded.includes('boss'));assert.ok(music.cacheSize<=2);assert.equal(c.active.length,2);c.advance(.7);assert.equal(c.active.length,1);music.dispose();assert.equal(clock.tasks.size,0);
});

test('pausing a shuffled playlist freezes its song and cancels scheduled advancement',async()=>{
 const c=new Context();c.state='running';const clock=new Clock(),bag=new ShuffleBag(['menu','battle'],()=>.999),music=new MusicPlayer(c,c.destination,async()=>({duration:10}),clock);
 music.setSequence(bag);music.setTrack(bag.next());music.setPaused(false);await tick();c.advance(3);clock.advance(3000);music.setPaused(true);assert.equal(clock.tasks.size,0);clock.advance(50000);c.advance(50);assert.equal(music.track,'menu');
 music.setPaused(false);await tick();assert.equal(c.active[0].offset,3);c.advance(6.4);clock.advance(6400);await tick();assert.equal(music.track,'battle');music.dispose();
});

test('a failed queued song keeps the current loop and retries without advancing the bag again',async()=>{
 const c=new Context();c.state='running';const clock=new Clock(),bag=new ShuffleBag(['menu','battle','boss'],()=>.999);let works=false;
 const music=new MusicPlayer(c,c.destination,async track=>{if(track==='battle'&&!works)throw Error('offline');return {duration:10}},clock);
 music.setSequence(bag);music.setTrack(bag.next());music.setPaused(false);await tick();c.advance(9.4);clock.advance(9400);await tick();assert.equal(music.track,'menu');assert.equal(c.active.length,1);
 music.retry();await tick();assert.equal(clock.tasks.size,1);
 works=true;c.advance(15);clock.advance(15000);await tick();assert.equal(music.track,'battle');assert.equal(bag.peek(),'boss');music.dispose();
});

test('repeated shuffle scene updates do not restart a song or consume the next choice',async()=>{
 const clock=new Clock(),context=new Context();const audio=new GameAudio({createContext:()=>context,fetch:async url=>response(url),baseUrl:'/',random:()=>.999,musicClock:clock});
 audio.setMusic('shuffle');audio.setPaused(false);audio.unlock();await tick();const first=context.active.find(s=>s.loop);for(let i=0;i<10;i++)audio.setMusic('shuffle');await tick();assert.equal(context.active.find(s=>s.loop),first);assert.equal(clock.tasks.size,1);
 audio.setMusic(null);assert.equal(clock.tasks.size,0);audio.setMusic('shuffle');await tick();assert.ok(context.active.some(s=>s.loop&&s.buffer.file.endsWith('/battle.mp3')));audio.dispose();assert.equal(clock.tasks.size,0);
});

test('combat cues distinguish bows, monster projectiles, impacts and meaningful damage',()=>{
 const towers=[{id:'ally',team:'ally'},{id:'enemy',team:'enemy'}],base={type:'hit',x:0,y:0,amount:20};
 assert.equal(combatSound({...base,source:'warrior'},towers),'hit');assert.equal(combatSound({...base,source:'archer',ranged:true},towers),'arrow');assert.equal(combatSound({...base,source:'shaman',ranged:true},towers),'magic');
 assert.equal(combatSound({...base,towerId:'ally',ranged:true},towers),'arrow');assert.equal(combatSound({...base,towerId:'enemy',ranged:true},towers),'magic');assert.equal(combatSound({...base,amount:0},towers),null);assert.equal(combatSound(base,towers),null);
 assert.equal(combatSound({type:'towerDown',x:0,y:0},towers),'collapse');assert.equal(combatSound({type:'boss',x:0,y:0},towers),'explosion');
});

test('fireball and group healing generate one sound per cast or impact, not per recipient',()=>{
 const fire=new Battle(LEVELS[0],{spell:'fireball'});fire.energy=10;fire.spawn('goblin','enemy',240,250);fire.spawn('spider','enemy',250,250);fire.castSpell(245,250);fire.update(.4);
 const sounds=fire.events.map(e=>combatSound(e,fire.towers)).filter(Boolean);assert.deepEqual(sounds,['fireCast','explosion']);assert.ok(fire.events.filter(e=>e.type==='hit').every(e=>e.spell==='fireball'));
 const heal=new Battle(LEVELS[0],{spell:'healing'});heal.energy=10;heal.spawn('warrior','ally',240,500).hp=50;heal.spawn('archer','ally',220,510).hp=20;heal.castSpell(240,510);assert.deepEqual(heal.events.map(e=>combatSound(e,heal.towers)).filter(Boolean),['healSpell']);
});
