import { specs, type Kind } from './battle.ts';

export const cards:Kind[]=['warrior','archer','lancer','monk'];
export const cardInfo:Record<string,string>={warrior:'低费前排 · 快速补位',archer:'远程输出 · 需要保护',lancer:'重装前排 · 吸收伤害',monk:'持续治疗 · 跟随友军'};
export const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
export const text=(selector:string,value:string)=>{const node=$(selector);if(node.textContent!==value)node.textContent=value};
export const hidden=(selector:string,value:boolean)=>$(selector).classList.toggle('hidden',value);

export function mountUI(){
 $('#app').innerHTML=`<main class="shell"><div class="arena">
  <header class="battle-header"><div class="wave-stat"><span id="level-name">边境警戒</span><strong id="wave">第一波 · 试探</strong></div>
   <div class="header-tools"><div class="battle-clock"><span>战斗时间</span><strong id="timer">00:00</strong></div><button id="help" class="small-btn" aria-label="战斗规则">?</button><button id="settings" class="small-btn" aria-label="设置">⚙</button><button id="pause" class="small-btn" aria-label="暂停游戏">Ⅱ</button></div></header>
  <section class="game-frame"><div id="game" aria-label="战场，点击金色虚线内的空地部署"></div>
   <div class="base-stat"><span>我方据点</span><strong id="base">600 / 600</strong><div class="bar"><i id="base-bar"></i></div></div>
   <div id="hint" class="hint" role="status" aria-live="polite"></div>
  </section>
  <section class="controls" aria-label="部署和法术">
   <div id="tutorial-coach" class="tutorial-coach hidden"><span id="tutorial-text"></span><button id="skip-tutorial">跳过</button></div>
   <div class="battle-status-row"><div class="enemy-base-stat"><span id="enemy-label">首领护盾</span><strong id="enemy-base">700 / 700</strong><div class="bar"><i id="enemy-base-bar"></i></div></div><div id="boss-hud" class="boss-hud hidden" role="progressbar" aria-label="首领生命值" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="bar"><i id="boss-bar"></i></div></div></div>
   <div class="deck-title"><span>部署部队</span><span id="selection"></span></div>
   <div id="cards" class="cards">${cards.map((kind,index)=>`<div class="card-wrap"><button class="card" data-kind="${kind}" aria-label="${specs[kind].name}，${specs[kind].cost}能量" aria-pressed="false"><span class="card-index">0${index+1}</span><span class="portrait ${kind}" aria-hidden="true"></span><span class="card-title">${specs[kind].name}</span><b>✦ ${specs[kind].cost}</b></button><button class="card-info" data-info="${kind}" aria-label="查看${specs[kind].name}详情">i</button></div>`).join('')}</div>
   <div class="energy-area"><div class="energy-content"><div class="energy-row"><span>✦ 能量 <strong id="energy">7.0</strong><span class="muted"> / 10</span></span><span class="muted">自动恢复</span></div><div class="energy-track"><i id="energy-bar"></i></div></div><button id="spell-action" class="spell-action hidden" aria-pressed="false"></button></div>
   <p class="instruction">点击卡牌与空地部署 · 长按卡牌查看详情 · 1–4 切换 · 空格暂停</p>
  </section>
  <section id="title-screen" class="campaign-screen title-screen"><div class="title-content"><p class="campaign-kicker">A PIXEL STRATEGY ADVENTURE</p><h1>帝国觉醒<br><em>战鼓再起</em></h1><p class="title-subtitle">集结部队 · 守卫边境 · 向敌军进发</p><div id="load-status" role="status">正在准备战场…</div><progress id="load-progress" max="1" value="0" aria-label="素材加载进度"></progress><button id="start-game" class="campaign-button" disabled>开始游戏</button><button id="load-retry" class="campaign-button hidden">重新加载</button><p id="storage-warning" class="storage-warning hidden">当前浏览器无法保存进度，本次仍可正常游玩。</p></div></section>
  <section id="map-screen" class="campaign-screen map-screen hidden"><div class="map-heading"><span>征途地图</span><div><button id="map-settings" class="map-back" aria-label="设置">设置</button><button id="back-title" class="map-back">返回</button></div></div><div id="mode-choice" class="mode-choice hidden"><button data-mode="normal">普通征途</button><button data-mode="challenge">挑战征途</button></div><div class="map-art"><div id="map-nodes" class="map-nodes"></div></div><div class="map-detail"><p id="map-region"></p><h2 id="map-level-name"></h2><p id="map-description"></p><p id="map-boss"></p><p id="map-record" class="hidden"></p><div id="spell-loadout" class="spell-loadout hidden"></div><button id="enter-level" class="campaign-button" disabled>进入战斗</button></div></section>
  <div id="dialog-layer" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="modal"><h2 id="dialog-title"></h2><div id="dialog-body"></div><button id="close-dialog" class="campaign-button">继续</button></div></div>
  <div id="result-layer" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="result-title"><div class="modal"><span class="eyebrow">BATTLE REPORT</span><h2 id="result-title"></h2><p id="result-text"></p><div id="result-record"></div><div class="result-actions"><button id="restart" class="campaign-button">再战一次</button><button id="next-level" class="campaign-button hidden">下一关</button><button id="back-map" class="campaign-button">返回地图</button></div></div></div>
 </div></main>`;
}
