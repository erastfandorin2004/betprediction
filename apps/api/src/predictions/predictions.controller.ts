import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PredictionsService } from './predictions.service';

@ApiTags('predictions')
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

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
}
