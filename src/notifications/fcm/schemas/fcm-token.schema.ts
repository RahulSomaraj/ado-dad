import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class FcmToken extends Document {
    @Prop({ required: true, index: true })
    userId: string;

    @Prop({ required: true, unique: true })
    token: string;

    @Prop({ index: true })
    deviceId: string;

    @Prop({ enum: ['web', 'android', 'ios'], required: true })
    platform: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const FcmTokenSchema = SchemaFactory.createForClass(FcmToken);
