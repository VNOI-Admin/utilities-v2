import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScrapingController } from './scraping.controller';
import { ScrapingService } from './scraping.service';

@Module({
  imports: [ConfigModule],
  controllers: [ScrapingController],
  providers: [ScrapingService],
  exports: [ScrapingService],
})
export class ScrapingModule {}
