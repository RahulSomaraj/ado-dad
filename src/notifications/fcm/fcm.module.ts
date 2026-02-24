import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseService } from '../../firebase/firebase.service';
import { FcmToken, FcmTokenSchema } from './schemas/fcm-token.schema';
import { PushNotification, PushNotificationSchema } from './schemas/push-notification.schema';
import { FcmController } from './fcm.controller';
import { FcmTokenRepository } from './repositories/fcm-token.repository';
import { PushNotificationRepository } from './repositories/push-notification.repository';
import { FcmTokenService } from './fcm-token.service';
import { FcmNotificationService } from './fcm-notification.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: FcmToken.name, schema: FcmTokenSchema },
            { name: PushNotification.name, schema: PushNotificationSchema },
        ]),
    ],
    providers: [
        FirebaseService,
        FcmTokenRepository,
        PushNotificationRepository,
        FcmTokenService,
        FcmNotificationService,
    ],
    controllers: [FcmController],
    exports: [FcmTokenService, FcmNotificationService],
})
export class FcmModule { }

