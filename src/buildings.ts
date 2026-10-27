export type BuildingTheme={camp:string;campFrame?:number;campWidth:number;campHeight:number;campRuin:string;campRuinWidth:number;campRuinHeight:number;tower:string;towerFrame?:number;towerWidth:number;towerHeight:number;ruin:string;ruinWidth:number;ruinHeight:number;guardOffset:number};
export const BUILDINGS:BuildingTheme[]=[
 {camp:'enemy-camp',campWidth:74,campHeight:111,campRuin:'theme-frontier-camp-ruin',campRuinWidth:74,campRuinHeight:111,tower:'tower-enemy',towerFrame:0,towerWidth:110,towerHeight:82,ruin:'tower-enemy-ruin',ruinWidth:110,ruinHeight:82,guardOffset:48},
 {camp:'theme-forest-camp',campWidth:74,campHeight:111,campRuin:'theme-forest-ruin',campRuinWidth:60,campRuinHeight:120,tower:'theme-forest-tower',towerWidth:60,towerHeight:120,ruin:'theme-forest-ruin',ruinWidth:60,ruinHeight:120,guardOffset:44},
 {camp:'theme-wild-tribal-camp',campWidth:74,campHeight:111,campRuin:'theme-wild-ruin',campRuinWidth:74,campRuinHeight:111,tower:'theme-wild-totem-tower',towerWidth:60,towerHeight:120,ruin:'theme-wild-ruin',ruinWidth:80,ruinHeight:120,guardOffset:55},
 {camp:'theme-shadow-camp',campWidth:74,campHeight:111,campRuin:'theme-shadow-ruin',campRuinWidth:60,campRuinHeight:120,tower:'theme-shadow-tower',towerWidth:60,towerHeight:120,ruin:'theme-shadow-ruin',ruinWidth:60,ruinHeight:120,guardOffset:55},
 {camp:'theme-fort-camp',campWidth:115,campHeight:92,campRuin:'theme-fort-camp-ruin',campRuinWidth:115,campRuinHeight:92,tower:'theme-fort-tower',towerWidth:60,towerHeight:120,ruin:'theme-fort-ruin',ruinWidth:60,ruinHeight:120,guardOffset:48}
];
