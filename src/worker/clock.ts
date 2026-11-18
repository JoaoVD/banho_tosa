export interface Clock {
  now(): Date;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => new Date(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/** Relógio de teste: sleep só avança o tempo. */
export function fakeClock(start: Date): Clock & { advance(ms: number): void } {
  let t = start.getTime();
  return {
    now: () => new Date(t),
    sleep: async (ms) => { t += ms; },
    advance: (ms) => { t += ms; },
  };
}
