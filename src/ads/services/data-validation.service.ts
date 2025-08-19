import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad, AdDocument } from '../schemas/ad.schema';
import { CommercialVehicleAd, CommercialVehicleAdDocument } from '../schemas/commercial-vehicle-ad.schema';
import { VehicleAd, VehicleAdDocument } from '../schemas/vehicle-ad.schema';
import { PropertyAd, PropertyAdDocument } from '../schemas/property-ad.schema';

@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name);

  constructor(
    @InjectModel(Ad.name) private readonly adModel: Model<AdDocument>,
    @InjectModel(CommercialVehicleAd.name) private readonly commercialVehicleAdModel: Model<CommercialVehicleAdDocument>,
    @InjectModel(VehicleAd.name) private readonly vehicleAdModel: Model<VehicleAdDocument>,
    @InjectModel(PropertyAd.name) private readonly propertyAdModel: Model<PropertyAdDocument>,
  ) {}

  /**
   * Check for data consistency issues across all ad types
   */
  async validateDataConsistency(): Promise<{
    totalAds: number;
    issues: Array<{
      type: string;
      count: number;
      description: string;
      adIds?: string[];
    }>;
  }> {
    this.logger.log('🔍 Starting data consistency validation...');

    const issues: Array<{
      type: string;
      count: number;
      description: string;
      adIds?: string[];
    }> = [];
    const totalAds = await this.adModel.countDocuments();

    // Check commercial vehicle ads
    const commercialVehicleIssues = await this.validateCommercialVehicleAds();
    if (commercialVehicleIssues.length > 0) {
      issues.push({
        type: 'commercial_vehicle_missing_details',
        count: commercialVehicleIssues.length,
        description: 'Commercial vehicle ads missing detailed records',
        adIds: commercialVehicleIssues,
      });
    }

    // Check vehicle ads
    const vehicleIssues = await this.validateVehicleAds();
    if (vehicleIssues.length > 0) {
      issues.push({
        type: 'vehicle_missing_details',
        count: vehicleIssues.length,
        description: 'Vehicle ads missing detailed records',
        adIds: vehicleIssues,
      });
    }

    // Check property ads
    const propertyIssues = await this.validatePropertyAds();
    if (propertyIssues.length > 0) {
      issues.push({
        type: 'property_missing_details',
        count: propertyIssues.length,
        description: 'Property ads missing detailed records',
        adIds: propertyIssues,
      });
    }

    this.logger.log(`✅ Data validation completed. Found ${issues.length} types of issues.`);

    return {
      totalAds,
      issues,
    };
  }

  /**
   * Validate commercial vehicle ads for missing details
   */
  private async validateCommercialVehicleAds(): Promise<string[]> {
    const commercialVehicleAds = await this.adModel.find({
      category: 'commercial_vehicle',
    });

    const missingDetails: string[] = [];

    for (const ad of commercialVehicleAds) {
      const details = await this.commercialVehicleAdModel.findOne({
        ad: ad._id,
      });

      if (!details) {
        missingDetails.push((ad._id as any).toString());
        this.logger.warn(`❌ Commercial vehicle ad ${ad._id} missing details`);
      }
    }

    return missingDetails;
  }

  /**
   * Validate vehicle ads for missing details
   */
  private async validateVehicleAds(): Promise<string[]> {
    const vehicleAds = await this.adModel.find({
      category: { $in: ['private_vehicle', 'two_wheeler'] },
    });

    const missingDetails: string[] = [];

    for (const ad of vehicleAds) {
      const details = await this.vehicleAdModel.findOne({
        ad: ad._id,
      });

      if (!details) {
        missingDetails.push((ad._id as any).toString());
        this.logger.warn(`❌ Vehicle ad ${ad._id} missing details`);
      }
    }

    return missingDetails;
  }

  /**
   * Validate property ads for missing details
   */
  private async validatePropertyAds(): Promise<string[]> {
    const propertyAds = await this.adModel.find({
      category: 'property',
    });

    const missingDetails: string[] = [];

    for (const ad of propertyAds) {
      const details = await this.propertyAdModel.findOne({
        ad: ad._id,
      });

      if (!details) {
        missingDetails.push((ad._id as any).toString());
        this.logger.warn(`❌ Property ad ${ad._id} missing details`);
      }
    }

    return missingDetails;
  }

  /**
   * Clean up orphaned ads (ads without details)
   */
  async cleanupOrphanedAds(): Promise<{
    deleted: number;
    errors: string[];
  }> {
    this.logger.log('🧹 Starting orphaned ads cleanup...');

    const validation = await this.validateDataConsistency();
    const deleted: string[] = [];
    const errors: string[] = [];

    for (const issue of validation.issues) {
      if (issue.adIds && issue.adIds.length > 0) {
        for (const adId of issue.adIds) {
          try {
            await this.adModel.findByIdAndDelete(adId);
            deleted.push(adId);
            this.logger.log(`✅ Deleted orphaned ad: ${adId}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to delete ad ${adId}: ${errorMessage}`);
            this.logger.error(`❌ Failed to delete orphaned ad ${adId}:`, error);
          }
        }
      }
    }

    this.logger.log(`✅ Cleanup completed. Deleted ${deleted.length} orphaned ads.`);

    return {
      deleted: deleted.length,
      errors,
    };
  }

  /**
   * Generate a data consistency report
   */
  async generateConsistencyReport(): Promise<string> {
    const validation = await this.validateDataConsistency();
    
    let report = '📊 Data Consistency Report\n';
    report += '========================\n\n';
    report += `Total Ads: ${validation.totalAds}\n`;
    report += `Issues Found: ${validation.issues.length}\n\n`;

    if (validation.issues.length === 0) {
      report += '✅ No data consistency issues found!\n';
    } else {
      report += 'Issues:\n';
      for (const issue of validation.issues) {
        report += `- ${issue.description}: ${issue.count} ads\n`;
        if (issue.adIds && issue.adIds.length > 0) {
          report += `  Affected IDs: ${issue.adIds.slice(0, 5).join(', ')}${issue.adIds.length > 5 ? '...' : ''}\n`;
        }
      }
    }

    return report;
  }
}
