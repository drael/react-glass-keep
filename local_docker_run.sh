#!/bin/bash

# Liquid Keep Docker Deployment Script
# This script builds and runs the Liquid Keep application in a Docker container

set -e  # Exit on any error

echo "🧹 Removing existing glass-keep container (if exists)..."
docker rm -f glass-keep 2>/dev/null || true

echo "🏗️  Building glass-keep Docker image..."
docker build -t glass-keep:local .

echo "🚀 Starting glass-keep container..."
docker run -d \
  --name glass-keep \
  --restart unless-stopped \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e API_PORT=8080 \
  -e JWT_SECRET="replace-with-a-long-random-string" \
  -e DB_FILE=/app/data/notes.db \
  -e ADMIN_EMAILS=adminniku \
  -v "$HOME/.glass-keep:/app/data" \
  glass-keep:local

echo "✅ Local Deployment complete!"
echo "🌐 Application should be available at http://localhost:8080"
echo "� Stop container: docker stop glass-keep"
echo "� Streaming logs (Press Ctrl+C to stop viewing logs, container will keep running)..."
docker logs -f glass-keep
