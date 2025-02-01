import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EncryptionUtil } from '../common/encryption.util';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private encryptionUtil: EncryptionUtil,
  ) {}

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = { username, password: 'hashed-password' }; // Example user, replace with real user lookup
    const isValid = await EncryptionUtil.comparePassword(pass, user.password); // Await the promise

    if (isValid) {
      return user; // Return user if the password is valid
    }

    return null; // Return null if the password is not valid
  }
}
