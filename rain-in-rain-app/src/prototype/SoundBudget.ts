/** Reserve a glass lane so dense water/metal impacts cannot silence the window. */
export class SoundBudget {
  private last=new Map<string,number>();private ordinary:number[]=[];
  allow(kind:string,now:number,rain:boolean){
    const cooldown=kind==='glass'?.24:rain?.25:.12;
    if(now-(this.last.get(kind)??-100)<cooldown)return false;
    this.ordinary=this.ordinary.filter(t=>now-t<1);
    if(kind!=='glass'&&this.ordinary.length>=5)return false;
    this.last.set(kind,now);if(kind!=='glass')this.ordinary.push(now);return true;
  }
}
