import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldProjection } from '../src/projection.ts';
import { PauseGate,Tutorial,freshTutorial } from '../src/session.ts';
import { Battle } from '../src/battle.ts';

test('projection roundtrips positions and keeps artwork uniform at each viewport',()=>{
 const projection=new WorldProjection();
 for(const [w,h] of [[314,330],[396,480],[396,650],[424,720],[530,460],[700,500]]){
  projection.resize(w,h);assert.equal(projection.artworkScale,Math.min(w/480,h/740));
  for(const [x,y] of [[0,0],[480,740],[240,145],[135,329],[345,610],[55,410]]){const p=projection.point(x,y),back=projection.inverse(p.x,p.y);assert.ok(Math.abs(back.x-x)<1e-8&&Math.abs(back.y-y)<1e-8)}
  const radius=projection.radius(100);assert.ok(Math.abs(radius.x-100*w/480)<1e-8&&Math.abs(radius.y-100*h/740)<1e-8);
 }
});
test('resizing the view never changes a battle or its deployment validation',()=>{
 const b=new Battle(),p=new WorldProjection();b.deploy(135,500);const snapshot=JSON.stringify(b);
 for(const [w,h] of [[320,350],[402,490],[800,400]]){p.resize(w,h);const target=p.point(345,500),logical=p.inverse(target.x,target.y);assert.equal(b.placementProblem(logical.x,logical.y),null);assert.equal(JSON.stringify(b),snapshot)}
});
test('closing a dialog preserves user and background pause reasons',()=>{
 const gate=new PauseGate(),b=new Battle();gate.set('user',true);gate.set('dialog',true);gate.sync(b);assert.equal(b.status,'paused');gate.set('dialog',false);gate.sync(b);assert.equal(b.status,'paused');gate.set('background',true);gate.set('user',false);gate.sync(b);assert.equal(b.status,'paused');gate.set('background',false);gate.sync(b);assert.equal(b.status,'playing');b.status='won';gate.set('dialog',true);gate.sync(b);assert.equal(b.status,'won');
});
test('tutorial deployment gate is the only pause that allows first deployment',()=>{
 const gate=new PauseGate();gate.set('tutorial',true);assert.equal(gate.tutorialInputOnly,true);gate.set('dialog',true);assert.equal(gate.tutorialInputOnly,false);
});
test('tutorial steps survive retries and skipping disables further prompts',()=>{
 const state=freshTutorial(),tutorial=new Tutorial(state);assert.equal(tutorial.begin(2),false);assert.equal(tutorial.begin(1),true);tutorial.selectWarrior();assert.equal(state.selected,true);tutorial.deployed();assert.equal(new Tutorial(state).begin(1),false);tutorial.skip();assert.equal(state.skipped,true);
});
