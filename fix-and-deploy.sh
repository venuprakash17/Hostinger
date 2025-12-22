#!/bin/bash
# Single command to fix login errors and deploy to server

cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && \
VITE_API_BASE_URL="http://72.60.101.14:8000/api/v1" npm run build && \
scp -r dist/* root@72.60.101.14:/root/elevate-edu/dist/ && \
scp -r backend root@72.60.101.14:/root/elevate-edu/ && \
ssh root@72.60.101.14 "cd /root/elevate-edu && docker-compose restart nginx" && \
echo "✅ Fixed and deployed! Login at: http://72.60.101.14"

