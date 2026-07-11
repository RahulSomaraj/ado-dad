import { Body, Controller, Get, Headers, Patch, UseGuards } from '@nestjs/common';
import { AppVersionService } from './app-version.service';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { UserType } from '../users/enums/user.types';

@ApiTags('App Version')
@Controller('app-version')
export class AppVersionController {
    constructor(private readonly service: AppVersionService) { }

    @Patch()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserType.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update app version configuration' })
    @ApiResponse({ status: 200, description: 'Version configuration updated' })
    async updateVersion(@Body() updateDto: UpdateAppVersionDto) {
        return this.service.updateVersion(updateDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get app version configuration' })
    @ApiResponse({ status: 200, description: 'Version configuration retrieved' })
    async getVersion() {
        return this.service.getVersion();
    }
}
