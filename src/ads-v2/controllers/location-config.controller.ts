import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth-guard';
import { RolesGuard } from '../../auth/guard/roles.guards';
import { Roles } from '../../auth/guard/roles.decorator';
import { UserType } from '../../users/enums/user.types';
import {
  LocationHierarchyService,
  LocationHierarchyConfig,
} from '../../common/services/location-hierarchy.service';
import {
  INDIA_MAHARASHTRA_MUMBAI,
  INDIA_TAMIL_NADU_CHENNAI,
  USA_CALIFORNIA_LOS_ANGELES,
  USA_NEW_YORK_NYC,
  UK_ENGLAND_LONDON,
  AUSTRALIA_NSW_SYDNEY,
  CANADA_ONTARIO_TORONTO,
} from '../../common/services/location-hierarchy-examples';

@ApiTags('Location Configuration')
@Controller('v2/location-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LocationConfigController {
  constructor(
    private readonly locationHierarchyService: LocationHierarchyService,
  ) {}

  @Get('current')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get current location hierarchy configuration',
    description:
      'Returns the current default location hierarchy configuration (country, state, district)',
  })
  @ApiResponse({
    status: 200,
    description: 'Current location configuration',
    schema: {
      type: 'object',
      properties: {
        country: { type: 'string', example: 'India' },
        state: { type: 'string', example: 'Kerala' },
        district: { type: 'string', example: 'Pathanamthitta' },
        bounds: {
          type: 'object',
          properties: {
            country: {
              type: 'object',
              properties: {
                north: { type: 'number', example: 37.1 },
                south: { type: 'number', example: 6.4 },
                east: { type: 'number', example: 97.4 },
                west: { type: 'number', example: 68.2 },
              },
            },
            state: {
              type: 'object',
              properties: {
                north: { type: 'number', example: 12.8 },
                south: { type: 'number', example: 8.2 },
                east: { type: 'number', example: 77.3 },
                west: { type: 'number', example: 74.9 },
              },
            },
            district: {
              type: 'object',
              properties: {
                north: { type: 'number', example: 9.5 },
                south: { type: 'number', example: 9.0 },
                east: { type: 'number', example: 77.2 },
                west: { type: 'number', example: 76.7 },
              },
            },
          },
        },
      },
    },
  })
  getCurrentConfig(): LocationHierarchyConfig {
    return this.locationHierarchyService.getDefaultConfig();
  }

  @Post('update')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update location hierarchy configuration',
    description:
      'Updates the default location hierarchy configuration for the system',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        country: { type: 'string', example: 'India' },
        state: { type: 'string', example: 'Maharashtra' },
        district: { type: 'string', example: 'Mumbai' },
        bounds: {
          type: 'object',
          properties: {
            country: {
              type: 'object',
              properties: {
                north: { type: 'number' },
                south: { type: 'number' },
                east: { type: 'number' },
                west: { type: 'number' },
              },
            },
            state: {
              type: 'object',
              properties: {
                north: { type: 'number' },
                south: { type: 'number' },
                east: { type: 'number' },
                west: { type: 'number' },
              },
            },
            district: {
              type: 'object',
              properties: {
                north: { type: 'number' },
                south: { type: 'number' },
                east: { type: 'number' },
                west: { type: 'number' },
              },
            },
          },
        },
      },
      required: ['country', 'state', 'district', 'bounds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Location configuration updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Location configuration updated successfully',
        },
        config: {
          type: 'object',
          properties: {
            country: { type: 'string' },
            state: { type: 'string' },
            district: { type: 'string' },
          },
        },
      },
    },
  })
  updateConfig(@Body() config: LocationHierarchyConfig): {
    message: string;
    config: LocationHierarchyConfig;
  } {
    this.locationHierarchyService.updateDefaultConfig(config);
    return {
      message: 'Location configuration updated successfully',
      config: this.locationHierarchyService.getDefaultConfig(),
    };
  }

  @Post('preset/mumbai')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Set Mumbai, Maharashtra, India configuration',
    description:
      'Quick preset to configure the system for Mumbai, Maharashtra, India',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration set to Mumbai',
  })
  setMumbaiConfig(): { message: string; config: LocationHierarchyConfig } {
    this.locationHierarchyService.updateDefaultConfig(INDIA_MAHARASHTRA_MUMBAI);
    return {
      message: 'Location configuration set to Mumbai, Maharashtra, India',
      config: this.locationHierarchyService.getDefaultConfig(),
    };
  }

  @Post('preset/chennai')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Set Chennai, Tamil Nadu, India configuration',
    description:
      'Quick preset to configure the system for Chennai, Tamil Nadu, India',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration set to Chennai',
  })
  setChennaiConfig(): { message: string; config: LocationHierarchyConfig } {
    this.locationHierarchyService.updateDefaultConfig(INDIA_TAMIL_NADU_CHENNAI);
    return {
      message: 'Location configuration set to Chennai, Tamil Nadu, India',
      config: this.locationHierarchyService.getDefaultConfig(),
    };
  }

  @Post('preset/los-angeles')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Set Los Angeles, California, USA configuration',
    description:
      'Quick preset to configure the system for Los Angeles, California, USA',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration set to Los Angeles',
  })
  setLosAngelesConfig(): { message: string; config: LocationHierarchyConfig } {
    this.locationHierarchyService.updateDefaultConfig(
      USA_CALIFORNIA_LOS_ANGELES,
    );
    return {
      message: 'Location configuration set to Los Angeles, California, USA',
      config: this.locationHierarchyService.getDefaultConfig(),
    };
  }

  @Post('preset/new-york')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Set New York City, New York, USA configuration',
    description:
      'Quick preset to configure the system for New York City, New York, USA',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration set to New York City',
  })
  setNewYorkConfig(): { message: string; config: LocationHierarchyConfig } {
    this.locationHierarchyService.updateDefaultConfig(USA_NEW_YORK_NYC);
    return {
      message: 'Location configuration set to New York City, New York, USA',
      config: this.locationHierarchyService.getDefaultConfig(),
    };
  }

  @Post('preset/london')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Set London, England, UK configuration',
    description: 'Quick preset to configure the system for London, England, UK',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration set to London',
  })
  setLondonConfig(): { message: string; config: LocationHierarchyConfig } {
    this.locationHierarchyService.updateDefaultConfig(UK_ENGLAND_LONDON);
    return {
      message: 'Location configuration set to London, England, UK',
      config: this.locationHierarchyService.getDefaultConfig(),
    };
  }

  @Post('preset/sydney')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Set Sydney, New South Wales, Australia configuration',
    description:
      'Quick preset to configure the system for Sydney, New South Wales, Australia',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration set to Sydney',
  })
  setSydneyConfig(): { message: string; config: LocationHierarchyConfig } {
    this.locationHierarchyService.updateDefaultConfig(AUSTRALIA_NSW_SYDNEY);
    return {
      message:
        'Location configuration set to Sydney, New South Wales, Australia',
      config: this.locationHierarchyService.getDefaultConfig(),
    };
  }

  @Post('preset/toronto')
  @Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Set Toronto, Ontario, Canada configuration',
    description:
      'Quick preset to configure the system for Toronto, Ontario, Canada',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration set to Toronto',
  })
  setTorontoConfig(): { message: string; config: LocationHierarchyConfig } {
    this.locationHierarchyService.updateDefaultConfig(CANADA_ONTARIO_TORONTO);
    return {
      message: 'Location configuration set to Toronto, Ontario, Canada',
      config: this.locationHierarchyService.getDefaultConfig(),
    };
  }
}
