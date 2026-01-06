import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FcmToken } from '../schemas/fcm-token.schema';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FcmTokenRepository {
    constructor(
        @InjectModel(FcmToken.name)
        private readonly model: Model<FcmToken>,
    ) { }

    async upsert(userId: string, token: string, platform: string, deviceId?: string) {
        if (deviceId) {
            // If deviceId is provided, upsert based on userId + deviceId
            // This allows updating the token if it changed for the same device
            try {
                // If deviceId is provided, upsert based on userId + deviceId
                // This allows updating the token if it changed for the same device
                return await this.model.updateOne(
                    { userId, deviceId },
                    { userId, token, platform, deviceId, isActive: true },
                    { upsert: true },
                );
            } catch (error) {
                // If we hit a duplicate key error on 'token', it means this token is already registered
                // likely under a legacy entry (token-only). We should claim it for this deviceId.
                if (error.code === 11000) {
                    return this.model.updateOne(
                        { token },
                        { userId, token, platform, deviceId, isActive: true },
                        { upsert: true },
                    );
                }
                throw error;
            }
        } else {
            // Legacy behavior: upsert based on token
            return this.model.updateOne(
                { token },
                { userId, token, platform, isActive: true },
                { upsert: true },
            );
        }
    }

    async findActiveByUser(userId: string) {
        return this.model.find({ userId, isActive: true });
    }

    async deactivate(token: string) {
        return this.model.updateOne({ token }, { isActive: false });
    }
}
