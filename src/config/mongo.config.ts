import { MongooseModuleOptions } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import mongoose from 'mongoose';
import 'dotenv/config';

class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(private env: { [k: string]: string | undefined }) {}

  /**
   * Get environment variable value with optional validation
   */
  private getValue(key: string, throwOnMissing = true): string {
    const value = this.env[key];
    if (!value && throwOnMissing) {
      throw new Error(
        `Configuration error - missing environment variable: ${key}`,
      );
    }
    return value || '';
  }

  /**
   * Ensure all required environment variables are present
   */
  public ensureValues(keys: string[]): this {
    keys.forEach((key) => this.getValue(key, true));
    return this;
  }

  /**
   * Get application port
   */
  public getPort(): number {
    return parseInt(this.getValue('BACKEND_PORT', false) || '3000', 10);
  }

  /**
   * Check if running in production environment
   */
  public isProduction(): boolean {
    return this.getValue('NODE_ENV', false) === 'production';
  }

  /**
   * Get MongoDB configuration with optimized settings
   */
  public getMongoConfig(): MongooseModuleOptions {
    let uri: string = this.getValue('MONGO_URI', false);

    // Build URI from individual components if not provided
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

    // Log connection info (masked for security)
    const maskedUri = uri.replace(/\/\/.*@/, '//***:***@');
    this.logger.log(`Connecting to MongoDB: ${maskedUri}`);

    return {
      uri,
      maxPoolSize: parseInt(
        this.getValue('MONGO_MAX_POOL_SIZE', false) || '10',
        10,
      ),
      serverSelectionTimeoutMS: parseInt(
        this.getValue('MONGO_SERVER_SELECTION_TIMEOUT', false) || '5000',
        10,
      ),
      socketTimeoutMS: parseInt(
        this.getValue('MONGO_SOCKET_TIMEOUT', false) || '45000',
        10,
      ),
      retryWrites: true,
      w: 'majority',
      connectionFactory: (connection) => {
        // Connection event handlers
        connection.on('connected', () => {
          this.logger.log('✅ MongoDB connection established successfully');
        });

        connection.on('error', (error) => {
          this.logger.error('❌ MongoDB connection error:', error);
        });

        connection.on('disconnected', () => {
          this.logger.warn('⚠️ MongoDB connection lost');
        });

        connection.on('reconnected', () => {
          this.logger.log('🔄 MongoDB connection reestablished');
        });

        connection.on('close', () => {
          this.logger.log('🔒 MongoDB connection closed');
        });

        // Set up connection monitoring
        if (this.isProduction()) {
          this.setupConnectionMonitoring(connection);
        }

        return connection;
      },
    };
  }

  /**
   * Set up connection monitoring for production environments
   */
  private setupConnectionMonitoring(connection: mongoose.Connection): void {
    // Monitor connection pool
    setInterval(() => {
      const poolStatus = connection.db?.admin()?.listDatabases();
      if (poolStatus) {
        this.logger.debug('MongoDB pool status check completed');
      }
    }, 30000); // Check every 30 seconds

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      this.logger.log('Received SIGINT, closing MongoDB connection...');
      await connection.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      this.logger.log('Received SIGTERM, closing MongoDB connection...');
      await connection.close();
      process.exit(0);
    });
  }

  /**
   * Get database name from URI
   */
  public getDatabaseName(): string {
    const uri = this.getValue('MONGO_URI', false);
    if (uri) {
      const match = uri.match(/\/([^/?]+)(?:\?|$)/);
      return match ? match[1] : 'ado-dad';
    }
    return this.getValue('MONGO_DATABASE', true);
  }

  /**
   * Validate MongoDB connection string format
   */
  public validateMongoUri(uri: string): boolean {
    try {
      const url = new URL(uri);
      return url.protocol === 'mongodb:' || url.protocol === 'mongodb+srv:';
    } catch {
      return false;
    }
  }
}

// Initialize configuration service
const configService = new ConfigService(process.env);

// Ensure required values are present (only in production)
if (configService.isProduction()) {
  configService.ensureValues(['MONGO_URI']);
}

export { configService };
