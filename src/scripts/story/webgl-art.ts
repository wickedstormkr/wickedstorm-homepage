/**
 * 데이터 아트 WebGL 층(OGL, WebGL2, 입자 약 20,000개). 데스크톱·고성능 기기에서만 불러온다.
 * 배치 규칙은 story-data.ts place()와 같다(셰이더로 옮김): 장면 값 uS에 따라 S→T→B→D→L로 옮겨 간다.
 */
import { Renderer, Program, Geometry, Mesh } from 'ogl';
import { buildParticles, VERBS, VERB_COLOR, ANOMALY_LEAF, HOT_WEEK, CASE_NODES } from '../../lib/story-data';
import type { Art, ArtBox } from './art-types';

const vertex = /* glsl */ `
attribute vec2 aG; attribute vec2 aF; attribute vec2 aT; attribute vec2 aB; attribute vec2 aD; attribute vec2 aL;
attribute vec3 aColor; attribute vec4 aInfo; // delay, phase, anomaly(0/1/2=hot), evidence
attribute float aMag;
uniform float uS; uniform float uTime; uniform float uAmb; uniform vec4 uBox; uniform vec2 uRes; uniform float uSize; uniform vec2 uRoot;
uniform vec2 uDShift; uniform float uGain; uniform vec4 uStage; // 무대 좌표 → 그림 칸 좌표: x0, y0, sx, sy
varying vec3 vColor; varying float vA;
float ease(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
vec2 stageP(vec2 v){ return uStage.xy + v * uStage.zw; }
vec2 pos(float k){
  if(k<.5) return stageP(aG);
  if(k<1.5) return stageP(aF);
  if(k<2.5) return aT;
  if(k<3.5) return aB;
  if(k<4.5) return aD + (aInfo.w > .5 ? uDShift : vec2(0.));
  return aL;
}
float alp(float k){
  if(k<.5) return (.07 + (aMag - .5) * .75) * (.35 + .65 * min(1., aG.x / .55));
  if(k<1.5) return .75;
  if(k<2.5) return .85;
  if(k<3.5) return aInfo.z > 1.5 ? 1. : (aInfo.z > .5 ? .6 : .05);
  if(k<4.5) return aInfo.w > .5 ? 1. : .05;
  return .35;
}
float siz(float k){
  if(k<.5) return .8 + aMag * .9;
  if(k<1.5) return .9;
  if(k>2.5 && k<3.5 && aInfo.z > .5) return aInfo.z > 1.5 ? 1.5 : 1.2;
  if(k>3.5 && k<4.5 && aInfo.w > .5) return 1.3;
  return 1.;
}
void main(){
  float i = clamp(floor(uS), 0., 5.);
  float j = min(5., i + 1.);
  float t = i == j ? 0. : ease(clamp((uS - i - .3 - aInfo.x * .35) / .35, 0., 1.));
  vec2 a = pos(i); vec2 b = pos(j); vec2 p;
  if (i > .5 && i < 1.5) {
    // 흐름 줄기 → 뿌리(CFDocument) 근처 → 성취 항목
    vec2 c = vec2(uRoot.x + .06, uRoot.y + (a.y - .5) * .25);
    float u = 1. - t;
    p = u*u*a + 2.*u*t*c + t*t*b;
  } else p = mix(a, b, t);
  // 흐름(장면 2)에서는 줄기를 따라 오른쪽으로 천천히 흐른다
  float flow = (i < .5 ? t : (i < 1.5 ? 1. - t : 0.));
  p.x += flow * uAmb * 9. * sin(uTime * .35 + aInfo.y);
  p += vec2(sin(uTime*.7 + aInfo.y), cos(uTime*.6 + aInfo.y) * 1.6) * uAmb;
  float tw = uAmb > 0. && i < .5 ? mix(.65 + .35 * sin(uTime * 1.3 + aInfo.y * 3.), 1., t) : 1.;
  // 흩어진 별밭·흐름은 겹침이 적어 밝기를 덜 줄이고, 모여 뭉치는 장면(체계·막대·근거·고리)은 많이 줄인다
  float gi = i < .5 ? 1. : (i < 1.5 ? .55 : uGain);
  float gj = j < .5 ? 1. : (j < 1.5 ? .55 : uGain);
  vA = mix(alp(i) * gi, alp(j) * gj, t) * tw;
  vColor = aColor;
  vec2 px = uBox.xy + p * uBox.zw;
  gl_Position = vec4(px / uRes * 2. - 1., 0., 1.);
  gl_Position.y *= -1.;
  gl_PointSize = uSize * mix(siz(i), siz(j), t);
}`;
const fragment = /* glsl */ `
precision mediump float;
varying vec3 vColor; varying float vA;
void main(){
  float d = length(gl_PointCoord - .5);
  float core = smoothstep(.5, 0., d);
  float a = core * core * vA;
  gl_FragColor = vec4(mix(vColor, vec3(1.), smoothstep(.18, 0., d) * .6) * a, a);
}`;

const hex = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);

export class WebGLArt implements Art {
  ok = false;
  private renderer?: Renderer;
  private program?: Program;
  private mesh?: Mesh;
  private ambient = false;
  private raf = 0;
  private dpr = Math.min(1.5, devicePixelRatio || 1);

  constructor(canvas: HTMLCanvasElement, count = 20000) {
    try {
      const renderer = new Renderer({ canvas, dpr: this.dpr, alpha: true, premultipliedAlpha: true, antialias: false, webgl: 2 });
      const gl = renderer.gl;
      if (!(gl instanceof WebGL2RenderingContext)) return;
      gl.clearColor(0, 0, 0, 0);
      const ps = buildParticles(count, 7);
      const f2 = (k: 'G' | 'F' | 'T' | 'B' | 'D' | 'L') => new Float32Array(ps.flatMap((p) => p[k]));
      const colors = VERBS.map((v) => hex(VERB_COLOR[v]));
      const geometry = new Geometry(gl, {
        aG: { size: 2, data: f2('G') },
        aF: { size: 2, data: f2('F') },
        aMag: { size: 1, data: new Float32Array(ps.map((p) => p.mag)) },
        aT: { size: 2, data: f2('T') },
        aB: { size: 2, data: f2('B') },
        aD: { size: 2, data: f2('D') },
        aL: { size: 2, data: f2('L') },
        aColor: { size: 3, data: new Float32Array(ps.flatMap((p) => colors[p.verb])) },
        aInfo: {
          size: 4,
          data: new Float32Array(ps.flatMap((p) => [p.delay, p.phase, p.leaf === ANOMALY_LEAF ? (p.week === HOT_WEEK ? 2 : 1) : 0, p.evidence ? 1 : 0])),
        },
      });
      const program = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uS: { value: 0 },
          uTime: { value: 0 },
          uAmb: { value: 0 },
          uBox: { value: [0, 0, 1, 1] },
          uRes: { value: [1, 1] },
          uSize: { value: 4 },
          uRoot: { value: [CASE_NODES[0].x, CASE_NODES[0].y] },
          uDShift: { value: [0, 0] },
          uStage: { value: [0, 0, 1, 1] },
          // 입자가 캔버스 층보다 여덟 배쯤 많으므로 하나하나를 흐리게(더하기 합성이 하얗게 타지 않도록)
          uGain: { value: Math.min(1, 3200 / count) },
        },
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

  resize(w: number, h: number, box: ArtBox, shift: [number, number] = [0, 0]) {
    if (!this.renderer || !this.program) return;
    this.renderer.setSize(w, h);
    const u = this.program.uniforms;
    u.uRes.value = [w, h];
    u.uBox.value = [box.x, box.y, box.w, box.h];
    u.uDShift.value = shift;
    u.uStage.value = [-box.x / box.w, -box.y / box.h, w / box.w, h / box.h];
    u.uSize.value = Math.max(3.2, box.w * 0.0058) * this.dpr;
    this.draw(performance.now());
  }

  setScene(s: number) {
    if (!this.program) return;
    this.program.uniforms.uS.value = s;
    if (!this.raf) this.draw(performance.now());
  }

  setAmbient(on: boolean) {
    this.ambient = on;
    if (this.program) this.program.uniforms.uAmb.value = on ? 0.0022 : 0;
    if (on && !this.raf) {
      const loop = (t: number) => {
        if (!this.ambient) { this.raf = 0; return; }
        this.draw(t);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    } else if (!on) this.draw(performance.now());
  }

  private draw(time: number) {
    if (!this.renderer || !this.program || !this.mesh) return;
    this.program.uniforms.uTime.value = time / 1000;
    this.renderer.render({ scene: this.mesh });
  }

  destroy() {
    this.ambient = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const gl = this.renderer?.gl;
    if (gl) { gl.clear(gl.COLOR_BUFFER_BIT); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  }
}
