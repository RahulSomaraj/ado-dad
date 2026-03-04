import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'app_versions' })
export class AppVersion extends Document {
    @Prop({ default: 1, unique: true })
    configId: number;

    @Prop({ required: true })
    iosLatestVersion: string;

    @Prop({ required: true })
    androidLatestVersion: string;

    @Prop({ required: true })
    iosStoreUrl: string;

    @Prop({ required: true })
    androidStoreUrl: string;

    @Prop({ default: false })
    forceUpdate: boolean;
}

export const AppVersionSchema = SchemaFactory.createForClass(AppVersion);
