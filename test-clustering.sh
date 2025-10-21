#!/bin/bash

# Test script to verify PM2 clustering is working
echo "🧪 Testing PM2 Clustering Setup..."

# Build and run the container
echo "📦 Building Docker image with PM2 clustering..."
docker build -t adodad-app:clustered .

# Run container in background
echo "🚀 Starting container with PM2 clustering..."
docker run -d --name adodad-cluster-test \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e APP_CONFIG__BACKEND_PORT=3000 \
  -e MONGODB_URI="mongodb://localhost:27017/test" \
  -e REDIS_URL="redis://localhost:6379" \
  -e JWT_SECRET="test-secret" \
  -e TOKEN_KEY="test-token-key" \
  adodad-app:clustered

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Check if container is running
if docker ps | grep -q "adodad-cluster-test"; then
    echo "✅ Container is running"
    
    # Check PM2 processes inside container
    echo "🔍 Checking PM2 processes..."
    docker exec adodad-cluster-test pm2 list
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ads || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        echo "✅ Application is responding (HTTP $response)"
    else
        echo "❌ Application not responding (HTTP $response)"
    fi
    
    # Show PM2 logs
    echo "📋 PM2 Logs:"
    docker exec adodad-cluster-test pm2 logs --lines 10
    
else
    echo "❌ Container failed to start"
    echo "📋 Container logs:"
    docker logs adodad-cluster-test
fi

# Cleanup
echo "🧹 Cleaning up..."
docker stop adodad-cluster-test
docker rm adodad-cluster-test

echo "✅ Clustering test completed!"
