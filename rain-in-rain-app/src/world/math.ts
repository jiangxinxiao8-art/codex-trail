export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const damp=(a:number,b:number,rate:number,dt:number)=>a+(b-a)*(1-Math.exp(-rate*dt));
export function seeded(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export const INK=0xcccac0, GOLD=0xd8bf88, BLUE=0x9baebd, MAUVE=0xaea3b8;
export const PALETTE=[GOLD,BLUE,MAUVE,0xc5b2a7,0xa9b7ae];
