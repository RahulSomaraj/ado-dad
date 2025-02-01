import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RefreshTokenGuard } from './auth/guard/refresh-guard';
import { RefreshTokenDto } from './auth/dto/refresh-token.dto';
import { CustomAuthGuard } from './auth/guard/custom-auth-guard';
import { LocalAuthGuard } from './auth/guard/local-auth-guard';
import { LoginUserDto } from './common/dtos/userLoginDto';
import { HttpExceptionFilter } from './shared/exception-service';

@Controller()
@UseFilters(new HttpExceptionFilter('App'))
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  login(
    @Body() userLoginDto: LoginUserDto,
    @Request() req,
  ): Promise<{
    id: any;
    token: string;
    refreshToken: string;
    userName: string;
    email: string;
    userType: string;
  }> {
    const user = req.user;
    return this.appService.login(userLoginDto, user);
  }

  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @Post('/refresh-token')
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Request() req) {
    const user = req.user;
    return this.appService.getRefreshToken(user);
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
