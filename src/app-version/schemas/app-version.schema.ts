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

    /**
     * Legacy global switch. Builds that predate build-number checks read it to
     * decide force vs optional. New builds use *MinSupportedBuild instead.
     */
    @Prop({ default: false })
    forceUpdate: boolean;

    // Build numbers (Android versionCode / iOS CFBundleVersion = the "+N" in
    // pubspec). Newer app builds compare these instead of version names.

    /** Newest build live in the store -> optional ("Later") prompt below this. */
    @Prop({ type: Number, required: false })
    androidLatestBuild?: number;

    @Prop({ type: Number, required: false })
    iosLatestBuild?: number;

    /** Oldest build still allowed -> mandatory prompt below this. */
    @Prop({ type: Number, required: false })
    androidMinSupportedBuild?: number;

    @Prop({ type: Number, required: false })
    iosMinSupportedBuild?: number;

    /** Short "what's new" text shown in the update dialog. */
    @Prop({ type: String, required: false })
    releaseNotes?: string;
}

export const AppVersionSchema = SchemaFactory.createForClass(AppVersion);
