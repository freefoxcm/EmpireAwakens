import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILE_KEY,newProfile,loadProfile,saveProfile,recordVictory,getRecord,challengeUnlocked} from '../src/progress.ts';
const memory=initial=>{const values=new Map(Object.entries(initial??{}));return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};
const summary=(extra={})=>({levelId:1,mode:'normal',won:true,time:100,base:600,maxBase:600,towersRemaining:2,...extra});

test('legacy progress migrates without erasing old storage or inventing clear times',()=>{
 const storage=memory({'empire-awakens-progress-v1':JSON.stringify({unlocked:4,completed:3})}),p=loadProfile(storage);assert.equal(p.version,2);assert.equal(p.unlocked,4);assert.equal(p.completed,3);assert.equal(p.equippedSpell,'fireball');assert.equal(p.settings.tutorial.deployed,true);
 for(const id of [1,2,3]){assert.equal(getRecord(p,'normal',id).stars,1);assert.equal(getRecord(p,'normal',id).bestTime,null)}assert.equal(getRecord(p,'challenge',1).stars,0);assert.equal(challengeUnlocked(p),false);assert.equal(saveProfile(storage,p),true);assert.ok(storage.values.has('empire-awakens-progress-v1'));assert.deepEqual(loadProfile(storage),p);
});
test('old unlocked-only saves and completed-five saves retain their valid progress',()=>{
 assert.equal(loadProfile(memory({'empire-awakens-progress-v1':'{"unlocked":3}'})).completed,2);const p=loadProfile(memory({'empire-awakens-progress-v1':'{"unlocked":5,"completed":5}'}));assert.equal(challengeUnlocked(p),true);assert.equal(getRecord(p,'normal',5).stars,1);
});
test('corrupt, missing and blocked storage keep the game playable',()=>{
 for(const storage of [undefined,memory(),memory({[PROFILE_KEY]:'{'}),{getItem(){throw Error('blocked')}}])assert.deepEqual(loadProfile(storage),newProfile());assert.equal(saveProfile({setItem(){throw Error('blocked')}},newProfile()),false);assert.equal(saveProfile(undefined,newProfile()),false);
});
test('profile validates external values and only permits unlocked spells',()=>{
 const p=loadProfile(memory({[PROFILE_KEY]:JSON.stringify({version:2,unlocked:99,completed:1,equippedSpell:'healing',records:{normal:{1:{stars:1,bestTime:-10,bestBaseRatio:9}}},settings:{muted:'yes',volume:'100',tutorial:{skipped:'true'}}})}));assert.equal(p.unlocked,2);assert.equal(p.equippedSpell,'fireball');assert.equal(p.settings.muted,false);assert.equal(p.settings.volume,.35);assert.equal(p.settings.tutorial.skipped,false);assert.equal(getRecord(p,'normal',1).bestTime,null);assert.equal(getRecord(p,'normal',1).bestBaseRatio,1);
});
test('star conditions are evaluated per encounter, never unioned across attempts',()=>{
 const p=newProfile();const first=recordVictory(p,summary({base:500,towersRemaining:1}));assert.equal(first.stars,2);const second=recordVictory(p,summary({base:300,time:90}));assert.equal(second.stars,2);assert.equal(getRecord(p,'normal',1).stars,2);assert.equal(getRecord(p,'normal',1).bestTime,90);assert.equal(getRecord(p,'normal',1).bestBaseRatio,500/600);recordVictory(p,summary({time:120}));assert.equal(getRecord(p,'normal',1).stars,3);assert.equal(getRecord(p,'normal',1).bestTime,90);
});
test('normal victory unlocks next level and grants each ability once without requiring stars',()=>{
 const p=newProfile();const first=recordVictory(p,summary({base:50,towersRemaining:0}));assert.equal(first.stars,1);assert.equal(p.unlocked,2);assert.equal(p.equippedSpell,'fireball');assert.deepEqual(first.rewards,['火球法术已解锁']);assert.deepEqual(recordVictory(p,summary()).rewards,[]);p.equippedSpell=null;const second=recordVictory(p,summary({levelId:2}));assert.deepEqual(second.rewards,['治疗法术已解锁']);assert.equal(p.equippedSpell,null);
});
test('challenge requires five clears and its records do not overwrite normal results',()=>{
 const p=newProfile();assert.equal(recordVictory(p,summary({mode:'challenge'})).stars,0);for(let id=1;id<=5;id++){const result=recordVictory(p,summary({levelId:id}));if(id===5)assert.deepEqual(result.rewards,['五关挑战征途已解锁'])}assert.equal(challengeUnlocked(p),true);recordVictory(p,summary({mode:'challenge',time:200,base:100,towersRemaining:0}));assert.equal(getRecord(p,'challenge',1).stars,1);assert.equal(getRecord(p,'normal',1).stars,3);assert.equal(getRecord(p,'normal',1).bestTime,100);
});
test('defeat and invalid levels never replace progress or scores',()=>{
 const p=newProfile();recordVictory(p,summary());const before=JSON.stringify(p);recordVictory(p,summary({won:false,time:1}));recordVictory(p,summary({levelId:5}));recordVictory(p,summary({levelId:99}));assert.equal(JSON.stringify(p),before);
});
test('settings, deliberate unequip and tutorial milestones survive a reload',()=>{
 const p=newProfile(),storage=memory();recordVictory(p,summary());p.equippedSpell=null;p.settings.volume=.8;p.settings.muted=true;p.settings.tutorial.selected=true;p.settings.tutorial.deployed=true;saveProfile(storage,p);assert.deepEqual(loadProfile(storage),p);
});
