import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Manufacturer,
  ManufacturerDocument,
} from '../schemas/manufacturer.schema';

@Injectable()
export class ManufacturerSeedService {
  constructor(
    @InjectModel(Manufacturer.name)
    private readonly manufacturerModel: Model<ManufacturerDocument>,
  ) {}

  async seedManufacturers(): Promise<void> {
    const manufacturers = [
      // Indian Manufacturers
      {
        name: 'maruti_suzuki',
        displayName: 'Maruti Suzuki',
        originCountry: 'India',
        description:
          "India's largest car manufacturer, known for affordable and fuel-efficient vehicles",
        logo: 'https://example.com/logos/maruti-suzuki.png',
        website: 'https://www.marutisuzuki.com',
        foundedYear: 1981,
        headquarters: 'New Delhi, India',
        isActive: true,
      },
      {
        name: 'tata_motors',
        displayName: 'Tata Motors',
        originCountry: 'India',
        description:
          'Leading Indian automotive manufacturer, known for passenger cars and commercial vehicles',
        logo: 'https://example.com/logos/tata-motors.png',
        website: 'https://www.tatamotors.com',
        foundedYear: 1945,
        headquarters: 'Mumbai, India',
        isActive: true,
      },
      {
        name: 'mahindra',
        displayName: 'Mahindra & Mahindra',
        originCountry: 'India',
        description:
          'Major Indian automotive manufacturer specializing in SUVs and commercial vehicles',
        logo: 'https://example.com/logos/mahindra.png',
        website: 'https://www.mahindra.com',
        foundedYear: 1945,
        headquarters: 'Mumbai, India',
        isActive: true,
      },
      {
        name: 'hero_moto',
        displayName: 'Hero MotoCorp',
        originCountry: 'India',
        description:
          "World's largest two-wheeler manufacturer, known for motorcycles and scooters",
        logo: 'https://example.com/logos/hero-moto.png',
        website: 'https://www.heromotocorp.com',
        foundedYear: 1984,
        headquarters: 'New Delhi, India',
        isActive: true,
      },
      {
        name: 'bajaj_auto',
        displayName: 'Bajaj Auto',
        originCountry: 'India',
        description:
          'Leading Indian two-wheeler and three-wheeler manufacturer',
        logo: 'https://example.com/logos/bajaj-auto.png',
        website: 'https://www.bajajauto.com',
        foundedYear: 1945,
        headquarters: 'Pune, India',
        isActive: true,
      },
      {
        name: 'tvs_motor',
        displayName: 'TVS Motor Company',
        originCountry: 'India',
        description: 'Indian multinational motorcycle and scooter manufacturer',
        logo: 'https://example.com/logos/tvs-motor.png',
        website: 'https://www.tvsmotor.com',
        foundedYear: 1978,
        headquarters: 'Chennai, India',
        isActive: true,
      },
      {
        name: 'ashok_leyland',
        displayName: 'Ashok Leyland',
        originCountry: 'India',
        description: 'Major Indian commercial vehicle manufacturer',
        logo: 'https://example.com/logos/ashok-leyland.png',
        website: 'https://www.ashokleyland.com',
        foundedYear: 1948,
        headquarters: 'Chennai, India',
        isActive: true,
      },

      // Japanese Manufacturers
      {
        name: 'honda',
        displayName: 'Honda',
        originCountry: 'Japan',
        description:
          'Japanese multinational known for automobiles, motorcycles, and power equipment',
        logo: 'https://example.com/logos/honda.png',
        website: 'https://www.honda.com',
        foundedYear: 1948,
        headquarters: 'Tokyo, Japan',
        isActive: true,
      },
      {
        name: 'toyota',
        displayName: 'Toyota',
        originCountry: 'Japan',
        description:
          "World's largest automotive manufacturer, known for reliability and innovation",
        logo: 'https://example.com/logos/toyota.png',
        website: 'https://www.toyota.com',
        foundedYear: 1937,
        headquarters: 'Toyota City, Japan',
        isActive: true,
      },
      {
        name: 'suzuki',
        displayName: 'Suzuki',
        originCountry: 'Japan',
        description:
          'Japanese multinational known for automobiles, motorcycles, and marine engines',
        logo: 'https://example.com/logos/suzuki.png',
        website: 'https://www.suzuki.com',
        foundedYear: 1909,
        headquarters: 'Hamamatsu, Japan',
        isActive: true,
      },
      {
        name: 'yamaha',
        displayName: 'Yamaha',
        originCountry: 'Japan',
        description:
          'Japanese multinational known for motorcycles, marine products, and musical instruments',
        logo: 'https://example.com/logos/yamaha.png',
        website: 'https://www.yamaha.com',
        foundedYear: 1887,
        headquarters: 'Iwata, Japan',
        isActive: true,
      },
      {
        name: 'kawasaki',
        displayName: 'Kawasaki',
        originCountry: 'Japan',
        description:
          'Japanese multinational known for motorcycles, engines, and heavy equipment',
        logo: 'https://example.com/logos/kawasaki.png',
        website: 'https://www.kawasaki.com',
        foundedYear: 1896,
        headquarters: 'Tokyo, Japan',
        isActive: true,
      },
      {
        name: 'nissan',
        displayName: 'Nissan',
        originCountry: 'Japan',
        description: 'Japanese multinational automobile manufacturer',
        logo: 'https://example.com/logos/nissan.png',
        website: 'https://www.nissan.com',
        foundedYear: 1933,
        headquarters: 'Yokohama, Japan',
        isActive: true,
      },
      {
        name: 'mitsubishi',
        displayName: 'Mitsubishi',
        originCountry: 'Japan',
        description:
          'Japanese multinational conglomerate with automotive division',
        logo: 'https://example.com/logos/mitsubishi.png',
        website: 'https://www.mitsubishi.com',
        foundedYear: 1870,
        headquarters: 'Tokyo, Japan',
        isActive: true,
      },

      // Korean Manufacturers
      {
        name: 'hyundai',
        displayName: 'Hyundai',
        originCountry: 'South Korea',
        description: 'South Korean multinational automotive manufacturer',
        logo: 'https://example.com/logos/hyundai.png',
        website: 'https://www.hyundai.com',
        foundedYear: 1967,
        headquarters: 'Seoul, South Korea',
        isActive: true,
      },
      {
        name: 'kia',
        displayName: 'Kia',
        originCountry: 'South Korea',
        description: 'South Korean multinational automotive manufacturer',
        logo: 'https://example.com/logos/kia.png',
        website: 'https://www.kia.com',
        foundedYear: 1944,
        headquarters: 'Seoul, South Korea',
        isActive: true,
      },

      // European Manufacturers
      {
        name: 'volkswagen',
        displayName: 'Volkswagen',
        originCountry: 'Germany',
        description: 'German multinational automotive manufacturer',
        logo: 'https://example.com/logos/volkswagen.png',
        website: 'https://www.volkswagen.com',
        foundedYear: 1937,
        headquarters: 'Wolfsburg, Germany',
        isActive: true,
      },
      {
        name: 'bmw',
        displayName: 'BMW',
        originCountry: 'Germany',
        description:
          'German multinational manufacturer of luxury vehicles and motorcycles',
        logo: 'https://example.com/logos/bmw.png',
        website: 'https://www.bmw.com',
        foundedYear: 1916,
        headquarters: 'Munich, Germany',
        isActive: true,
      },
      {
        name: 'mercedes_benz',
        displayName: 'Mercedes-Benz',
        originCountry: 'Germany',
        description:
          'German multinational automotive manufacturer known for luxury vehicles',
        logo: 'https://example.com/logos/mercedes-benz.png',
        website: 'https://www.mercedes-benz.com',
        foundedYear: 1926,
        headquarters: 'Stuttgart, Germany',
        isActive: true,
      },
      {
        name: 'audi',
        displayName: 'Audi',
        originCountry: 'Germany',
        description: 'German multinational manufacturer of luxury vehicles',
        logo: 'https://example.com/logos/audi.png',
        website: 'https://www.audi.com',
        foundedYear: 1909,
        headquarters: 'Ingolstadt, Germany',
        isActive: true,
      },
      {
        name: 'volvo',
        displayName: 'Volvo',
        originCountry: 'Sweden',
        description: 'Swedish multinational manufacturer of luxury vehicles',
        logo: 'https://example.com/logos/volvo.png',
        website: 'https://www.volvo.com',
        foundedYear: 1927,
        headquarters: 'Gothenburg, Sweden',
        isActive: true,
      },
      {
        name: 'skoda',
        displayName: 'Škoda',
        originCountry: 'Czech Republic',
        description: 'Czech automobile manufacturer, part of Volkswagen Group',
        logo: 'https://example.com/logos/skoda.png',
        website: 'https://www.skoda.com',
        foundedYear: 1895,
        headquarters: 'Mladá Boleslav, Czech Republic',
        isActive: true,
      },

      // American Manufacturers
      {
        name: 'ford',
        displayName: 'Ford',
        originCountry: 'United States',
        description: 'American multinational automobile manufacturer',
        logo: 'https://example.com/logos/ford.png',
        website: 'https://www.ford.com',
        foundedYear: 1903,
        headquarters: 'Dearborn, Michigan, USA',
        isActive: true,
      },
      {
        name: 'chevrolet',
        displayName: 'Chevrolet',
        originCountry: 'United States',
        description: 'American automobile division of General Motors',
        logo: 'https://example.com/logos/chevrolet.png',
        website: 'https://www.chevrolet.com',
        foundedYear: 1911,
        headquarters: 'Detroit, Michigan, USA',
        isActive: true,
      },
      {
        name: 'jeep',
        displayName: 'Jeep',
        originCountry: 'United States',
        description:
          'American automobile brand specializing in SUVs and off-road vehicles',
        logo: 'https://example.com/logos/jeep.png',
        website: 'https://www.jeep.com',
        foundedYear: 1941,
        headquarters: 'Toledo, Ohio, USA',
        isActive: true,
      },

      // Chinese Manufacturers
      {
        name: 'mg_motor',
        displayName: 'MG Motor',
        originCountry: 'China',
        description: 'British automotive brand now owned by SAIC Motor',
        logo: 'https://example.com/logos/mg-motor.png',
        website: 'https://www.mgmotor.co.uk',
        foundedYear: 1924,
        headquarters: 'London, UK (owned by SAIC)',
        isActive: true,
      },
      {
        name: 'haval',
        displayName: 'Haval',
        originCountry: 'China',
        description: 'Chinese automobile manufacturer specializing in SUVs',
        logo: 'https://example.com/logos/haval.png',
        website: 'https://www.haval.com',
        foundedYear: 2013,
        headquarters: 'Baoding, China',
        isActive: true,
      },

      // Commercial Vehicle Manufacturers
      {
        name: 'eicher_motors',
        displayName: 'Eicher Motors',
        originCountry: 'India',
        description:
          'Indian commercial vehicle manufacturer, known for Royal Enfield motorcycles',
        logo: 'https://example.com/logos/eicher-motors.png',
        website: 'https://www.eicher.in',
        foundedYear: 1948,
        headquarters: 'Gurgaon, India',
        isActive: true,
      },
      {
        name: 'force_motors',
        displayName: 'Force Motors',
        originCountry: 'India',
        description:
          'Indian automotive manufacturer specializing in commercial vehicles',
        logo: 'https://example.com/logos/force-motors.png',
        website: 'https://www.forcemotors.com',
        foundedYear: 1958,
        headquarters: 'Pune, India',
        isActive: true,
      },
      {
        name: 'bharat_benz',
        displayName: 'Bharat Benz',
        originCountry: 'India',
        description: 'Indian commercial vehicle brand, part of Daimler AG',
        logo: 'https://example.com/logos/bharat-benz.png',
        website: 'https://www.bharatbenz.com',
        foundedYear: 2012,
        headquarters: 'Chennai, India',
        isActive: true,
      },
      {
        name: 'tata_daewoo',
        displayName: 'Tata Daewoo',
        originCountry: 'South Korea',
        description:
          'South Korean commercial vehicle manufacturer, part of Tata Motors',
        logo: 'https://example.com/logos/tata-daewoo.png',
        website: 'https://www.tatadaewoo.com',
        foundedYear: 2002,
        headquarters: 'Seoul, South Korea',
        isActive: true,
      },
    ];

    console.log('🌱 Starting manufacturer seeding...');

    for (const manufacturer of manufacturers) {
      const exists = await this.manufacturerModel
        .findOne({ name: manufacturer.name })
        .exec();

      if (!exists) {
        await this.manufacturerModel.create(manufacturer);
        console.log(`✅ Created manufacturer: ${manufacturer.displayName}`);
      } else {
        console.log(
          `⏭️  Manufacturer already exists: ${manufacturer.displayName}`,
        );
      }
    }

    console.log('✅ Manufacturer seeding completed!');
  }

  async clearManufacturers(): Promise<void> {
    console.log('🧹 Clearing existing manufacturers...');
    await this.manufacturerModel.deleteMany({});
    console.log('✅ Existing manufacturers cleared');
  }

  async seedAll(): Promise<void> {
    console.log('🚀 Starting manufacturer data seeding process...');

    await this.seedManufacturers();

    console.log('🎉 Manufacturer data seeding completed successfully!');
  }
}
