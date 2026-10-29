/** A shuffled round visits every item once, including across round boundaries. */
export class ShuffleBag<T> {
 private items:T[];private order:T[]=[];private last?:T;private random:()=>number;
 constructor(items:T[],random:()=>number=Math.random){if(!items.length)throw Error('A playlist needs at least one track');this.items=[...items];this.random=random}
 peek(){
  if(!this.order.length){
   this.order=[...this.items];
   for(let i=this.order.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.order[i],this.order[j]]=[this.order[j],this.order[i]]}
   if(this.order.length>1&&this.order[0]===this.last)[this.order[0],this.order[1]]=[this.order[1],this.order[0]];
  }
  return this.order[0];
 }
 next(){const value=this.peek();this.order.shift();this.last=value;return value}
}
