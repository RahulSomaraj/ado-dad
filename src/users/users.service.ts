import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { EmailService } from '../utils/email.service';
import { generateOTP } from '../utils/otp-generator';
import { EncryptionUtil } from '../common/encryption.util';
import { GetUsersDto } from './dto/get-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserType } from './enums/user.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    private emailService: EmailService,
  ) {}

  async getAllUsers(getUsersDto: GetUsersDto, currentUser: User) {
    const { page = 1, limit = 10, search, type } = getUsersDto;

    // Build query with filters and ensure `isDeleted: false`
    const query: any = { isDeleted: false };

    // If a search term is provided, add it to the query (searches name or email)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // If the current user is an admin (user.type === 'AD'), only return users
    // whose userType is one of the following: 'aDmin', 'NU', 'SR'
    if (currentUser.type == UserType.SUPER_ADMIN) {
      query.type = {
        $in: [UserType.ADMIN, UserType.USER, UserType.SHOWROOM],
      };
    }

    if (type) {
      // If a type filter is provided in the DTO, add it to the query
      query.type = type;
    }

    console.log('Query:', query);

    // Fetch paginated users with selected fields (you can adjust the projection as needed)
    const users = await this.userModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('_id name email type phoneNumber profilePic') // Only send required fields, adjust as necessary
      .exec();

    // Count total documents that match the query
    const count = await this.userModel.countDocuments(query);

    return {
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    };
  }

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id)
      .select('_id name email type phoneNumber profilePic') // Only send required fields, adjust as necessary
      .exec();
    if (!user || user.isDeleted)
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'User not found or deleted',
        },
        HttpStatus.BAD_REQUEST,
      );
    return user;
  }

  // Create a new user
  async createUser(userData: any): Promise<User> {
    const existingUser = await this.userModel.findOne({
      $or: [{ phoneNumber: userData.phoneNumber }, { email: userData.email }],
    });

    if (existingUser) {
      if (existingUser.phoneNumber == userData.phoneNumber) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'User Already Exist for same Phone Number ',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'User Already Exist for same Email',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  // Update user details
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user || user.isDeleted) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'User not found or deleted',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingUser = await this.userModel.findOne({
      _id: { $ne: id },
      $or: [
        { phoneNumber: updateData.phoneNumber },
        { email: updateData.email },
      ],
    });

    if (existingUser) {
      if (existingUser.phoneNumber == updateData.phoneNumber) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'User Already Exist for same Phone Number ',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'User Already Exist for same Email',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    return updatedUser!;
  }

  // Soft delete user
  async deleteUser(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    user.isDeleted = true;
    await user.save();
    return user;
  }

  // Send OTP via email
  async sendOTP(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException('User not found');

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60000); // OTP expires in 10 minutes
    await user.save();

    await this.emailService.sendOtp(user.email, otp);
  }

  // Verify OTP
  async verifyOTP(email: string, otp: string): Promise<string> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException('User not found');

    if (user.otp !== otp) throw new BadRequestException('Invalid OTP');

    if (!user.otpExpires || user.otpExpires < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return 'OTP verified successfully';
  }
}
