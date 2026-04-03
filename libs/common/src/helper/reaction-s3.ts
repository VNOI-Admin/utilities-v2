import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

/**
 * Uploads a WebM buffer to S3 under `{keyPrefix}/{key}` and returns
 * the public URL built from REACTION_S3_PUBLIC_BASE_URL.
 */
export async function putReactionWebm(
  client: S3Client,
  config: ReactionS3Config,
  key: string,
  body: Buffer,
): Promise<string> {
  const fullKey = config.keyPrefix ? `${config.keyPrefix}/${key}` : key;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: fullKey,
      Body: body,
      ContentType: 'video/webm',
    }),
  );

  const baseUrl = config.publicBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}/${fullKey}`;
}
