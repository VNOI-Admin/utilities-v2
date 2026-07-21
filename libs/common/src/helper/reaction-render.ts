import { constants, accessSync } from 'node:fs';
import * as path from 'node:path';

import type { Configuration, Params } from './renderer';
import { render } from './renderer';
import { probeHasAudio } from './renderer-audio';

export class ReactionRenderConfigError extends Error {
  override readonly name = 'ReactionRenderConfigError';
}

export class ReactionLogoError extends Error {
  override readonly name = 'ReactionLogoError';
}

export type ReactionRenderEnvLoaded = {
  backgroundSrc: string;
  logoSrc: string;
  fontPath: string;
  universityLogoDir: string;
  universityLogoExt: string;
  universityLogoFallback: string;
  defaultUniversityName: string;
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
 * Required: REACTION_RENDERER_BACKGROUND, REACTION_RENDERER_LOGO, REACTION_RENDERER_FONT,
 * REACTION_UNIVERSITY_LOGO_DIR, REACTION_UNIVERSITY_LOGO_FALLBACK.
 * Optional: REACTION_UNIVERSITY_LOGO_EXT, REACTION_DEFAULT_UNIVERSITY_NAME,
 * REACTION_TEXT_HEADER_LEFT, REACTION_TEXT_HEADER_RIGHT, REACTION_TEXT_FOOTER.
 */
export function readReactionRenderEnv(get: (key: string) => string | undefined): ReactionRenderEnvLoaded {
  return {
    backgroundSrc: requireEnv(get, 'REACTION_RENDERER_BACKGROUND'),
    logoSrc: requireEnv(get, 'REACTION_RENDERER_LOGO'),
    fontPath: requireEnv(get, 'REACTION_RENDERER_FONT'),
    universityLogoDir: requireEnv(get, 'REACTION_UNIVERSITY_LOGO_DIR'),
    universityLogoExt: get('REACTION_UNIVERSITY_LOGO_EXT')?.trim() || '.png',
    universityLogoFallback: requireEnv(get, 'REACTION_UNIVERSITY_LOGO_FALLBACK'),
    defaultUniversityName: get('REACTION_DEFAULT_UNIVERSITY_NAME')?.trim() || 'University',
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

/**
 * Resolves an absolute path for the university logo; falls back when the primary file is missing.
 */
export function resolveUniversityLogoAbsolutePath(
  env: ReactionRenderEnvLoaded,
  userGroup: string | undefined,
  logWarn?: (message: string) => void,
): string {
  const slug = slugGroupForLogoFilename(userGroup ?? '');
  const primary = path.resolve(path.join(env.universityLogoDir, `${slug}${env.universityLogoExt}`));
  try {
    accessSync(primary, constants.R_OK);
    return primary;
  } catch {
    logWarn?.(
      `University logo not found for group="${userGroup ?? ''}" at ${primary}; using REACTION_UNIVERSITY_LOGO_FALLBACK`,
    );
  }

  const fallback = path.resolve(env.universityLogoFallback);
  try {
    accessSync(fallback, constants.R_OK);
    return fallback;
  } catch {
    throw new ReactionLogoError(
      `University logo missing: primary ${primary} and fallback ${fallback} are not readable`,
    );
  }
}

/**
 * Escapes text for ffmpeg `drawtext=text='...'` (single-quoted) segments.
 */
export function sanitizeDrawtext(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
}

function getDefaultReactionConfiguration(env: ReactionRenderEnvLoaded): Configuration {
  return {
    backgroundSrc: env.backgroundSrc,
    logoSrc: env.logoSrc,
    fontPath: env.fontPath,
    padding: 40,
    width: 1080,
    height: 1920,
    barHeight: 80,
    fontSize: {
      base: 24,
      teamName: 32,
      universityName: 20,
      problem: 28,
    },
    style: {
      base: {
        background: '#0f172a',
        foreground: '#f8fafc',
      },
      banner: {
        background: '#1e293b',
        foreground: '#f8fafc',
      },
    },
    text: {
      headerLeft: sanitizeDrawtext(env.headerLeft),
      headerRight: sanitizeDrawtext(env.headerRight),
      footer: sanitizeDrawtext(env.footer),
    },
  };
}

export type ReactionSubmissionInput = {
  author: string;
  problem_code: string;
  data: {
    old_rank: number;
    new_rank: number;
  };
};

export type ReactionUserInput = {
  fullName?: string;
  group?: string;
};

export function buildReactionParamsPartial(
  submission: ReactionSubmissionInput,
  user: ReactionUserInput,
  universityLogoAbsolutePath: string,
  defaultUniversityName: string,
): Omit<Params, 'webcamSrc' | 'screenSrc'> {
  const teamName = (user.fullName?.trim() || submission.author).trim();
  const universityName = (user.group?.trim() || defaultUniversityName).trim();
  return {
    teamName,
    university: {
      name: universityName,
      logoSrc: universityLogoAbsolutePath,
    },
    problem: submission.problem_code,
    rank: {
      before: submission.data.old_rank,
      after: submission.data.new_rank,
    },
    status: 'AC',
  };
}

/**
 * Probes both slice files for audio, then renders an MP4 via `render()`.
 * No intermediate temp files — audio absence is handled in the filter graph.
 */
export async function renderReactionMp4FromSlicePaths(
  envLoaded: ReactionRenderEnvLoaded,
  webcamSrc: string,
  screenSrc: string,
  paramsPartial: Omit<Params, 'webcamSrc' | 'screenSrc'>,
): Promise<Buffer> {
  const config = getDefaultReactionConfiguration(envLoaded);

  const [webcamHasAudio, screenHasAudio] = await Promise.all([probeHasAudio(webcamSrc), probeHasAudio(screenSrc)]);

  const params: Params = {
    webcamSrc,
    screenSrc,
    teamName: sanitizeDrawtext(paramsPartial.teamName),
    university: {
      name: sanitizeDrawtext(paramsPartial.university.name),
      logoSrc: paramsPartial.university.logoSrc,
    },
    problem: sanitizeDrawtext(paramsPartial.problem),
    rank: paramsPartial.rank,
    status: paramsPartial.status,
  };

  return render(config, params, { webcamHasAudio, screenHasAudio });
}
