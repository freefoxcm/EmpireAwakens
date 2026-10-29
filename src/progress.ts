import { LEVELS } from './levels.ts';
import { availableSpells,type Difficulty,type SpellKind } from './spells.ts';
import { freshTutorial,type Preferences } from './session.ts';

export const PROFILE_KEY='empire-awakens-progress-v2';
export type LevelRecord={stars:number;bestTime:number|null;bestBaseRatio:number};
export type PlayerProfile={version:2;unlocked:number;completed:number;equippedSpell:SpellKind|null;records:Record<Difficulty,Record<number,LevelRecord>>;settings:Preferences};
export type BattleSummary={levelId:number;mode:Difficulty;won:boolean;time:number;base:number;maxBase:number;towersRemaining:number};
const integer=(value:unknown,min:number,max:number,fallback:number)=>typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max?value:fallback;
const ratio=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
export const newProfile=():PlayerProfile=>({version:2,unlocked:1,completed:0,equippedSpell:null,records:{normal:{},challenge:{}},settings:{muted:false,volume:.35,musicMuted:false,musicVolume:.18,tutorial:freshTutorial()}});
const parse=(value:string|null)=>{try{return value?JSON.parse(value):null}catch{return null}};

export function loadProfile(storage?:Pick<Storage,'getItem'>):PlayerProfile{
 const profile=newProfile();
 try{
  if(!storage)return profile;const value=parse(storage.getItem(PROFILE_KEY));
  if(value?.version===2){
   profile.unlocked=integer(value.unlocked,1,LEVELS.length,1);profile.completed=integer(value.completed,0,LEVELS.length,0);
   for(const mode of ['normal','challenge'] as const)for(const level of LEVELS){const record=value.records?.[mode]?.[level.id];if(record&&integer(record.stars,0,3,0)>0){profile.records[mode][level.id]={stars:integer(record.stars,0,3,0),bestTime:typeof record.bestTime==='number'&&Number.isFinite(record.bestTime)&&record.bestTime>0?record.bestTime:null,bestBaseRatio:ratio(record.bestBaseRatio)};if(mode==='normal')profile.completed=Math.max(profile.completed,level.id)}}
   readSettings(profile,value.settings);const available=availableSpells(profile.completed);profile.equippedSpell=value.equippedSpell===null?null:available.includes(value.equippedSpell)?value.equippedSpell:available[0]??null;
  }else{
   const legacy=parse(storage.getItem('empire-awakens-progress-v1'));
   profile.unlocked=integer(legacy?.unlocked,1,LEVELS.length,1);profile.completed=integer(legacy?.completed,0,LEVELS.length,profile.unlocked-1);
   for(let id=1;id<=profile.completed;id++)profile.records.normal[id]={stars:1,bestTime:null,bestBaseRatio:0};
   const preferences=parse(storage.getItem('empire-awakens-preferences-v1'));if(preferences)readSettings(profile,preferences);else if(profile.completed>0)profile.settings.tutorial={...freshTutorial(),selected:true,deployed:true,bossSeen:true};
   profile.equippedSpell=availableSpells(profile.completed)[0]??null;
  }
  profile.unlocked=Math.max(profile.unlocked,Math.min(LEVELS.length,profile.completed+1));
  for(let id=1;id<=profile.completed;id++)profile.records.normal[id]??={stars:1,bestTime:null,bestBaseRatio:0};
 }catch{/* Storage may be blocked; keep the valid in-memory defaults. */}
 return profile;
}
function readSettings(profile:PlayerProfile,value:unknown){
 if(!value||typeof value!=='object')return;const settings=value as Partial<Preferences>;profile.settings.muted=settings.muted===true;profile.settings.volume=ratio(settings.volume,.35);
 profile.settings.musicMuted=typeof settings.musicMuted==='boolean'?settings.musicMuted:profile.settings.muted;profile.settings.musicVolume=ratio(settings.musicVolume,.18);
 const tutorial=settings.tutorial;if(tutorial&&typeof tutorial==='object')for(const key of Object.keys(profile.settings.tutorial) as (keyof Preferences['tutorial'])[])profile.settings.tutorial[key]=tutorial[key]===true;
}
export function saveProfile(storage:Pick<Storage,'setItem'>|undefined,profile:PlayerProfile){try{if(!storage)return false;storage.setItem(PROFILE_KEY,JSON.stringify(profile));return true}catch{return false}}
export const challengeUnlocked=(profile:PlayerProfile)=>profile.completed>=LEVELS.length;
export const getRecord=(profile:PlayerProfile,mode:Difficulty,id:number)=>profile.records[mode][id]??{stars:0,bestTime:null,bestBaseRatio:0};
export function recordVictory(profile:PlayerProfile,summary:BattleSummary):{stars:number;rewards:string[];firstWin:boolean}{
 if(!summary.won||!LEVELS.some(l=>l.id===summary.levelId)||summary.mode==='normal'&&summary.levelId>profile.unlocked||summary.mode==='challenge'&&!challengeUnlocked(profile))return {stars:0,rewards:[],firstWin:false};
 const baseRatio=summary.maxBase>0?ratio(summary.base/summary.maxBase):0,stars=1+Number(baseRatio>=.8)+Number(summary.towersRemaining===2),previous=getRecord(profile,summary.mode,summary.levelId),time=Number.isFinite(summary.time)&&summary.time>0?summary.time:null;
 profile.records[summary.mode][summary.levelId]={stars:Math.max(previous.stars,stars),bestTime:time===null?previous.bestTime:previous.bestTime===null?time:Math.min(previous.bestTime,time),bestBaseRatio:Math.max(previous.bestBaseRatio,baseRatio)};
 const rewards:string[]=[];
 if(summary.mode==='normal'){
  const before=profile.completed;profile.completed=Math.max(profile.completed,summary.levelId);profile.unlocked=Math.max(profile.unlocked,Math.min(LEVELS.length,summary.levelId+1));
  if(before<1&&profile.completed>=1){rewards.push('火球法术已解锁');if(!profile.equippedSpell)profile.equippedSpell='fireball'}
  if(before<2&&profile.completed>=2)rewards.push('治疗法术已解锁');
  if(before<LEVELS.length&&challengeUnlocked(profile))rewards.push('五关挑战征途已解锁');
 }
 return {stars,rewards,firstWin:previous.stars===0};
}
