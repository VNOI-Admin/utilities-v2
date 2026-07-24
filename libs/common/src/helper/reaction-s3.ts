import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export class ReactionS3ConfigError extends Error {
  override readonly name = 'ReactionS3ConfigError';
}

export type ReactionS3Config = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  keyPrefix: string;
  publicBaseUrl: string;
};

function requireS3Env(get: (key: string) => string | undefined, key: string): string {
  const v = get(key);
  if (!v || !v.trim()) {
    throw new ReactionS3ConfigError(`Missing required env for S3: ${key}`);
  }
  return v.trim();
}

/**
 * Reads S3 configuration from env (via ConfigService.get).
 *
 * Required: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * REACTION_S3_BUCKET, REACTION_S3_PUBLIC_BASE_URL.
 * Optional: REACTION_S3_KEY_PREFIX (default "reactions").
 */
export function readReactionS3Env(get: (key: string) => string | undefined): ReactionS3Config {
  return {
    region: requireS3Env(get, 'AWS_REGION'),
    accessKeyId: requireS3Env(get, 'AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireS3Env(get, 'AWS_SECRET_ACCESS_KEY'),
    bucket: requireS3Env(get, 'REACTION_S3_BUCKET'),
    keyPrefix: get('REACTION_S3_KEY_PREFIX')?.trim() || 'reactions',
    publicBaseUrl: requireS3Env(get, 'REACTION_S3_PUBLIC_BASE_URL'),
  };
}

export function createReactionS3Client(config: ReactionS3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/** S3 prefix for listing objects under the same path as uploads (`{keyPrefix}/` or `''`). */
export function reactionS3ListPrefix(config: ReactionS3Config): string {
  return config.keyPrefix ? `${config.keyPrefix}/` : '';
}

/** Public URL for an object key exactly as returned by S3 (e.g. `reactions/id.webm`). */
export function reactionObjectPublicUrl(config: ReactionS3Config, fullKey: string): string {
  const baseUrl = config.publicBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}/${fullKey}`;
}

export type ReactionVideoListItem = {
  key: string;
  url: string;
  lastModified?: Date;
  size?: number;
};

/** Renders are MP4 now; `.webm` stays listed so older objects remain visible. */
const REACTION_VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const;

/**
 * Lists reaction video objects under the reaction prefix, paged until complete.
 */
export async function listReactionVideoObjects(
  client: S3Client,
  config: ReactionS3Config,
): Promise<ReactionVideoListItem[]> {
  const prefix = reactionS3ListPrefix(config);
  const out: ReactionVideoListItem[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of response.Contents ?? []) {
      const key = obj.Key;
      const lower = key?.toLowerCase();
      if (!key || !lower || !REACTION_VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        continue;
      }
      out.push({
        key,
        url: reactionObjectPublicUrl(config, key),
        lastModified: obj.LastModified,
        size: obj.Size,
      });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return out;
}

/**
 * Full object keys a submission's reaction could be stored under, across every
 * known extension. The current renderer only emits `.mp4`, but older objects may
 * still be `.webm`, so a delete has to sweep both.
 */
export function reactionVideoKeysForSubmission(config: ReactionS3Config, submissionId: string): string[] {
  const prefix = reactionS3ListPrefix(config);
  return REACTION_VIDEO_EXTENSIONS.map((ext) => `${prefix}${submissionId}${ext}`);
}

/**
 * Deletes the stored reaction video(s) for the given submission ids, across every
 * known extension. S3 deletes are idempotent — absent keys are a no-op — so this
 * is safe to call before a re-render whether or not a clip currently exists.
 * Batched to S3's 1000-key-per-request limit.
 */
export async function deleteReactionVideos(
  client: S3Client,
  config: ReactionS3Config,
  submissionIds: string[],
): Promise<void> {
  const keys = submissionIds.flatMap((id) => reactionVideoKeysForSubmission(config, id));
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}

/**
 * Uploads a rendered reaction video to S3 under `{keyPrefix}/{key}` and returns
 * the public URL built from REACTION_S3_PUBLIC_BASE_URL.
 */
export async function putReactionVideo(
  client: S3Client,
  config: ReactionS3Config,
  key: string,
  body: Buffer,
  contentType = 'video/mp4',
): Promise<string> {
  const fullKey = config.keyPrefix ? `${config.keyPrefix}/${key}` : key;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: fullKey,
      Body: body,
      ContentType: contentType,
    }),
  );

  return reactionObjectPublicUrl(config, fullKey);
}
