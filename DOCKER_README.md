# Docker Setup for Ado-Dad Backend

This document provides instructions for running the Ado-Dad NestJS backend application using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of available RAM
- At least 5GB of available disk space

## Quick Start

### Production Environment

1. **Clone the repository and navigate to the project directory:**

   ```bash
   cd ado-dad
   ```

2. **Create environment variables file (optional):**

   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Build and start the application:**

   ```bash
   docker-compose up -d
   ```

4. **Check the status:**

   ```bash
   docker-compose ps
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f app
   ```

### Development Environment

1. **Start development environment:**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Access the application:**
   - API: http://localhost:5000
   - Swagger Docs: http://localhost:5000/docs
   - MongoDB Express: http://localhost:8081 (admin/password123)

## Services

### Production Services

- **app**: NestJS application (port 5000)
- **mongodb**: MongoDB database (port 27017)
- **mongo-express**: MongoDB web interface (port 8081, development profile only)

### Development Services

- **app**: NestJS application with hot reload (port 5000)
- **mongodb**: MongoDB database (port 27017)
- **mongo-express**: MongoDB web interface (port 8081)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Application
NODE_ENV=production
APP_CONFIG__BACKEND_PORT=5000

# MongoDB
MONGODB_URI=mongodb://admin:password123@mongodb:27017/adodad_db?authSource=admin

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_s3_bucket_name

# JWT
JWT_SECRET=your-super-secret-jwt-key
TOKEN_KEY=your-token-key
```

## Database Management

### MongoDB Express (Web Interface)

Access MongoDB Express at http://localhost:8081:

- Username: `admin`
- Password: `password123`

### Database Connection Details

- **Host**: `localhost` (or `mongodb` from within containers)
- **Port**: `27017`
- **Database**: `adodad_db`
- **Username**: `admin`
- **Password**: `password123`
- **Auth Source**: `admin`

## Useful Commands

### Production Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# View logs
docker-compose logs -f app
docker-compose logs -f mongodb

# Access container shell
docker-compose exec app sh
docker-compose exec mongodb mongosh

# Remove all containers and volumes
docker-compose down -v
```

### Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# Rebuild development environment
docker-compose -f docker-compose.dev.yml up -d --build

# View development logs
docker-compose -f docker-compose.dev.yml logs -f app

# Access development container
docker-compose -f docker-compose.dev.yml exec app sh
```

### Database Commands

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh

# Backup database
docker-compose exec mongodb mongodump --db adodad_db --out /backup

# Restore database
docker-compose exec mongodb mongorestore --db adodad_db /backup/adodad_db

# Seed data (from host machine)
docker-compose exec app npm run seed:manufacturers
docker-compose exec app npm run seed:vehicle-models
docker-compose exec app npm run seed:vehicle-variants
docker-compose exec app npm run seed:ads
```

## Health Checks

The application includes health checks for all services:

- **App**: Checks if the API is responding on `/ads` endpoint
- **MongoDB**: Checks if the database is accepting connections

## Troubleshooting

### Common Issues

1. **Port already in use:**

   ```bash
   # Check what's using the port
   lsof -i :5000
   # Kill the process or change the port in docker-compose.yml
   ```

2. **MongoDB connection issues:**

   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   # Restart MongoDB
   docker-compose restart mongodb
   ```

3. **Application not starting:**

   ```bash
   # Check application logs
   docker-compose logs app
   # Check if MongoDB is ready
   docker-compose logs mongodb
   ```

4. **Permission issues:**
   ```bash
   # Fix volume permissions
   sudo chown -R 1001:1001 ./data
   ```

### Performance Optimization

1. **Increase Docker resources:**

   - Allocate more RAM and CPU to Docker
   - Use SSD storage for better I/O performance

2. **Database optimization:**

   - The MongoDB initialization script creates proper indexes
   - Monitor query performance using MongoDB Express

3. **Application optimization:**
   - Use production build for better performance
   - Enable compression and caching headers

## Security Considerations

1. **Change default passwords** in production
2. **Use environment variables** for sensitive data
3. **Limit network access** to MongoDB (only from app container)
4. **Regular security updates** for base images
5. **Backup strategy** for database data

## Backup and Restore

### Backup Database

```bash
# Create backup
docker-compose exec mongodb mongodump --db adodad_db --out /backup

# Copy backup to host
docker cp adodad_mongodb:/backup ./backup
```

### Restore Database

```bash
# Copy backup to container
docker cp ./backup adodad_mongodb:/backup

# Restore database
docker-compose exec mongodb mongorestore --db adodad_db /backup/adodad_db
```

## Monitoring

### Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
```

### Resource Usage

```bash
# Check container resource usage
docker stats

# Check disk usage
docker system df
```

## Scaling

For production scaling, consider:

1. **Load balancer** (nginx, haproxy)
2. **Multiple app instances**
3. **MongoDB replica set**
4. **Redis for caching**
5. **CDN for static assets**

## Support

For issues related to Docker setup:

1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Check network connectivity between containers
4. Ensure sufficient system resources
