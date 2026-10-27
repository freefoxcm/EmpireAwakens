export const MAP = {
 width:480,height:740,
 riverTop:300,riverBottom:358,bridges:[135,345],bridgeHalfWidth:38,
 minX:45,maxX:435,minY:95,maxY:645,
 deployLeft:55,deployRight:425,deployTop:410,deployBottom:600,
 baseX:240,baseY:670,baseKeepOut:80,
 campX:240,campY:75,campKeepOut:70,
 spawnX:240,spawnY:145,
 allyTowerY:610,enemyTowerY:130
} as const;
export function isWalkable(x:number,y:number):boolean {
 if(x<MAP.minX||x>MAP.maxX||y<MAP.minY||y>MAP.maxY)return false;
 if(y>=MAP.riverTop&&y<=MAP.riverBottom&&!MAP.bridges.some(b=>Math.abs(x-b)<=MAP.bridgeHalfWidth))return false;
 if(Math.hypot(x-MAP.baseX,y-MAP.baseY)<MAP.baseKeepOut)return false;
 if(Math.hypot(x-MAP.campX,y-MAP.campY)<MAP.campKeepOut)return false;
 return true;
}
