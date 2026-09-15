import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { SuspensionGuard } from '../moderation/guards/suspension.guard';
import { Throttle } from '../common/guards/auth-throttle.guard';
import { UserThrottleGuard } from '../common/guards/user-throttle.guard';
import { SellApiExceptionFilter } from '../common/filters/sell-api-exception.filter';
import { CreateMediaIntentDto } from './dto/create-media-intent.dto';
import { MediaService } from './media.service';

@ApiTags('Media v2')
@ApiBearerAuth()
@Controller('v2/media')
@UseFilters(SellApiExceptionFilter)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('intents')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ name: 'mediaIntent', limit: 120, ttl: 3600, by: 'user' })
  @UseGuards(JwtAuthGuard, UserThrottleGuard, SuspensionGuard)
  @ApiOperation({
    summary: 'Get a presigned PUT for one ad photo or video',
    description:
      'Returns { mediaId, uploadUrl, method:"PUT", headers, key, expiresIn:900 }. PUT the bytes with exactly `headers`, then call POST /v2/media/:id/complete.',
  })
  createIntent(@Body() dto: CreateMediaIntentDto, @Req() req: any) {
    return this.media.createIntent(String(req.user.id), dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Throttle({ name: 'mediaComplete', limit: 240, ttl: 3600, by: 'user' })
  @UseGuards(JwtAuthGuard, UserThrottleGuard, SuspensionGuard)
  @ApiOperation({
    summary: 'Verify an uploaded object (size + type) and mark it uploaded',
  })
  complete(@Param('id') id: string, @Req() req: any) {
    return this.media.complete(String(req.user.id), id);
  }
}
