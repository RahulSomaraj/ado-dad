import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { UserType } from '../users/enums/user.types';
import { HttpExceptionFilter } from '../shared/exception-service';
import {
  AddStrikeDto,
  BanUserDto,
  CreateAppealDto,
  ModerationListQueryDto,
  RemoveAdDto,
  ReviewAppealDto,
  SuspendUserDto,
  UpdateSettingsDto,
} from './dto/moderation.dto';

const MOD_ROLES = [
  UserType.SUPER_ADMIN,
  UserType.ADMIN,
  UserType.MODERATOR,
] as const;
const ADMIN_ROLES = [UserType.SUPER_ADMIN, UserType.ADMIN] as const;

@ApiTags('Moderation')
@Controller('moderation')
@UseFilters(new HttpExceptionFilter('Moderation'))
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // ----------------------------- Strikes -----------------------------
  @Post('users/:id/strikes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Add a strike to a user (auto-applies thresholds)' })
  @ApiResponse({ status: 201, description: 'Strike added; profile returned' })
  addStrike(
    @Param('id') id: string,
    @Body() dto: AddStrikeDto,
    @Request() req: any,
  ) {
    return this.moderationService.addStrike(id, dto, req.user.id);
  }

  @Delete('strikes/:strikeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Revoke (remove) a strike' })
  removeStrike(@Param('strikeId') strikeId: string, @Request() req: any) {
    return this.moderationService.removeStrike(strikeId, req.user.id);
  }

  @Get('users/:id/strikes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Get a user’s strike history' })
  getStrikes(@Param('id') id: string, @Query() query: ModerationListQueryDto) {
    return this.moderationService.getStrikes(id, query);
  }

  // --------------------------- Suspensions ---------------------------
  @Post('users/:id/suspend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Suspend a user for a number of days' })
  suspend(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @Request() req: any,
  ) {
    return this.moderationService.suspend(id, dto, req.user.id);
  }

  @Post('users/:id/unsuspend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Lift a user’s active suspension' })
  unsuspend(@Param('id') id: string, @Request() req: any) {
    return this.moderationService.unsuspend(id, req.user.id);
  }

  @Post('users/:id/ban')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Permanently ban a user (admin only)' })
  ban(@Param('id') id: string, @Body() dto: BanUserDto, @Request() req: any) {
    return this.moderationService.ban(id, dto, req.user.id);
  }

  @Get('users/:id/suspensions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Get a user’s suspension history' })
  getSuspensions(
    @Param('id') id: string,
    @Query() query: ModerationListQueryDto,
  ) {
    return this.moderationService.getSuspensions(id, query);
  }

  @Get('suspensions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Suspension management list (all users)' })
  listSuspensions(@Query() query: ModerationListQueryDto) {
    return this.moderationService.listSuspensions(query);
  }

  // ------------------------ Profile / audit --------------------------
  @Get('users/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({
    summary: 'Moderation profile (ads, reports, strikes, suspension)',
  })
  getProfile(@Param('id') id: string) {
    return this.moderationService.getModerationProfile(id);
  }

  @Get('audit-logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Admin action audit log' })
  getAuditLogs(
    @Query()
    query: ModerationListQueryDto & {
      actor?: string;
      actionType?: string;
      targetId?: string;
    },
  ) {
    return this.moderationService.getAuditLogs(query);
  }

  // ----------------------------- Settings ----------------------------
  @Get('settings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Get moderation settings (strike thresholds)' })
  getSettings() {
    return this.moderationService.getSettings();
  }

  @Put('settings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update moderation settings (Super Admin only)' })
  updateSettings(@Body() dto: UpdateSettingsDto, @Request() req: any) {
    return this.moderationService.updateSettings(dto, req.user.id);
  }

  // --------------------------- Ad removal ----------------------------
  @Post('ads/:id/remove')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Remove an advertisement (admin removal)' })
  removeAd(
    @Param('id') id: string,
    @Body() dto: RemoveAdDto,
    @Request() req: any,
  ) {
    return this.moderationService.removeAd(id, dto, req.user.id);
  }

  @Post('ads/:id/restore')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Restore an admin-removed advertisement' })
  restoreAd(@Param('id') id: string, @Request() req: any) {
    return this.moderationService.restoreAd(id, req.user.id);
  }

  // ----------------------------- Appeals -----------------------------
  @Post('appeals')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit an appeal against your suspension (user)' })
  createAppeal(@Body() dto: CreateAppealDto, @Request() req: any) {
    return this.moderationService.createAppeal(req.user.id, dto);
  }

  @Get('appeals')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'List suspension appeals' })
  listAppeals(@Query() query: ModerationListQueryDto) {
    return this.moderationService.listAppeals(query);
  }

  @Patch('appeals/:id/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MOD_ROLES)
  @ApiOperation({ summary: 'Approve or reject an appeal' })
  reviewAppeal(
    @Param('id') id: string,
    @Body() dto: ReviewAppealDto,
    @Request() req: any,
  ) {
    return this.moderationService.reviewAppeal(id, dto, req.user.id);
  }
}
