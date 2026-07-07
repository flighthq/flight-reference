type Ease = (t: number) => number;

interface TweenChain {
  delay(seconds: number): TweenChain;
  ease(fn: Ease): TweenChain;
  onComplete(fn: () => void): TweenChain;
  sound(left: number, right?: number): TweenChain;
}

const active = new WeakMap<object, number[]>();

function addFrame(target: object, id: number): void {
  const frames = active.get(target) ?? [];
  frames.push(id);
  active.set(target, frames);
}

function cancelTarget(target: object): void {
  const frames = active.get(target);
  if (!frames) return;
  for (const id of frames) cancelAnimationFrame(id);
  active.delete(target);
}

function createChain(target: object, seconds: number, props: Record<string, number>): TweenChain {
  let delayMs = 0;
  let ease: Ease = Actuate.defaultEase;
  let complete: (() => void) | null = null;
  let started = false;

  const run = (): void => {
    if (started) return;
    started = true;
    const startValues = new Map<string, number>();
    for (const key of Object.keys(props)) {
      startValues.set(key, Number((target as Record<string, unknown>)[key] ?? 0));
    }
    const start = performance.now() + delayMs;
    const duration = Math.max(0, seconds * 1000);

    const tick = (now: number): void => {
      if (now < start) {
        addFrame(target, requestAnimationFrame(tick));
        return;
      }
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const k = ease(t);
      for (const [key, from] of startValues) {
        const to = props[key];
        (target as Record<string, number>)[key] = from + (to - from) * k;
      }
      if (t < 1) {
        addFrame(target, requestAnimationFrame(tick));
      } else {
        complete?.();
      }
    };

    addFrame(target, requestAnimationFrame(tick));
  };

  queueMicrotask(run);

  return {
    delay(seconds: number) {
      delayMs = seconds * 1000;
      return this;
    },
    ease(fn: Ease) {
      ease = fn;
      return this;
    },
    onComplete(fn: () => void) {
      complete = fn;
      return this;
    },
    sound(left: number) {
      props.volume = left;
      return this;
    },
  };
}

const Actuate = {
  defaultEase: (t: number) => 1 - (1 - t) * (1 - t),

  stop(target: object): void {
    cancelTarget(target);
  },

  transform(target: object, seconds: number): TweenChain {
    return createChain(target, seconds, {});
  },

  tween(target: object, seconds: number, props: Record<string, number>): TweenChain {
    return createChain(target, seconds, props);
  },
};

export default Actuate;
