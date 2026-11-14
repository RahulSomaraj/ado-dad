import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    CommercialVehicleType,
    CommercialVehicleTypeDocument,
} from '../schemas/commercial-vehicle-type.schema';
import { TestDataSafetyService } from '../../common/services/test-data-safety.service';
import { SafeTestDataManagerService } from '../../common/services/safe-test-data-manager.service';
import {
    TestDataSafe,
    AuditDatabaseOperations,
    ValidateEnvironment,
} from '../../common/decorators/test-data-safety.decorators';

@Injectable()
export class SafeCommercialVehicleTypeSeedService {
    private readonly logger = new Logger(SafeCommercialVehicleTypeSeedService.name);

    constructor(
        @InjectModel(CommercialVehicleType.name)
        private readonly commercialVehicleTypeModel: Model<CommercialVehicleTypeDocument>,
        private readonly testDataSafetyService: TestDataSafetyService,
        private readonly safeTestDataManager: SafeTestDataManagerService,
    ) { }

    /**
     * 🛡️ SAFE: Seeds commercial vehicle types with safety markers and tracking
     */
    @TestDataSafe({
        collection: 'commercialvehicletypes',
        prefix: 'Seed',
        requireTestDataMarkers: true,
        allowHardDelete: false,
    })
    @AuditDatabaseOperations()
    @ValidateEnvironment()
    async seedCommercialVehicleTypes(): Promise<void> {
        this.logger.log('🚚 Starting safe commercial vehicle type seeding process...');

        this.testDataSafetyService.validateEnvironmentForDestructiveOperation(
            'seed commercial vehicle types',
        );

        const types = [
            'Truck',
            'Van',
            'Bus',
            'Tractor',
            'Trailer',
            'Forklift',
            'Auto-rickshaws',
            'Heavy Machinery',
            'Modified Jeep',
            'Taxi Cab',
        ];

        const commercialVehicleTypes = types.map((type, index) => ({
            name: type.toLowerCase().replace(/[\s-]/g, '_'),
            displayName: type,
            isActive: true,
            sortOrder: index,
            isDeleted: false,
        }));

        const createdTypes: CommercialVehicleTypeDocument[] = [];
        const typeIds: string[] = [];

        try {
            let successCount = 0;
            let errorCount = 0;
            let existingCount = 0;

            for (const vTypeData of commercialVehicleTypes) {
                try {
                    const existingType = await this.commercialVehicleTypeModel
                        .findOne({ name: vTypeData.name })
                        .exec();

                    if (existingType) {
                        createdTypes.push(existingType);
                        typeIds.push((existingType._id as any).toString());
                        existingCount++;
                        this.logger.log(
                            `🔄 Found existing commercial vehicle type: ${existingType.displayName}`,
                        );
                    } else {
                        const safeTypeData =
                            this.safeTestDataManager.createTestDataWithMarkers(
                                vTypeData,
                                'Seed',
                            );

                        const type = new this.commercialVehicleTypeModel(safeTypeData);
                        const savedType = await type.save();

                        createdTypes.push(savedType);
                        typeIds.push((savedType._id as any).toString());
                        successCount++;

                        this.logger.log(
                            `✅ Created commercial vehicle type: ${savedType.displayName}`,
                        );
                    }
                } catch (typeError) {
                    errorCount++;
                    this.logger.error(
                        `❌ Failed to create commercial vehicle type ${vTypeData.name}: ${typeError.message}`,
                    );
                }
            }

            this.logger.log(
                `📊 Commercial vehicle type creation summary: ${successCount} created, ${existingCount} existing, ${errorCount} failed`,
            );

            this.safeTestDataManager.registerTestData(
                'commercialvehicletypes',
                typeIds,
                'Seed',
            );

            this.logger.log(
                `🎉 Successfully seeded ${createdTypes.length} commercial vehicle types`,
            );
        } catch (error) {
            this.logger.error(`❌ Error during commercial vehicle type seeding: ${error.message}`);
            throw error;
        }
    }

    /**
     * 🛡️ SAFE: Safely cleans up seeded commercial vehicle type data
     */
    @TestDataSafe({
        collection: 'commercialvehicletypes',
        prefix: 'Seed',
        requireTestDataMarkers: true,
        allowHardDelete: true,
    })
    @AuditDatabaseOperations()
    @ValidateEnvironment()
    async cleanupSeededCommercialVehicleTypes(): Promise<any> {
        this.logger.log('🧹 Starting safe cleanup of seeded commercial vehicle types...');
        try {
            const result = await this.safeTestDataManager.safeCleanupTestData(
                'commercialvehicletypes',
                this.commercialVehicleTypeModel,
            );
            this.logger.log(
                `✅ Safe cleanup completed: ${result.deletedCount} commercial vehicle types removed`,
            );
            return result;
        } catch (error) {
            this.logger.error(`❌ Error during safe cleanup: ${error.message}`);
            throw error;
        }
    }

    async getSeededCommercialVehicleTypeCount(): Promise<number> {
        return await this.safeTestDataManager.getTestDataCount(
            'commercialvehicletypes',
            this.commercialVehicleTypeModel,
        );
    }

    async listSeededCommercialVehicleTypes(): Promise<CommercialVehicleTypeDocument[]> {
        const safeFilter =
            this.safeTestDataManager.createSafeTestDataFilter('commercialvehicletypes');
        return await this.commercialVehicleTypeModel.find(safeFilter).exec();
    }

    async validateCommercialVehicleTypeIntegrity(): Promise<boolean> {
        const expectedCount = 10;
        const actualCount = await this.getSeededCommercialVehicleTypeCount();

        const minRequiredCount = Math.floor(expectedCount * 0.8);

        if (actualCount < minRequiredCount) {
            this.logger.error(
                `🚨 Commercial vehicle type integrity check failed: Expected at least ${minRequiredCount}, Actual ${actualCount}`,
            );
            return false;
        }

        if (actualCount < expectedCount) {
            this.logger.warn(
                `⚠️ Commercial vehicle type integrity check passed with warning: Expected ${expectedCount}, Actual ${actualCount}`,
            );
        } else {
            this.logger.log(
                `✅ Commercial vehicle type integrity check passed: ${actualCount} types found`,
            );
        }

        return true;
    }
}
