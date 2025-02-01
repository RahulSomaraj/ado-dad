import { MongooseModuleOptions } from '@nestjs/mongoose';
import 'dotenv/config';

class ConfigService {
  constructor(private env: { [k: string]: string | undefined }) {}

  private getValue(key: string, throwOnMissing = true): string {
    const value = this.env[key];
    if (!value && throwOnMissing) {
      throw new Error(`Config error - missing env.${key}`);
    }
    return value || ''; // Ensure it always returns a string
  }

  public ensureValues(keys: string[]) {
    keys.forEach((k) => this.getValue(k, true));
    return this;
  }

  public getPort() {
    return this.getValue('PORT', true);
  }

  public isProduction() {
    return this.getValue('NODE_ENV', false) === 'production';
  }

  public getMongoConfig(): MongooseModuleOptions {
    let uri: string = this.getValue('MONGO_URI', false); // Now always a string

    if (!uri) {
      const user = encodeURIComponent(this.getValue('MONGO_USER', false) || '');
      const password = encodeURIComponent(
        this.getValue('MONGO_PASSWORD', false) || '',
      );
      const host = this.getValue('MONGO_HOST', true);
      const port = this.getValue('MONGO_PORT', true);
      const dbName = this.getValue('MONGO_DATABASE', true);

      if (user && password) {
        uri = `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=admin`;
      } else {
        uri = `mongodb://${host}:${port}/${dbName}`;
      }
    }

    console.log('Connecting to MongoDB:', uri);

    return {
      uri, // Guaranteed to be a string
      connectionFactory: (connection) => {
        console.log('MongoDB connection established');
        return connection;
      },
    };
  }
}

const configService = new ConfigService(process.env).ensureValues([
  'MONGO_URI', // Ensures URI is set OR falls back to manual connection
  'MONGO_DATABASE', // Additional required values
]);

export { configService };
