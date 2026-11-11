import { clamp, damp } from './math';
export class CameraController {
 x=0;y=0;zoom=1;targetZoom=1;targetY=0;bounds:[number,number]=[0,1600];
 reset(){this.x=this.y=this.targetY=0;this.zoom=this.targetZoom=1;}
 update(subjectX:number,dt:number){this.x=damp(this.x,clamp(subjectX-800,...this.bounds),2.1,dt);this.y=damp(this.y,this.targetY,2,dt);this.zoom=damp(this.zoom,this.targetZoom,1.4,dt);}
 worldToScreen(x:number,y:number){return{x:800+(x-this.x-800)*this.zoom,y:450+(y-this.y-450)*this.zoom};}
 screenToWorld(x:number,y:number){return{x:(x-800)/this.zoom+800+this.x,y:(y-450)/this.zoom+450+this.y};}
}
