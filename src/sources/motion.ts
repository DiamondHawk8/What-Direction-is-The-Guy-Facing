export type MotionProfile = 'everyday' | 'restless' | 'still';
type Segment = { from: number; turn: number; durationMs: number; elapsedMs: number };

export function wrapHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

// A small movement model, independent of timers, packets, and UI.
// Holds, short turns, and slow corrections replace the old constant rotation.
export class SimulatedMotion {
  private heading = 42.5;
  private segment: Segment | null = null;
  private profile: MotionProfile;
  private readonly random: () => number;

  constructor(
    profile: MotionProfile = 'everyday',
    random: () => number = Math.random,
  ) {
    this.profile = profile;
    this.random = random;
  }

  setProfile(profile: MotionProfile): void {
    this.profile = profile;
    this.segment = null;
  }

  private between(minimum: number, maximum: number): number {
    return minimum + this.random() * (maximum - minimum);
  }

  private nextSegment(): Segment {
    const choice = this.random();
    const restless = this.profile === 'restless';
    const hold = this.profile === 'still' || choice < (restless ? 0.2 : 0.5);
    const drift = !hold && choice > 0.85;
    const sign = this.random() < 0.5 ? -1 : 1;
    return {
      from: this.heading,
      turn: hold ? 0 : sign * (drift ? this.between(3, 12) : this.between(30, 150)),
      durationMs: hold
        ? this.between(800, restless ? 1600 : 4200)
        : drift ? this.between(1600, 3000) : this.between(240, restless ? 480 : 900),
      elapsedMs: 0,
    };
  }

  advance(milliseconds: number): number {
    let remaining = Math.max(0, milliseconds);
    while (remaining > 0) {
      this.segment ??= this.nextSegment();
      const segment = this.segment;
      const step = Math.min(remaining, segment.durationMs - segment.elapsedMs);
      segment.elapsedMs += step;
      remaining -= step;
      const progress = segment.elapsedMs / segment.durationMs;
      // Quick acceleration and a definite stop, rather than a spinning dial.
      const eased = progress * progress * (3 - 2 * progress);
      this.heading = wrapHeading(segment.from + segment.turn * eased);
      if (segment.elapsedMs >= segment.durationMs) this.segment = null;
    }
    // Small sensor noise is independent of the direction the person is facing.
    return wrapHeading(this.heading + this.between(-0.35, 0.35));
  }
}
