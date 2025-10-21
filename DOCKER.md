# 🐳 Docker Setup for Ado-dad Application

This document explains how to containerize and run the Ado-dad NestJS application using Docker.

## 📋 Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose
- Node.js 20.19.1 (for local development)

## 🏗️ Multi-Stage Dockerfile

The application uses a multi-stage Dockerfile for optimal image size and security:

### Stage 1: Builder

- Uses Node.js 20.19.1 Alpine
- Installs all dependencies (including dev dependencies)
- Builds the application
- Creates optimized production build

### Stage 2: Production

- Uses Node.js 20.19.1 Alpine (minimal image)
- Installs only production dependencies
- Runs as non-root user (`nestjs:nodejs`)
- Includes health checks
- Uses `dumb-init` for proper signal handling
- **PM2 Clustering**: Automatically spawns multiple workers (one per CPU core)

## 🚀 Quick Start

### Prerequisites

Before running the application, you need to set up external services:

1. **MongoDB Atlas**: Create a cluster and get your connection string
2. **External Redis**: Set up Redis (Redis Cloud, AWS ElastiCache, etc.)
3. **Environment Variables**: Copy `env.example` to `.env` and configure your services

### Production (Recommended)

```bash
# Copy and configure environment variables
cp env.example .env
# Edit .env with your MongoDB Atlas and Redis details

# Build and run production with external services
docker-compose up --build

# Access the application
curl http://localhost:3000/ads
```

### Development

```bash
# Build and run development with external services
docker-compose -f docker-compose.dev.yml up --build

# Access the application
curl http://localhost:3000/ads
```

## 🔧 Available Dockerfiles

| File             | Port | Description                                  |
| ---------------- | ---- | -------------------------------------------- |
| `Dockerfile`     | 3000 | Production Dockerfile with external services |
| `Dockerfile.dev` | 3000 | Development Dockerfile with hot reload       |

## 📦 Docker Compose Configurations

| File                     | Port | Use Case                                            |
| ------------------------ | ---- | --------------------------------------------------- |
| `docker-compose.yml`     | 3000 | **Production with external services (Recommended)** |
| `docker-compose.dev.yml` | 3000 | Development with external services                  |

## 🛠️ Development

### Development Mode

```bash
# Start development environment with external services
docker-compose -f docker-compose.dev.yml up --build

# The application will auto-reload on file changes
# Debug port 9229 is exposed for debugging
```

### Building Individual Images

```bash
# Build production image
docker build -t adodad-app:latest .

# Build development image
docker build -f Dockerfile.dev -t adodad-app:dev .
```

## 🔍 Health Checks

The application includes built-in health checks:

```bash
# Check container health
docker ps
# Look for "healthy" status

# Manual health check
docker exec <container_name> node healthcheck.js
```

## 🛡️ Security Features

- **Non-root user**: Application runs as `nestjs` user (UID 1001)
- **Minimal base image**: Uses Alpine Linux
- **Signal handling**: Proper SIGTERM handling with `dumb-init`
- **Graceful shutdown**: 30-second grace period for clean shutdown
- **Health checks**: Built-in application health monitoring

## ⚡ Performance Features

- **PM2 Clustering**: Automatically spawns multiple workers (one per CPU core)
- **High Concurrency**: Each worker can handle requests independently
- **Auto-restart**: Failed workers are automatically restarted
- **Memory Management**: Workers restart if memory usage exceeds 1GB
- **Load Balancing**: PM2 distributes requests across all workers

## 🌐 External Services Setup

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a new cluster
3. Create a database user
4. Get your connection string from "Connect" → "Connect your application"
5. Add your connection string to `.env` as `MONGODB_URI`

### Redis Setup Options

Choose one of these Redis providers:

#### Option 1: Redis Cloud

1. Sign up at [redis.com/redis-enterprise-cloud](https://redis.com/redis-enterprise-cloud)
2. Create a new database
3. Get connection details from the dashboard
4. Add to `.env`:
   ```
   REDIS_HOST=your-redis-host.com
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```

#### Option 2: AWS ElastiCache

1. Create an ElastiCache Redis cluster in AWS Console
2. Configure security groups to allow access
3. Get endpoint and port from cluster details
4. Add to `.env`:
   ```
   REDIS_HOST=your-cluster.cache.amazonaws.com
   REDIS_PORT=6379
   REDIS_PASSWORD=your-auth-token
   ```

#### Option 3: Railway Redis

1. Create a Redis service on [railway.app](https://railway.app)
2. Get connection details from the service dashboard
3. Add to `.env` with the provided credentials

## 📊 Environment Variables

### Application Configuration

| Variable                   | Default      | Description         |
| -------------------------- | ------------ | ------------------- |
| `NODE_ENV`                 | `production` | Node.js environment |
| `BACKEND_PORT`             | `3000`       | Backend port        |
| `APP_CONFIG__BACKEND_PORT` | `3000`       | Application port    |

### Database Configuration

| Variable         | Default | Description                     |
| ---------------- | ------- | ------------------------------- |
| `MONGODB_URI`    | -       | MongoDB Atlas connection string |
| `MONGO_URI`      | -       | Alternative MongoDB URI         |
| `MONGO_USER`     | -       | MongoDB username                |
| `MONGO_PASSWORD` | -       | MongoDB password                |
| `MONGO_HOST`     | -       | MongoDB host                    |
| `MONGO_PORT`     | `27017` | MongoDB port                    |
| `MONGO_DATABASE` | -       | MongoDB database name           |

### Redis Configuration

| Variable         | Default | Description             |
| ---------------- | ------- | ----------------------- |
| `REDIS_URL`      | -       | Redis connection URL    |
| `REDIS_HOST`     | -       | External Redis hostname |
| `REDIS_PORT`     | `6379`  | Redis port              |
| `REDIS_PASSWORD` | -       | Redis password          |
| `REDIS_DB`       | `0`     | Redis database number   |

### Authentication & Security

| Variable               | Default    | Description              |
| ---------------------- | ---------- | ------------------------ |
| `JWT_SECRET`           | -          | JWT secret key           |
| `TOKEN_KEY`            | -          | Token encryption key     |
| `SALT_ROUNDS`          | `10`       | Password salt rounds     |
| `ACCESS_TOKEN_EXPIRY`  | `86400000` | Access token expiry (ms) |
| `REFRESH_TOKEN_EXPIRY` | `60d`      | Refresh token expiry     |

### AWS Configuration

| Variable                | Default      | Description                |
| ----------------------- | ------------ | -------------------------- |
| `AWS_ACCESS_KEY_ID`     | -            | AWS access key             |
| `AWS_SECRET_ACCESS_KEY` | -            | AWS secret key             |
| `AWS_REGION`            | `ap-south-1` | AWS region                 |
| `AWS_S3_BUCKET`         | -            | S3 bucket name             |
| `AWS_S3_BUCKET_NAME`    | -            | Alternative S3 bucket name |

### Firebase Configuration

| Variable           | Default | Description                   |
| ------------------ | ------- | ----------------------------- |
| `FIREBASE_SA_JSON` | -       | Firebase service account JSON |

### Email Configuration

| Variable         | Default | Description                  |
| ---------------- | ------- | ---------------------------- |
| `RESET_LINK`     | -       | Password reset link template |
| `SES_FROM_EMAIL` | -       | SES sender email             |
| `FRONTEND_URL`   | -       | Frontend application URL     |

### Google Maps Configuration

| Variable              | Default | Description              |
| --------------------- | ------- | ------------------------ |
| `GOOGLE_MAPS_API_KEY` | -       | Google Maps API key      |
| `API_KEY_MAPS`        | -       | Alternative Maps API key |
| `API_SECRET_MAPS`     | -       | Maps API secret          |

## 🧪 Testing

### Test Graceful Shutdown

```bash
# Start the application
docker-compose up

# In another terminal, test graceful shutdown
docker-compose down
# Watch the logs for graceful shutdown messages
```

### Run Tests in Container

```bash
# Run tests in development container
docker-compose -f docker-compose.dev.yml exec app npm test

# Run e2e tests
docker-compose -f docker-compose.dev.yml exec app npm run test:e2e
```

## 📈 Performance Optimizations

### Image Size Optimization

- Multi-stage build reduces final image size
- Alpine Linux base image (~5MB vs ~100MB for Ubuntu)
- Production dependencies only in final stage
- Cleaned npm cache and temporary files

### Build Optimization

- Layer caching for faster rebuilds
- Package files copied first for better cache utilization
- Separate dependency installation from source code copying

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   # Check what's using the port
   netstat -tulpn | grep :3000
   ```

2. **Build failures**

   ```bash
   # Clean build
   docker-compose build --no-cache

   # Check build logs
   docker-compose build --progress=plain
   ```

3. **External service connection issues**

   ```bash
   # Test MongoDB Atlas connection
   docker-compose exec app node -e "
   const mongoose = require('mongoose');
   mongoose.connect(process.env.MONGODB_URI)
     .then(() => console.log('MongoDB connected'))
     .catch(err => console.error('MongoDB connection failed:', err));
   "

   # Test Redis connection
   docker-compose exec app node -e "
   const redis = require('redis');
   const client = redis.createClient({
     host: process.env.REDIS_HOST,
     port: process.env.REDIS_PORT,
     password: process.env.REDIS_PASSWORD
   });
   client.ping().then(() => console.log('Redis connected')).catch(err => console.error('Redis connection failed:', err));
   "
   ```

### Logs and Debugging

```bash
# View application logs
docker-compose logs -f app

# View all service logs
docker-compose logs -f

# Debug container
docker-compose exec app sh
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t adodad-app:test .
      - name: Run tests
        run: docker run --rm adodad-app:test npm test
```

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [Multi-stage Builds](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/#use-multi-stage-builds)
