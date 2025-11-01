import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VnojApi, VNOJ_API_CLIENT } from './vnoj';

@Module({})
export class VnojApiModule {
  static forRootAsync(): DynamicModule {
    return {
      module: VnojApiModule,
      providers: [
        {
          provide: VNOJ_API_CLIENT,
          useFactory: (configService: ConfigService) => {
            const baseUrl = configService.get('VNOJ_API_BASE_URL') || 'https://oj.vnoi.info';
            const apiKey = configService.get('VNOJ_API_KEY');

            const client = new VnojApi({
              baseURL: baseUrl,
            });

            if (apiKey) {
              client.setGlobalApiKey(apiKey);
            }

            return client;
          },
          inject: [ConfigService],
        },
      ],
      exports: [VNOJ_API_CLIENT],
      global: true,
    };
  }
}
