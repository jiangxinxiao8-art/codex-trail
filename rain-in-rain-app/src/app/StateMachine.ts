export const scenes = [
 {id:'CITY',name:'城市，下雨了',line:'今天的雨，好像格外漫长。',hint:'移动食指，陪他向前走。',mouse:'移动鼠标，陪他向前走。',min:40,goal:2,music:0},
 {id:'RAINDROP',name:'雨滴，会唱歌吗？',line:'原来，雨里藏着声音。',hint:'靠近发光雨滴，捏合手指。',mouse:'点击发光的雨滴，听见雨的声音。',min:45,goal:5,music:1},
 {id:'UMBRELLA',name:'给雨一把伞',line:'如果雨不会停，那就种一片伞吧。',hint:'在地面空处捏合，种下一把伞。',mouse:'点击街道或水面，种下五把雨伞。',min:45,goal:5,music:1},
 {id:'DREAM',name:'水里的另一个世界',line:'也许，世界不只有眼前的模样。',hint:'走近水洼，捏合触碰倒影。',mouse:'走近右侧水洼，点击它的倒影。',min:40,goal:1,music:2},
 {id:'DANCE',name:'那就在雨中起舞吧',line:'雨没有停。可我想跳一支舞。',hint:'张开手掌，跟着音乐轻轻挥动。',mouse:'按住空格，左右移动鼠标起舞。',min:95,goal:14,music:3},
 {id:'ENDING',name:'雨还在下',line:'雨没有停，但我已经学会在雨中起舞。',hint:'张开手掌，安静停留两秒。',mouse:'按住空格，静静停留两秒。',min:25,goal:1,music:4},
] as const;
export type SceneId = typeof scenes[number]['id'];
export class StateMachine {
 index=0; elapsed=0; progress=0; finished=false;
 get scene(){return scenes[this.index];}
 reset(){this.index=0;this.elapsed=0;this.progress=0;this.finished=false;}
 event(value=1){this.progress=Math.min(this.scene.goal,this.progress+value);}
 update(dt:number){if(this.finished)return false;this.elapsed+=dt;if(this.elapsed>=this.scene.min&&this.progress>=this.scene.goal){if(this.index===5){this.finished=true;return true;}this.index++;this.elapsed=0;this.progress=0;return true;}return false;}
 get needsHelp(){return this.elapsed>this.scene.min+15&&this.progress<this.scene.goal;}
}
