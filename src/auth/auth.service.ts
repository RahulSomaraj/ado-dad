import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    console.log(`🔍 Received login request for: ${username}`);

    // Handle cases where username or password is missing
    if (!username || !password) {
      console.log('Missing username or password');
      return null;
    }

    const trimmedUsername = username.trim();
    console.log(`🔎 Searching for user: ${trimmedUsername}`);

    // Find user by username, email, or phoneNumber
    const user = await this.userModel
      .findOne({
        $or: [
          { name: trimmedUsername }, // Ensure username is included if applicable
          { email: trimmedUsername },
          { phoneNumber: trimmedUsername },
        ],
      })
      .exec();

    if (!user) {
      console.log('User not found in database');
      return null;
    }

    console.log('✅ User found:', user.email);

    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      if (user.otp == password) return user;
      console.log('Incorrect password');
      return null;
    }

    console.log('✅ Password matched. Authentication successful');

    // Exclude password from response
    const { password: _, ...result } = user.toObject();
    return result;
  }
}
