import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VehicleVariant,
  VehicleVariantDocument,
} from '../schemas/vehicle-variant.schema';
import {
  VehicleModel,
  VehicleModelDocument,
} from '../schemas/vehicle-model.schema';
import { FuelType, FuelTypeDocument } from '../schemas/fuel-type.schema';
import {
  TransmissionType,
  TransmissionTypeDocument,
} from '../schemas/transmission-type.schema';
import { FeaturePackage } from '../../vehicles/enum/vehicle.type';

@Injectable()
export class VehicleVariantSeedService {
  constructor(
    @InjectModel(VehicleVariant.name)
    private readonly vehicleVariantModel: Model<VehicleVariantDocument>,
    @InjectModel(VehicleModel.name)
    private readonly vehicleModelModel: Model<VehicleModelDocument>,
    @InjectModel(FuelType.name)
    private readonly fuelTypeModel: Model<FuelTypeDocument>,
    @InjectModel(TransmissionType.name)
    private readonly transmissionTypeModel: Model<TransmissionTypeDocument>,
  ) {}

  private generateEngineSpecs(fuelType: string, featurePackage: string): any {
    const baseCapacity =
      fuelType === 'Electric' ? 0 : Math.random() * 2000 + 800;
    const basePower =
      fuelType === 'Electric'
        ? Math.random() * 200 + 50
        : Math.random() * 150 + 60;
    const baseTorque =
      fuelType === 'Electric'
        ? Math.random() * 300 + 100
        : Math.random() * 200 + 80;

    // Adjust based on feature package
    const multiplier = this.getFeaturePackageMultiplier(featurePackage);

    return {
      capacity: Math.round(baseCapacity * multiplier),
      maxPower: Math.round(basePower * multiplier),
      maxTorque: Math.round(baseTorque * multiplier),
      cylinders:
        fuelType === 'Electric' ? undefined : Math.floor(Math.random() * 4) + 3,
      turbocharged: fuelType === 'Electric' ? undefined : Math.random() > 0.5,
    };
  }

  private generatePerformanceSpecs(
    fuelType: string,
    featurePackage: string,
  ): any {
    const baseMileage =
      fuelType === 'Electric'
        ? Math.random() * 200 + 150
        : Math.random() * 15 + 8;
    const baseAcceleration = Math.random() * 8 + 4;
    const baseTopSpeed = Math.random() * 100 + 120;
    const baseFuelCapacity =
      fuelType === 'Electric'
        ? Math.random() * 50 + 30
        : Math.random() * 20 + 35;

    const multiplier = this.getFeaturePackageMultiplier(featurePackage);

    return {
      mileage: Math.round(baseMileage * multiplier * 10) / 10,
      acceleration: Math.round(baseAcceleration * (1 / multiplier) * 10) / 10,
      topSpeed: Math.round(baseTopSpeed * multiplier),
      fuelCapacity: Math.round(baseFuelCapacity * multiplier),
    };
  }

  private generateDimensions(vehicleType: string): any {
    const baseLength =
      vehicleType === 'SUV'
        ? Math.random() * 500 + 4200
        : vehicleType === 'Sedan'
          ? Math.random() * 300 + 4500
          : vehicleType === 'Hatchback'
            ? Math.random() * 200 + 3800
            : vehicleType === 'two-wheeler'
              ? Math.random() * 200 + 2000
              : Math.random() * 400 + 4000;

    const baseWidth =
      vehicleType === 'two-wheeler'
        ? Math.random() * 100 + 700
        : Math.random() * 200 + 1700;

    const baseHeight =
      vehicleType === 'SUV'
        ? Math.random() * 200 + 1600
        : vehicleType === 'two-wheeler'
          ? Math.random() * 100 + 1100
          : Math.random() * 150 + 1400;

    return {
      length: Math.round(baseLength),
      width: Math.round(baseWidth),
      height: Math.round(baseHeight),
      wheelbase: Math.round(baseLength * 0.6),
      groundClearance:
        vehicleType === 'SUV'
          ? Math.round(Math.random() * 50 + 180)
          : Math.round(Math.random() * 30 + 140),
      bootSpace:
        vehicleType === 'two-wheeler'
          ? undefined
          : Math.round(Math.random() * 200 + 300),
    };
  }

  private getFeaturePackageMultiplier(featurePackage: string): number {
    switch (featurePackage) {
      case FeaturePackage.BASE:
        return 0.8;
      case FeaturePackage.L:
        return 0.9;
      case FeaturePackage.LX:
        return 1.0;
      case FeaturePackage.V:
        return 1.1;
      case FeaturePackage.VX:
        return 1.2;
      case FeaturePackage.Z:
        return 1.3;
      case FeaturePackage.ZX:
        return 1.4;
      case FeaturePackage.ZX_O:
        return 1.5;
      case FeaturePackage.ZX_PLUS:
        return 1.6;
      case FeaturePackage.TOP_END:
        return 1.7;
      case FeaturePackage.PREMIUM:
        return 1.8;
      case FeaturePackage.EXECUTIVE:
        return 1.9;
      case FeaturePackage.ROYALE:
        return 2.0;
      default:
        return 1.0;
    }
  }

  private generateFeatures(featurePackage: string): any {
    const baseFeatures = {
      safety: {
        abs: true,
        ebd: true,
        driverAirbag: 1,
        passengerAirbag: 1,
        centralLocking: true,
        immobilizer: true,
      },
      comfort: {
        airConditioning: true,
        powerSteering: true,
        fabricSeats: true,
      },
      exterior: {
        powerAdjustableMirrors: true,
        bodyColouredBumpers: true,
      },
      technology: {
        bluetooth: true,
        usbCharging: true,
        amFmRadio: true,
        speakers: 4,
      },
      convenience: {
        powerWindows: true,
        powerSteering: true,
        gloveBox: true,
        cupHolders: 2,
      },
      security: {
        engineImmobilizer: true,
        securityAlarm: true,
      },
      maintenance: {
        serviceReminder: true,
        checkEngineLight: true,
        lowFuelWarning: true,
      },
    };

    const premiumFeatures = {
      safety: {
        ...baseFeatures.safety,
        esp: true,
        tractionControl: true,
        sideAirbags: 2,
        curtainAirbags: 2,
        crashTestRating: '5 Star',
      },
      comfort: {
        ...baseFeatures.comfort,
        automaticClimateControl: true,
        powerDriverSeat: true,
        leatherSeats: true,
        cruiseControl: true,
      },
      exterior: {
        ...baseFeatures.exterior,
        ledHeadlamps: true,
        ledTailLamps: true,
        alloyWheels: true,
        sunroof: true,
      },
      technology: {
        ...baseFeatures.technology,
        touchscreen: true,
        androidAuto: true,
        appleCarplay: true,
        navigation: true,
        speakers: 6,
      },
      parking: {
        parkingSensors: true,
        parkingCamera: true,
      },
      performance: {
        sportMode: true,
        ecoMode: true,
      },
      convenience: {
        ...baseFeatures.convenience,
        keylessEntry: true,
        pushButtonStart: true,
        autoDimmingIrvm: true,
        bottleHolders: 4,
      },
    };

    const luxuryFeatures = {
      ...premiumFeatures,
      safety: {
        ...premiumFeatures.safety,
        kneeAirbag: 1,
        isofixChildSeat: true,
        impactSensingDoorUnlock: true,
      },
      comfort: {
        ...premiumFeatures.comfort,
        dualZoneClimateControl: true,
        ventilatedSeats: true,
        memorySeats: true,
        adaptiveCruiseControl: true,
      },
      exterior: {
        ...premiumFeatures.exterior,
        panoramicSunroof: true,
        ambientLighting: true,
      },
      technology: {
        ...premiumFeatures.technology,
        wirelessCharging: true,
        headsUpDisplay: true,
        premiumAudio: true,
        speakers: 8,
      },
      parking: {
        ...premiumFeatures.parking,
        threeSixtyDegreeCamera: true,
        automaticParking: true,
      },
      performance: {
        ...premiumFeatures.performance,
        paddleShifters: true,
        adaptiveSuspension: true,
      },
    };

    // Return features based on feature package
    if (['Base', 'L', 'LX'].includes(featurePackage)) {
      return baseFeatures;
    } else if (['V', 'VX', 'Z', 'ZX'].includes(featurePackage)) {
      return premiumFeatures;
    } else {
      return luxuryFeatures;
    }
  }

  private generateColors(): string[] {
    const colorOptions = [
      'Pearl White',
      'Metallic Silver',
      'Cosmic Black',
      'Racing Red',
      'Ocean Blue',
      'Forest Green',
      'Sunset Orange',
      'Midnight Grey',
      'Champagne Gold',
      'Electric Blue',
      'Crimson Red',
      'Emerald Green',
    ];

    const numColors = Math.floor(Math.random() * 4) + 3; // 3-6 colors
    const selectedColors: string[] = [];

    for (let i = 0; i < numColors; i++) {
      const color =
        colorOptions[Math.floor(Math.random() * colorOptions.length)];
      if (!selectedColors.includes(color)) {
        selectedColors.push(color);
      }
    }

    return selectedColors;
  }

  private generateVariantName(
    modelName: string,
    fuelType: string,
    transmissionType: string,
    featurePackage: string,
  ): string {
    const fuelAbbr =
      fuelType === 'Petrol'
        ? 'P'
        : fuelType === 'Diesel'
          ? 'D'
          : fuelType === 'Electric'
            ? 'E'
            : fuelType === 'Hybrid'
              ? 'H'
              : fuelType.charAt(0);

    const transmissionAbbr =
      transmissionType === 'Manual'
        ? 'MT'
        : transmissionType === 'Automatic'
          ? 'AT'
          : transmissionType === 'AMT'
            ? 'AMT'
            : transmissionType === 'CVT'
              ? 'CVT'
              : transmissionType.charAt(0);

    return `${modelName} ${featurePackage} ${fuelAbbr} ${transmissionAbbr}`;
  }

  private generateDisplayName(
    modelName: string,
    fuelType: string,
    transmissionType: string,
    featurePackage: string,
  ): string {
    return `${modelName} ${featurePackage} ${fuelType} ${transmissionType}`;
  }

  async seedVehicleVariants(): Promise<void> {
    console.log('Starting vehicle variant seeding...');

    // Get all required data
    const vehicleModels = await this.vehicleModelModel
      .find({ isDeleted: false })
      .exec();
    const fuelTypes = await this.fuelTypeModel
      .find({ isDeleted: false })
      .exec();
    const transmissionTypes = await this.transmissionTypeModel
      .find({ isDeleted: false })
      .exec();

    if (vehicleModels.length === 0) {
      console.log('No vehicle models found. Please seed vehicle models first.');
      return;
    }

    if (fuelTypes.length === 0) {
      console.log('No fuel types found. Please seed fuel types first.');
      return;
    }

    if (transmissionTypes.length === 0) {
      console.log(
        'No transmission types found. Please seed transmission types first.',
      );
      return;
    }

    console.log(
      `Found ${vehicleModels.length} vehicle models, ${fuelTypes.length} fuel types, ${transmissionTypes.length} transmission types`,
    );

    let totalVariantsCreated = 0;

    for (const model of vehicleModels) {
      console.log(`Creating variants for model: ${model.name}`);

      // Determine which fuel types are suitable for this vehicle type
      const suitableFuelTypes = this.getSuitableFuelTypes(model.vehicleType);
      const suitableTransmissionTypes = this.getSuitableTransmissionTypes(
        model.vehicleType,
      );
      const suitableFeaturePackages = this.getSuitableFeaturePackages(
        model.vehicleType,
      );

      // Create 3-5 variants per model
      const numVariants = Math.floor(Math.random() * 3) + 3; // 3-5 variants

      for (let i = 0; i < numVariants; i++) {
        const fuelType =
          suitableFuelTypes[
            Math.floor(Math.random() * suitableFuelTypes.length)
          ];
        const transmissionType =
          suitableTransmissionTypes[
            Math.floor(Math.random() * suitableTransmissionTypes.length)
          ];
        const featurePackage =
          suitableFeaturePackages[
            Math.floor(Math.random() * suitableFeaturePackages.length)
          ];

        const fuelTypeDoc = fuelTypes.find((ft) => ft.name === fuelType);
        const transmissionTypeDoc = transmissionTypes.find(
          (tt) => tt.name === transmissionType,
        );

        if (!fuelTypeDoc || !transmissionTypeDoc) {
          console.log(
            `Skipping variant - fuel type or transmission type not found`,
          );
          continue;
        }

        const variantName = this.generateVariantName(
          model.name,
          fuelType,
          transmissionType,
          featurePackage,
        );
        const displayName = this.generateDisplayName(
          model.name,
          fuelType,
          transmissionType,
          featurePackage,
        );

        // Check if variant already exists
        const existingVariant = await this.vehicleVariantModel
          .findOne({
            vehicleModel: model._id,
            fuelType: fuelTypeDoc._id,
            transmissionType: transmissionTypeDoc._id,
            featurePackage: featurePackage,
          })
          .exec();

        if (existingVariant) {
          console.log(`Variant already exists: ${displayName}`);
          continue;
        }

        // Generate pricing based on model, fuel type, and feature package
        const basePrice = this.calculateBasePrice(
          model.vehicleType,
          fuelType,
          featurePackage,
        );
        const exShowroomPrice = Math.round(basePrice * 0.85);
        const onRoadPrice = Math.round(basePrice * 1.15);

        const variantData = {
          name: variantName,
          displayName: displayName,
          vehicleModel: model._id,
          fuelType: fuelTypeDoc._id,
          transmissionType: transmissionTypeDoc._id,
          featurePackage: featurePackage,
          engineSpecs: this.generateEngineSpecs(fuelType, featurePackage),
          performanceSpecs: this.generatePerformanceSpecs(
            fuelType,
            featurePackage,
          ),
          dimensions: this.generateDimensions(model.vehicleType),
          seatingCapacity:
            model.vehicleType === 'two-wheeler'
              ? 2
              : Math.floor(Math.random() * 3) + 5, // 2 for 2-wheelers, 5-7 for others
          price: basePrice,
          exShowroomPrice: exShowroomPrice,
          onRoadPrice: onRoadPrice,
          colors: this.generateColors(),
          description: `${displayName} - A perfect blend of performance, comfort, and style. Features ${featurePackage} package with ${fuelType} engine and ${transmissionType} transmission.`,
          features: this.generateFeatures(featurePackage),
          isActive: true,
          isLaunched: true,
          launchDate: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          ), // Random date within last year
        };

        try {
          await this.vehicleVariantModel.create(variantData);
          console.log(
            `Created variant: ${displayName} - ₹${basePrice.toLocaleString()}`,
          );
          totalVariantsCreated++;
        } catch (error) {
          console.error(
            `Error creating variant ${displayName}:`,
            error.message,
          );
        }
      }
    }

    console.log(
      `Vehicle variant seeding completed! Created ${totalVariantsCreated} variants.`,
    );
  }

  private getSuitableFuelTypes(vehicleType: string): string[] {
    switch (vehicleType) {
      case 'two-wheeler':
        return ['Petrol', 'Electric'];
      case 'SUV':
      case 'Sedan':
      case 'Hatchback':
      case 'MUV':
      case 'Compact SUV':
      case 'Sub-Compact SUV':
        return ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Plugin_Hybrid'];
      case 'Truck':
        return ['Diesel', 'Electric'];
      default:
        return ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
    }
  }

  private getSuitableTransmissionTypes(vehicleType: string): string[] {
    switch (vehicleType) {
      case 'two-wheeler':
        return ['Manual', 'Automatic'];
      case 'Truck':
        return ['Manual', 'Automatic'];
      default:
        return ['Manual', 'Automatic', 'AMT', 'CVT', 'Dual_Clutch'];
    }
  }

  private getSuitableFeaturePackages(vehicleType: string): string[] {
    switch (vehicleType) {
      case 'two-wheeler':
        return [
          FeaturePackage.BASE,
          FeaturePackage.L,
          FeaturePackage.LX,
          FeaturePackage.V,
          FeaturePackage.VX,
        ];
      case 'Truck':
        return [
          FeaturePackage.BASE,
          FeaturePackage.L,
          FeaturePackage.LX,
          FeaturePackage.V,
        ];
      default:
        return Object.values(FeaturePackage);
    }
  }

  private calculateBasePrice(
    vehicleType: string,
    fuelType: string,
    featurePackage: string,
  ): number {
    let basePrice = 0;

    // Base price by vehicle type
    switch (vehicleType) {
      case 'two-wheeler':
        basePrice = 50000 + Math.random() * 150000;
        break;
      case 'Hatchback':
        basePrice = 300000 + Math.random() * 400000;
        break;
      case 'Sedan':
        basePrice = 500000 + Math.random() * 800000;
        break;
      case 'SUV':
      case 'Compact SUV':
      case 'Sub-Compact SUV':
        basePrice = 600000 + Math.random() * 1200000;
        break;
      case 'MUV':
        basePrice = 400000 + Math.random() * 600000;
        break;
      case 'Truck':
        basePrice = 800000 + Math.random() * 2000000;
        break;
      default:
        basePrice = 400000 + Math.random() * 600000;
    }

    // Adjust for fuel type
    switch (fuelType) {
      case 'Diesel':
        basePrice *= 1.1;
        break;
      case 'Electric':
        basePrice *= 1.3;
        break;
      case 'Hybrid':
        basePrice *= 1.2;
        break;
      case 'Plugin_Hybrid':
        basePrice *= 1.4;
        break;
    }

    // Adjust for feature package
    const featureMultiplier = this.getFeaturePackageMultiplier(featurePackage);
    basePrice *= featureMultiplier;

    return Math.round(basePrice);
  }

  async seedAll(): Promise<void> {
    console.log('Starting vehicle variant seed data population...');
    await this.seedVehicleVariants();
    console.log('Vehicle variant seed data population completed!');
  }
}
