import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Controller, Get, NotFoundException, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { ClicsKeyGuard } from './clics-key.guard';
import { filterByIds } from './clics-objects';
import { ClicsService } from './clics.service';

const FINALIZE_DELAY_MS = 1500;

const line = (event: unknown) => `${JSON.stringify(event)}\n`;

@ApiTags('Contest API (CLICS 2023-06)')
@ApiBearerAuth()
@ApiBasicAuth()
@UseGuards(ClicsKeyGuard, AccessTokenGuard)
@Controller('api')
export class ClicsController {
  constructor(private readonly clicsService: ClicsService) {}

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({ summary: 'API information' })
  @Get()
  info() {
    return {
      version: '2023-06',
      version_url: 'https://ccs-specs.icpc.io/2023-06/contest_api',
      name: 'VNOI Utilities',
    };
  }

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @Get('contests')
  contests() {
    return this.clicsService.contests();
  }

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @Get('contests/:id')
  contest(@Param('id') id: string) {
    return this.clicsService.contest(id);
  }

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @Get('contests/:id/state')
  state(@Param('id') id: string) {
    return this.clicsService.state(id);
  }

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @Get('contests/:id/access')
  access(@Param('id') id: string) {
    return this.clicsService.access(id);
  }

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @Get('contests/:id/scoreboard')
  scoreboard(@Param('id') id: string) {
    return this.clicsService.scoreboard(id);
  }

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({
    summary: 'Event feed (NDJSON)',
    description:
      'Dumps the whole contest as batch events and closes; clients such as ICPC Live reconnect to reload. ' +
      '`finalize=1` marks an ended, fully judged contest as final.',
  })
  @Get('contests/:id/event-feed')
  async eventFeed(@Param('id') id: string, @Query('finalize') finalize: string | undefined, @Res() res: Response) {
    const events = await this.clicsService.eventFeed(id, finalize === '1' || finalize === 'true');
    const state = events[events.length - 1].data as { end_of_updates: string | null };
    res.type('application/x-ndjson');
    if (!state.end_of_updates) {
      res.send(events.map(line).join(''));
      return;
    }
    res.write(events.slice(0, -1).map(line).join(''));
    setTimeout(() => res.end(line(events[events.length - 1])), FINALIZE_DELAY_MS);
  }

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @Get('contests/:id/:collection')
  async collection(
    @Param('id') id: string,
    @Param('collection') collection: string,
    @Query() query: Record<string, string>,
  ) {
    return filterByIds(await this.objects(id, collection), query);
  }

  @RequiredRoles(Role.ADMIN, Role.COACH)
  @Get('contests/:id/:collection/:objectId')
  async object(@Param('id') id: string, @Param('collection') collection: string, @Param('objectId') objectId: string) {
    const found = (await this.objects(id, collection)).find((object) => object.id === objectId);
    if (!found) throw new NotFoundException(`${collection}/${objectId} not found`);
    return found;
  }

  private async objects(id: string, collection: string): Promise<Record<string, unknown>[]> {
    const collections = await this.clicsService.collections(id);
    if (!(collection in collections)) throw new NotFoundException(`Unknown endpoint ${collection}`);
    return collections[collection as keyof typeof collections] as Record<string, unknown>[];
  }
}
