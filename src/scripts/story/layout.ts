/** One scroll coordinate for every viewport. Tall scenes get reading space before
 * their transition; resizing preserves the scene and its reading position. */
export interface StoryFrame { s: number; pans: number[] }

export class StoryLayout {
  frame: StoryFrame = { s: 0, pans: [] };
  private starts: number[] = [];
  private overflow: number[] = [];
  private step = 1;
  private top = 0;
  private range = 1;
  private height = 0;
  private pending = 0;
  private measuring = true;
  private listeners = new Set<(frame: StoryFrame) => void>();
  private observer: ResizeObserver;

  constructor(readonly story: HTMLElement, readonly stage: HTMLElement, readonly scenes: HTMLElement[]) {
    this.observer = new ResizeObserver(() => this.schedule(true));
    const controls = story.querySelector<HTMLElement>('.story-ui');
    [stage, ...scenes, ...(controls ? [controls] : [])].forEach((el) => this.observer.observe(el));
    addEventListener('resize', () => this.schedule(true));
    addEventListener('scroll', () => this.schedule(), { passive: true });
    document.fonts?.ready.then(() => this.schedule(true));
    this.refresh(false);
  }

  get enabled() { return document.documentElement.classList.contains('story-pin'); }

  subscribe(fn: (frame: StoryFrame) => void) {
    this.listeners.add(fn);
    fn(this.frame);
    return () => { this.listeners.delete(fn); };
  }

  sceneY(i: number, reading = 0) {
    return this.top + (this.starts[i] ?? 0) + Math.min(this.overflow[i] ?? 0, Math.max(0, reading));
  }

  /** Record an instant jump before a queued resize preserves the previous frame. */
  syncScroll() { this.update(); }

  private schedule(measure = false) {
    this.measuring ||= measure;
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      if (this.measuring) this.refresh();
      else this.update();
    });
  }

  refresh(preserve = true) {
    this.measuring = false;
    if (!this.enabled) return;
    const previous = this.frame;
    const oldOverflow = this.overflow;
    const oldEnd = this.top + this.range;
    const oldHeight = this.height;
    const y = scrollY;
    const inside = oldHeight > 0 && y >= this.top && y <= oldEnd + 1;
    this.top = this.story.getBoundingClientRect().top + y;
    this.step = this.stage.clientHeight;
    const controls = this.story.querySelector<HTMLElement>('.story-ui');
    this.stage.style.setProperty('--story-controls-h', `${controls?.offsetHeight ?? 44}px`);
    this.overflow = this.scenes.map((scene) => Math.max(0, scene.offsetHeight - this.step));
    let cursor = 0;
    this.starts = this.scenes.map((_, i) => {
      const start = cursor;
      cursor += this.overflow[i] + (i < this.scenes.length - 1 ? this.step : 0);
      return start;
    });
    this.range = Math.max(1, cursor);
    this.height = this.range + this.step;
    this.story.style.setProperty('--story-length', `${this.height}px`);
    if (preserve && inside) {
      const i = Math.floor(previous.s);
      const f = previous.s - i;
      const reading = oldOverflow[i] ? (previous.pans[i] ?? 0) / oldOverflow[i] : 0;
      const offset = f > 0 ? this.overflow[i] + f * this.step : reading * this.overflow[i];
      scrollTo({ top: this.top + this.starts[i] + offset, behavior: 'instant' });
    } else if (preserve && oldHeight && y > oldEnd + this.step) {
      // Content below the story must not jump when its scroll budget changes.
      scrollTo({ top: y + this.height - oldHeight, behavior: 'instant' });
    }
    this.update();
    this.story.dispatchEvent(new Event('story:layout'));
  }

  private update() {
    if (!this.enabled) return;
    const distance = Math.max(0, Math.min(this.range, scrollY - this.top));
    let s = this.scenes.length - 1;
    for (let i = 0; i < this.scenes.length - 1; i++) {
      if (distance < this.starts[i + 1]) {
        s = i + Math.max(0, (distance - this.starts[i] - this.overflow[i]) / this.step);
        break;
      }
    }
    const pans = this.scenes.map((scene, i) => {
      const pan = Math.max(0, Math.min(this.overflow[i], distance - this.starts[i]));
      const value = `${-pan}px`;
      if (scene.style.getPropertyValue('--scene-pan') !== value) scene.style.setProperty('--scene-pan', value);
      return pan;
    });
    this.frame = { s, pans };
    this.story.dataset.s = s.toFixed(2);
    this.story.style.setProperty('--story-progress', String(distance / this.range));
    this.listeners.forEach((fn) => fn(this.frame));
  }
}
