import { type Rgba, luminance, parseColor } from './png';

/**
 * Visual constants for the 1080x1920 reaction video.
 *
 * Geometry is measured off the ICPC World Finals reaction reference frame
 * (1080x1920): white header/footer bars, a patterned brand background, both
 * clips inset as rounded 16:9 cards, and a verdict banner between them with a
 * floating "Nth place" pill overlapping its top edge.
 */

export const CANVAS = {
  width: 1080,
  height: 1920,
} as const;

export const FRAME = {
  headerHeight: 130,
  footerY: 1790,
  footerHeight: 130,
  /** Bars are white with dark text, as in the reference. */
  barColor: '#ffffff',
  barForeground: '#111827',
  cardRadius: 18,
} as const;

/** Both clips are inset 40px and rendered as 16:9 rounded cards. */
export const WEBCAM_CARD = { x: 40, y: 193, width: 1000, height: 564 } as const;
export const SCREEN_CARD = { x: 40, y: 1162, width: 1000, height: 564 } as const;

export const BANNER = {
  x: 40,
  y: 854,
  width: 1000,
  height: 258,
  radius: 40,
  padding: 36,
  /** Circular university crest on the leading edge. */
  crestCx: 155,
  crestCy: 983,
  crestRadius: 80,
  /** Text column starts clear of the crest. */
  textX: 266,
  /** The team name block is centred between these bounds, 1 or 2 lines. */
  teamRegionTop: 876,
  teamRegionBottom: 1030,
  teamLineHeight: 66,
  subtitleY: 1042,
  /** Big problem letter, centred in its own column. */
  problemCx: 895,
  problemCy: 946,
  /** Verdict letters + clock are right-aligned on the subtitle row. */
  metaRight: 1004,
} as const;

/** Floating rank badge; its right edge lines up with the banner's. */
export const PLACE_PILL = {
  right: 1040,
  y: 806,
  height: 72,
  radius: 36,
  paddingX: 30,
} as const;

export const FONT_SIZE = {
  headerBrand: 44,
  headerTag: 42,
  footer: 40,
  teamNameMax: 60,
  teamNameMin: 34,
  subtitle: 28,
  meta: 30,
  problemLetter: 156,
  place: 36,
} as const;

export const PALETTE = {
  canvas: '#0b1020',
  bannerForeground: '#ffffff',
  /** Subtitle sits slightly back from the team name. */
  bannerMuted: '#ffffff',
  placeBackground: '#3f3f46',
  placeForeground: '#ffffff',
} as const;

/**
 * Pending is the amber "judging" state every submission starts in; the verdict
 * colour replaces it once the judge finishes. Values are sampled from the
 * reference video.
 */
export const PENDING_COLOR = '#fcb911';

const VERDICT_COLORS: Record<string, string> = {
  AC: '#1b8141',
  WA: '#b22c1c',
  RTE: '#b22c1c',
  RE: '#b22c1c',
  IR: '#b22c1c',
  CE: '#b22c1c',
  TLE: '#b22c1c',
  MLE: '#b22c1c',
  OLE: '#b22c1c',
  IE: '#4b5563',
  AB: '#4b5563',
  UNKNOWN: '#4b5563',
};

export function verdictColor(status: string): string {
  return VERDICT_COLORS[status?.toUpperCase()] ?? VERDICT_COLORS.UNKNOWN;
}

/** Picks black or white text for legibility against `background`. */
export function readableForeground(background: string): Rgba {
  return luminance(parseColor(background)) > 0.62 ? parseColor('#111827') : parseColor('#ffffff');
}

/**
 * Animation timeline, in seconds.
 *
 * There is deliberately no intro animation: the background, bars, banner and
 * place pill are fully drawn on the very first frame. Beyond looking right when
 * a clip is scrubbed to 0, the admin grid uses the first frame as each card's
 * poster image, so anything that faded in would leave thumbnails blank.
 *
 * The only motion is the verdict reveal, anchored to when the judge actually
 * finished (see `Params.verdictAtSeconds`).
 */
export const TIMELINE = {
  /** Pending dots cycle ". / .. / ..." while the judge is still running. */
  dotPeriod: 0.4,
  /** Verdict reveal: alternate pending/verdict colour, then settle. */
  blinkHalfPeriod: 0.2,
  blinkCount: 8,
  /** Rank counts up while the banner is blinking. */
  rankCountDuration: 1.2,
  /**
   * Safety buffer on the judge-finish time, in seconds.
   *
   * The caller anchors `verdictAtSeconds` to `Submission.judgeEndAt` — when
   * judging actually finished, as opposed to `judgedAt`, which is only when it
   * started. This buffer is added on top to absorb the residual slop between the
   * judge finishing and the contestant seeing it, so the banner never flips
   * before they have visibly reacted.
   */
  revealDelay: 1,
} as const;

export const BLINK_DURATION = TIMELINE.blinkHalfPeriod * TIMELINE.blinkCount;
