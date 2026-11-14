import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FcmToken } from '../schemas/fcm-token.schema';

@Injectable()
export class FcmTokenRepository {
    constructor(
        @InjectModel(FcmToken.name)
        private readonly tokenModel: Model<FcmToken>,
    ) { }

    async updateToken(userId: string, token: string, platform?: string, deviceId?: string): Promise<FcmToken> {
        return this.tokenModel.findOneAndUpdate(
            { token },
            { userId, isActive: true, platform, deviceId },
            { upsert: true, new: true },
        ).exec();
    }

    async findActiveTokensByUserId(userId: string): Promise<FcmToken[]> {
        return this.tokenModel.find({ userId, isActive: true }).exec();
    }

    async deactivateToken(token: string): Promise<void> {
        await this.tokenModel.updateOne({ token }, { isActive: false }).exec();
    }
}
