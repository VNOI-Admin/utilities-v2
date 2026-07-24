import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { type DecodedImage, type Rgba, Surface, decodePng, parseColor } from './png';
import {
  BANNER,
  CANVAS,
  FONT_SIZE,
  FRAME,
  PALETTE,
  PENDING_COLOR,
  PLACE_PILL,
  SCREEN_CARD,
  WEBCAM_CARD,
  readableForeground,
  verdictColor,
} from './reaction-theme';
import { type ReactionRevealTiming, resolveRevealTiming } from './reaction-timing';
import { ellipsizeText, fitFontSize, measureText, wrapText } from './text-metrics';

export type Params = {
  webcamSrc: string;
  screenSrc: string;
  teamName: string;
  university: {
    name: string;
    logoSrc: string;
  };
  /** Rendered after the university name as `#Tag`, as in the reference. */
  hashtag?: string;
  problem: string;
  rank: {
    before: number;
    after: number;
  };
  status: string;
  /**
   * Seconds into the clip at which the judge finished. The banner holds the
   * amber pending state until this moment, then blinks and settles on the
   * verdict colour. Undefined means the verdict was already known, so the
   * pending phase is skipped entirely.
   */
  verdictAtSeconds?: number;
  /**
   * Overrides for the verdict reveal timing (hold delay, blink, rank count-up,
   * pending dots). Any field left out falls back to its built-in default, and
   * every field is clamped to a safe range. `revealDelaySeconds` is additionally
   * clamped down at render time so the whole reveal still fits inside the clip —
   * a short slice keeps whatever room it has rather than losing the verdict off
   * the end. Only applies when there is a pending phase.
   */
  revealTiming?: Partial<ReactionRevealTiming>;
  /** Contest elapsed seconds at clip t=0; drives the ticking clock. */
  clockStartSeconds?: number;
};

export type Configuration = {
  /** Patterned brand background; falls back to a flat colour when absent. */
  backgroundSrc?: string;
  logoSrc: string;
  fontPath: string;
  /** Fall back to `fontPath` when the deployment has no separate face. */
  fontPathBold?: string;
  fontPathMono?: string;
  width: number;
  height: number;
  text: {
    headerLeft: string;
    headerRight: string;
    footer: string;
  };
};

/**
 * Seconds the settled verdict must remain on screen after the blink finishes.
 * Together with the blink it forms the tail the delayed reveal is clamped to fit
 * inside the clip, so a delayed flip is never cut off mid-animation.
 */
const REVEAL_MIN_HOLD = 0.5;

export type RenderOptions = {
  webcamHasAudio?: boolean;
  screenHasAudio?: boolean;
  /** Overrides the ffmpeg binary; defaults to `ffmpeg` on PATH. */
  ffmpegPath?: string;
};

function runCommand(cmd: string, args: readonly string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks = new Array<Buffer>();
    const errChunks = new Array<Buffer>();

    p.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    p.stderr.on('data', (chunk: Buffer) => errChunks.push(Buffer.from(chunk)));

    p.on('error', (err) => reject(err));
    p.on('close', (code, signal) => {
      if (code !== 0 || signal) {
        const stderr = Buffer.concat(errChunks).toString('utf8').trim();
        // A signal with no stderr is almost always the OOM killer; without
        // naming it the failure is indistinguishable from a filter-graph error.
        const how = signal ? `killed by ${signal}` : `exited ${code}`;
        return reject(new Error(`${cmd} ${how}${stderr ? `\n${stderr}` : ' (no stderr output)'}`));
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

// --- ffmpeg expression helpers ------------------------------------------------
//
// Every expression is emitted inside single quotes in the filter graph, so
// commas and colons inside them do not need escaping.

type Interval = readonly [number, number | null];

/**
 * Boolean `enable` expression covering a set of half-open intervals.
 *
 * Half-open matters: ffmpeg's `between()` is inclusive at both ends, so
 * adjacent intervals would both be active on a boundary frame and two layers
 * (or two numbers) would draw at once.
 */
function intervalsExpr(intervals: readonly Interval[]): string {
  if (intervals.length === 0) {
    return '0';
  }
  return intervals
    .map(([from, to]) =>
      to === null ? `gte(t,${from.toFixed(3)})` : `gte(t,${from.toFixed(3)})*lt(t,${to.toFixed(3)})`,
    )
    .join('+');
}

/** Escapes text for a single-quoted `drawtext=text='...'` value. */
export function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/%/g, '\\%');
}

/** Escapes a filesystem path used as a filter option value. */
function escapeFilterPath(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

type DrawTextSpec = {
  text: string;
  fontPath: string;
  fontSize: number;
  color: Rgba;
  x: string;
  y: string;
  alpha?: string;
  enable?: string;
};

function toRgbaOption(color: Rgba): string {
  const hex = (v: number): string => Math.round(v).toString(16).padStart(2, '0');
  return `0x${hex(color[0])}${hex(color[1])}${hex(color[2])}@${(color[3] / 255).toFixed(3)}`;
}

function drawText(spec: DrawTextSpec): string {
  const parts = [
    `fontfile='${escapeFilterPath(spec.fontPath)}'`,
    `text='${escapeDrawtext(spec.text)}'`,
    `fontcolor=${toRgbaOption(spec.color)}`,
    `fontsize=${spec.fontSize}`,
    `x='${spec.x}'`,
    `y='${spec.y}'`,
    'y_align=font',
  ];
  if (spec.alpha) {
    parts.push(`alpha='${spec.alpha}'`);
  }
  if (spec.enable) {
    parts.push(`enable='${spec.enable}'`);
  }
  return `drawtext=${parts.join(':')}`;
}

// --- probing ------------------------------------------------------------------

async function probeDurationSeconds(src: string): Promise<number> {
  try {
    const out = await runCommand('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=nw=1:nk=1',
      src,
    ]);
    const value = Number.parseFloat(out.toString('utf8').trim());
    return Number.isFinite(value) && value > 0 ? value : 20;
  } catch {
    return 20;
  }
}

// --- image preparation --------------------------------------------------------

/**
 * Normalises an arbitrary image into a decoded RGBA bitmap. `cover` scales up
 * and centre-crops to exactly the given box; otherwise the image is fit inside
 * it. Returns null when the file is unreadable rather than failing the render.
 */
async function loadImage(
  ffmpeg: string,
  src: string,
  width: number,
  height: number,
  mode: 'contain' | 'cover' = 'contain',
): Promise<DecodedImage | null> {
  const filter =
    mode === 'cover'
      ? `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height}`
      : `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos`;
  try {
    const png = await runCommand(ffmpeg, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      src,
      '-vf',
      filter,
      '-frames:v',
      '1',
      '-c:v',
      'png',
      '-f',
      'image2pipe',
      '-',
    ]);
    return decodePng(png);
  } catch {
    return null;
  }
}

// --- layer painting -----------------------------------------------------------

/**
 * The static frame drawn *over* the clips: patterned background, white header
 * and footer bars, card shadows, and rounded holes the clips show through.
 */
function paintFrameLayer(
  config: Configuration,
  background: DecodedImage | null,
  brandLogo: DecodedImage | null,
): Surface {
  const surface = new Surface(config.width, config.height);

  if (background) {
    surface.drawImageContain(background, 0, 0, config.width, config.height);
  } else {
    surface.fillRect(0, 0, config.width, config.height, parseColor(PALETTE.canvas));
  }

  // Card shadows go down before the holes are punched, so they survive.
  const shadow = parseColor('#000000', 0.5);
  for (const card of [WEBCAM_CARD, SCREEN_CARD]) {
    surface.dropShadowRoundRect(card.x, card.y, card.width, card.height, FRAME.cardRadius, 14, shadow);
  }

  surface.fillRect(0, 0, config.width, FRAME.headerHeight, parseColor(FRAME.barColor));
  surface.fillRect(0, FRAME.footerY, config.width, FRAME.footerHeight, parseColor(FRAME.barColor));

  if (brandLogo) {
    const size = 56;
    const x = 40;
    const y = (FRAME.headerHeight - size) / 2;
    // Drawn straight onto the white header bar with no backing plate; the brand
    // mark is expected to carry its own contrast against white.
    surface.drawImageContain(brandLogo, x, y, size, size);
  }

  for (const card of [WEBCAM_CARD, SCREEN_CARD]) {
    surface.clearRoundRect(card.x, card.y, card.width, card.height, FRAME.cardRadius);
  }

  return surface;
}

/** Banner card in a given colour, with the university crest baked in. */
function paintBannerLayer(background: string, crest: DecodedImage | null): Surface {
  const margin = 26;
  const surface = new Surface(BANNER.width + margin * 2, BANNER.height + margin * 2);
  const localX = margin;
  const localY = margin;

  surface.dropShadowRoundRect(
    localX,
    localY,
    BANNER.width,
    BANNER.height,
    BANNER.radius,
    16,
    parseColor('#000000', 0.45),
  );
  surface.fillRoundRect(localX, localY, BANNER.width, BANNER.height, BANNER.radius, parseColor(background));

  const crestCx = localX + (BANNER.crestCx - BANNER.x);
  const crestCy = localY + (BANNER.crestCy - BANNER.y);
  // The crest sits directly on the banner — no backing plate circle behind it.
  if (crest) {
    const inner = BANNER.crestRadius * 1.5;
    surface.drawImageContain(crest, crestCx - inner / 2, crestCy - inner / 2, inner, inner);
  }

  return surface;
}

/** Dark "Nth place" pill. Sized for the widest label it will ever show. */
function paintPlaceLayer(widestLabel: string, boldFont: string): { surface: Surface; x: number; y: number } {
  const textWidth = measureText(boldFont, widestLabel, FONT_SIZE.place);
  const width = Math.ceil(textWidth + PLACE_PILL.paddingX * 2);
  const margin = 20;

  const surface = new Surface(width + margin * 2, PLACE_PILL.height + margin * 2);
  surface.dropShadowRoundRect(
    margin,
    margin,
    width,
    PLACE_PILL.height,
    PLACE_PILL.radius,
    12,
    parseColor('#000000', 0.4),
  );
  surface.fillRoundRect(
    margin,
    margin,
    width,
    PLACE_PILL.height,
    PLACE_PILL.radius,
    parseColor(PALETTE.placeBackground),
  );

  return { surface, x: PLACE_PILL.right - width - margin, y: PLACE_PILL.y - margin };
}

// --- text helpers -------------------------------------------------------------

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (v: number): string => String(v).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// --- audio --------------------------------------------------------------------

function buildAudioFilter(webcamHasAudio: boolean, screenHasAudio: boolean): string {
  if (webcamHasAudio && screenHasAudio) {
    return '[0:a][1:a]amix=inputs=2:normalize=0[outa]';
  }
  if (webcamHasAudio) {
    return '[0:a]anull[outa]';
  }
  if (screenHasAudio) {
    return '[1:a]anull[outa]';
  }
  return 'anullsrc=channel_layout=stereo:sample_rate=48000[outa]';
}

// --- render -------------------------------------------------------------------

/**
 * Composites the two clips into the 1080x1920 reaction video and returns the
 * encoded MP4.
 *
 * All static decoration is baked into RGBA layers generated in-process (see
 * `png.ts`), which is what makes rounded corners, gradients and punched-out
 * card holes possible at all — `drawbox` alone cannot express them. Those
 * layers are opaque from the first frame; only the verdict reveal is animated,
 * via `enable` expressions keyed off the real judged time.
 */
export async function render(config: Configuration, params: Params, options?: RenderOptions): Promise<Buffer> {
  const ffmpeg = options?.ffmpegPath ?? 'ffmpeg';
  const fonts = {
    regular: config.fontPath,
    bold: config.fontPathBold?.trim() || config.fontPath,
    mono: config.fontPathMono?.trim() || config.fontPath,
  };

  const resolved = verdictColor(params.status);
  const hasPendingPhase = params.verdictAtSeconds !== undefined && params.verdictAtSeconds > 0;
  const reveal = resolveRevealTiming(params.revealTiming);
  const blinkDuration = reveal.blinkHalfPeriod * reveal.blinkCount;

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `reaction-render-${randomUUID()}-`));

  try {
    const [background, brandLogo, crest, duration] = await Promise.all([
      config.backgroundSrc
        ? loadImage(ffmpeg, config.backgroundSrc, config.width, config.height, 'cover')
        : Promise.resolve(null),
      loadImage(ffmpeg, config.logoSrc, 192, 192),
      loadImage(ffmpeg, params.university.logoSrc, 256, 256),
      probeDurationSeconds(params.webcamSrc),
    ]);

    // Hold the reveal a few seconds past the real judged instant so the flip
    // lands on the streamer's visible reaction rather than ahead of it. The
    // delay is clamped against the probed clip length: the blink and a short
    // settle hold must finish before the clip ends, otherwise the reveal would
    // fall off the end of a short slice and the banner would stay pending
    // forever. A slice too short even for the undelayed reveal collapses the
    // delay to zero, preserving the prior behaviour.
    const rawVerdictAt = hasPendingPhase ? (params.verdictAtSeconds as number) : 0;
    const revealTail = blinkDuration + REVEAL_MIN_HOLD;
    const maxDelay = Math.max(0, duration - rawVerdictAt - revealTail);
    const revealDelay = hasPendingPhase ? Math.min(reveal.revealDelaySeconds, maxDelay) : 0;
    const verdictAt = hasPendingPhase ? rawVerdictAt + revealDelay : 0;
    const settleAt = hasPendingPhase ? verdictAt + blinkDuration : 0;

    const frame = paintFrameLayer(config, background, brandLogo);
    const bannerPending = paintBannerLayer(PENDING_COLOR, crest);
    const bannerResult = paintBannerLayer(resolved, crest);

    const placeLabels = [ordinal(params.rank.after || 1), ordinal(params.rank.before || 1)];
    const widestPlace = placeLabels.reduce((a, b) => (a.length >= b.length ? a : b));
    const place = paintPlaceLayer(`${widestPlace} place`, fonts.bold);

    const framePath = path.join(workDir, 'frame.png');
    const pendingPath = path.join(workDir, 'banner-pending.png');
    const resultPath = path.join(workDir, 'banner-result.png');
    const placePath = path.join(workDir, 'place.png');
    const outputPath = path.join(workDir, 'out.mp4');

    await Promise.all([
      fs.writeFile(framePath, frame.toPngBuffer()),
      fs.writeFile(pendingPath, bannerPending.toPngBuffer()),
      fs.writeFile(resultPath, bannerResult.toPngBuffer()),
      fs.writeFile(placePath, place.surface.toPngBuffer()),
    ]);

    const inputs: string[] = [
      '-i',
      params.webcamSrc,
      '-i',
      params.screenSrc,
      '-loop',
      '1',
      '-framerate',
      '30',
      '-i',
      framePath,
      '-loop',
      '1',
      '-framerate',
      '30',
      '-i',
      pendingPath,
      '-loop',
      '1',
      '-framerate',
      '30',
      '-i',
      resultPath,
      '-loop',
      '1',
      '-framerate',
      '30',
      '-i',
      placePath,
    ];
    const FRAME_IN = 2;
    const PENDING_IN = 3;
    const RESULT_IN = 4;
    const PLACE_IN = 5;

    // Verdict reveal: alternate pending/verdict colour, then settle.
    const pendingIntervals: Interval[] = [];
    const resultIntervals: Interval[] = [];
    if (hasPendingPhase) {
      pendingIntervals.push([0, verdictAt]);
      for (let i = 0; i < reveal.blinkCount; ++i) {
        const from = verdictAt + i * reveal.blinkHalfPeriod;
        const to = from + reveal.blinkHalfPeriod;
        (i % 2 === 0 ? resultIntervals : pendingIntervals).push([from, to]);
      }
      resultIntervals.push([settleAt, null]);
    } else {
      resultIntervals.push([0, null]);
    }

    const pendingEnable = intervalsExpr(pendingIntervals);
    const resultEnable = intervalsExpr(resultIntervals);

    type CardRect = { readonly width: number; readonly height: number };
    const cardFill = (label: string, out: string, card: CardRect): string =>
      `[${label}]setpts=PTS-STARTPTS,scale=${card.width}:${card.height}:force_original_aspect_ratio=increase,` +
      `crop=${card.width}:${card.height},setsar=1[${out}]`;

    const graph: string[] = [
      cardFill('0:v', 'wc_card', WEBCAM_CARD),
      cardFill('1:v', 'sc_card', SCREEN_CARD),
      buildAudioFilter(options?.webcamHasAudio ?? true, options?.screenHasAudio ?? true),

      // Clips first; the frame layer then covers everything but the card holes.
      `[wc_card]pad=${CANVAS.width}:${CANVAS.height}:${WEBCAM_CARD.x}:${WEBCAM_CARD.y}:color=${PALETTE.canvas},format=rgba[base0]`,
      `[base0][sc_card]overlay=${SCREEN_CARD.x}:${SCREEN_CARD.y}[base1]`,
      `[${FRAME_IN}:v]format=rgba[frame]`,
      '[base1][frame]overlay=0:0:format=auto[c0]',
    ];

    // Header and footer text on the white bars.
    const barText = parseColor(FRAME.barForeground);
    const chromeTexts: string[] = [
      drawText({
        text: config.text.headerLeft,
        fontPath: fonts.bold,
        fontSize: FONT_SIZE.headerBrand,
        color: barText,
        x: `${40 + 56 + 22}`,
        y: `${(FRAME.headerHeight - FONT_SIZE.headerBrand) / 2}`,
      }),
    ];
    if (config.text.headerRight.trim()) {
      chromeTexts.push(
        drawText({
          text: config.text.headerRight,
          fontPath: fonts.bold,
          fontSize: FONT_SIZE.headerTag,
          color: barText,
          x: 'w-text_w-40',
          y: `${(FRAME.headerHeight - FONT_SIZE.headerTag) / 2}`,
        }),
      );
    }
    if (config.text.footer.trim()) {
      chromeTexts.push(
        drawText({
          text: config.text.footer,
          fontPath: fonts.bold,
          fontSize: FONT_SIZE.footer,
          color: barText,
          x: '(w-text_w)/2',
          y: `${FRAME.footerY + (FRAME.footerHeight - FONT_SIZE.footer) / 2}`,
        }),
      );
    }
    graph.push(`[c0]${chromeTexts.join(',')}[c1]`);

    // Banner: the two colour states share a slide, toggled by `enable`.
    const bannerMargin = 26;
    const bannerX = BANNER.x - bannerMargin;
    const bannerY = BANNER.y - bannerMargin;
    graph.push(
      `[${PENDING_IN}:v]format=rgba[bpend]`,
      `[${RESULT_IN}:v]format=rgba[bres]`,
      `[c1][bpend]overlay=x=${bannerX}:y=${bannerY}:format=auto:enable='${pendingEnable}'[c2]`,
      `[c2][bres]overlay=x=${bannerX}:y=${bannerY}:format=auto:enable='${resultEnable}'[c3]`,
    );

    // Banner text. White reads on amber, green and red alike, so it does not
    // need to change with the verdict state.
    const bannerFg = readableForeground(resolved);
    const textWidth = BANNER.problemCx - 70 - BANNER.textX;
    const teamFontSize = fitFontSize(
      fonts.bold,
      params.teamName,
      textWidth,
      FONT_SIZE.teamNameMin,
      FONT_SIZE.teamNameMax,
    );
    const teamLines = wrapText(fonts.bold, params.teamName, teamFontSize, textWidth, 2);

    // Centre the block so a one-line name does not float at the top of the
    // banner the way a two-line one correctly sits.
    const blockHeight = (teamLines.length - 1) * BANNER.teamLineHeight + teamFontSize;
    const teamTop = Math.round(
      BANNER.teamRegionTop + (BANNER.teamRegionBottom - BANNER.teamRegionTop - blockHeight) / 2,
    );

    const bannerTexts: string[] = teamLines.map((line, index) =>
      drawText({
        text: line,
        fontPath: fonts.bold,
        fontSize: teamFontSize,
        color: bannerFg,
        x: `${BANNER.textX}`,
        y: `${teamTop + index * BANNER.teamLineHeight}`,
      }),
    );

    const subtitle = [params.university.name, params.hashtag ? `#${params.hashtag}` : ''].filter(Boolean).join('  ');
    if (subtitle) {
      bannerTexts.push(
        drawText({
          text: ellipsizeText(fonts.regular, subtitle, FONT_SIZE.subtitle, textWidth),
          fontPath: fonts.regular,
          fontSize: FONT_SIZE.subtitle,
          color: [bannerFg[0], bannerFg[1], bannerFg[2], 225],
          x: `${BANNER.textX}`,
          y: `${BANNER.subtitleY}`,
        }),
      );
    }

    bannerTexts.push(
      drawText({
        text: params.problem,
        fontPath: fonts.bold,
        fontSize: FONT_SIZE.problemLetter,
        color: bannerFg,
        x: `${BANNER.problemCx}-text_w/2`,
        y: `${Math.round(BANNER.problemCy - FONT_SIZE.problemLetter * 0.52)}`,
      }),
    );

    // Ticking contest clock, one drawtext per second of the clip.
    let clockWidth = 0;
    if (params.clockStartSeconds !== undefined) {
      clockWidth = measureText(fonts.mono, '00:00:00', FONT_SIZE.meta);
      const seconds = Math.ceil(duration);
      for (let s = 0; s < seconds; ++s) {
        bannerTexts.push(
          drawText({
            text: formatClock(params.clockStartSeconds + s),
            fontPath: fonts.mono,
            fontSize: FONT_SIZE.meta,
            color: [bannerFg[0], bannerFg[1], bannerFg[2], 235],
            x: `${BANNER.metaRight}-text_w`,
            y: `${BANNER.subtitleY - 2}`,
            enable: intervalsExpr([[s, s + 1]]),
          }),
        );
      }
    }

    // Judging indicator: cycling dots while pending, verdict letters after.
    const metaX = `${Math.round(BANNER.metaRight - clockWidth - (clockWidth > 0 ? 22 : 0))}-text_w`;
    if (hasPendingPhase) {
      // Dots keep cycling through the blink, so the slot is never empty before
      // the verdict letters take over at settle.
      const dots = ['.', '..', '...'];
      const cycles = Math.ceil(settleAt / reveal.dotPeriod);
      for (let i = 0; i < cycles; ++i) {
        const from = i * reveal.dotPeriod;
        const to = Math.min(from + reveal.dotPeriod, settleAt);
        if (to <= from) {
          break;
        }
        bannerTexts.push(
          drawText({
            text: dots[i % dots.length],
            fontPath: fonts.mono,
            fontSize: FONT_SIZE.meta,
            color: [bannerFg[0], bannerFg[1], bannerFg[2], 200],
            x: metaX,
            y: `${BANNER.subtitleY - 2}`,
            enable: intervalsExpr([[from, to]]),
          }),
        );
      }
    }
    bannerTexts.push(
      drawText({
        text: params.status,
        fontPath: fonts.mono,
        fontSize: FONT_SIZE.meta,
        color: [bannerFg[0], bannerFg[1], bannerFg[2], 235],
        x: metaX,
        y: `${BANNER.subtitleY - 2}`,
        enable: intervalsExpr([[settleAt, null]]),
      }),
    );

    graph.push(`[c3]${bannerTexts.join(',')}[c4]`);

    // Place pill: holds the old rank, then resolves while the banner blinks.
    graph.push(
      `[${PLACE_IN}:v]format=rgba[placepill]`,
      `[c4][placepill]overlay=x=${place.x}:y=${place.y}:format=auto[c5]`,
    );

    const placeCx = PLACE_PILL.right - (place.surface.width - 40) / 2;
    const placeTextY = `${Math.round(PLACE_PILL.y + (PLACE_PILL.height - FONT_SIZE.place) / 2)}`;
    const placeTexts = rankCountSteps(params.rank, verdictAt, hasPendingPhase, reveal.rankCountDuration).map((step) =>
      drawText({
        text: `${ordinal(step.value)} place`,
        fontPath: fonts.bold,
        fontSize: FONT_SIZE.place,
        color: parseColor(PALETTE.placeForeground),
        x: `${Math.round(placeCx)}-text_w/2`,
        y: placeTextY,
        enable: step.enable,
      }),
    );
    graph.push(`[c5]${placeTexts.join(',')}[c6]`);

    graph.push('[c6]format=yuv420p[outv]');

    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      ...inputs,
      '-filter_complex',
      graph.join('; '),
      // The reaction worker runs at concurrency 1 on a shared box, and this
      // graph carries ~50 drawtext filters over six inputs. Letting ffmpeg fan
      // out over every core costs far more memory than the render saves in
      // wall-clock, so both the filter and encoder stages stay single-threaded.
      '-filter_threads',
      '1',
      '-map',
      '[outv]',
      '-map',
      '[outa]',
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '21',
      '-preset',
      'veryfast',
      '-threads',
      '1',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '48000',
      '-ac',
      '2',
      // Looping PNG layers and generated silence make the output streams
      // unbounded, so cap them to the duration already probed from the clip.
      '-t',
      String(duration),
      // Retain the existing shortest-stream guard as an additional safeguard.
      '-shortest',
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ];

    await runCommand(ffmpeg, args);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

type RankStep = { value: number; enable: string };

/**
 * Discrete frames of the rank count-up. The pill holds the old rank until the
 * judge finishes, ticks to the new one while the banner blinks, then stays.
 */
function rankCountSteps(
  rank: Params['rank'],
  verdictAt: number,
  hasPendingPhase: boolean,
  rankCountDuration: number,
): RankStep[] {
  const { before, after } = rank;
  const target = after > 0 ? after : before;
  if (!(before > 0) || !(after > 0) || before === after) {
    return [{ value: target || 1, enable: 'gte(t,0)' }];
  }

  if (!hasPendingPhase) {
    return [{ value: after, enable: 'gte(t,0)' }];
  }

  const total = Math.min(10, Math.abs(before - after));
  const step = rankCountDuration / total;
  const steps: RankStep[] = [{ value: before, enable: intervalsExpr([[0, verdictAt]]) }];

  for (let i = 1; i <= total; ++i) {
    const value = Math.round(before + ((after - before) * i) / total);
    const from = verdictAt + step * (i - 1);
    const to = verdictAt + step * i;
    steps.push({
      value,
      enable: intervalsExpr([[from, i === total ? null : to]]),
    });
  }

  return steps;
}
