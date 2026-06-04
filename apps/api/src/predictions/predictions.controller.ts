import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PredictionsService } from './predictions.service';
import { AiAnalysisService } from './ai-analysis.service';
import { SettlementService } from './settlement.service';

@ApiTags('predictions')
@Controller('predictions')
export class PredictionsController {
  constructor(
    private readonly predictionsService: PredictionsService,
    private readonly aiAnalysis: AiAnalysisService,
    private readonly settlement: SettlementService,
  ) {}

  @Get('daily-picks')
  @ApiOperation({ summary: 'Top AI picks of the day sorted by confidence' })
  getDailyPicks(@Query('limit') limit?: string) {
    return this.predictionsService.getDailyPicks(limit ? parseInt(limit, 10) : 5);
  }

  @Get('value-bets')
  @ApiOperation({ summary: 'Fixtures where AI probability exceeds market implied probability' })
  getValueBets() {
    return this.predictionsService.getValueBets();
  }

  @Get('track-record')
  @ApiOperation({ summary: 'Public accuracy statistics for all resolved predictions' })
  getTrackRecord() {
    return this.predictionsService.getTrackRecord();
  }

  @Get('backtest')
  @ApiOperation({ summary: 'Latest backtest run of the value-bet logic over the control sample' })
  getBacktest() {
    return this.predictionsService.getBacktest();
  }

  @Get('history')
  @ApiOperation({ summary: 'History of all AI analyses with their post-match verdict' })
  getHistory(@Query('limit') limit?: string) {
    return this.predictionsService.getHistory(limit ? parseInt(limit, 10) : 50);
  }

  @Post(':fixtureId/analyze')
  @ApiOperation({ summary: 'Run on-demand AI analysis for a fixture (free in test phase)' })
  @ApiParam({ name: 'fixtureId', type: Number })
  analyze(@Param('fixtureId', ParseIntPipe) fixtureId: number) {
    return this.aiAnalysis.analyze(fixtureId);
  }

  @Post(':fixtureId/settle')
  @ApiOperation({ summary: 'Settle the prediction for a finished fixture against the real result' })
  @ApiParam({ name: 'fixtureId', type: Number })
  settle(@Param('fixtureId', ParseIntPipe) fixtureId: number) {
    return this.settlement.settle(fixtureId);
  }
}
