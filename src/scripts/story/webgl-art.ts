/**
 * 데이터 아트 WebGL 층(OGL, WebGL2, 입자 약 20,000개). 데스크톱·고성능 기기에서만 불러온다.
 * 배치 규칙은 story-data.ts place()와 같다(셰이더로 옮김): 은하(G) → 흐름(F) → 체계(T) → 막대(B) → 근거(D) → 고리(L).
 * 빛 꼬리: 지난 그림을 조금 어둡게 한 위에 새 그림을 더한다(두 장의 그림판을 번갈아 씀). 움직임 멈춤이면 꼬리 없이 한 장.
 */
import { Renderer, Program, Geometry, Mesh, RenderTarget, Triangle } from 'ogl';
import { buildParticles, VERBS, VERB_COLOR, ANOMALY_LEAF, HOT_WEEK, CASE_NODES, GALAXY, ART_ASPECT } from '../../lib/story-data';
import type { Art, ArtBox, ArtAnchors } from './art-types';

const vertex = /* glsl */ `
attribute vec3 aGp; attribute vec2 aF; attribute vec2 aT; attribute vec2 aB; attribute vec2 aD; attribute vec2 aLa;
attribute vec3 aColor; attribute vec4 aInfo; // delay, phase, anomaly(0/1/2=hot), evidence
attribute vec4 aExtra; // hero, curve, mag, verb
uniform float uS; uniform float uTime; uniform float uAmb; uniform vec4 uBox; uniform vec2 uRes; uniform float uSize; uniform vec2 uRoot;
uniform vec2 uDShift; uniform float uGain; uniform vec4 uStage; uniform float uAr; uniform vec4 uHero; uniform vec4 uGalaxy; uniform float uAspect;
varying vec3 vColor; varying float vA;
float ease(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
vec2 toBox(vec2 v){ return uStage.xy + v * uStage.zw; }
float hero(){ return aExtra.x; }
vec2 pos(float k, out float dep, out float edg){
  dep = 1.; edg = 1.;
  if(k<.5){
    if(hero() > .5) return toBox(uHero.xy);
    float spin = uTime * .05 + min(uS, 1.2) * .9;
    float r = aGp.x; float a = aGp.y + spin * (1.25 - r * .7);
    float x = cos(a) * r; float z = sin(a) * r;
    float ct = cos(uGalaxy.w); float st = sin(uGalaxy.w);
    float y2 = aGp.z * ct - z * st; float z2 = aGp.z * st + z * ct;
    float per = 2.6 / (2.6 - z2);
    dep = (z2 + 1.) / 2.;
    return toBox(vec2(uGalaxy.x + x * per * uGalaxy.z, uGalaxy.y + y2 * per * uGalaxy.z * uAr));
  }
  if(k<1.5){
    if(hero() > .5) return toBox(uHero.zw);
    float fx = fract(aF.x + uTime * (.012 + aExtra.w * .003));
    edg = smoothstep(0., .08, fx) * smoothstep(1., .92, fx);
    return toBox(vec2(fx, aF.y));
  }
  if(k<2.5) return aT;
  if(k<3.5) return aB;
  if(k<4.5) return aD + (aInfo.w > .5 ? uDShift : vec2(0.));
  float a = aLa.x + uTime * .035;
  return vec2(.5 + cos(a) * aLa.y, .5 + sin(a) * aLa.y * uAspect * .98);
}
float alp(float k){
  if(hero() > .5 && k < 1.5) return 1.;
  if(k<.5) return .1 + (aExtra.z - .5) * .72;
  if(k<1.5) return .7;
  if(k<2.5) return .85;
  if(k<3.5) return aInfo.z > 1.5 ? 1. : (aInfo.z > .5 ? .6 : .05);
  if(k<4.5) return aInfo.w > .5 ? 1. : .05;
  return .35;
}
float siz(float k){
  if(hero() > .5) return k < 1.5 ? 4.2 : 2.;
  if(k<.5) return .55 + aExtra.z * .55;
  if(k<1.5) return .85;
  if(k>2.5 && k<3.5 && aInfo.z > .5) return aInfo.z > 1.5 ? 1.5 : 1.2;
  if(k>3.5 && k<4.5 && aInfo.w > .5) return 1.3;
  return 1.;
}
float gain(float k){ return hero() > .5 ? 1. : (k < .5 ? 1. : (k < 1.5 ? .55 : uGain)); }
void main(){
  float i = clamp(floor(uS), 0., 5.);
  float j = min(5., i + 1.);
  float t = i == j ? 0. : ease(clamp((uS - i - .3 - aInfo.x * .35) / .35, 0., 1.));
  float dA; float eA; float dB; float eB;
  vec2 a = pos(i, dA, eA); vec2 b = pos(j, dB, eB);
  vec2 c;
  if (i > .5 && i < 1.5) c = vec2(uRoot.x + .06, uRoot.y + (a.y - .5) * .25);
  else c = (a + b) * .5 + vec2(-(b.y - a.y), b.x - a.x) * aExtra.y;
  float u = 1. - t;
  vec2 p = u*u*a + 2.*u*t*c + t*t*b;
  float va = alp(i) * (i < .5 ? .45 + .55 * dA : 1.) * eA * gain(i);
  float vb = alp(j) * (j < .5 ? .45 + .55 * dB : 1.) * eB * gain(j);
  float tw = (uAmb > .5 && i < .5 && hero() < .5) ? mix(.7 + .3 * sin(uTime * 1.3 + aInfo.y * 3.), 1., t) : 1.;
  vA = mix(va, vb, t) * tw;
  vColor = aColor;
  vec2 px = uBox.xy + p * uBox.zw;
  gl_Position = vec4(px / uRes * 2. - 1., 0., 1.);
  gl_Position.y *= -1.;
  float pulse = (hero() > .5 && uS < 1.6) ? 1. + .25 * sin(uTime * 2.4) : 1.;
  gl_PointSize = uSize * mix(siz(i), siz(j), t) * pulse;
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
const quadVertex = /* glsl */ `
attribute vec2 position; attribute vec2 uv; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0., 1.); }`;
const quadFragment = /* glsl */ `
precision mediump float;
uniform sampler2D tMap; uniform float uFade; varying vec2 vUv;
// 8비트 그림판은 곱하기만으로는 0까지 떨어지지 않아 조금씩 빼 준다(꼬리가 배경에 남지 않게)
void main(){ gl_FragColor = uFade > 0.999 ? texture2D(tMap, vUv) : max(texture2D(tMap, vUv) * uFade - vec4(.016), 0.); }`;

const hex = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);

export class WebGLArt implements Art {
  ok = false;
  private renderer?: Renderer;
  private program?: Program;
  private mesh?: Mesh;
  private fade?: Mesh;
  private copy?: Mesh;
  private targets: RenderTarget[] = [];
  private ambient = false;
  private raf = 0;
  private t0 = performance.now();
  private clock = 0;
  private dpr = Math.min(1.5, devicePixelRatio || 1);

  constructor(canvas: HTMLCanvasElement, count = 20000) {
    try {
      const renderer = new Renderer({ canvas, dpr: this.dpr, alpha: true, premultipliedAlpha: true, antialias: false, webgl: 2 });
      const gl = renderer.gl;
      if (!(gl instanceof WebGL2RenderingContext)) return;
      gl.clearColor(0, 0, 0, 0);
      const ps = buildParticles(count, 7);
      const f = (get: (p: (typeof ps)[number]) => number[]) => new Float32Array(ps.flatMap(get));
      const colors = VERBS.map((v) => hex(VERB_COLOR[v]));
      const geometry = new Geometry(gl, {
        aGp: { size: 3, data: f((p) => p.Gp) },
        aF: { size: 2, data: f((p) => p.F) },
        aT: { size: 2, data: f((p) => p.T) },
        aB: { size: 2, data: f((p) => p.B) },
        aD: { size: 2, data: f((p) => p.D) },
        aLa: { size: 2, data: f((p) => p.La) },
        aColor: { size: 3, data: f((p) => colors[p.verb]) },
        aInfo: { size: 4, data: f((p) => [p.delay, p.phase, p.leaf === ANOMALY_LEAF ? (p.week === HOT_WEEK ? 2 : 1) : 0, p.evidence ? 1 : 0]) },
        aExtra: { size: 4, data: f((p) => [p.hero ? 1 : 0, p.curve, p.mag, p.verb]) },
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
          uAr: { value: 1.6 },
          uHero: { value: [GALAXY.cx, GALAXY.cy, 0.5, 0.8] },
          uGalaxy: { value: [GALAXY.cx, GALAXY.cy, GALAXY.r, GALAXY.tilt] },
          uAspect: { value: ART_ASPECT },
          // 뭉치는 장면에서는 입자가 캔버스 층보다 여덟 배쯤 많으므로 하나하나를 흐리게(더하기 합성이 하얗게 타지 않도록)
          uGain: { value: Math.min(1, 3200 / count) },
        },
      });
      program.setBlendFunc(gl.ONE, gl.ONE);
      this.mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program });
      const tri = new Triangle(gl);
      const quad = (fadeTo: number) => new Mesh(gl, { geometry: tri, program: new Program(gl, { vertex: quadVertex, fragment: quadFragment, depthTest: false, depthWrite: false, uniforms: { tMap: { value: null }, uFade: { value: fadeTo } } }) });
      this.fade = quad(0.8);
      this.copy = quad(1);
      this.renderer = renderer;
      this.program = program;
      this.ok = true;
    } catch {
      this.ok = false;
    }
  }

  resize(w: number, h: number, box: ArtBox, a: ArtAnchors = {}) {
    if (!this.renderer || !this.program) return;
    this.renderer.setSize(w, h);
    const gl = this.renderer.gl;
    this.targets = [0, 1].map(() => new RenderTarget(gl, { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, depth: false }));
    const u = this.program.uniforms;
    u.uRes.value = [w, h];
    u.uBox.value = [box.x, box.y, box.w, box.h];
    u.uStage.value = [-box.x / box.w, -box.y / box.h, w / box.w, h / box.h];
    u.uAr.value = w / h;
    u.uDShift.value = a.shift ?? [0, 0];
    const hg = a.heroG ?? [GALAXY.cx, GALAXY.cy];
    const hf = a.heroF ?? [0.5, 0.8];
    u.uHero.value = [hg[0], hg[1], hf[0], hf[1]];
    u.uSize.value = Math.max(3.2, box.w * 0.0058) * this.dpr;
    this.draw(true);
  }

  setScene(s: number) {
    if (!this.program) return;
    this.program.uniforms.uS.value = s;
    if (!this.raf) this.draw(true);
  }

  setAmbient(on: boolean) {
    this.ambient = on;
    if (this.program) this.program.uniforms.uAmb.value = on ? 1 : 0;
    if (on && !this.raf) {
      this.t0 = performance.now() - this.clock * 1000;
      const loop = () => {
        if (!this.ambient) { this.raf = 0; return; }
        this.clock = (performance.now() - this.t0) / 1000;
        this.draw(false);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    } else if (!on) this.draw(true);
  }

  private draw(clear: boolean) {
    const { renderer, program, mesh, fade, copy } = this;
    if (!renderer || !program || !mesh || !fade || !copy || this.targets.length < 2) return;
    program.uniforms.uTime.value = this.clock;
    const [prev, cur] = this.targets;
    // 1) 지난 그림을 조금 어둡게(움직임 멈춤이면 지운다) 2) 새 입자를 더한다 3) 화면으로
    fade.program.uniforms.tMap.value = prev.texture;
    fade.program.uniforms.uFade.value = clear || !this.ambient ? 0 : 0.72;
    renderer.render({ scene: fade, target: cur });
    renderer.render({ scene: mesh, target: cur, clear: false });
    copy.program.uniforms.tMap.value = cur.texture;
    renderer.render({ scene: copy });
    this.targets = [cur, prev];
  }

  destroy() {
    this.ambient = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const gl = this.renderer?.gl;
    if (gl) { gl.clear(gl.COLOR_BUFFER_BIT); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  }
}
