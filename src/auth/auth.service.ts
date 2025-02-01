import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const trimmedUsername = username.trim();

    // 🔹 Find user by username, email, or contact number
    const user = await this.userModel
      .findOne({
        $or: [
          { userName: trimmedUsername },
          { contactEmail: trimmedUsername },
          { contactNumber: trimmedUsername },
        ],
      })
      .exec();

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject(); // Convert Mongoose document to a plain object
      return result;
    }
    return null;
  }
}
