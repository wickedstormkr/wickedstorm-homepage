/**
 * 먼 별 층(OGL, WebGL2): 성능이 되는 데스크톱에서만, 주 그림(캔버스) 뒤에 깊이를 더한다.
 * 이야기의 구조(문장·칸·체계)는 그리지 않는다. 쌓인 학습데이터의 원경으로, 스크롤하면 가까운 별이 조금 더 움직인다(시차).
 * 불러오지 못해도 이야기는 캔버스 층만으로 완결된다.
 */
import { Renderer, Program, Geometry, Mesh } from 'ogl';
import { rng } from '../../lib/story-data';

const vertex = /* glsl */ `
attribute vec3 aP; attribute float aPh; attribute vec3 aC;
uniform float uS; uniform float uTime; uniform float uAmb; uniform vec2 uRes; uniform float uDpr;
varying float vA; varying vec3 vC;
void main(){
  float z = aP.z;
  vec2 p = aP.xy;
  p.y = fract(p.y - uS * (.015 + z * .05));
  p.x += sin(uTime * .05 + aPh) * .004 * z;
  vA = (.1 + z * .38) * (uAmb > .5 ? .7 + .3 * sin(uTime * (.8 + z) + aPh * 6.) : 1.);
  vC = aC;
  gl_Position = vec4(p.x * 2. - 1., 1. - p.y * 2., 0., 1.);
  gl_PointSize = (1.2 + z * z * 3.2) * uDpr;
}`;
const fragment = /* glsl */ `
precision mediump float;
varying float vA; varying vec3 vC;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .0, d);
  a = a * a * vA;
  gl_FragColor = vec4(mix(vC, vec3(1.), .55) * a, a);
}`;

export class DeepField {
  ok = false;
  private renderer?: Renderer;
  private program?: Program;
  private mesh?: Mesh;
  private ambient = false;
  private raf = 0;
  private t0 = performance.now();
  private dpr = Math.min(1.5, devicePixelRatio || 1);

  constructor(canvas: HTMLCanvasElement, count = 4200) {
    try {
      const renderer = new Renderer({ canvas, dpr: this.dpr, alpha: true, premultipliedAlpha: true, antialias: false, webgl: 2 });
      const gl = renderer.gl;
      if (!(gl instanceof WebGL2RenderingContext)) return;
      gl.clearColor(0, 0, 0, 0);
      const r = rng(23);
      const pal = [[0.18, 0.49, 1], [0.49, 0.3, 1], [0.64, 0.69, 1], [0.49, 0.57, 0.89]];
      const P = new Float32Array(count * 3);
      const Ph = new Float32Array(count);
      const C = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        P.set([r(), r(), Math.pow(r(), 2.2)], i * 3);
        Ph[i] = r() * 6.283;
        C.set(pal[Math.floor(r() * pal.length)], i * 3);
      }
      const geometry = new Geometry(gl, { aP: { size: 3, data: P }, aPh: { size: 1, data: Ph }, aC: { size: 3, data: C } });
      const program = new Program(gl, {
        vertex, fragment, transparent: true, depthTest: false, depthWrite: false,
        uniforms: { uS: { value: 0 }, uTime: { value: 0 }, uAmb: { value: 0 }, uRes: { value: [1, 1] }, uDpr: { value: this.dpr } },
      });
      program.setBlendFunc(gl.ONE, gl.ONE);
      this.mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program });
      this.renderer = renderer;
      this.program = program;
      this.ok = true;
    } catch {
      this.ok = false;
    }
  }
  resize(w: number, h: number) {
    if (!this.renderer || !this.program) return;
    this.renderer.setSize(w, h);
    this.program.uniforms.uRes.value = [w, h];
    this.draw();
  }
  setScene(s: number) {
    if (!this.program) return;
    this.program.uniforms.uS.value = s;
    if (!this.raf) this.draw();
  }
  setAmbient(on: boolean) {
    this.ambient = on;
    if (this.program) this.program.uniforms.uAmb.value = on ? 1 : 0;
    if (on && !this.raf) {
      const loop = () => {
        if (!this.ambient) { this.raf = 0; return; }
        this.draw();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
  }
  private draw() {
    if (!this.renderer || !this.program || !this.mesh) return;
    this.program.uniforms.uTime.value = (performance.now() - this.t0) / 1000;
    this.renderer.render({ scene: this.mesh });
  }
  destroy() {
    this.ambient = false;
    cancelAnimationFrame(this.raf);
    const gl = this.renderer?.gl;
    if (gl) { gl.clear(gl.COLOR_BUFFER_BIT); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  }
}
