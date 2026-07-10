type Ease = (t: number) => number;

interface TweenChain {
  delay(seconds: number): TweenChain;
  ease(fn: Ease): TweenChain;
  onComplete(fn: (...args: unknown[]) => void, args?: unknown[]): TweenChain;
  sound(left: number, right?: number): TweenChain;
}

const active = new WeakMap<object, number[]>();
let paused = false;

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
  let complete: ((...args: unknown[]) => void) | null = null;
  let completeArgs: unknown[] = [];
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
    let pausedAt = 0;
    let pausedDuration = 0;

    const tick = (now: number): void => {
      if (paused) {
        if (pausedAt === 0) pausedAt = now;
        addFrame(target, requestAnimationFrame(tick));
        return;
      }

      if (pausedAt !== 0) {
        pausedDuration += now - pausedAt;
        pausedAt = 0;
      }

      const adjustedStart = start + pausedDuration;

      if (duration === 0) {
        for (const [key, from] of startValues) {
          const to = props[key];
          (target as Record<string, number>)[key] = from + (to - from);
        }
        active.delete(target);
        complete?.(...completeArgs);
        return;
      }

      if (now < adjustedStart) {
        addFrame(target, requestAnimationFrame(tick));
        return;
      }
      const t = Math.min(1, (now - adjustedStart) / duration);
      const k = ease(t);
      for (const [key, from] of startValues) {
        const to = props[key];
        (target as Record<string, number>)[key] = from + (to - from) * k;
      }
      if (t < 1) {
        addFrame(target, requestAnimationFrame(tick));
      } else {
        active.delete(target);
        complete?.(...completeArgs);
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
    onComplete(fn: (...args: unknown[]) => void, args: unknown[] = []) {
      complete = fn;
      completeArgs = args;
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

  pauseAll(): void {
    paused = true;
  },

  resumeAll(): void {
    paused = false;
  },

  stop(target: object): void {
    cancelTarget(target);
  },

  timer(seconds: number): TweenChain {
    return createChain({}, seconds, {});
  },

  transform(target: object, seconds: number): TweenChain {
    return createChain(target, seconds, {});
  },

  tween(target: object, seconds: number, props: Record<string, number>): TweenChain {
    return createChain(target, seconds, props);
  },
};

export default Actuate;
