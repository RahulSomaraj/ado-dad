import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommercialVehicleTypeDocument = CommercialVehicleType & Document;

@Schema({ timestamps: true })
export class CommercialVehicleType {
    @Prop({ required: true, unique: true, trim: true })
    name: string;

    @Prop({ required: true })
    displayName: string;

    @Prop({ required: false })
    description?: string;

    @Prop({ required: false })
    icon?: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: 0 })
    sortOrder: number; // For ordering in dropdowns

    // Soft delete fields
    @Prop({ default: false })
    isDeleted: boolean;

    @Prop()
    deletedAt?: Date;
}

export const CommercialVehicleTypeSchema = SchemaFactory.createForClass(CommercialVehicleType);

// Indexes for fast lookups
CommercialVehicleTypeSchema.index({ isActive: 1, isDeleted: 1 });
CommercialVehicleTypeSchema.index({ sortOrder: 1 });
