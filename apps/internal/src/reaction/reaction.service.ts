import {
  ReactionS3ConfigError,
  createReactionS3Client,
  listReactionWebmObjects,
  readReactionS3Env,
} from '@libs/common/helper/reaction-s3';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ReactionVideoListItemDto } from './dtos/reaction-video-list-item.dto';

@Injectable()
export class ReactionService {
  constructor(private readonly configService: ConfigService) {}

  async listRenderedWebms(): Promise<ReactionVideoListItemDto[]> {
    let config;
    try {
      config = readReactionS3Env((key) => this.configService.get<string>(key));
    } catch (error) {
      if (error instanceof ReactionS3ConfigError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }

    const client = createReactionS3Client(config);
    const items = await listReactionWebmObjects(client, config);

    return items.map((item) => ({
      key: item.key,
      url: item.url,
      lastModified: item.lastModified?.toISOString(),
      size: item.size,
    }));
  }
}
