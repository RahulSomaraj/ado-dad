import { Injectable, Logger } from '@nestjs/common';
import { FcmTokenRepository } from './repositories/fcm-token.repository';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class FcmTokenService {
    private readonly logger = new Logger(FcmTokenService.name);

    constructor(
        private readonly tokenRepository: FcmTokenRepository,
        private readonly firebaseService: FirebaseService,
    ) { }

    async registerToken(userId: string, token: string, platform?: string, deviceId?: string) {
        await this.tokenRepository.updateToken(userId, token, platform, deviceId);

        // Subscribe to topic
        try {
            await this.firebaseService
                .getMessaging()
                .subscribeToTopic(token, 'all_users');
            this.logger.log(`Token subscribed to all_users topic: ${token.substring(0, 10)}...`);
        } catch (error) {
            this.logger.error(`Failed to subscribe to topic: ${error.message}`);
        }

        return { success: true };
    }

    async getActiveTokens(userId: string) {
        return this.tokenRepository.findActiveTokensByUserId(userId);
    }

    async deactivateToken(token: string) {
        return this.tokenRepository.deactivateToken(token);
    }
}
