import { TIMELINE } from './reaction-theme';

/**
 * Every tunable time value in the reaction pipeline, in seconds (except
 * `blinkCount`, a plain count).
 *
 * These used to live purely in env, which meant a redeploy to retime a clip
 * mid-contest. They are now resolved settings-first so an operator can adjust
 * them from the admin settings page while a contest is running, with env kept as
 * the fallback so existing deployments keep their current behaviour.
 *
 * Precedence per field: stored setting -> env var -> built-in default.
 */
export type ReactionTimingConfig = {
  /** Clip starts this many seconds before the submission. */
  beforeSeconds: number;
  /** Clip ends this many seconds after the verdict. */
  afterSeconds: number;
  /**
   * How long to wait past the verdict reveal
   * (`Submission.judgeEndAt + revealDelaySeconds`) before enqueuing a render, so
   * the post-reveal tail has actually been recorded. Effectively the floor on
   * `afterSeconds`: the scheduler waits `max(this, afterSeconds)` from the reveal.
   */
  renderDelaySeconds: number;
  /**
   * Safety buffer added on top of `Submission.judgeEndAt` before the
   * pending->verdict reveal fires. Absorbs the residual slop between the judge
   * finishing and the contestant seeing it — clock drift, UI refresh lag — so
   * the flip lands on the visible reaction.
   */
  revealDelaySeconds: number;
  /** Half-period of the verdict blink. */
  blinkHalfPeriod: number;
  /** Number of blink half-cycles before the banner settles. */
  blinkCount: number;
  /** How long the rank pill takes to count from the old rank to the new one. */
  rankCountDuration: number;
  /** Period of the ". / .. / ..." pending dots. */
  dotPeriod: number;
};

/** The subset the renderer needs; the rest only affects scheduling. */
export type ReactionRevealTiming = Pick<
  ReactionTimingConfig,
  'revealDelaySeconds' | 'blinkHalfPeriod' | 'blinkCount' | 'rankCountDuration' | 'dotPeriod'
>;

export type FieldSpec = {
  /** Env var consulted when the setting is unset. Omitted where none existed. */
  env?: string;
  default: number;
  min: number;
  max: number;
  integer?: boolean;
};

/**
 * Bounds are guard rails, not preferences: a value typed into the settings page
 * reaches ffmpeg, so anything out of range is clamped rather than trusted.
 */
export const REACTION_TIMING_FIELDS = {
  beforeSeconds: { env: 'REACTION_BEFORE_SECONDS', default: 10, min: 0, max: 600 },
  afterSeconds: { env: 'REACTION_AFTER_SECONDS', default: 15, min: 0, max: 600 },
  renderDelaySeconds: { env: 'REACTION_RENDER_DELAY_SECONDS', default: 20, min: 0, max: 3600 },
  revealDelaySeconds: { env: 'REACTION_REVEAL_DELAY_SECONDS', default: TIMELINE.revealDelay, min: 0, max: 120 },
  blinkHalfPeriod: { default: TIMELINE.blinkHalfPeriod, min: 0.05, max: 2 },
  blinkCount: { default: TIMELINE.blinkCount, min: 0, max: 40, integer: true },
  rankCountDuration: { default: TIMELINE.rankCountDuration, min: 0.1, max: 10 },
  dotPeriod: { default: TIMELINE.dotPeriod, min: 0.05, max: 5 },
} as const satisfies Record<keyof ReactionTimingConfig, FieldSpec>;

const REVEAL_KEYS = [
  'revealDelaySeconds',
  'blinkHalfPeriod',
  'blinkCount',
  'rankCountDuration',
  'dotPeriod',
] as const satisfies readonly (keyof ReactionRevealTiming)[];

function clamp(value: number, spec: FieldSpec): number {
  const bounded = Math.min(spec.max, Math.max(spec.min, value));
  return spec.integer ? Math.round(bounded) : bounded;
}

/** Finite numbers only — a stored `null`, `""` or `"abc"` falls through. */
function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Merges a stored settings object over env over the built-in defaults, clamping
 * every field to its documented range.
 *
 * `stored` is whatever `SystemConfig.value` holds for `REACTION_TIMING_CONFIG_KEY`
 * — untrusted and possibly absent, partial or malformed, so each field is taken
 * only when it parses to a finite number.
 */
export function resolveReactionTiming(
  stored?: unknown,
  envGet?: (key: string) => string | undefined,
): ReactionTimingConfig {
  const source = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};

  const out = {} as ReactionTimingConfig;
  for (const [key, spec] of Object.entries(REACTION_TIMING_FIELDS) as [keyof ReactionTimingConfig, FieldSpec][]) {
    const fromStored = asNumber(source[key]);
    const fromEnv = spec.env && envGet ? asNumber(envGet(spec.env)) : undefined;
    out[key] = clamp(fromStored ?? fromEnv ?? spec.default, spec);
  }
  return out;
}

/** Narrows a full timing config to just what `render()` consumes. */
export function revealTimingFrom(config: ReactionTimingConfig): ReactionRevealTiming {
  const out = {} as ReactionRevealTiming;
  for (const key of REVEAL_KEYS) {
    out[key] = config[key];
  }
  return out;
}

/**
 * Fills in and clamps a partial reveal timing. The renderer calls this so a
 * direct caller passing raw values gets the same guard rails as the settings
 * page, rather than injecting an out-of-range value straight into the filter graph.
 */
export function resolveRevealTiming(partial?: Partial<ReactionRevealTiming>): ReactionRevealTiming {
  const out = {} as ReactionRevealTiming;
  for (const key of REVEAL_KEYS) {
    const spec: FieldSpec = REACTION_TIMING_FIELDS[key];
    out[key] = clamp(asNumber(partial?.[key]) ?? spec.default, spec);
  }
  return out;
}
