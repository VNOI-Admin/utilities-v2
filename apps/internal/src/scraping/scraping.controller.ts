import { Controller, Get } from '@nestjs/common';
import { ScrapingService, RankingEntry, SubmissionEntry } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Get('vnoi-ranking')
  async getVNOIRanking(): Promise<RankingEntry[]> {
    return this.scrapingService.scrapeVNOIRanking();
  }

  @Get('vnoi-submissions')
  async getVNOISubmissions(): Promise<SubmissionEntry[]> {
    return this.scrapingService.scrapeVNOISubmissions();
  }
}
