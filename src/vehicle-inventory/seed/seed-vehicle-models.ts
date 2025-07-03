import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Manufacturer,
  ManufacturerDocument,
} from '../schemas/manufacturer.schema';
import {
  VehicleModel,
  VehicleModelDocument,
} from '../schemas/vehicle-model.schema';
import { VehicleTypes } from '../../vehicles/enum/vehicle.type';

@Injectable()
export class VehicleModelSeedService {
  constructor(
    @InjectModel(Manufacturer.name)
    private readonly manufacturerModel: Model<ManufacturerDocument>,
    @InjectModel(VehicleModel.name)
    private readonly vehicleModelModel: Model<VehicleModelDocument>,
  ) {}

  async seedVehicleModels(): Promise<void> {
    console.log('🚗 Starting vehicle model seeding...');

    // Get all manufacturers for reference
    const manufacturers = await this.manufacturerModel
      .find({ isActive: true })
      .exec();
    const manufacturerMap = new Map();
    manufacturers.forEach((m) => manufacturerMap.set(m.name, m._id));

    const vehicleModels = [
      // Maruti Suzuki Models
      {
        name: 'swift',
        displayName: 'Swift',
        manufacturerName: 'maruti_suzuki',
        vehicleType: VehicleTypes.HATCHBACK,
        description:
          'Popular hatchback known for fuel efficiency and reliability',
        launchYear: 2005,
        segment: 'B',
        bodyType: 'Hatchback',
        images: [
          'https://example.com/models/swift-1.jpg',
          'https://example.com/models/swift-2.jpg',
        ],
        brochureUrl: 'https://example.com/brochures/swift.pdf',
      },
      {
        name: 'dzire',
        displayName: 'Dzire',
        manufacturerName: 'maruti_suzuki',
        vehicleType: VehicleTypes.SEDAN,
        description: 'Compact sedan based on Swift platform',
        launchYear: 2008,
        segment: 'B',
        bodyType: 'Sedan',
        images: ['https://example.com/models/dzire-1.jpg'],
        brochureUrl: 'https://example.com/brochures/dzire.pdf',
      },
      {
        name: 'brezza',
        displayName: 'Brezza',
        manufacturerName: 'maruti_suzuki',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Compact SUV with modern design and features',
        launchYear: 2016,
        segment: 'B',
        bodyType: 'SUV',
        images: ['https://example.com/models/brezza-1.jpg'],
        brochureUrl: 'https://example.com/brochures/brezza.pdf',
      },
      {
        name: 'ertiga',
        displayName: 'Ertiga',
        manufacturerName: 'maruti_suzuki',
        vehicleType: VehicleTypes.MUV,
        description: '7-seater MPV perfect for family use',
        launchYear: 2012,
        segment: 'C',
        bodyType: 'MPV',
        images: ['https://example.com/models/ertiga-1.jpg'],
        brochureUrl: 'https://example.com/brochures/ertiga.pdf',
      },

      // Honda Models
      {
        name: 'city',
        displayName: 'City',
        manufacturerName: 'honda',
        vehicleType: VehicleTypes.SEDAN,
        description:
          'Premium sedan with excellent build quality and refinement',
        launchYear: 1998,
        segment: 'C',
        bodyType: 'Sedan',
        images: ['https://example.com/models/city-1.jpg'],
        brochureUrl: 'https://example.com/brochures/city.pdf',
      },
      {
        name: 'amaze',
        displayName: 'Amaze',
        manufacturerName: 'honda',
        vehicleType: VehicleTypes.SEDAN,
        description: 'Compact sedan with Honda reliability',
        launchYear: 2013,
        segment: 'B',
        bodyType: 'Sedan',
        images: ['https://example.com/models/amaze-1.jpg'],
        brochureUrl: 'https://example.com/brochures/amaze.pdf',
      },
      {
        name: 'jazz',
        displayName: 'Jazz',
        manufacturerName: 'honda',
        vehicleType: VehicleTypes.HATCHBACK,
        description: 'Premium hatchback with versatile interior',
        launchYear: 2009,
        segment: 'B',
        bodyType: 'Hatchback',
        images: ['https://example.com/models/jazz-1.jpg'],
        brochureUrl: 'https://example.com/brochures/jazz.pdf',
      },
      {
        name: 'activa',
        displayName: 'Activa',
        manufacturerName: 'honda',
        vehicleType: VehicleTypes.TWOWHEELER,
        description:
          "India's most popular scooter with excellent fuel efficiency",
        launchYear: 2001,
        segment: 'Scooter',
        bodyType: 'Scooter',
        images: ['https://example.com/models/activa-1.jpg'],
        brochureUrl: 'https://example.com/brochures/activa.pdf',
      },

      // Toyota Models
      {
        name: 'innova_crysta',
        displayName: 'Innova Crysta',
        manufacturerName: 'toyota',
        vehicleType: VehicleTypes.MUV,
        description: 'Premium MPV with excellent comfort and reliability',
        launchYear: 2016,
        segment: 'D',
        bodyType: 'MPV',
        images: ['https://example.com/models/innova-crysta-1.jpg'],
        brochureUrl: 'https://example.com/brochures/innova-crysta.pdf',
      },
      {
        name: 'fortuner',
        displayName: 'Fortuner',
        manufacturerName: 'toyota',
        vehicleType: VehicleTypes.SUV,
        description:
          'Premium SUV with commanding presence and off-road capability',
        launchYear: 2009,
        segment: 'D',
        bodyType: 'SUV',
        images: ['https://example.com/models/fortuner-1.jpg'],
        brochureUrl: 'https://example.com/brochures/fortuner.pdf',
      },
      {
        name: 'camry',
        displayName: 'Camry',
        manufacturerName: 'toyota',
        vehicleType: VehicleTypes.SEDAN,
        description: 'Luxury sedan with hybrid technology',
        launchYear: 2002,
        segment: 'E',
        bodyType: 'Sedan',
        images: ['https://example.com/models/camry-1.jpg'],
        brochureUrl: 'https://example.com/brochures/camry.pdf',
      },

      // Hyundai Models
      {
        name: 'i20',
        displayName: 'i20',
        manufacturerName: 'hyundai',
        vehicleType: VehicleTypes.HATCHBACK,
        description: 'Premium hatchback with modern design and features',
        launchYear: 2008,
        segment: 'B',
        bodyType: 'Hatchback',
        images: ['https://example.com/models/i20-1.jpg'],
        brochureUrl: 'https://example.com/brochures/i20.pdf',
      },
      {
        name: 'verna',
        displayName: 'Verna',
        manufacturerName: 'hyundai',
        vehicleType: VehicleTypes.SEDAN,
        description: 'Sporty sedan with excellent performance',
        launchYear: 2006,
        segment: 'C',
        bodyType: 'Sedan',
        images: ['https://example.com/models/verna-1.jpg'],
        brochureUrl: 'https://example.com/brochures/verna.pdf',
      },
      {
        name: 'creta',
        displayName: 'Creta',
        manufacturerName: 'hyundai',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Compact SUV with modern design and features',
        launchYear: 2015,
        segment: 'B',
        bodyType: 'SUV',
        images: ['https://example.com/models/creta-1.jpg'],
        brochureUrl: 'https://example.com/brochures/creta.pdf',
      },
      {
        name: 'venue',
        displayName: 'Venue',
        manufacturerName: 'hyundai',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Micro SUV with modern features and connectivity',
        launchYear: 2019,
        segment: 'B',
        bodyType: 'SUV',
        images: ['https://example.com/models/venue-1.jpg'],
        brochureUrl: 'https://example.com/brochures/venue.pdf',
      },

      // Tata Models
      {
        name: 'nexon',
        displayName: 'Nexon',
        manufacturerName: 'tata_motors',
        vehicleType: VehicleTypes.SUV,
        description: "India's first 5-star safety rated electric SUV",
        launchYear: 2017,
        segment: 'B',
        bodyType: 'SUV',
        images: ['https://example.com/models/nexon-1.jpg'],
        brochureUrl: 'https://example.com/brochures/nexon.pdf',
      },
      {
        name: 'punch',
        displayName: 'Punch',
        manufacturerName: 'tata_motors',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Micro SUV with 5-star safety rating',
        launchYear: 2021,
        segment: 'B',
        bodyType: 'SUV',
        images: ['https://example.com/models/punch-1.jpg'],
        brochureUrl: 'https://example.com/brochures/punch.pdf',
      },
      {
        name: 'altroz',
        displayName: 'Altroz',
        manufacturerName: 'tata_motors',
        vehicleType: VehicleTypes.HATCHBACK,
        description: 'Premium hatchback with 5-star safety rating',
        launchYear: 2020,
        segment: 'B',
        bodyType: 'Hatchback',
        images: ['https://example.com/models/altroz-1.jpg'],
        brochureUrl: 'https://example.com/brochures/altroz.pdf',
      },

      // Mahindra Models
      {
        name: 'xuv700',
        displayName: 'XUV700',
        manufacturerName: 'mahindra',
        vehicleType: VehicleTypes.SUV,
        description: 'Premium SUV with advanced ADAS features',
        launchYear: 2021,
        segment: 'D',
        bodyType: 'SUV',
        images: ['https://example.com/models/xuv700-1.jpg'],
        brochureUrl: 'https://example.com/brochures/xuv700.pdf',
      },
      {
        name: 'thar',
        displayName: 'Thar',
        manufacturerName: 'mahindra',
        vehicleType: VehicleTypes.SUV,
        description: 'Iconic off-roader with modern features',
        launchYear: 2020,
        segment: 'C',
        bodyType: 'SUV',
        images: ['https://example.com/models/thar-1.jpg'],
        brochureUrl: 'https://example.com/brochures/thar.pdf',
      },
      {
        name: 'scorpio',
        displayName: 'Scorpio',
        manufacturerName: 'mahindra',
        vehicleType: VehicleTypes.SUV,
        description: 'Legendary SUV with commanding presence',
        launchYear: 2002,
        segment: 'D',
        bodyType: 'SUV',
        images: ['https://example.com/models/scorpio-1.jpg'],
        brochureUrl: 'https://example.com/brochures/scorpio.pdf',
      },

      // Kia Models
      {
        name: 'sonet',
        displayName: 'Sonet',
        manufacturerName: 'kia',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Compact SUV with premium features',
        launchYear: 2020,
        segment: 'B',
        bodyType: 'SUV',
        images: ['https://example.com/models/sonet-1.jpg'],
        brochureUrl: 'https://example.com/brochures/sonet.pdf',
      },
      {
        name: 'seltos',
        displayName: 'Seltos',
        manufacturerName: 'kia',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Mid-size SUV with modern design',
        launchYear: 2019,
        segment: 'C',
        bodyType: 'SUV',
        images: ['https://example.com/models/seltos-1.jpg'],
        brochureUrl: 'https://example.com/brochures/seltos.pdf',
      },
      {
        name: 'carens',
        displayName: 'Carens',
        manufacturerName: 'kia',
        vehicleType: VehicleTypes.MUV,
        description: 'Premium MPV with SUV-like design',
        launchYear: 2022,
        segment: 'C',
        bodyType: 'MPV',
        images: ['https://example.com/models/carens-1.jpg'],
        brochureUrl: 'https://example.com/brochures/carens.pdf',
      },

      // BMW Models
      {
        name: '3_series',
        displayName: '3 Series',
        manufacturerName: 'bmw',
        vehicleType: VehicleTypes.SEDAN,
        description: 'Luxury sports sedan with excellent driving dynamics',
        launchYear: 1975,
        segment: 'E',
        bodyType: 'Sedan',
        images: ['https://example.com/models/3-series-1.jpg'],
        brochureUrl: 'https://example.com/brochures/3-series.pdf',
      },
      {
        name: 'x1',
        displayName: 'X1',
        manufacturerName: 'bmw',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Compact luxury SUV with sporty character',
        launchYear: 2009,
        segment: 'C',
        bodyType: 'SUV',
        images: ['https://example.com/models/x1-1.jpg'],
        brochureUrl: 'https://example.com/brochures/x1.pdf',
      },
      {
        name: 'x3',
        displayName: 'X3',
        manufacturerName: 'bmw',
        vehicleType: VehicleTypes.SUV,
        description: 'Mid-size luxury SUV with excellent performance',
        launchYear: 2003,
        segment: 'D',
        bodyType: 'SUV',
        images: ['https://example.com/models/x3-1.jpg'],
        brochureUrl: 'https://example.com/brochures/x3.pdf',
      },

      // Mercedes-Benz Models
      {
        name: 'c_class',
        displayName: 'C-Class',
        manufacturerName: 'mercedes_benz',
        vehicleType: VehicleTypes.SEDAN,
        description: 'Luxury sedan with sophisticated design and technology',
        launchYear: 1993,
        segment: 'E',
        bodyType: 'Sedan',
        images: ['https://example.com/models/c-class-1.jpg'],
        brochureUrl: 'https://example.com/brochures/c-class.pdf',
      },
      {
        name: 'e_class',
        displayName: 'E-Class',
        manufacturerName: 'mercedes_benz',
        vehicleType: VehicleTypes.SEDAN,
        description: 'Executive luxury sedan with advanced features',
        launchYear: 1953,
        segment: 'F',
        bodyType: 'Sedan',
        images: ['https://example.com/models/e-class-1.jpg'],
        brochureUrl: 'https://example.com/brochures/e-class.pdf',
      },
      {
        name: 'gla',
        displayName: 'GLA',
        manufacturerName: 'mercedes_benz',
        vehicleType: VehicleTypes.SUB_COMPACT_SUV,
        description: 'Compact luxury SUV with urban appeal',
        launchYear: 2013,
        segment: 'C',
        bodyType: 'SUV',
        images: ['https://example.com/models/gla-1.jpg'],
        brochureUrl: 'https://example.com/brochures/gla.pdf',
      },

      // Hero MotoCorp Models
      {
        name: 'splendor',
        displayName: 'Splendor',
        manufacturerName: 'hero_moto',
        vehicleType: VehicleTypes.TWOWHEELER,
        description:
          "India's most trusted motorcycle with excellent fuel efficiency",
        launchYear: 1994,
        segment: 'Commuter',
        bodyType: 'Motorcycle',
        images: ['https://example.com/models/splendor-1.jpg'],
        brochureUrl: 'https://example.com/brochures/splendor.pdf',
      },
      {
        name: 'passion',
        displayName: 'Passion',
        manufacturerName: 'hero_moto',
        vehicleType: VehicleTypes.TWOWHEELER,
        description: 'Stylish commuter motorcycle for young riders',
        launchYear: 2001,
        segment: 'Commuter',
        bodyType: 'Motorcycle',
        images: ['https://example.com/models/passion-1.jpg'],
        brochureUrl: 'https://example.com/brochures/passion.pdf',
      },
      {
        name: 'xpulse',
        displayName: 'XPulse',
        manufacturerName: 'hero_moto',
        vehicleType: VehicleTypes.TWOWHEELER,
        description: 'Adventure motorcycle for off-road enthusiasts',
        launchYear: 2019,
        segment: 'Adventure',
        bodyType: 'Motorcycle',
        images: ['https://example.com/models/xpulse-1.jpg'],
        brochureUrl: 'https://example.com/brochures/xpulse.pdf',
      },

      // Bajaj Auto Models
      {
        name: 'pulsar',
        displayName: 'Pulsar',
        manufacturerName: 'bajaj_auto',
        vehicleType: VehicleTypes.TWOWHEELER,
        description: 'Iconic performance motorcycle for young riders',
        launchYear: 2001,
        segment: 'Performance',
        bodyType: 'Motorcycle',
        images: ['https://example.com/models/pulsar-1.jpg'],
        brochureUrl: 'https://example.com/brochures/pulsar.pdf',
      },
      {
        name: 'platina',
        displayName: 'Platina',
        manufacturerName: 'bajaj_auto',
        vehicleType: VehicleTypes.TWOWHEELER,
        description: 'Fuel-efficient commuter motorcycle',
        launchYear: 2006,
        segment: 'Commuter',
        bodyType: 'Motorcycle',
        images: ['https://example.com/models/platina-1.jpg'],
        brochureUrl: 'https://example.com/brochures/platina.pdf',
      },
      {
        name: 'ct100',
        displayName: 'CT100',
        manufacturerName: 'bajaj_auto',
        vehicleType: VehicleTypes.TWOWHEELER,
        description: 'Entry-level motorcycle with excellent fuel efficiency',
        launchYear: 2014,
        segment: 'Entry',
        bodyType: 'Motorcycle',
        images: ['https://example.com/models/ct100-1.jpg'],
        brochureUrl: 'https://example.com/brochures/ct100.pdf',
      },

      // TVS Motor Models
      {
        name: 'apache_rtr',
        displayName: 'Apache RTR',
        manufacturerName: 'tvs_motor',
        vehicleType: VehicleTypes.TWOWHEELER,
        description: 'Sporty motorcycle with racing DNA',
        launchYear: 2005,
        segment: 'Performance',
        bodyType: 'Motorcycle',
        images: ['https://example.com/models/apache-rtr-1.jpg'],
        brochureUrl: 'https://example.com/brochures/apache-rtr.pdf',
      },
      {
        name: 'jupiter',
        displayName: 'Jupiter',
        manufacturerName: 'tvs_motor',
        vehicleType: VehicleTypes.TWOWHEELER,
        description: 'Premium scooter with modern features',
        launchYear: 2013,
        segment: 'Scooter',
        bodyType: 'Scooter',
        images: ['https://example.com/models/jupiter-1.jpg'],
        brochureUrl: 'https://example.com/brochures/jupiter.pdf',
      },
      {
        name: 'ntorq',
        displayName: 'NTorq',
        manufacturerName: 'tvs_motor',
        vehicleType: VehicleTypes.TWOWHEELER,
        description: 'Sporty scooter with connected features',
        launchYear: 2018,
        segment: 'Scooter',
        bodyType: 'Scooter',
        images: ['https://example.com/models/ntorq-1.jpg'],
        brochureUrl: 'https://example.com/brochures/ntorq.pdf',
      },

      // Commercial Vehicle Models
      {
        name: '407_truck',
        displayName: '407 Truck',
        manufacturerName: 'ashok_leyland',
        vehicleType: VehicleTypes.TRUCK,
        description: 'Light commercial truck for urban logistics',
        launchYear: 1993,
        segment: 'LCV',
        bodyType: 'Truck',
        images: ['https://example.com/models/407-truck-1.jpg'],
        brochureUrl: 'https://example.com/brochures/407-truck.pdf',
      },
      {
        name: 'boss_truck',
        displayName: 'Boss Truck',
        manufacturerName: 'ashok_leyland',
        vehicleType: VehicleTypes.TRUCK,
        description: 'Heavy commercial truck for long-haul transportation',
        launchYear: 2008,
        segment: 'HCV',
        bodyType: 'Truck',
        images: ['https://example.com/models/boss-truck-1.jpg'],
        brochureUrl: 'https://example.com/brochures/boss-truck.pdf',
      },
      {
        name: 'eicher_pro',
        displayName: 'Eicher Pro',
        manufacturerName: 'eicher_motors',
        vehicleType: VehicleTypes.TRUCK,
        description: 'Modern commercial truck with advanced features',
        launchYear: 2016,
        segment: 'MCV',
        bodyType: 'Truck',
        images: ['https://example.com/models/eicher-pro-1.jpg'],
        brochureUrl: 'https://example.com/brochures/eicher-pro.pdf',
      },
    ];

    for (const model of vehicleModels) {
      const manufacturerId = manufacturerMap.get(model.manufacturerName);
      if (!manufacturerId) {
        console.log(`⚠️  Manufacturer not found: ${model.manufacturerName}`);
        continue;
      }

      const exists = await this.vehicleModelModel
        .findOne({
          name: model.name,
          manufacturer: manufacturerId,
        })
        .exec();

      if (!exists) {
        await this.vehicleModelModel.create({
          name: model.name,
          displayName: model.displayName,
          manufacturer: manufacturerId,
          vehicleType: model.vehicleType,
          description: model.description,
          launchYear: model.launchYear,
          segment: model.segment,
          bodyType: model.bodyType,
          images: model.images,
          brochureUrl: model.brochureUrl,
          isActive: true,
        });
        console.log(
          `✅ Created vehicle model: ${model.displayName} (${model.manufacturerName})`,
        );
      } else {
        console.log(
          `⏭️  Vehicle model already exists: ${model.displayName} (${model.manufacturerName})`,
        );
      }
    }

    console.log('✅ Vehicle model seeding completed!');
  }

  async clearVehicleModels(): Promise<void> {
    console.log('🧹 Clearing existing vehicle models...');
    await this.vehicleModelModel.deleteMany({});
    console.log('✅ Existing vehicle models cleared');
  }

  async seedAll(): Promise<void> {
    console.log('🚀 Starting vehicle model data seeding process...');

    await this.seedVehicleModels();

    console.log('🎉 Vehicle model data seeding completed successfully!');
  }
}
