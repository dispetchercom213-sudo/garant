#!/bin/bash

set -e

echo "🚀 Deploying GARANT BETON via Docker..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Stop PM2 if running
echo -e "${YELLOW}Stopping PM2...${NC}"
pm2 stop garant-beton-backend 2>/dev/null || true
pm2 delete garant-beton-backend 2>/dev/null || true

# Stop aaPanel Nginx
echo -e "${YELLOW}Stopping aaPanel Nginx...${NC}"
systemctl stop nginx 2>/dev/null || true
/etc/init.d/nginx stop 2>/dev/null || true

# Navigate to project directory
cd /root/garant-beton || mkdir -p /root/garant-beton && cd /root/garant-beton

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose down -v 2>/dev/null || true

# Build images
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose build --no-cache

# Start containers
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database...${NC}"
sleep 10

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose exec -T backend npx prisma migrate deploy

# Check status
echo -e "${GREEN}Checking services status...${NC}"
docker-compose ps

# Test endpoints
echo -e "${GREEN}Testing endpoints...${NC}"
sleep 5
curl -s http://localhost/api/v1/health || echo -e "${RED}Backend not responding${NC}"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Access your site at: http://78.40.109.177${NC}"

