#!/bin/bash

# Frontend Deployment Script
# Run this on your local machine to build and deploy frontend to S3

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Starting Frontend Deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    echo "Install: https://aws.amazon.com/cli/"
    exit 1
fi

# Get configuration
echo -e "${YELLOW}📝 Configuration${NC}"
read -p "S3 Bucket Name: " S3_BUCKET
read -p "EC2 Backend IP or Domain: " BACKEND_URL
read -p "CloudFront Distribution ID (optional, press Enter to skip): " CF_DIST_ID

# Validate inputs
if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}❌ S3 Bucket name is required${NC}"
    exit 1
fi

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ Backend URL is required${NC}"
    exit 1
fi

# Create .env.production
echo -e "${YELLOW}⚙️  Creating production environment file...${NC}"
cat > .env.production <<EOF
VITE_API_BASE_URL=http://${BACKEND_URL}:8000/api/v1
EOF

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Build
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed. dist directory not found.${NC}"
    exit 1
fi

# Upload to S3
echo -e "${YELLOW}📤 Uploading to S3...${NC}"
cd dist
aws s3 sync . s3://${S3_BUCKET}/ --delete --cache-control "public, max-age=31536000, immutable"

# Upload index.html with no cache
aws s3 cp index.html s3://${S3_BUCKET}/index.html --cache-control "no-cache, no-store, must-revalidate"

echo -e "${GREEN}✅ Files uploaded to S3!${NC}"

# Invalidate CloudFront cache if distribution ID provided
if [ ! -z "$CF_DIST_ID" ]; then
    echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation \
        --distribution-id ${CF_DIST_ID} \
        --paths "/*"
    echo -e "${GREEN}✅ CloudFront cache invalidation initiated!${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Your frontend is available at:"
echo "  S3 Website: http://${S3_BUCKET}.s3-website-$(aws configure get region).amazonaws.com"
if [ ! -z "$CF_DIST_ID" ]; then
    CF_URL=$(aws cloudfront get-distribution --id ${CF_DIST_ID} --query 'Distribution.DomainName' --output text)
    echo "  CloudFront: https://${CF_URL}"
fi

