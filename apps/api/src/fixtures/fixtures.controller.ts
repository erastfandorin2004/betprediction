import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FixturesService } from './fixtures.service';
import { FixtureListQueryDto } from './dto/fixture-list-query.dto';

@ApiTags('fixtures')
@Controller('fixtures')
export class FixturesController {
  constructor(private readonly fixturesService: FixturesService) {}

  @Get()
  @ApiOperation({ summary: 'List fixtures with filters' })
  @ApiResponse({ status: 200, description: 'Paginated fixture list' })
  findAll(@Query() query: FixtureListQueryDto) {
    return this.fixturesService.findAll(query);
  }

  @Get('live')
  @ApiOperation({ summary: 'Currently live fixtures' })
  findLive() {
    return this.fixturesService.findLive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fixture detail with stats, lineups, H2H and prediction' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 404, description: 'Fixture not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fixturesService.findOne(id);
  }
}
