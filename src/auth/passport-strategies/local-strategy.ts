import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'username', // ✅ Using 'username' field consistently
      passwordField: 'password',
    });
  }

  async validate(username: string, password: string): Promise<any> {
    console.log('🔐 LocalStrategy.validate() called with:', {
      username,
      password: '***',
    });

    const user = await this.authService.validateUser(username, password);

    if (!user) {
      console.log('❌ User validation failed for:', username);
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Invalid username or password',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    console.log('✅ User validation successful for:', user.email);
    return user;
  }
}
