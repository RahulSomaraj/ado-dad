import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class FcmToken extends Document {
    @Prop({ required: true })
    userId: string;

    @Prop({ required: true, unique: true })
    token: string;

    @Prop({ default: 'unknown' })
    platform?: string;

    @Prop()
    deviceId?: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const FcmTokenSchema = SchemaFactory.createForClass(FcmToken);
