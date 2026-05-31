import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { LeaguesService } from './leagues.service';

@ApiTags('leagues')
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  @ApiOperation({ summary: 'List all supported leagues' })
  findAll(@Query('sportId') sportId?: string) {
    return this.leaguesService.findAll(sportId ? parseInt(sportId, 10) : 1);
  }

  @Get(':id')
  @ApiOperation({ summary: 'League details' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leaguesService.findOne(id);
  }
}
