import { MAP } from './geometry.ts';

/** Only terrain and positions use two-axis scaling. Artwork keeps a uniform scale. */
export class WorldProjection {
 width=480; height=740;
 resize(width:number,height:number){this.width=Math.max(1,width);this.height=Math.max(1,height)}
 get sx(){return this.width/MAP.width}
 get sy(){return this.height/MAP.height}
 get artworkScale(){return Math.min(this.sx,this.sy)}
 point(x:number,y:number){return {x:x*this.sx,y:y*this.sy}}
 inverse(x:number,y:number){return {x:x/this.sx,y:y/this.sy}}
 radius(radius:number){return {x:radius*this.sx,y:radius*this.sy}}
}

export function observeViewport(shell:HTMLElement){
 const update=()=>{
  const viewport=window.visualViewport;
  shell.style.setProperty('--viewport-height',`${viewport?.height??window.innerHeight}px`);
  shell.style.setProperty('--viewport-width',`${viewport?.width??window.innerWidth}px`);
 };
 update();window.addEventListener('resize',update);
 window.visualViewport?.addEventListener('resize',update);
 window.visualViewport?.addEventListener('scroll',update);
 return ()=>{window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update)};
}
