import {
  Controller,
  Get,
  Headers,
  Query,
  Res,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SellApiExceptionFilter } from '../common/filters/sell-api-exception.filter';
import { FieldValidationException } from '../common/errors/api-errors';
import { Throttle } from '../common/guards/auth-throttle.guard';
import { SELL_CATEGORIES, SellCategory } from './sell.constants';
import { SellConfigService } from './sell-config.service';

@ApiTags('Sell v2')
@Controller('v2/sell')
@UseFilters(SellApiExceptionFilter)
export class SellController {
  constructor(private readonly config: SellConfigService) {}

  @Get('config')
  // Public, cacheable. Per-IP throttle like the other public v2 reads.
  @Throttle({ name: 'sellConfig', limit: 60, ttl: 60 })
  @ApiOperation({
    summary: 'Sell-form configuration for one category (public, ETag)',
  })
  @ApiQuery({ name: 'category', enum: SELL_CATEGORIES })
  async getConfig(
    @Query('category') category: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ) {
    if (!SELL_CATEGORIES.includes(category as SellCategory)) {
      throw new FieldValidationException({ category: 'Choose a category' });
    }
    const { body, etag } = await this.config.getConfig(
      category as SellCategory,
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('ETag', etag);
    const candidates = String(ifNoneMatch ?? '')
      .split(',')
      .map((t) => t.trim().replace(/^W\//, ''));
    if (ifNoneMatch && (candidates.includes(etag) || candidates.includes('*'))) {
      res.status(304).end();
      return;
    }
    res.status(200).json(body);
  }
}
