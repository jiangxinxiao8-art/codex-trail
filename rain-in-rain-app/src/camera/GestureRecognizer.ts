export type Point = { x: number; y: number; z?: number };
export type Input = { x: number; y: number; pinch: boolean; open: boolean; present: boolean; palmX?: number; palmY?: number };
export const emptyInput = (): Input => ({ x: .5, y: .5, pinch: false, open: false, present: false });
const distance = (a: Point, b: Point) => Math.hypot(a.x-b.x, a.y-b.y);
export class GestureRecognizer {
  private held = false; private last = -Infinity;
  reset() { this.held = false; this.last = -Infinity; }
  read(points: Point[], time: number): Input {
    if (points.length !== 21) { this.held = false; return emptyInput(); }
    const size = Math.max(.025, distance(points[0], points[9]));
    const ratio = distance(points[4], points[8]) / size;
    let pinch = false;
    if (!this.held && ratio < .30) { this.held = true; if (time-this.last >= 260) { pinch = true; this.last = time; } }
    if (ratio > .46) this.held = false;
    const fingers = [8,12,16,20].every(i => distance(points[i],points[0]) > distance(points[i-2],points[0])*1.15);
    const thumb = distance(points[4], points[17]) > distance(points[3], points[17])*1.12;
    const palm=[0,5,9,13,17].map(i=>points[i]);
    return { palmX:1-palm.reduce((n,p)=>n+p.x,0)/5,palmY:palm.reduce((n,p)=>n+p.y,0)/5,x: 1-points[8].x, y: points[8].y, pinch, open: fingers && thumb && !this.held, present: true };
  }
}
