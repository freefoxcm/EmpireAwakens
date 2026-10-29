import { specs,type Kind } from './battle.ts';
import { cardInfo } from './ui.ts';
import type { Preferences } from './session.ts';

export function settingsPanel(preferences:Preferences,inBattle:boolean){
 return `<section class="menu-section"><h3><span class="menu-icon sound" aria-hidden="true"></span>声音</h3>
  <label class="settings-toggle"><span>战斗音效<small id="sound-state">${preferences.muted?'已关闭':'已开启'}</small></span><input id="mute-sound" type="checkbox" role="switch" aria-label="战斗音效" ${preferences.muted?'':'checked'}></label>
  <div class="volume-setting"><label for="sound-volume">音量</label><output id="volume-value" for="sound-volume">${Math.round(preferences.volume*100)}%</output><input id="sound-volume" aria-label="音量" type="range" min="0" max="100" value="${Math.round(preferences.volume*100)}"></div>
 </section><section class="menu-section"><h3><span class="menu-icon help" aria-hidden="true"></span>战役</h3>
  <button id="replay-tutorial" class="menu-row-action"><span>重看第一关教学<small>通关成绩和解锁内容会保留</small></span><b aria-hidden="true">›</b></button>
  ${inBattle?'<button id="leave-battle" class="menu-row-action"><span>返回征途地图<small>结束本局，调整法术与关卡</small></span><span class="menu-icon back" aria-hidden="true"></span></button>':''}
 </section><p class="menu-footnote">切到后台自动暂停，返回后可手动继续。</p>`;
}
export const rulesPanel=()=>`<section class="menu-section"><h3>部署与协同</h3><ol class="rule-steps"><li><b>选卡，再点空地</b><span>在金色虚线内出兵，能量会自动恢复；场上最多 10 名部队。</span></li><li><b>前排保护远程</b><span>战士和枪骑士吸收伤害，弓手输出，修士治疗友军。</span></li><li><b>选择法术后再点战场</b><span>切换兵种或再次点击技能可取消施法选择。</span></li></ol></section><section class="menu-section"><h3>通关目标</h3><p>击败首领解除主城护盾，再摧毁敌方主城。</p><p>单位优先攻击附近敌军，其次是箭塔和主城。箭塔守卫与建筑共用生命值。</p></section>`;
export function troopPanel(kind:Kind){
 const spec=specs[kind];
 return `<div class="troop-summary"><span class="troop-picture ${kind}" aria-hidden="true"></span><div><p class="troop-role">${cardInfo[kind]}</p><span class="troop-cost">✦ ${spec.cost} 能量</span></div></div><dl class="troop-stats">${[['生命',spec.hp],[kind==='monk'?'单次治疗':'单次伤害',spec.damage],['攻击间隔',`${spec.interval} 秒`],['射程',spec.range],['移动速度',spec.speed],['职责',kind==='monk'?'治疗':spec.range>60?'远程':'近战']].map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}
