import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { LvsService } from './lvs.service';

// ЛВС (LVS) — отдельный раздел матчей ЧМ. Полностью изолирован от /predictions.
@ApiTags('lvs')
@Controller('lvs')
export class LvsController {
  constructor(private readonly lvs: LvsService) {}

  @Get('fixtures')
  @ApiOperation({ summary: 'Все матчи ЧМ для раздела ЛВС с прогнозами, по дням' })
  getFixtures() {
    return this.lvs.listFixtures();
  }

  @Get('history')
  @ApiOperation({ summary: 'История ЛВС — завершённые прогнозы с вердиктом (отдельно от /predictions/history)' })
  getHistory() {
    return this.lvs.listHistory();
  }

  @Post(':fixtureId/analyze')
  @ApiOperation({ summary: 'Ручной запуск/перезапуск анализа ЛВС по матчу (нужны составы)' })
  @ApiParam({ name: 'fixtureId', type: Number })
  analyze(@Param('fixtureId', ParseIntPipe) fixtureId: number) {
    return this.lvs.analyze(fixtureId);
  }
}
