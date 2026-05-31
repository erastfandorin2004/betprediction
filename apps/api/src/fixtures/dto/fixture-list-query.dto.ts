import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class FixtureListQueryDto {
  @ApiPropertyOptional({ example: '2025-06-01', description: 'YYYY-MM-DD, default: today' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({
    enum: ['scheduled', 'live', 'finished', 'postponed', 'cancelled', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['scheduled', 'live', 'finished', 'postponed', 'cancelled', 'all'])
  status?: string = 'all';

  @ApiPropertyOptional({ description: 'Filter by league ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  leagueId?: number;

  @ApiPropertyOptional({ default: 1, description: 'Sport ID (1 = football)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sportId?: number = 1;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
