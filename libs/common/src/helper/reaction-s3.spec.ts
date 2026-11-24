import type { S3Client } from '@aws-sdk/client-s3';
import { putReactionVideo, type ReactionS3Config } from './reaction-s3';

const config: ReactionS3Config = {
  region: 'sgp1',
  accessKeyId: 'id',
  secretAccessKey: 'secret',
  bucket: 'vnoi-reactions',
  keyPrefix: 'reactions',
  publicBaseUrl: 'https://vnoi-reactions.sgp1.digitaloceanspaces.com',
};

describe('putReactionVideo', () => {
  it('uploads the video publicly readable so viewers can play it from the public URL', async () => {
    const send = jest.fn().mockResolvedValue({});
    const url = await putReactionVideo({ send } as unknown as S3Client, config, '123.mp4', Buffer.from('v'));

    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'vnoi-reactions',
      Key: 'reactions/123.mp4',
      ACL: 'public-read',
    });
    expect(url).toBe('https://vnoi-reactions.sgp1.digitaloceanspaces.com/reactions/123.mp4');
  });
});
