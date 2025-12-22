import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseFilters,
  UseGuards,
  Patch,
  Param,
  Delete,
  Res,
  Header,
} from '@nestjs/common';
import { AppService } from './app.service';
import { LoginResponse } from './users/dto/login-response.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RefreshTokenGuard } from './auth/guard/refresh-guard';
import { RefreshTokenDto } from './auth/dto/refresh-token.dto';
import { CustomAuthGuard } from './auth/guard/custom-auth-guard';
import { LocalAuthGuard } from './auth/guard/local-auth-guard';
import { LoginUserDto } from './common/dtos/userLoginDto';
import { HttpExceptionFilter } from './shared/exception-service';
import { RedisService } from './shared/redis.service';
import { Response } from 'express';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

@Controller()
@UseFilters(new HttpExceptionFilter('App'))
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    try {
      // Check Redis health using ping method
      const redisPing = await this.redisService.ping();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          redis: redisPing === 'PONG' ? 'ok' : 'error',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          redis: 'error',
        },
        error: error.message,
      };
    }
  }

  @Get('cors-test')
  testCors() {
    // Synchronous response for better performance
    return {
      message: 'CORS is working!',
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }

  @Get('test-report')
  getTestReport() {
    try {
      const reportPath = join(
        __dirname,
        '..',
        '..',
        'reports',
        'e2e-test-summary.json',
      );
      if (!existsSync(reportPath)) {
        return {
          available: false,
          message: 'Report not found. Run tests to generate.',
        };
      }
      const json = readFileSync(reportPath, 'utf8');
      return JSON.parse(json);
    } catch (error) {
      return { available: false, error: (error as any).message };
    }
  }

  @Get('test-report/html')
  getTestReportHtml(@Res() res: Response) {
    try {
      const htmlPath = join(
        __dirname,
        '..',
        '..',
        'reports',
        'e2e-test-report.html',
      );
      if (!existsSync(htmlPath)) {
        return res
          .status(404)
          .send(
            '<html><body><h3>E2E HTML report not found. Run tests to generate.</h3></body></html>',
          );
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const html = readFileSync(htmlPath);
      return res.send(html);
    } catch (error) {
      return res.status(500).send('Failed to load HTML report');
    }
  }

  @Get('images/:filename')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  @Header(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, X-Requested-With',
  )
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  @Header('Cross-Origin-Embedder-Policy', 'unsafe-none')
  async serveImage(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const imagePath = join(
        __dirname,
        '..',
        '..',
        'public',
        'images',
        filename,
      );

      if (!existsSync(imagePath)) {
        return res.status(404).json({ error: 'Image not found' });
      }

      const imageBuffer = readFileSync(imagePath);

      // Set proper content type based on file extension
      let contentType = 'image/jpeg';
      if (filename.endsWith('.png')) {
        contentType = 'image/png';
      } else if (filename.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (filename.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (filename.endsWith('.svg')) {
        contentType = 'image/svg+xml';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Authorization, X-Requested-With',
      );
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

      res.send(imageBuffer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to serve image' });
    }
  }

  @Get('assets/:filename')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  @Header(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, X-Requested-With',
  )
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  @Header('Cross-Origin-Embedder-Policy', 'unsafe-none')
  async serveAsset(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const assetPath = join(
        __dirname,
        '..',
        '..',
        'public',
        'assets',
        filename,
      );

      if (!existsSync(assetPath)) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const assetBuffer = readFileSync(assetPath);

      // Set proper content type based on file extension
      let contentType = 'application/octet-stream';
      if (filename.endsWith('.json')) {
        contentType = 'application/json';
      } else if (filename.endsWith('.css')) {
        contentType = 'text/css';
      } else if (filename.endsWith('.js')) {
        contentType = 'application/javascript';
      } else if (filename.endsWith('.xml')) {
        contentType = 'application/xml';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Authorization, X-Requested-With',
      );
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

      res.send(assetBuffer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to serve asset' });
    }
  }

  @Get('data/:filename')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  @Header(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, X-Requested-With',
  )
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  @Header('Cross-Origin-Embedder-Policy', 'unsafe-none')
  async serveData(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const dataPath = join(__dirname, '..', '..', 'public', filename);

      if (!existsSync(dataPath)) {
        return res.status(404).json({ error: 'Data file not found' });
      }

      const dataBuffer = readFileSync(dataPath);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Authorization, X-Requested-With',
      );
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

      res.send(dataBuffer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to serve data' });
    }
  }

  @Get('redis/test')
  async testRedis() {
    try {
      // Use Promise.all for concurrent operations
      const [ping, testValue] = await Promise.all([
        this.redisService.ping(),
        this.redisService.get('test').catch(() => null), // Don't fail if key doesn't exist
      ]);

      // Only set if not already set
      if (!testValue) {
        await this.redisService.set('test', 'Hello Redis!', 60);
      }

      return {
        status: 'success',
        ping,
        testValue: testValue || 'Hello Redis!',
        message: 'Redis connection is working!',
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Redis connection failed',
        error: error.message,
      };
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  login(
    @Body() userLoginDto: LoginUserDto,
    @Request() req,
  ): Promise<LoginResponse> {
    const user = req.user;
    return this.appService.login(userLoginDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @Post('/refresh-token')
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Request() req) {
    const user = req.user;
    const oldRefreshTokenId = req.storedRefreshTokenId;
    return this.appService.getRefreshToken(user, oldRefreshTokenId);
  }

  @ApiBearerAuth()
  @UseGuards(CustomAuthGuard)
  @Post('/logout-all-sessions')
  logoutAll(@Request() req) {
    const user = req.user;
    return this.appService.logoutAllSessions(user);
  }

  @ApiBearerAuth()
  @UseGuards(CustomAuthGuard)
  @Post('/logout')
  logout(@Body() refreshTokenDto: RefreshTokenDto, @Request() req) {
    const user = req.user;
    return this.appService.logout(refreshTokenDto, user);
  }
}
