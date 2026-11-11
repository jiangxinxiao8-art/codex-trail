export const scenes = [
 {id:'CITY',name:'城市，下雨了',line:'今天的雨，好像格外漫长。',hint:'手掌偏向一侧慢慢行走；靠近灯，食指指向并捏合。',mouse:'鼠标偏向一侧慢慢行走；靠近路灯后点击灯光。',min:0,goal:2,music:0},
 {id:'RAINDROP',name:'雨滴，会唱歌吗？',line:'原来，雨里藏着声音。',hint:'用食指找到三颗发光雨滴，捏合接住它们。',mouse:'点击三颗发光雨滴，听一段雨的旋律。',min:0,goal:3,music:1},
 {id:'UMBRELLA',name:'给雨一把伞',line:'如果雨不会停，那就种一片伞吧。',hint:'在地面的空处捏合，让三把伞慢慢生长。',mouse:'点击地面不同空处，让三把伞慢慢生长。',min:0,goal:3,music:1},
 {id:'DREAM',name:'水中的另一个世界',line:'也许，世界不只有眼前的模样。',hint:'走近光池，指向水面并捏合；然后继续向前。',mouse:'走近光池并点击水面；穿过倒影后继续向前。',min:0,goal:2,music:2},
 {id:'DANCE',name:'在雨中起舞与飞翔',line:'雨没有停。可我想跳一支舞。',hint:'张开手掌轻轻挥动，随后让手掌带你飞翔。',mouse:'按住空格左右挥动鼠标起舞，随后保持空格滑翔。',min:0,goal:4,music:3},
 {id:'ENDING',name:'雨夜归家',line:'雨没有停。但这一次，我不再害怕它。',hint:'慢慢走近物品，用食指指向并捏合。最后在窗边坐下。',mouse:'走近台灯、挂伞处、唱片机、茶杯并点击；最后在窗边坐下。',min:0,goal:5,music:4},
] as const;
export type SceneId = typeof scenes[number]['id'];
export class StateMachine {
 index=0;elapsed=0;progress=0;finished=false;
 get scene(){return scenes[this.index];}
 reset(){this.index=0;this.elapsed=0;this.progress=0;this.finished=false;}
 event(value=1){this.progress=Math.min(this.scene.goal,this.progress+value);}
 update(dt:number){if(this.finished)return false;this.elapsed+=dt;if(this.progress>=this.scene.goal){if(this.index===5){this.finished=true;return true;}this.index++;this.elapsed=0;this.progress=0;return true;}return false;}
 get needsHelp(){return this.elapsed>25&&this.progress<this.scene.goal;}
}
