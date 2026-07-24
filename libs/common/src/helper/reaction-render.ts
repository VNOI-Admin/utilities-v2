import { constants, accessSync } from 'node:fs';
import * as path from 'node:path';

import type { ReactionRevealTiming } from './reaction-timing';
import type { Configuration, Params } from './renderer';
import { escapeDrawtext, render } from './renderer';
import { probeHasAudio } from './renderer-audio';

export class ReactionRenderConfigError extends Error {
  override readonly name = 'ReactionRenderConfigError';
}

export type ReactionRenderEnvLoaded = {
  /** Optional patterned brand background behind the cards. */
  backgroundSrc: string;
  logoSrc: string;
  fontPath: string;
  fontPathBold: string;
  fontPathMono: string;
  universityLogoDir: string;
  universityLogoExt: string;
  /** Optional; when unset the brand logo stands in for a missing crest. */
  universityLogoFallback: string;
  headerLeft: string;
  headerRight: string;
  footer: string;
};

function requireEnv(get: (key: string) => string | undefined, key: string): string {
  const v = get(key);
  if (!v || !v.trim()) {
    throw new ReactionRenderConfigError(`Missing required env: ${key}`);
  }
  return v.trim();
}

/**
 * Reads reaction renderer paths and labels from process/env (via ConfigService.get).
 *
 * Required: REACTION_RENDERER_LOGO, REACTION_RENDERER_FONT.
 * Optional: REACTION_RENDERER_BACKGROUND, REACTION_RENDERER_FONT_BOLD,
 * REACTION_RENDERER_FONT_MONO, REACTION_UNIVERSITY_LOGO_DIR,
 * REACTION_UNIVERSITY_LOGO_EXT, REACTION_UNIVERSITY_LOGO_FALLBACK,
 * REACTION_TEXT_HEADER_LEFT, REACTION_TEXT_HEADER_RIGHT, REACTION_TEXT_FOOTER.
 */
export function readReactionRenderEnv(get: (key: string) => string | undefined): ReactionRenderEnvLoaded {
  const logoSrc = requireEnv(get, 'REACTION_RENDERER_LOGO');
  const fontPath = requireEnv(get, 'REACTION_RENDERER_FONT');

  return {
    backgroundSrc: get('REACTION_RENDERER_BACKGROUND')?.trim() || '',
    logoSrc,
    fontPath,
    fontPathBold: get('REACTION_RENDERER_FONT_BOLD')?.trim() || fontPath,
    fontPathMono: get('REACTION_RENDERER_FONT_MONO')?.trim() || fontPath,
    universityLogoDir: get('REACTION_UNIVERSITY_LOGO_DIR')?.trim() || '',
    universityLogoExt: get('REACTION_UNIVERSITY_LOGO_EXT')?.trim() || '.png',
    universityLogoFallback: get('REACTION_UNIVERSITY_LOGO_FALLBACK')?.trim() || '',
    headerLeft: get('REACTION_TEXT_HEADER_LEFT')?.trim() || 'VNOI',
    headerRight: get('REACTION_TEXT_HEADER_RIGHT')?.trim() || '',
    footer: get('REACTION_TEXT_FOOTER')?.trim() || 'Reaction',
  };
}

/**
 * Safe filename segment for `{REACTION_UNIVERSITY_LOGO_DIR}/{slug}{ext}`.
 */
export function slugGroupForLogoFilename(group: string): string {
  const raw = group.trim();
  if (!raw) {
    return '_default';
  }
  const slug = raw
    .split('')
    .map((c) => (/[a-zA-Z0-9._-]/.test(c) ? c : '_'))
    .join('')
    .replace(/_+/g, '_')
    .slice(0, 120);
  return slug || '_default';
}

function isReadable(target: string): boolean {
  try {
    accessSync(target, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the crest shown in the verdict strip.
 *
 * Users without a group, or whose group has no crest on disk, fall back to the
 * VNOI brand logo (rescaled into the avatar plate) rather than failing the
 * render — a missing crest should never cost us a reaction video.
 */
export function resolveUniversityLogoAbsolutePath(
  env: ReactionRenderEnvLoaded,
  userGroup: string | undefined,
  logWarn?: (message: string) => void,
): string {
  const group = userGroup?.trim() ?? '';

  if (group && env.universityLogoDir) {
    const slug = slugGroupForLogoFilename(group);
    const primary = path.resolve(path.join(env.universityLogoDir, `${slug}${env.universityLogoExt}`));
    if (isReadable(primary)) {
      return primary;
    }
    logWarn?.(`University logo not found for group="${group}" at ${primary}; using brand logo`);
  } else if (!group) {
    logWarn?.('User has no group; using brand logo in place of a university crest');
  }

  if (env.universityLogoFallback) {
    const fallback = path.resolve(env.universityLogoFallback);
    if (isReadable(fallback)) {
      return fallback;
    }
    logWarn?.(`REACTION_UNIVERSITY_LOGO_FALLBACK is not readable at ${fallback}; using brand logo`);
  }

  return path.resolve(env.logoSrc);
}

/**
 * Escapes text for ffmpeg `drawtext=text='...'` (single-quoted) segments.
 *
 * @deprecated The renderer escapes its own text; this remains for callers that
 * build drawtext fragments directly.
 */
export function sanitizeDrawtext(text: string): string {
  return escapeDrawtext(text);
}

function getDefaultReactionConfiguration(env: ReactionRenderEnvLoaded): Configuration {
  return {
    backgroundSrc: env.backgroundSrc || undefined,
    logoSrc: env.logoSrc,
    fontPath: env.fontPath,
    fontPathBold: env.fontPathBold,
    fontPathMono: env.fontPathMono,
    width: 1080,
    height: 1920,
    text: {
      headerLeft: env.headerLeft,
      headerRight: env.headerRight,
      footer: env.footer,
    },
  };
}

export type ReactionSubmissionInput = {
  author: string;
  problem_code: string;
  submissionStatus?: string;
  data: {
    old_rank: number;
    new_rank: number;
  };
};

export type ReactionUserInput = {
  fullName?: string;
  group?: string;
};

export type ReactionTiming = {
  /**
   * Seconds into the clip at which the judge finished. The banner stays amber
   * ("pending") until this moment, then blinks and settles on the verdict
   * colour. Omit when the judged time is unknown — the pending phase is then
   * skipped rather than faked.
   */
  verdictAtSeconds?: number;
  /** Contest elapsed seconds at clip t=0, for the ticking clock. */
  clockStartSeconds?: number;
  /**
   * Operator-tunable reveal timing (hold delay, blink, rank count-up, dots),
   * resolved from settings/env by the caller. Omit to use the built-in defaults.
   */
  revealTiming?: Partial<ReactionRevealTiming>;
};

/** `Ho Chi Minh City University` -> `HoChiMinhCityUniversity` */
export function hashtagFromGroup(group: string | undefined): string | undefined {
  const compact = (group ?? '').replace(/[^a-zA-Z0-9]/g, '');
  return compact ? compact : undefined;
}

export function buildReactionParamsPartial(
  submission: ReactionSubmissionInput,
  user: ReactionUserInput,
  universityLogoAbsolutePath: string,
  timing?: ReactionTiming,
): Omit<Params, 'webcamSrc' | 'screenSrc'> {
  const teamName = (user.fullName?.trim() || submission.author).trim();
  // Left blank when the user has no group: the banner then shows the team name
  // alone instead of a placeholder university.
  const universityName = user.group?.trim() ?? '';

  return {
    teamName,
    university: {
      name: universityName,
      logoSrc: universityLogoAbsolutePath,
    },
    hashtag: hashtagFromGroup(user.group),
    problem: submission.problem_code,
    rank: {
      before: submission.data.old_rank,
      after: submission.data.new_rank,
    },
    status: submission.submissionStatus ?? 'AC',
    verdictAtSeconds: timing?.verdictAtSeconds,
    clockStartSeconds: timing?.clockStartSeconds,
    revealTiming: timing?.revealTiming,
  };
}

/**
 * Probes both slice files for audio, then renders the reaction MP4.
 * No intermediate temp files — audio absence is handled in the filter graph.
 */
export async function renderReactionVideoFromSlicePaths(
  envLoaded: ReactionRenderEnvLoaded,
  webcamSrc: string,
  screenSrc: string,
  paramsPartial: Omit<Params, 'webcamSrc' | 'screenSrc'>,
): Promise<Buffer> {
  const config = getDefaultReactionConfiguration(envLoaded);

  const [webcamHasAudio, screenHasAudio] = await Promise.all([probeHasAudio(webcamSrc), probeHasAudio(screenSrc)]);

  return render(config, { ...paramsPartial, webcamSrc, screenSrc }, { webcamHasAudio, screenHasAudio });
}
