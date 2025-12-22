#!/bin/bash

# Stop Local Development Environment

echo "🛑 Stopping Local Development Environment..."
docker-compose -f docker-compose.local.yml down
echo "✅ Services stopped"

