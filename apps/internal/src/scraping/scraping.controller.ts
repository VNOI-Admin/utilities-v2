import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { ScrapingService, RankingEntry, SubmissionEntry } from './scraping.service';

// Scraped data is enriched with full names resolved from the internal user
// database, and each request fans out 1-2 outbound scrapes plus one DB query
// per row - staff-only, like every other internal controller.
@UseGuards(AccessTokenGuard)
@RequiredRoles(Role.ADMIN, Role.COACH)
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
